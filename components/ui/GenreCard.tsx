// ============================================================
// GenreCard — Homepage genre browser tile.
// Redesigned with a neo-brutalist aesthetic.
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Genre } from '@/types/database';
import { getGenreIcon } from './GenreIcon';

interface GenreCardProps {
  genre: Genre;
}

export default function GenreCard({ genre }: GenreCardProps) {
  // Use a fallback color if genre color isn't available
  const accentColor = genre.color || '#f5e642';
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/genres/${genre.slug}`}
      className="block relative overflow-hidden transition-transform hover:-translate-y-1"
      aria-label={`Browse ${genre.name} books`}
      style={{
        background: '#f5f5f0',
        border: '5px solid #0a0a0a',
        boxShadow: '8px 8px 0 #0a0a0a',
      }}
    >
      {/* ── Photo Header ── */}
      <div 
        className="relative flex items-end overflow-hidden h-[100px] sm:h-[140px]"
        style={{ 
          background: accentColor,
          borderBottom: '4px solid #0a0a0a'
        }}
      >
        {/* Halftone Pattern Overlay or Custom Image */}
        {!imgError ? (
          <div className="absolute inset-0 pointer-events-none z-0">
            <Image 
              src={`/illustrations/${genre.slug}.png`}
              alt={genre.name}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
              unoptimized
            />
          </div>
        ) : (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent 0px, transparent 8px, rgba(0, 0, 0, 0.12) 8px, rgba(0, 0, 0, 0.12) 10px)'
            }}
          />
        )}

        {/* Big Background Number (removed book count) */}

        {/* Status Badge */}
        <div 
          className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 border-[2px] sm:border-[3px] border-[#0a0a0a] text-[8px] sm:text-[9px] font-[800] uppercase tracking-[0.18em]"
          style={{
            background: '#00e060',
            boxShadow: '2px 2px 0 #0a0a0a',
            padding: '3px 6px',
            color: '#0a0a0a'
          }}
        >
          {genre.is_learning ? 'LEARN' : 'EXPLORE'}
        </div>

        {/* Avatar / Icon */}
        <div 
          className="relative z-10 flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-6 w-12 h-12 sm:w-16 sm:h-16 bg-[#0a0a0a] border-t-[3px] sm:border-t-[5px] border-r-[3px] sm:border-r-[5px] border-[#0a0a0a] ml-3 sm:ml-[20px]"
          style={{
            color: accentColor,
          }}
        >
          {getGenreIcon(genre.slug, "w-6 h-6 sm:w-8 sm:h-8")}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-3 py-3 sm:px-[18px] sm:pt-[16px] sm:pb-0">
        <div className="text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-[#a8a49a] uppercase mb-1">
          GENRE
        </div>
        <h3 
          className="truncate text-xl sm:text-[2.4rem] text-[#0a0a0a] mb-2 sm:mb-[10px]"
          style={{
            fontFamily: 'var(--font-bebas)',
            lineHeight: '0.88',
            letterSpacing: '-0.01em',
          }}
        >
          {genre.name}
        </h3>
        
        {genre.description ? (
          <p 
            className="line-clamp-2 text-[10px] sm:text-xs text-[#0a0a0a] font-medium mb-3 sm:mb-[14px]"
            style={{
              borderLeft: `4px solid ${accentColor}`,
              paddingLeft: '8px',
              lineHeight: '1.4',
              height: '1.8rem',
            }}
          >
            {genre.description}
          </p>
        ) : (
          <div className="mb-3 sm:mb-[14px]" style={{ height: '1.8rem' }} />
        )}
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 border-t-[3px] border-[#0a0a0a]">
        <div className="py-2 sm:py-3 text-center">
          <span 
            className="block text-lg sm:text-[1.8rem] text-[#0a0a0a]"
            style={{
              fontFamily: 'var(--font-bebas)',
              lineHeight: '1',
            }}
          >
            {genre.is_fiction ? 'FICTION' : 'NON-FICTION'}
          </span>
          <span className="block text-[8px] sm:text-[9px] font-bold tracking-[0.15em] text-[#a8a49a] uppercase mt-1">
            TYPE
          </span>
        </div>
      </div>

      {/* ── Action Button ── */}
      <button 
        className="block w-full py-2 sm:py-[13px] border-t-[3px] sm:border-t-[5px] border-[#0a0a0a] group-hover:bg-[#0a0a0a] group-hover:text-white transition-colors text-xs sm:text-[1.1rem] text-[#0a0a0a] cursor-pointer text-center tracking-[0.2em]"
        style={{
          background: accentColor,
          fontFamily: 'var(--font-bebas)',
        }}
      >
        BROWSE
      </button>
    </Link>
  );
}
