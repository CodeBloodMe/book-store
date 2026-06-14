// ============================================================
// GenreCard — Homepage genre browser tile.
// Redesigned with a neo-brutalist aesthetic.
// ============================================================

import Link from 'next/link';
import type { Genre } from '@/types/database';

interface GenreCardProps {
  genre: Genre;
}

export default function GenreCard({ genre }: GenreCardProps) {
  // Use a fallback color if genre color isn't available
  const accentColor = genre.color || '#f5e642';

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
        {/* Halftone Pattern Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(45deg, transparent 0px, transparent 8px, rgba(0, 0, 0, 0.12) 8px, rgba(0, 0, 0, 0.12) 10px)'
          }}
        />

        {/* Big Background Number (e.g. book count) */}
        <span 
          className="absolute -right-2 -bottom-2 pointer-events-none"
          style={{
            fontFamily: 'var(--font-bebas)',
            fontSize: '7rem',
            lineHeight: '0.85',
            color: 'rgba(0, 0, 0, 0.08)',
            letterSpacing: '-0.02em'
          }}
        >
          {genre.book_count}
        </span>

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
          className="relative z-10 flex items-center justify-center flex-shrink-0"
          style={{
            width: '64px',
            height: '64px',
            background: '#0a0a0a',
            borderTop: '5px solid #0a0a0a',
            borderRight: '5px solid #0a0a0a',
            marginLeft: '20px',
            fontFamily: 'var(--font-bebas)',
            fontSize: '2rem',
            color: accentColor,
          }}
        >
          <span className="text-3xl" role="img" aria-hidden="true" style={{ filter: 'grayscale(100%) brightness(200%) sepia(100%) hue-rotate(10deg) saturate(500%) drop-shadow(0 0 0 white)' }}>
            {/* The filter tries to colorize standard emojis, but we just show the icon directly */}
            {genre.icon}
          </span>
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
          gridTemplateColumns: '1fr 1fr',
          borderTop: '3px solid #0a0a0a'
        }}
      >
        <div style={{ padding: '12px 10px', borderRight: '3px solid #0a0a0a', textAlign: 'center' }}>
          <span 
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: '1.8rem',
              lineHeight: '1',
              color: '#0a0a0a',
              display: 'block'
            }}
          >
            {genre.book_count}
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
            BOOKS
          </span>
        </div>
        
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
            {genre.is_fiction ? 'FICTION' : 'NON-FIC'}
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
