'use client';

// ============================================================
// BookCard — Core book display card.
// Client Component — uses useState for image error fallback.
// Uses plain <img> for OpenLibrary covers to bypass Next.js
// remotePatterns which was returning 400 errors.
// ============================================================

import Link from 'next/link';
import { useState } from 'react';
import type { Book } from '@/types/database';

interface BookCardProps {
  book: Book;
  featured?: boolean;
}

function getCoverUrl(book: Book): string {
  if (book.cover_image_url) return book.cover_image_url;
  if (book.isbn) {
    const cleanIsbn = book.isbn.replace(/[-\s]/g, '');
    return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
  }
  return '';
}

function getGradient(title: string): string {
  const gradients = [
    'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  ];
  const idx = title.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

export default function BookCard({ book, featured = false }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const coverUrl = getCoverUrl(book);
  const showCover = Boolean(coverUrl) && !imgError;
  const genre = book.genres;

  return (
    <article 
      className="relative overflow-hidden group rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300"
      style={{ height: featured ? '460px' : '420px', backgroundColor: '#222222' }}
    >
      <Link href={`/books/${book.id}`} className="block w-full h-full">
        {/* ── Full Cover Background ─────────────────────────────── */}
        <div className="absolute inset-0 bg-gray-900">
          {showCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={`Cover of ${book.title}`}
              onError={() => setImgError(true)}
              onLoad={(e) => {
                if (e.currentTarget.naturalWidth <= 1) {
                  setImgError(true);
                }
              }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center p-6"
              style={{ background: getGradient(book.title) }}
            >
              <span className="text-white font-bold text-center drop-shadow-md text-2xl">
                {book.title}
              </span>
            </div>
          )}
          
          {/* Original subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#262626] from-40% via-[#262626]/80 to-transparent pointer-events-none" />
        </div>

        {/* ── Content Overlay at Bottom ──────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 flex flex-col justify-end">
          
          <h3
            className="font-bold leading-tight line-clamp-2 mb-2"
            style={{ 
              color: '#ffffff',
              fontSize: featured ? '26px' : '22px', 
              fontFamily: 'var(--font-serif)',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {book.title}
          </h3>
          
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-4">
            {book.description || `An incredible work by ${book.author} that has captured the attention of experts and readers alike. Explore the depths of its ideas and insights.`}
          </p>

          <div className="flex flex-wrap gap-2 mb-5">
            {genre && (
              <div className="bg-[#222]/80 backdrop-blur-sm text-gray-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-white/10">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                {genre.name}
              </div>
            )}
            {book.difficulty_level && (
              <div className="bg-[#222]/80 backdrop-blur-sm text-gray-200 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">
                {book.difficulty_level}
              </div>
            )}
            {book.is_bestseller && (
              <div className="bg-[#222]/80 backdrop-blur-sm text-[#f59e0b] px-3 py-1.5 rounded-full text-xs font-medium border border-[#f59e0b]/30">
                Top Rated
              </div>
            )}
          </div>

          <div className="w-full bg-white text-gray-900 font-bold py-3.5 rounded-[16px] text-center text-sm shadow-md transition-transform hover:scale-[1.02]">
            View Details
          </div>
        </div>
      </Link>
    </article>
  );
}
