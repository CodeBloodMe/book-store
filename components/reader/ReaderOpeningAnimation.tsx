"use client";

import React, { useState, useEffect } from 'react';
import { ReaderTheme } from '@/lib/reader-themes';

interface ReaderOpeningAnimationProps {
  coverUrl?: string | null;
  theme: ReaderTheme;
  onComplete: () => void;
}

export default function ReaderOpeningAnimation({ coverUrl, theme, onComplete }: ReaderOpeningAnimationProps) {
  const [phase, setPhase] = useState<'rising' | 'fading'>('rising');

  useEffect(() => {
    // After the cover rises, start fading it out
    const fadeTimer = setTimeout(() => setPhase('fading'), 900);
    // After fade, signal the reader is ready
    const completeTimer = setTimeout(() => onComplete(), 1500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="reader-opening-overlay"
      style={{ background: theme.epubBody.background || '#ffffff' }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt="Book cover"
          className={`reader-opening-cover${phase === 'fading' ? ' fading' : ''}`}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        // Fallback placeholder cover
        <div
          className={`reader-opening-cover${phase === 'fading' ? ' fading' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 48 }}>📖</span>
        </div>
      )}
    </div>
  );
}
