"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ReactReader } from 'react-reader';
import {
  ReaderPrefs, ReaderTheme, ThemeId,
  READER_THEMES, FONT_FAMILIES, MARGIN_MAP,
  loadPrefs, savePrefs, DEFAULT_PREFS,
} from '@/lib/reader-themes';
import ReaderSettingsPanel from '@/components/reader/ReaderSettingsPanel';
import ReaderTOCDrawer from '@/components/reader/ReaderTOCDrawer';
import ReaderFooter from '@/components/reader/ReaderFooter';
import HighlightPopover from '@/components/reader/HighlightPopover';
import ReaderOpeningAnimation from '@/components/reader/ReaderOpeningAnimation';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TocItem { label: string; href: string; subitems?: TocItem[]; }
interface Bookmark { cfi: string; label: string; timestamp: number; }
interface Highlight { cfi: string; text: string; color: string; timestamp: number; }
interface Popover { x: number; y: number; cfi: string; text: string; }

interface EpubReaderClientProps {
  url: string;
  title: string;
  author?: string;
  coverUrl?: string | null;
  genreColor?: string;
  bookId: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function getStorageKey(bookId: string, kind: string) {
  return `chapterone-reader-${kind}-${bookId}`;
}

function loadBookmarks(bookId: string): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(bookId, 'bookmarks')) || '[]');
  } catch { return []; }
}

function saveBookmarks(bookId: string, bookmarks: Bookmark[]) {
  localStorage.setItem(getStorageKey(bookId, 'bookmarks'), JSON.stringify(bookmarks));
}

function loadHighlights(bookId: string): Highlight[] {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(bookId, 'highlights')) || '[]');
  } catch { return []; }
}

function saveHighlights(bookId: string, highlights: Highlight[]) {
  localStorage.setItem(getStorageKey(bookId, 'highlights'), JSON.stringify(highlights));
}

function loadPosition(bookId: string): string | number {
  try {
    const saved = localStorage.getItem(getStorageKey(bookId, 'position'));
    return saved ? saved : 0;
  } catch { return 0; }
}

function savePosition(bookId: string, cfi: string | number) {
  if (typeof cfi === 'string') {
    localStorage.setItem(getStorageKey(bookId, 'position'), cfi);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EpubReaderClient({ url, title, author, coverUrl, genreColor, bookId }: EpubReaderClientProps) {
  // ── Reader Engine refs ────────────────────────────────────────────────────
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [location, setLocation] = useState<string | number>(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [popover, setPopover] = useState<Popover | null>(null);

  // ── UI State ──────────────────────────────────────────────────────────────
  const [showOpening, setShowOpening] = useState(true);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkFlash, setBookmarkFlash] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const theme: ReaderTheme = READER_THEMES[prefs.themeId];
  const t = theme.chrome;

  // ─── Load saved prefs + bookmarks on mount ────────────────────────────────
  useEffect(() => {
    setPrefs(loadPrefs());
    setBookmarks(loadBookmarks(bookId));
    setHighlights(loadHighlights(bookId));
    setLocation(loadPosition(bookId));
  }, [bookId]);

  // ─── Apply preferences to EPUB rendition ─────────────────────────────────
  const applyPrefs = useCallback((r: any, p: ReaderPrefs) => {
    const th = READER_THEMES[p.themeId];
    r.themes.register('chapterone', {
      body: {
        ...th.epubBody,
        'font-family': FONT_FAMILIES[p.fontFamily],
        'font-size': `${p.fontSize}%`,
        'line-height': String(p.lineHeight),
        padding: `0 ${MARGIN_MAP[p.margin]}`,
      },
      p: { margin: '0 0 1em 0' },
      h1: { 'margin-bottom': '0.5em' },
      h2: { 'margin-bottom': '0.5em' },
    });
    r.themes.select('chapterone');
  }, []);

  useEffect(() => {
    if (renditionRef.current) {
      applyPrefs(renditionRef.current, prefs);
      savePrefs(prefs);
    }
  }, [prefs, applyPrefs]);

  // ─── Reapply highlights when chapter changes ──────────────────────────────
  const applyHighlights = useCallback((r: any, hlList: Highlight[]) => {
    // Inject highlight CSS styles directly into the epub iframe
    // (CSS in reader.css can't reach inside the iframe)
    const HIGHLIGHT_CSS = `
      .epub-highlight-yellow { background: rgba(255, 220, 0, 0.45) !important; }
      .epub-highlight-green  { background: rgba(52, 211, 153, 0.40) !important; }
      .epub-highlight-blue   { background: rgba(96, 165, 250, 0.40) !important; }
      .epub-highlight-pink   { background: rgba(244, 114, 182, 0.40) !important; }
    `;
    try {
      r.getContents()?.forEach((c: any) => {
        const doc = c.document;
        if (doc && !doc.getElementById('chapterone-highlight-styles')) {
          const style = doc.createElement('style');
          style.id = 'chapterone-highlight-styles';
          style.textContent = HIGHLIGHT_CSS;
          doc.head.appendChild(style);
        }
      });
    } catch { /* ignore */ }

    const HIGHLIGHT_CLASSES: Record<string, string> = {
      yellow: 'epub-highlight-yellow',
      green:  'epub-highlight-green',
      blue:   'epub-highlight-blue',
      pink:   'epub-highlight-pink',
    };
    const HIGHLIGHT_STYLES: Record<string, any> = {
      yellow: { fill: '#fbbf24', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
      green:  { fill: '#34d399', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
      blue:   { fill: '#60a5fa', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
      pink:   { fill: '#f472b6', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
    };

    hlList.forEach(hl => {
      try {
        r.annotations.remove(hl.cfi, 'highlight');
        r.annotations.highlight(
          hl.cfi, {}, (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.target.getBoundingClientRect();
            const iframe = document.querySelector('iframe');
            if (!iframe) return;
            const iframeRect = iframe.getBoundingClientRect();
            setPopover({
              x: iframeRect.left + rect.left + rect.width / 2,
              y: iframeRect.top + rect.top,
              cfi: hl.cfi,
              text: hl.text,
            });
          },
          HIGHLIGHT_CLASSES[hl.color] || 'epub-highlight-yellow',
          HIGHLIGHT_STYLES[hl.color] || HIGHLIGHT_STYLES.yellow
        );
      } catch { /* ignore if chapter not in view */ }
    });
  }, []);

  // ─── getRendition — called once when epub.js is ready ────────────────────
  const getRendition = useCallback((rendition: any) => {
    renditionRef.current = rendition;
    applyPrefs(rendition, prefs);
    applyHighlights(rendition, highlights);

    // ── Text selection → show highlight popover ──────────────────────────
    rendition.on('selected', (cfiRange: string, contents: any) => {
      try {
        const selection = contents.window.getSelection();
        if (!selection || selection.toString().trim().length < 3) return;
        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        // Map iframe coords to viewport
        const iframe = document.querySelector('iframe');
        if (!iframe) return;
        const iframeRect = iframe.getBoundingClientRect();
        setPopover({
          x: iframeRect.left + rect.left + rect.width / 2,
          y: iframeRect.top + rect.top,
          cfi: cfiRange,
          text,
        });
      } catch { /* ignore */ }
    });

    // ── Clear popover when clicking without selection ─────────────────────
    rendition.on('click', (e: any) => {
      const target = e?.target?.tagName?.toLowerCase();
      if (target === 'svg' || target === 'rect' || target === 'path' || target === 'mark') {
        return;
      }
      setPopover(null);
    });

    // ── Reinject highlight CSS on each chapter change ─────────────────────
    rendition.on('rendered', () => {
      const HIGHLIGHT_CSS = `
        .epub-highlight-yellow { background: rgba(255, 220, 0, 0.45) !important; }
        .epub-highlight-green  { background: rgba(52, 211, 153, 0.40) !important; }
        .epub-highlight-blue   { background: rgba(96, 165, 250, 0.40) !important; }
        .epub-highlight-pink   { background: rgba(244, 114, 182, 0.40) !important; }
      `;
      try {
        rendition.getContents()?.forEach((c: any) => {
          const doc = c.document;
          if (doc && !doc.getElementById('chapterone-highlight-styles')) {
            const style = doc.createElement('style');
            style.id = 'chapterone-highlight-styles';
            style.textContent = HIGHLIGHT_CSS;
            doc.head.appendChild(style);
          }
        });
      } catch { /* ignore */ }
    });

    // ── Generate Locations for Page Numbers ───────────────────────────────
    rendition.book.ready.then(() => {
      // 1600 characters per logical page is a better approximation for desktop/tablet screens
      return rendition.book.locations.generate(1600);
    }).then(() => {
      setTotalPages(rendition.book.locations.total);
      // Update current page if already relocated
      const loc = rendition.currentLocation();
      if (loc?.start) {
        setCurrentPage(rendition.book.locations.locationFromCfi(loc.start.cfi));
      }
    }).catch(console.error);

    // ── Page change event ─────────────────────────────────────────────────
    rendition.on('relocated', (location: any) => {
      if (location?.start) {
        if (rendition.book.locations && rendition.book.locations.total > 0) {
          setCurrentPage(rendition.book.locations.locationFromCfi(location.start.cfi));
          setTotalPages(rendition.book.locations.total);
        } else {
          setCurrentPage(location.start.displayed?.page || 0);
          setTotalPages(location.start.displayed?.total || 0);
        }
      }
    });
  }, [prefs, highlights, applyPrefs, applyHighlights]);

  // ─── TOC callback ─────────────────────────────────────────────────────────
  const tocChanged = useCallback((tocItems: TocItem[]) => {
    setToc(tocItems);
  }, []);

  // ─── Auto-hide toolbar on inactivity ─────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setToolbarHidden(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setToolbarHidden(true), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHideTimer]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const r = renditionRef.current;
      // Note: Arrow key navigation (← →) is handled natively by epubjs.
      // Adding our own listener causes double-page skips.
      switch (e.key) {
        case 'Escape':
          if (showSettings) { setShowSettings(false); break; }
          if (showTOC) { setShowTOC(false); break; }
          window.history.back();
          break;
        case 't': case 'T':
          if (!showSettings) setShowTOC(prev => !prev);
          break;
        case 'b': case 'B': handleBookmark(); break;
        case 's': case 'S':
          if (!showTOC) setShowSettings(prev => !prev);
          break;
      }
      resetHideTimer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showSettings, showTOC, resetHideTimer]);

  // ─── Bookmark logic ───────────────────────────────────────────────────────
  const handleBookmark = useCallback(() => {
    if (!renditionRef.current) return;
    const cfi = typeof location === 'string' ? location : '';
    if (!cfi) return;
    const exists = bookmarks.find(b => b.cfi === cfi);
    let updated: Bookmark[];
    if (exists) {
      updated = bookmarks.filter(b => b.cfi !== cfi);
    } else {
      updated = [...bookmarks, { cfi, label: `Page ${currentPage}`, timestamp: Date.now() }];
    }
    setBookmarks(updated);
    saveBookmarks(bookId, updated);
    setIsBookmarked(!exists);
    setBookmarkFlash(true);
    setTimeout(() => setBookmarkFlash(false), 600);
  }, [location, bookmarks, bookId, currentPage]);

  // ─── Check if current page is bookmarked ─────────────────────────────────
  useEffect(() => {
    if (typeof location === 'string') {
      setIsBookmarked(bookmarks.some(b => b.cfi === location));
    }
  }, [location, bookmarks]);

  // ─── Highlight logic ──────────────────────────────────────────────────────
  const handleHighlight = useCallback((color: string) => {
    if (!popover || !renditionRef.current) return;

    // If already highlighted at this CFI, remove the old one first (color change)
    const existingIdx = highlights.findIndex(h => h.cfi === popover.cfi);
    let baseList = highlights;
    if (existingIdx !== -1) {
      try { renditionRef.current.annotations.remove(popover.cfi, 'highlight'); } catch {}
      baseList = highlights.filter(h => h.cfi !== popover.cfi);
    }

    const newHl: Highlight = {
      cfi: popover.cfi,
      text: popover.text,
      color,
      timestamp: Date.now(),
    };
    const HIGHLIGHT_CLASSES: Record<string, string> = {
      yellow: 'epub-highlight-yellow',
      green:  'epub-highlight-green',
      blue:   'epub-highlight-blue',
      pink:   'epub-highlight-pink',
    };
    const HIGHLIGHT_STYLES: Record<string, any> = {
      yellow: { fill: '#fbbf24', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
      green:  { fill: '#34d399', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
      blue:   { fill: '#60a5fa', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
      pink:   { fill: '#f472b6', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
    };
    try {
      renditionRef.current.annotations.highlight(
        popover.cfi, {}, (e: any) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.target.getBoundingClientRect();
          const iframe = document.querySelector('iframe');
          if (!iframe) return;
          const iframeRect = iframe.getBoundingClientRect();
          setPopover({
            x: iframeRect.left + rect.left + rect.width / 2,
            y: iframeRect.top + rect.top,
            cfi: popover.cfi, // use the captured cfi
            text: popover.text, // use the captured text
          });
        },
        HIGHLIGHT_CLASSES[color] || 'epub-highlight-yellow',
        HIGHLIGHT_STYLES[color] || HIGHLIGHT_STYLES.yellow
      );
    } catch { /* ignore */ }
    const updated = [...baseList, newHl];
    setHighlights(updated);
    saveHighlights(bookId, updated);
    setPopover(null);
    renditionRef.current?.getContents()?.forEach((c: any) => c.window.getSelection()?.removeAllRanges());
  }, [popover, highlights, bookId]);

  // ─── Erase highlight (from popover) ────────────────────────────────────────
  const handleEraseHighlight = useCallback(() => {
    if (!popover || !renditionRef.current) return;
    try { renditionRef.current.annotations.remove(popover.cfi, 'highlight'); } catch {}
    const updated = highlights.filter(h => h.cfi !== popover.cfi);
    setHighlights(updated);
    saveHighlights(bookId, updated);
    setPopover(null);
  }, [popover, highlights, bookId]);

  // ─── Delete highlight (from TOC drawer) ────────────────────────────────────
  const handleDeleteHighlight = useCallback((cfi: string) => {
    try { renditionRef.current?.annotations.remove(cfi, 'highlight'); } catch {}
    const updated = highlights.filter(h => h.cfi !== cfi);
    setHighlights(updated);
    saveHighlights(bookId, updated);
  }, [highlights, bookId]);

  const handleCopy = useCallback(() => {
    if (popover?.text) navigator.clipboard.writeText(popover.text).catch(() => {});
  }, [popover]);

  // ─── Navigate to CFI ──────────────────────────────────────────────────────
  const navigateToCfi = useCallback((cfi: string) => {
    renditionRef.current?.display(cfi);
  }, []);

  // ─── Save reading position ────────────────────────────────────────────────
  const handleLocationChange = useCallback((cfi: string) => {
    setLocation(cfi);
    savePosition(bookId, cfi);
    setPopover(null);
  }, [bookId]);

  // ─── Toolbar icon button style ────────────────────────────────────────────
  const iconBtn = (active = false): React.CSSProperties => ({
    width: 36,
    height: 36,
    borderRadius: 8,
    background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
    border: `1px solid ${active ? '#1f2937' : t.border}`,
    color: active ? '#1f2937' : t.text,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    transition: 'all 0.15s ease',
    flexShrink: 0,
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="reader-shell"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999, // Cover the Navbar + Footer from root layout
        background: theme.epubBody.background,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'background 0.4s ease',
      }}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* ── Opening Animation ─────────────────────────────────────────────── */}
      {showOpening && (
        <ReaderOpeningAnimation
          coverUrl={coverUrl}
          theme={theme}
          onComplete={() => setShowOpening(false)}
        />
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div
        className="reader-toolbar"
        style={{
          height: 56,
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 16,
          gap: 8,
          zIndex: 30,
          flexShrink: 0,
          opacity: toolbarHidden ? 0 : 1,
          transform: toolbarHidden ? 'translateY(-8px)' : 'translateY(0)',
          pointerEvents: toolbarHidden ? 'none' : 'auto',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        {/* TOC button */}
        <button style={iconBtn(showTOC)} onClick={() => setShowTOC(v => !v)} title="Table of Contents (T)">
          ☰
        </button>

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          style={{ ...iconBtn(), fontSize: 13, paddingInline: 12, width: 'auto', gap: 6, display: 'flex', alignItems: 'center' }}
          title="Close Reader (Esc)"
        >
          ← <span className="exit-text">Exit</span>
        </button>

        {/* Title & Page Numbers */}
        <div className="title-container" style={{ flex: 1, textAlign: 'center', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: t.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
            {title}
          </div>
          <div style={{ color: t.textMuted, fontSize: 11, display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
            {author && <span>{author}</span>}
            {author && totalPages > 0 && <span>•</span>}
            {totalPages > 0 && <span>Loc {currentPage > 0 ? currentPage : 1} of {totalPages}</span>}
          </div>
        </div>

        {/* Bookmark */}
        <button
          style={{ ...iconBtn(isBookmarked), fontSize: 18, transform: bookmarkFlash ? 'scale(1.3)' : 'scale(1)', transition: 'all 0.2s ease' }}
          onClick={handleBookmark}
          title="Bookmark this page (B)"
        >
          {isBookmarked ? '🔖' : '🔗'}
        </button>

        {/* Settings */}
        <button style={iconBtn(showSettings)} onClick={() => setShowSettings(v => !v)} title="Reading settings (S)">
          ⚙
        </button>
      </div>

      {/* ── Reader Content ────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          opacity: showOpening ? 0 : 1,
          transition: 'opacity 0.5s ease 0.2s',
        }}
      >
        <ReactReader
          url={url}
          location={location}
          locationChanged={handleLocationChange}
          getRendition={getRendition}
          tocChanged={tocChanged}
          showToc={false}
          epubInitOptions={{ openAs: 'epub' }}
          epubOptions={{
            flow: 'paginated',
            manager: 'continuous',
            spread: 'none',
          }}
        />

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <ReaderFooter
          hidden={toolbarHidden}
          theme={theme}
          currentPage={currentPage}
          totalPages={totalPages}
          genreColor={genreColor}
        />

        {/* ── Bookmark Ribbon ──────────────────────────────────────────────── */}
        {isBookmarked && (
          <div
            className="bookmark-ribbon"
            style={{ background: genreColor || '#1f2937', position: 'absolute', top: 0, right: 24, zIndex: 10 }}
          />
        )}
      </div>

      {/* ── Highlight Popover ────────────────────────────────────────────── */}
      {popover && (
        <HighlightPopover
          x={popover.x}
          y={popover.y}
          theme={theme}
          onHighlight={handleHighlight}
          onCopy={handleCopy}
          onClose={() => setPopover(null)}
          existingColor={highlights.find(h => h.cfi === popover.cfi)?.color}
          onErase={handleEraseHighlight}
        />
      )}

      {/* ── TOC Drawer ───────────────────────────────────────────────────── */}
      <ReaderTOCDrawer
        open={showTOC}
        onClose={() => setShowTOC(false)}
        toc={toc}
        currentLocation={location}
        theme={theme}
        bookTitle={title}
        coverUrl={coverUrl}
        onNavigate={(href) => setLocation(href)}
        bookmarks={bookmarks}
        highlights={highlights}
        onDeleteBookmark={(cfi) => {
          const updated = bookmarks.filter(b => b.cfi !== cfi);
          setBookmarks(updated);
          saveBookmarks(bookId, updated);
        }}
        onDeleteHighlight={handleDeleteHighlight}
        onNavigateToCfi={(cfi) => setLocation(cfi)}
        totalPages={totalPages}
        onJumpToLocation={(locNumber) => {
          if (renditionRef.current?.book?.locations) {
            const cfi = renditionRef.current.book.locations.cfiFromLocation(locNumber);
            if (cfi) setLocation(cfi);
          }
        }}
      />

      {/* ── Settings Panel ───────────────────────────────────────────────── */}
      <ReaderSettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        prefs={prefs}
        onPrefsChange={(p) => { setPrefs(p); savePrefs(p); }}
        theme={theme}
      />
    </div>
  );
}
