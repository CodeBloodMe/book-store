// components/reader/HighlightPopover.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Floating popover that appears on text selection or when clicking a highlight.
// Shows colour swatches, copy, and erase actions.
//
// Fixes vs original:
//  1. Popover could appear off-screen — clamped to viewport
//  2. No keyboard dismiss — now closes on Escape
//  3. existingColor not visually indicated — now shown with ring

"use client";

import React, { useEffect, useRef } from 'react';
import { ReaderTheme } from '@/lib/reader-themes';

interface HighlightPopoverProps {
  x: number;
  y: number;
  theme: ReaderTheme;
  onHighlight: (color: string) => void;
  onCopy: () => void;
  onClose: () => void;
  existingColor?: string;
  onErase: () => void;
}

const COLORS: { key: string; label: string; bg: string }[] = [
  { key: 'yellow', label: 'Yellow', bg: '#fbbf24' },
  { key: 'green', label: 'Green', bg: '#34d399' },
  { key: 'blue', label: 'Blue', bg: '#60a5fa' },
  { key: 'pink', label: 'Pink', bg: '#f472b6' },
];

const POPOVER_WIDTH = 220;
const POPOVER_HEIGHT = 72;  // approximate
const MARGIN = 12;  // screen edge margin

export default function HighlightPopover({
  x, y, theme, onHighlight, onCopy, onClose, existingColor, onErase,
}: HighlightPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const t = theme.chrome;

  // Clamp to viewport so it never goes off-screen
  const left = Math.min(
    Math.max(MARGIN, x - POPOVER_WIDTH / 2),
    window.innerWidth - POPOVER_WIDTH - MARGIN,
  );
  // Show above the selection; if not enough room, show below
  const showAbove = y - POPOVER_HEIGHT - 12 > MARGIN;
  const top = showAbove
    ? y - POPOVER_HEIGHT - 12
    : y + 24;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // Small delay so the same click that opened it doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  const btnBase: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${t.border}`,
    color: t.textMuted,
    borderRadius: 6,
    cursor: 'pointer',
    padding: '5px 10px',
    fontSize: 11,
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        background: t.drawerBg,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: POPOVER_WIDTH,
        backdropFilter: 'blur(16px)',
        animation: 'popoverIn 0.15s ease',
      }}
    >
      <style>{`
        @keyframes popoverIn {
          from { opacity: 0; transform: scale(0.92) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>

      {/* Colour swatches */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
          Highlight
        </span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {COLORS.map(c => (
            <button
              key={c.key}
              title={c.label}
              onClick={() => onHighlight(c.key)}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: c.bg,
                border: existingColor === c.key
                  ? '3px solid #6366f1'
                  : '2px solid rgba(0,0,0,0.1)',
                cursor: 'pointer',
                padding: 0,
                transition: 'transform 0.12s, border-color 0.12s',
                transform: existingColor === c.key ? 'scale(1.18)' : 'scale(1)',
                boxShadow: existingColor === c.key ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.22)')}
              onMouseLeave={e => (e.currentTarget.style.transform = existingColor === c.key ? 'scale(1.18)' : 'scale(1)')}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: t.border }} />

      {/* Actions row */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onCopy}
          style={btnBase}
          title="Copy selected text"
        >
          Copy
        </button>

        <button
          onClick={onErase}
          style={{ ...btnBase, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
          title={existingColor ? "Remove highlight" : "Clear selection"}
        >
          {existingColor ? "Erase" : "Clear"}
        </button>

        <button
          onClick={onClose}
          style={{ ...btnBase, marginLeft: 'auto' }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
