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
        className="relative flex items-end overflow-hidden"
        style={{ 
          height: '140px', 
          background: accentColor,
          borderBottom: '5px solid #0a0a0a'
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
          className="absolute top-3 right-3 z-10"
          style={{
            background: '#00e060',
            border: '3px solid #0a0a0a',
            boxShadow: '3px 3px 0 #0a0a0a',
            fontSize: '0.55rem',
            fontWeight: 800,
            letterSpacing: '0.18em',
            padding: '3px 8px',
            textTransform: 'uppercase',
            color: '#0a0a0a'
          }}
        >
          {genre.is_learning ? 'LEARN' : 'EXPLORE'}
        </div>

        {/* Avatar / Icon */}
        <div 
          className="relative z-10 flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-6"
          style={{
            width: '64px',
            height: '64px',
            background: '#0a0a0a',
            borderTop: '5px solid #0a0a0a',
            borderRight: '5px solid #0a0a0a',
            marginLeft: '20px',
            color: accentColor,
          }}
        >
          {getGenreIcon(genre.slug, "w-8 h-8")}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '16px 18px 0' }}>
        <div 
          style={{
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: '#a8a49a',
            textTransform: 'uppercase',
            marginBottom: '2px'
          }}
        >
          GENRE
        </div>
        <h3 
          className="truncate"
          style={{
            fontFamily: 'var(--font-bebas)',
            fontSize: '2.4rem',
            lineHeight: '0.88',
            color: '#0a0a0a',
            letterSpacing: '-0.01em',
            marginBottom: '10px'
          }}
        >
          {genre.name}
        </h3>
        
        {genre.description ? (
          <p 
            className="line-clamp-2"
            style={{
              fontSize: '0.72rem',
              fontWeight: 500,
              color: '#0a0a0a',
              borderLeft: `5px solid ${accentColor}`,
              paddingLeft: '10px',
              lineHeight: '1.55',
              marginBottom: '14px',
              height: '2.2rem'
            }}
          >
            {genre.description}
          </p>
        ) : (
          <div style={{ height: '2.2rem', marginBottom: '14px' }} />
        )}
      </div>

      {/* ── Stats Grid ── */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          borderTop: '3px solid #0a0a0a'
        }}
      >
        <div style={{ padding: '12px 10px', textAlign: 'center' }}>
          <span 
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: '1.8rem',
              lineHeight: '1',
              color: '#0a0a0a',
              display: 'block'
            }}
          >
            {genre.is_fiction ? 'FICTION' : 'NON-FICTION'}
          </span>
          <span 
            style={{
              fontSize: '0.48rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: '#a8a49a',
              textTransform: 'uppercase',
              display: 'block',
              marginTop: '2px'
            }}
          >
            TYPE
          </span>
        </div>
      </div>

      {/* ── Action Button ── */}
      <button 
        className="group-hover:bg-[#0a0a0a] group-hover:text-white transition-colors"
        style={{
          display: 'block',
          width: '100%',
          padding: '13px',
          background: accentColor,
          color: '#0a0a0a',
          border: 'none',
          borderTop: '5px solid #0a0a0a',
          fontFamily: 'var(--font-bebas)',
          fontSize: '1.1rem',
          letterSpacing: '0.2em',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        BROWSE COLLECTION
      </button>
    </Link>
  );
}
