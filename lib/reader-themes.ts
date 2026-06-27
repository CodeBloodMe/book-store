// lib/reader-themes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reader configuration constants, theme definitions, and persistence helpers.

export type ThemeId = 'light' | 'sepia' | 'dark' | 'amoled';
export type FontFamily = 'serif' | 'sans' | 'mono';
export type MarginSize = 'narrow' | 'normal' | 'wide';

export interface ReaderTheme {
  id: ThemeId;
  label: string;
  icon: string;
  chrome: {
    bg: string;
    border: string;
    text: string;
    textMuted: string;
    buttonHover: string;
    drawerBg: string;
    progressTrack: string;
    progressFill: string;
  };
  epubBody: Record<string, string>;
}

export interface ReaderPrefs {
  themeId: ThemeId;
  fontSize: number;       // percentage, e.g. 100 = 100%
  fontFamily: FontFamily;
  lineHeight: number;     // e.g. 1.8
  margin: MarginSize;
}

export const DEFAULT_PREFS: ReaderPrefs = {
  themeId: 'light',
  fontSize: 100,
  fontFamily: 'serif',
  lineHeight: 1.8,
  margin: 'normal',
};

// Maps FontFamily key → actual CSS font-family string
export const FONT_FAMILIES: Record<FontFamily, string> = {
  serif: '"Playfair Display", "Georgia", "Times New Roman", serif',
  sans:  '"Inter", "Helvetica Neue", "Arial", sans-serif',
  mono:  '"Courier New", "Courier", monospace',
};

// Maps MarginSize key → CSS padding value for epub body
export const MARGIN_MAP: Record<MarginSize, string> = {
  narrow: '4%',
  normal: '8%',
  wide:   '14%',
};

export const READER_THEMES: Record<ThemeId, ReaderTheme> = {
  light: {
    id: 'light',
    label: 'Light',
    icon: '☀️',
    chrome: {
      bg:            'rgba(255, 255, 255, 0.92)',
      border:        'rgba(0,0,0,0.08)',
      text:          '#1a1a2e',
      textMuted:     '#6b7280',
      buttonHover:   'rgba(0,0,0,0.06)',
      drawerBg:      '#ffffff',
      progressTrack: '#e5e7eb',
      progressFill:  '#6366f1',
    },
    epubBody: {
      background:              '#ffffff',
      color:                   '#1a1a2e',
      'line-height':           '1.8',
      'font-smooth':           'always',
      '-webkit-font-smoothing':'antialiased',
    },
  },

  sepia: {
    id: 'sepia',
    label: 'Sepia',
    icon: '📜',
    chrome: {
      bg:            'rgba(244, 236, 216, 0.95)',
      border:        'rgba(139, 90, 43, 0.15)',
      text:          '#3b2a1a',
      textMuted:     '#8a6a50',
      buttonHover:   'rgba(139, 90, 43, 0.1)',
      drawerBg:      '#f4ecd8',
      progressTrack: '#d4b896',
      progressFill:  '#a0522d',
    },
    epubBody: {
      background:              '#f4ecd8',
      color:                   '#3b2a1a',
      'line-height':           '1.8',
      'font-smooth':           'always',
      '-webkit-font-smoothing':'antialiased',
    },
  },

  dark: {
    id: 'dark',
    label: 'Dark',
    icon: '🌙',
    chrome: {
      bg:            'rgba(20, 20, 35, 0.95)',
      border:        'rgba(255,255,255,0.08)',
      text:          '#e0ddd5',
      textMuted:     '#6b7280',
      buttonHover:   'rgba(255,255,255,0.08)',
      drawerBg:      '#16162a',
      progressTrack: '#2d2d45',
      progressFill:  '#818cf8',
    },
    epubBody: {
      background:              '#1e1e2e',
      color:                   '#e0ddd5',
      'line-height':           '1.8',
      'font-smooth':           'always',
      '-webkit-font-smoothing':'antialiased',
    },
  },

  amoled: {
    id: 'amoled',
    label: 'AMOLED',
    icon: '⬛',
    chrome: {
      bg:            'rgba(0, 0, 0, 0.97)',
      border:        'rgba(255,255,255,0.06)',
      text:          '#cccccc',
      textMuted:     '#555555',
      buttonHover:   'rgba(255,255,255,0.06)',
      drawerBg:      '#000000',
      progressTrack: '#1a1a1a',
      progressFill:  '#a5b4fc',
    },
    epubBody: {
      background:              '#000000',
      color:                   '#cccccc',
      'line-height':           '1.8',
      'font-smooth':           'always',
      '-webkit-font-smoothing':'antialiased',
    },
  },
};

// ─── Persistence ─────────────────────────────────────────────────────────────

const PREFS_KEY = 'chapterone-reader-prefs';

export function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    // Merge with defaults so new fields don't break old saves
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ReaderPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* quota exceeded or SSR */ }
}
