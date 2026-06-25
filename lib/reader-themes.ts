// ─────────────────────────────────────────────────────────────────────────────
// ChapterOne Reader Theme Engine
// Each theme defines styles for both the EPUB content (via epubjs rendition)
// and the reader chrome (toolbar, footer, drawers — React components).
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeId = 'light' | 'sepia' | 'dark' | 'amoled';

export interface ReaderTheme {
  id: ThemeId;
  label: string;
  icon: string;
  // Chrome styles (React components)
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
  // EPUB content styles (injected via rendition.themes.register)
  epubBody: Record<string, string>;
}

export const READER_THEMES: Record<ThemeId, ReaderTheme> = {
  light: {
    id: 'light',
    label: 'Light',
    icon: '☀️',
    chrome: {
      bg: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(0,0,0,0.08)',
      text: '#1a1a2e',
      textMuted: '#6b7280',
      buttonHover: 'rgba(0,0,0,0.06)',
      drawerBg: '#ffffff',
      progressTrack: '#e5e7eb',
      progressFill: '#1f2937',
    },
    epubBody: {
      background: '#ffffff',
      color: '#1a1a2e',
      'line-height': '1.8',
      'font-smooth': 'always',
      '-webkit-font-smoothing': 'antialiased',
    },
  },

  sepia: {
    id: 'sepia',
    label: 'Sepia',
    icon: '📜',
    chrome: {
      bg: 'rgba(244, 236, 216, 0.95)',
      border: 'rgba(139, 90, 43, 0.15)',
      text: '#3b2a1a',
      textMuted: '#8a6a50',
      buttonHover: 'rgba(139, 90, 43, 0.1)',
      drawerBg: '#f4ecd8',
      progressTrack: '#d4b896',
      progressFill: '#a0522d',
    },
    epubBody: {
      background: '#f4ecd8',
      color: '#3b2a1a',
      'line-height': '1.8',
      'font-smooth': 'always',
      '-webkit-font-smoothing': 'antialiased',
    },
  },

  dark: {
    id: 'dark',
    label: 'Dark',
    icon: '🌙',
    chrome: {
      bg: 'rgba(20, 20, 35, 0.95)',
      border: 'rgba(255,255,255,0.08)',
      text: '#e0ddd5',
      textMuted: '#6b7280',
      buttonHover: 'rgba(255,255,255,0.08)',
      drawerBg: '#16162a',
      progressTrack: '#2d2d45',
      progressFill: '#818cf8',
    },
    epubBody: {
      background: '#1e1e2e',
      color: '#e0ddd5',
      'line-height': '1.8',
      'font-smooth': 'always',
      '-webkit-font-smoothing': 'antialiased',
    },
  },

  amoled: {
    id: 'amoled',
    label: 'AMOLED',
    icon: '⬛',
    chrome: {
      bg: 'rgba(0, 0, 0, 0.97)',
      border: 'rgba(255,255,255,0.06)',
      text: '#cccccc',
      textMuted: '#555555',
      buttonHover: 'rgba(255,255,255,0.06)',
      drawerBg: '#000000',
      progressTrack: '#1a1a1a',
      progressFill: '#a5b4fc',
    },
    epubBody: {
      background: '#000000',
      color: '#cccccc',
      'line-height': '1.8',
      'font-smooth': 'always',
      '-webkit-font-smoothing': 'antialiased',
    },
  },
};

// Reading preference types
export interface ReaderPrefs {
  themeId: ThemeId;
  fontSize: number;        // percentage: 80–200
  fontFamily: 'serif' | 'sans' | 'mono';
  lineHeight: number;      // 1.4, 1.6, 1.8, 2.0, 2.4
  margin: 'narrow' | 'normal' | 'wide';
}

export const DEFAULT_PREFS: ReaderPrefs = {
  themeId: 'light',
  fontSize: 120,
  fontFamily: 'serif',
  lineHeight: 1.8,
  margin: 'normal',
};

export const FONT_FAMILIES: Record<ReaderPrefs['fontFamily'], string> = {
  serif:  '"Playfair Display", Georgia, "Times New Roman", serif',
  sans:   '"Inter", system-ui, -apple-system, sans-serif',
  mono:   '"Courier New", Courier, monospace',
};

export const MARGIN_MAP: Record<ReaderPrefs['margin'], string> = {
  narrow: '2%',
  normal: '6%',
  wide:   '12%',
};

export const PREFS_STORAGE_KEY = 'chapterone-reader-prefs';

export function loadPrefs(): ReaderPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ReaderPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}
