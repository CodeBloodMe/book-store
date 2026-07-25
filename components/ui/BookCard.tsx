'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Book } from '@/types/database';
import { getCoverUrl } from '@/lib/cover-utils';
import GeneratedCover from './GeneratedCover';

interface BookCardProps {
  book: Book;
  featured?: boolean;
}

// Lazy-load fast-average-color once at module level (not per card)
let facInstance: any = null;
let facPromise: Promise<any> | null = null;

function getFacInstance(): Promise<any> {
  if (facInstance) return Promise.resolve(facInstance);
  if (!facPromise) {
    facPromise = import('fast-average-color').then(({ FastAverageColor }) => {
      facInstance = new FastAverageColor();
      return facInstance;
    });
  }
  return facPromise;
}

export default function BookCard({ book, featured = false }: BookCardProps) {
  // ── Image state ─────────────────────────────────────────────
  const [imageErrorLevel, setImageErrorLevel] = useState(0);
  const [dominantColor, setDominantColor] = useState('transparent');

  // ── Feature 1: Tilt + Holographic Foil ─────────────────────
  const cardRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, scale: 1 });

  // Use centralized cover URL resolution
  const { primary, fallback } = getCoverUrl(book);
  const currentCoverUrl = imageErrorLevel === 0 ? primary : (imageErrorLevel === 1 ? fallback : '');
  const shouldShowCover = currentCoverUrl !== '' && imageErrorLevel < 2;

  // Dominant color extraction (shared FAC instance)
  useEffect(() => {
    if (!shouldShowCover || !currentCoverUrl) return;

    let cancelled = false;

    getFacInstance().then((fac) => {
      if (cancelled) return;
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = currentCoverUrl;
      img.onload = () => {
        if (cancelled) return;
        fac.getColorAsync(img, { algorithm: 'dominant' })
          .then((r: any) => {
            if (!cancelled) setDominantColor(r.rgba);
          })
          .catch(() => {});
      };
    });

    return () => { cancelled = true; };
  }, [currentCoverUrl, shouldShowCover]);

  // Feature 1: Mouse tilt handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!cardRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width  / 2); // –1 to 1
      const dy = (e.clientY - cy) / (rect.height / 2); // –1 to 1

      setTilt({ rx: -dy * 13, ry: dx * 15, scale: 1.035 });
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    cardRef.current?.addEventListener('mousemove', handleMouseMove as EventListener);
  }, [handleMouseMove]);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTilt({ rx: 0, ry: 0, scale: 1 });
    cardRef.current?.removeEventListener('mousemove', handleMouseMove as EventListener);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleImageError = () => {
    if (imageErrorLevel === 0 && fallback) setImageErrorLevel(1);
    else setImageErrorLevel(2);
  };
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.naturalWidth <= 1) handleImageError();
  };

  const cardHeightClass = featured ? 'h-[320px] sm:h-[460px]' : 'h-[280px] sm:h-[420px]';

  // Tilt transform
  const isMoving = tilt.rx !== 0 || tilt.ry !== 0;
  const tiltTransform = `perspective(820px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.scale})`;
  const tiltTransition = isMoving
    ? 'transform 0.06s linear'
    : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)';

  return (
    <article
      ref={cardRef}
      className={`relative overflow-hidden group rounded-[20px] sm:rounded-[24px] shadow-sm hover:shadow-2xl ${cardHeightClass}`}
      style={{
        backgroundColor: '#222222',
        transform: tiltTransform,
        transition: tiltTransition,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/books/${book.id}`}
        className="absolute inset-0 z-10"
        aria-label={`View details for ${book.title}`}
      />

      {/* ── Book cover image layer ──────────────────────────── */}
      <div className="absolute inset-0 bg-gray-900 pointer-events-none">
        {shouldShowCover ? (
          <Image
            src={currentCoverUrl}
            alt={`Cover of ${book.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={handleImageError}
            onLoad={handleImageLoad}
            unoptimized={true}
          />
        ) : (
          <div className="transition-transform duration-700 group-hover:scale-105 w-full h-full">
            <GeneratedCover title={book.title} author={book.author} />
          </div>
        )}

        {/* Dominant color gradient */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: `linear-gradient(to top, ${dominantColor} 0%, transparent 70%)`,
            opacity: dominantColor === 'transparent' ? 0 : 0.8,
          }}
        />

        {/* Base dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 from-10% via-black/20 to-transparent pointer-events-none" />
      </div>



      {/* ── Text content overlay ─────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 md:p-6 flex flex-col justify-end z-20 pointer-events-none">

        <h3
          className={`font-bold leading-tight line-clamp-2 mb-1 sm:mb-2 ${featured ? 'text-xl sm:text-[26px]' : 'text-lg sm:text-[22px]'}`}
          style={{
            color: '#ffffff',
            fontFamily: 'var(--font-serif)',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {book.title}
        </h3>

        <p className="text-gray-300 text-xs sm:text-sm line-clamp-1 mb-2 sm:mb-4">
          by <Link href={`/authors/${encodeURIComponent(book.author)}`} className="font-bold hover:underline relative z-30 pointer-events-auto transition-colors" style={{ color: '#f5e642' }}>{book.author}</Link>
        </p>

        <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-5">
          {book.genres && (
            <div className="bg-[#222]/80 backdrop-blur-sm text-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 border border-white/10">
              <svg width="10" height="10" className="sm:w-3 sm:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
              <span className="truncate max-w-[80px] sm:max-w-none">{book.genres.name}</span>
            </div>
          )}
          
          {book.difficulty_level && (
            <div className="bg-[#222]/80 backdrop-blur-sm text-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border border-white/10">
              {book.difficulty_level}
            </div>
          )}
          
          {book.is_bestseller && (
            <div className="hidden sm:flex bg-[#222]/80 backdrop-blur-sm text-[#f59e0b] px-3 py-1.5 rounded-full text-xs font-medium border border-[#f59e0b]/30">
              Bestseller
            </div>
          )}
        </div>

        <div className="w-full bg-white text-gray-900 font-bold py-2 sm:py-3.5 rounded-[12px] sm:rounded-[16px] text-center text-xs sm:text-sm shadow-md transition-transform group-hover:scale-[1.02]">
          View Details
        </div>
      </div>
    </article>
  );
}
