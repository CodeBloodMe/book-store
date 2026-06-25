"use client";

import React from 'react';
import { ReaderTheme } from '@/lib/reader-themes';

interface ReaderFooterProps {
  hidden: boolean;
  theme: ReaderTheme;
  currentPage: number;
  totalPages: number;
  genreColor?: string;
}

function formatTimeLeft(pagesLeft: number): string {
  // Average reading speed: ~250 words/page, ~250 wpm
  const minutes = Math.round(pagesLeft * 1); // ~1 min per page
  if (minutes < 1) return 'Almost done';
  if (minutes < 60) return `~${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m left` : `~${hours}h left`;
}

export default function ReaderFooter({ hidden, theme, currentPage, totalPages, genreColor }: ReaderFooterProps) {
  const t = theme.chrome;
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const pagesLeft = Math.max(0, totalPages - currentPage);
  const accentColor = genreColor || '#1f2937';

  return (
    <div
      className={`reader-footer-bar`}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 44,
        background: t.bg,
        borderTop: `1px solid ${t.border}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        paddingInline: 20,
        gap: 12,
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        pointerEvents: hidden ? 'none' : 'auto',
        zIndex: 20,
      }}
    >
      {/* Progress bar track */}
      <div style={{ flex: 1, height: 3, background: t.progressTrack, borderRadius: 2, overflow: 'hidden' }}>
        <div
          className="reader-progress-bar"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
            height: '100%',
            borderRadius: 2,
          }}
        />
      </div>

      {/* Percentage + time */}
      <span className="time-info" style={{ fontSize: 12, color: t.textMuted, whiteSpace: 'nowrap', minWidth: 90, textAlign: 'right' }}>
        {totalPages > 0 ? (
          <>
            <span style={{ color: accentColor, fontWeight: 600 }}>{Math.round(progress)}%</span>
            {' · '}
            {formatTimeLeft(pagesLeft)}
          </>
        ) : ''}
      </span>
    </div>
  );
}
