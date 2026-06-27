// components/reader/ReaderSettingsPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Slide-in settings panel (right side).
// Original was an empty stub — this is the full implementation.

"use client";

import React from 'react';
import {
  ReaderTheme, ReaderPrefs, ThemeId,
  READER_THEMES, FontFamily, MarginSize,
} from '@/lib/reader-themes';

interface ReaderSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  prefs: ReaderPrefs;
  onPrefsChange: (p: ReaderPrefs) => void;
  theme: ReaderTheme;
  currentPage?: number;
  totalPages?: number;
}

const THEMES: { id: ThemeId; label: string; icon: string; bg: string; text: string }[] = [
  { id: 'light', label: 'Light', icon: '☀️', bg: '#ffffff', text: '#1a1a2e' },
  { id: 'sepia', label: 'Sepia', icon: '📜', bg: '#f4ecd8', text: '#3b2a1a' },
  { id: 'dark', label: 'Dark', icon: '🌙', bg: '#1e1e2e', text: '#e0ddd5' },
  { id: 'amoled', label: 'AMOLED', icon: '⬛', bg: '#000000', text: '#cccccc' },
];

const FONT_OPTIONS: { value: FontFamily; label: string; sample: string }[] = [
  { value: 'serif', label: 'Serif', sample: 'Playfair' },
  { value: 'sans', label: 'Sans-serif', sample: 'Inter' },
  { value: 'mono', label: 'Mono', sample: 'Courier' },
];

const FONT_SIZES = [75, 85, 100, 115, 130, 150];
const LINE_HEIGHTS = [1.4, 1.6, 1.8, 2.0, 2.4];
const MARGINS: { value: MarginSize; label: string }[] = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
];

export default function ReaderSettingsPanel({
  open, onClose, prefs, onPrefsChange, theme, currentPage = 0, totalPages = 0
}: ReaderSettingsPanelProps) {
  const t = theme.chrome;
  const update = (patch: Partial<ReaderPrefs>) => onPrefsChange({ ...prefs, ...patch });

  const progress = totalPages > 0 ? Math.min(100, Math.max(0, (currentPage / totalPages) * 100)) : 0;

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: t.text,
    marginBottom: 10,
    display: 'block',
    fontFamily: 'system-ui, sans-serif'
  };

  const pillBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: t.text,
    background: 'transparent',
    border: 'none',
    fontFamily: 'system-ui, sans-serif',
    padding: 0,
  });

  const RadioDot = ({ active }: { active: boolean }) => (
    <div style={{
      width: 16, height: 16, borderRadius: '50%',
      border: `2px solid ${active ? '#b89c72' : t.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? '#fdfbf7' : 'transparent',
    }}>
      {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#b89c72' }} />}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0,0,0,0.2)',
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 340,
          maxWidth: '90vw',
          zIndex: 50,
          background: prefs.themeId === 'dark' || prefs.themeId === 'amoled' ? t.drawerBg : '#fdfbf7',
          borderLeft: `1px solid ${t.border}`,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: open ? '-10px 0 30px rgba(0,0,0,0.1)' : 'none',
          overflowY: 'auto',
        }}
      >
        {/* Subtle Paper Texture Overlay */}
        {(prefs.themeId === 'light' || prefs.themeId === 'sepia') && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'multiply'
          }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, padding: '24px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <h2 style={{
              fontFamily: 'Georgia, serif',
              fontSize: 22,
              color: t.text,
              margin: 0,
              fontWeight: 400
            }}>
              Setting
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#b89c72',
                cursor: 'pointer',
                fontSize: 24,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ height: 1, background: t.border, marginBottom: 24, opacity: 0.5 }} />

          {/* Book Progress */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: 'system-ui, sans-serif' }}>Book Progress</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: 'system-ui, sans-serif' }}>{progress.toFixed(0)}% Completed</span>
            </div>
            <div style={{ height: 4, background: t.progressTrack, borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#b89c72', borderRadius: 2 }} />
            </div>
          </div>

          {/* Controls Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ── Theme ─────────────────────────────────────────────────────────── */}
            <div>
              <span style={sectionLabel}>Theme</span>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                {THEMES.map(th => {
                  const isActive = prefs.themeId === th.id;
                  return (
                    <div key={th.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => update({ themeId: th.id })}
                        style={{
                          width: 44, height: 44,
                          borderRadius: '50%',
                          background: th.bg,
                          border: `1px solid ${th.id === 'light' ? '#ddd' : 'transparent'}`,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isActive ? `0 0 0 2px ${prefs.themeId === 'dark' || prefs.themeId === 'amoled' ? '#222' : '#fdfbf7'}, 0 0 0 4px #b89c72` : 'none',
                          transition: 'box-shadow 0.2s',
                          fontSize: 20
                        }}
                      >
                        {th.id === 'amoled' ? '' : th.icon}
                      </button>
                      <span style={{ fontSize: 11, color: t.text, fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>{th.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Font style ───────────────────────────────────────────────────── */}
            <div>
              <span style={sectionLabel}>Font style</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FONT_OPTIONS.map(f => {
                  const isActive = prefs.fontFamily === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => update({ fontFamily: f.value })}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                        color: isActive ? t.text : t.textMuted,
                      }}
                    >
                      <span style={{
                        fontSize: 18,
                        fontFamily: f.value === 'serif' ? 'Georgia, serif' : f.value === 'mono' ? 'Courier New, monospace' : 'system-ui, sans-serif',
                        fontWeight: f.value === 'sans' ? 600 : 400
                      }}>
                        The Quick Brown Fox
                      </span>
                      <span style={{
                        fontSize: 11,
                        border: isActive ? `1px solid ${t.text}` : 'none',
                        padding: isActive ? '2px 8px' : 0,
                        borderRadius: 12,
                        fontFamily: 'system-ui, sans-serif'
                      }}>
                        {f.value === 'serif' ? 'Regular' : f.value === 'sans' ? 'Bold' : 'Light'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Font size ─────────────────────────────────────────────────────── */}
            <div>
              <span style={sectionLabel}>
                Font size ({prefs.fontSize}%)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => {
                    const idx = FONT_SIZES.indexOf(prefs.fontSize);
                    if (idx > 0) update({ fontSize: FONT_SIZES[idx - 1] });
                  }}
                  disabled={prefs.fontSize <= FONT_SIZES[0]}
                  style={{
                    background: 'transparent', border: 'none', color: '#b89c72', fontSize: 24, cursor: 'pointer', opacity: prefs.fontSize <= FONT_SIZES[0] ? 0.3 : 1, padding: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  −
                </button>
                <div style={{ flex: 1, position: 'relative', height: 2, background: t.border }}>
                  <div style={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: `${((FONT_SIZES.indexOf(prefs.fontSize)) / (FONT_SIZES.length - 1)) * 100}%`,
                    width: 14, height: 14, borderRadius: '50%', background: '#2c3e50',
                    marginLeft: -7, cursor: 'pointer',
                  }} />
                </div>
                <button
                  onClick={() => {
                    const idx = FONT_SIZES.indexOf(prefs.fontSize);
                    if (idx < FONT_SIZES.length - 1) update({ fontSize: FONT_SIZES[idx + 1] });
                  }}
                  disabled={prefs.fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                  style={{
                    background: 'transparent', border: 'none', color: '#b89c72', fontSize: 20, cursor: 'pointer', opacity: prefs.fontSize >= FONT_SIZES[FONT_SIZES.length - 1] ? 0.3 : 1, padding: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* ── Line height ───────────────────────────────────────────────────── */}
            <div>
              <span style={sectionLabel}>
                Line spacing ({prefs.lineHeight}x)
              </span>
              <div style={{ display: 'flex', gap: 20 }}>
                {[1.4, 1.8, 2.4].map(lh => (
                  <button
                    key={lh}
                    onClick={() => update({ lineHeight: lh })}
                    style={pillBtn(prefs.lineHeight === lh)}
                  >
                    <RadioDot active={prefs.lineHeight === lh} />
                    {lh}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Margins ───────────────────────────────────────────────────────── */}
            <div>
              <span style={sectionLabel}>Margins</span>
              <div style={{ display: 'flex', gap: 20 }}>
                {MARGINS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => update({ margin: m.value })}
                    style={pillBtn(prefs.margin === m.value)}
                  >
                    <RadioDot active={prefs.margin === m.value} />
                    <span style={{ textTransform: 'capitalize' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Reset ─────────────────────────────────────────────────────────── */}
            <button
              onClick={() => update({ fontSize: 100, fontFamily: 'serif', lineHeight: 1.8, margin: 'normal' })}
              style={{
                background: 'transparent',
                border: `1px solid #b89c72`,
                color: '#b89c72',
                padding: '12px 0',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
                width: '100%',
                marginTop: 8,
                fontWeight: 500
              }}
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
