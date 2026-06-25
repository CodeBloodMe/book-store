"use client";

import React from 'react';
import { ReaderTheme, ReaderPrefs, FONT_FAMILIES, READER_THEMES, ThemeId } from '@/lib/reader-themes';

interface ReaderSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  prefs: ReaderPrefs;
  onPrefsChange: (p: ReaderPrefs) => void;
  theme: ReaderTheme;
}

const FONT_OPTIONS: { value: ReaderPrefs['fontFamily']; label: string; preview: string }[] = [
  { value: 'serif', label: 'Serif',       preview: 'Playfair Display' },
  { value: 'sans',  label: 'Sans-serif',  preview: 'Inter' },
  { value: 'mono',  label: 'Mono',        preview: 'Courier New' },
];

const LINE_HEIGHTS: { value: number; label: string }[] = [
  { value: 1.4, label: 'Compact' },
  { value: 1.6, label: 'Normal' },
  { value: 1.8, label: 'Relaxed' },
  { value: 2.2, label: 'Spacious' },
];

const MARGINS: { value: ReaderPrefs['margin']; label: string }[] = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide',   label: 'Wide' },
];

const THEME_ORDER: ThemeId[] = ['light', 'sepia', 'dark', 'amoled'];

const THEME_SWATCHES: Record<ThemeId, { bg: string; dot: string }> = {
  light:  { bg: '#ffffff', dot: '#1a1a2e' },
  sepia:  { bg: '#f4ecd8', dot: '#3b2a1a' },
  dark:   { bg: '#1e1e2e', dot: '#e0ddd5' },
  amoled: { bg: '#000000', dot: '#cccccc' },
};

export default function ReaderSettingsPanel({ open, onClose, prefs, onPrefsChange, theme }: ReaderSettingsPanelProps) {
  const t = theme.chrome;
  const update = (patch: Partial<ReaderPrefs>) => onPrefsChange({ ...prefs, ...patch });

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="toc-drawer-backdrop"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`settings-panel${open ? ' open' : ''}`}
        style={{ background: t.drawerBg, borderLeft: `1px solid ${t.border}` }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: t.text }}>Reading Settings</span>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${t.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px 20px max(40px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Theme */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted, display: 'block', marginBottom: 12 }}>
              Theme
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {THEME_ORDER.map(id => {
                const s = THEME_SWATCHES[id];
                const selected = prefs.themeId === id;
                return (
                  <button
                    key={id}
                    onClick={() => update({ themeId: id })}
                    title={READER_THEMES[id].label}
                    style={{
                      background: s.bg,
                      border: selected ? '2px solid #1f2937' : `2px solid ${t.border}`,
                      borderRadius: 10,
                      height: 48,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      transition: 'border-color 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.dot }} />
                    <span style={{ fontSize: 9, color: s.dot, fontWeight: 600 }}>{READER_THEMES[id].label}</span>
                    {selected && (
                      <div style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderRadius: '50%', background: '#1f2937' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted, display: 'block', marginBottom: 12 }}>
              Font Size — {prefs.fontSize}%
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => update({ fontSize: Math.max(80, prefs.fontSize - 10) })}
                style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.text, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                A-
              </button>
              <input
                type="range" min={80} max={200} step={10}
                value={prefs.fontSize}
                onChange={e => update({ fontSize: Number(e.target.value) })}
                style={{ flex: 1, accentColor: '#1f2937' }}
              />
              <button onClick={() => update({ fontSize: Math.min(200, prefs.fontSize + 10) })}
                style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.text, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                A+
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted, display: 'block', marginBottom: 12 }}>
              Font Style
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FONT_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => update({ fontFamily: f.value })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${prefs.fontFamily === f.value ? '#1f2937' : t.border}`,
                    background: prefs.fontFamily === f.value ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: prefs.fontFamily === f.value ? '#1f2937' : t.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: FONT_FAMILIES[f.value],
                    fontSize: 14,
                    fontWeight: prefs.fontFamily === f.value ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.preview}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted, display: 'block', marginBottom: 12 }}>
              Line Spacing
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {LINE_HEIGHTS.map(lh => (
                <button
                  key={lh.value}
                  onClick={() => update({ lineHeight: lh.value })}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 8,
                    border: `1.5px solid ${prefs.lineHeight === lh.value ? '#1f2937' : t.border}`,
                    background: prefs.lineHeight === lh.value ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: prefs.lineHeight === lh.value ? '#1f2937' : t.text,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted, display: 'block', marginBottom: 12 }}>
              Page Margins
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {MARGINS.map(m => (
                <button
                  key={m.value}
                  onClick={() => update({ margin: m.value })}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 8,
                    border: `1.5px solid ${prefs.margin === m.value ? '#1f2937' : t.border}`,
                    background: prefs.margin === m.value ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: prefs.margin === m.value ? '#1f2937' : t.text,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
