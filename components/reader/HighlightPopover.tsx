"use client";

import React from 'react';
import { ReaderTheme } from '@/lib/reader-themes';

interface HighlightPopoverProps {
  x: number;
  y: number;
  theme: ReaderTheme;
  onHighlight: (color: string) => void;
  onCopy: () => void;
  onClose: () => void;
  /** If set, the selected text already has a highlight — show erase instead */
  existingColor?: string | null;
  onErase?: () => void;
}

const COLORS = [
  { id: 'yellow', bg: '#fbbf24', label: 'Yellow' },
  { id: 'green',  bg: '#34d399', label: 'Green'  },
  { id: 'blue',   bg: '#60a5fa', label: 'Blue'   },
  { id: 'pink',   bg: '#f472b6', label: 'Pink'   },
];

export default function HighlightPopover({
  x, y, theme, onHighlight, onCopy, onClose, existingColor, onErase,
}: HighlightPopoverProps) {
  const t = theme.chrome;

  return (
    <div
      className="highlight-popover"
      style={{
        left: x,
        top: y - 60,
        background: t.drawerBg,
        border: `1px solid ${t.border}`,
        color: t.text,
      }}
    >
      {/* Highlight color dots */}
      {COLORS.map(c => (
        <button
          key={c.id}
          onClick={() => { onHighlight(c.id); onClose(); }}
          title={`Highlight ${c.label}`}
          style={{
            background: c.bg,
            border: existingColor === c.id ? '2px solid #fff' : 'none',
            boxShadow: existingColor === c.id ? `0 0 0 2px ${c.bg}` : 'none',
          }}
        >
          <span style={{ fontSize: 14 }}>🖊</span>
        </button>
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: t.border, margin: '0 2px' }} />

      {/* Copy */}
      <button
        onClick={() => { onCopy(); onClose(); }}
        title="Copy text"
        style={{ background: t.buttonHover }}
      >
        📋
      </button>

      {/* Erase — only show if this text already has a highlight */}
      {existingColor && onErase && (
        <>
          <div style={{ width: 1, height: 20, background: t.border, margin: '0 2px' }} />
          <button
            onClick={() => { onErase(); onClose(); }}
            title="Remove highlight"
            style={{ background: 'rgba(239,68,68,0.15)' }}
          >
            <span style={{ fontSize: 14 }}>🗑</span>
          </button>
        </>
      )}
    </div>
  );
}
