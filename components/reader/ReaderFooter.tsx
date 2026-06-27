// components/reader/ReaderFooter.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Thin progress bar + page indicator fixed at the bottom of the reader.
// Auto-hides with the toolbar.

"use client";

import React from 'react';
import { ReaderTheme } from '@/lib/reader-themes';

interface ReaderFooterProps {
  hidden:      boolean;
  theme:       ReaderTheme;
  currentPage: number;
  totalPages:  number;
  genreColor?: string;
}

export default function ReaderFooter({
  hidden, theme, currentPage, totalPages, genreColor,
}: ReaderFooterProps) {
  const t        = theme.chrome;
  const progress = totalPages > 0 ? Math.min(100, Math.max(0, (currentPage / totalPages) * 100)) : 0;
  const pct      = `${progress.toFixed(1)}%`;

  return (
    <div
      style={{
        position:   'absolute',
        bottom:     0,
        left:       0,
        right:      0,
        zIndex:     20,
        opacity:    hidden ? 0 : 1,
        transform:  hidden ? 'translateY(4px)' : 'translateY(0)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        pointerEvents: 'none',
      }}
    >
      {/* Page indicator text */}
      {totalPages > 0 && (
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          paddingBottom:  6,
        }}>
          <span style={{
            fontSize:     10,
            color:        t.textMuted,
            background:   t.bg,
            backdropFilter:'blur(8px)',
            padding:      '3px 10px',
            borderRadius: 12,
            border:       `1px solid ${t.border}`,
            letterSpacing:'0.04em',
          }}>
            {pct} · {currentPage > 0 ? currentPage : 1} / {totalPages}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        height:     3,
        background: t.progressTrack,
        position:   'relative',
      }}>
        <div
          style={{
            position:   'absolute',
            left:       0,
            top:        0,
            bottom:     0,
            width:      `${progress}%`,
            background: genreColor || t.progressFill,
            transition: 'width 0.4s ease',
            borderRadius:'0 2px 2px 0',
          }}
        />
      </div>
    </div>
  );
}
