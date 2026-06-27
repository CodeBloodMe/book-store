// components/reader/ReaderOpeningAnimation.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen book-opening animation shown once when the reader mounts.
// Auto-completes after ~1.6 s or when the cover fades out.

"use client";

import React, { useEffect, useState } from 'react';
import { ReaderTheme } from '@/lib/reader-themes';

interface ReaderOpeningAnimationProps {
  coverUrl?:  string | null;
  theme:      ReaderTheme;
  onComplete: () => void;
}

export default function ReaderOpeningAnimation({
  coverUrl, theme, onComplete,
}: ReaderOpeningAnimationProps) {
  const [phase, setPhase] = useState<'show' | 'fade'>('show');

  useEffect(() => {
    // Phase 1 → fade out after 900 ms
    const t1 = setTimeout(() => setPhase('fade'), 900);
    // Phase 2 → notify parent after fade (500 ms transition)
    const t2 = setTimeout(() => onComplete(), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  const bg = theme.epubBody.background;

  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         99999,
        background:     bg,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexDirection:  'column',
        gap:            20,
        opacity:        phase === 'fade' ? 0 : 1,
        transition:     'opacity 0.5s ease',
        pointerEvents:  'none',
      }}
    >
      {/* Cover image or placeholder */}
      <div
        style={{
          width:        120,
          height:       180,
          borderRadius: 8,
          overflow:     'hidden',
          boxShadow:    '0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.15)',
          transform:    phase === 'fade' ? 'scale(0.92) translateY(-8px)' : 'scale(1)',
          transition:   'transform 0.5s ease',
          flexShrink:   0,
        }}
      >
        {coverUrl
          ? <img src={coverUrl} alt="Book cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{
              width:          '100%',
              height:         '100%',
              background:     'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       48,
            }}>
              📖
            </div>
        }
      </div>

      {/* Loading indicator */}
      <div style={{ display: 'flex', gap: 6, opacity: phase === 'fade' ? 0 : 1, transition: 'opacity 0.3s' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   theme.chrome.progressFill,
              animation:    `pulse 1s ease ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
