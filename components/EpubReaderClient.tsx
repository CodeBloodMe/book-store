// components/EpubReaderClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Production-ready EPUB reader client.
//
// Bugs fixed vs original:
//  1. handleBookmark stale-closure in keydown effect → extracted to useRef-stable callback
//  2. highlights lost on chapter navigation → applyHighlights called inside 'rendered' event
//  3. document.querySelector('iframe') → use rendition.manager.container for correct iframe
//  4. Initial location=0 (number) persisted as nothing → proper guard, only persist strings
//  5. Settings panel was empty stub → fully implemented controls
//  6. getRendition dep array included `highlights` snapshot → removed, use ref for highlights
//  7. Toolbar hide timer created anew each render → stable via ref, not recreated
//  8. popover position off when page scrolled → use iframe-relative coords correctly
//  9. FONT_FAMILIES / MARGIN_MAP / loadPrefs / savePrefs / DEFAULT_PREFS were missing → defined in reader-themes.ts
// 10. ReaderTOCDrawer highlight colour always yellow → fixed in TOC drawer component

"use client";

import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import { ReactReader } from 'react-reader';
import {
  ReaderPrefs, ReaderTheme, ThemeId,
  READER_THEMES, FONT_FAMILIES, MARGIN_MAP,
  loadPrefs, savePrefs, DEFAULT_PREFS,
} from '@/lib/reader-themes';
import ReaderSettingsPanel   from '@/components/reader/ReaderSettingsPanel';
import ReaderTOCDrawer       from '@/components/reader/ReaderTOCDrawer';
import ReaderFooter          from '@/components/reader/ReaderFooter';
import HighlightPopover      from '@/components/reader/HighlightPopover';
import ReaderOpeningAnimation from '@/components/reader/ReaderOpeningAnimation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TocItem    { label: string; href: string; subitems?: TocItem[]; }
interface Bookmark   { cfi: string; label: string; timestamp: number; }
interface Highlight  { cfi: string; text: string; color: string; timestamp: number; }
interface Popover    { x: number; y: number; cfi: string; text: string; }

interface EpubReaderClientProps {
  url: string;
  title: string;
  author?: string;
  coverUrl?: string | null;
  genreColor?: string;
  bookId: string;
}

// ─── Highlight colours ────────────────────────────────────────────────────────

const HIGHLIGHT_CSS = `
  .epub-hl-yellow { background: rgba(255,220,0,0.45)   !important; cursor: pointer; }
  .epub-hl-green  { background: rgba(52,211,153,0.40)  !important; cursor: pointer; }
  .epub-hl-blue   { background: rgba(96,165,250,0.40)  !important; cursor: pointer; }
  .epub-hl-pink   { background: rgba(244,114,182,0.40) !important; cursor: pointer; }
`;
const HIGHLIGHT_CLASS: Record<string, string> = {
  yellow: 'epub-hl-yellow',
  green:  'epub-hl-green',
  blue:   'epub-hl-blue',
  pink:   'epub-hl-pink',
};
const HIGHLIGHT_SVG_STYLE: Record<string, Record<string, string>> = {
  yellow: { fill: '#fbbf24', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
  green:  { fill: '#34d399', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
  blue:   { fill: '#60a5fa', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
  pink:   { fill: '#f472b6', 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply' },
};

// ─── Local-storage helpers ────────────────────────────────────────────────────

function storageKey(bookId: string, kind: string) {
  return `chapterone-reader-${kind}-${bookId}`;
}
function loadBookmarks(bookId: string): Bookmark[] {
  try { return JSON.parse(localStorage.getItem(storageKey(bookId, 'bookmarks')) ?? '[]'); }
  catch { return []; }
}
function saveBookmarks(bookId: string, bms: Bookmark[]) {
  localStorage.setItem(storageKey(bookId, 'bookmarks'), JSON.stringify(bms));
}
function loadHighlights(bookId: string): Highlight[] {
  try { return JSON.parse(localStorage.getItem(storageKey(bookId, 'highlights')) ?? '[]'); }
  catch { return []; }
}
function saveHighlights(bookId: string, hls: Highlight[]) {
  localStorage.setItem(storageKey(bookId, 'highlights'), JSON.stringify(hls));
}
function loadPosition(bookId: string): string | null {
  try { return localStorage.getItem(storageKey(bookId, 'position')); }
  catch { return null; }
}
function savePosition(bookId: string, cfi: string) {
  localStorage.setItem(storageKey(bookId, 'position'), cfi);
}

// ─── Popover position helper ──────────────────────────────────────────────────
// Gets the screen-space coordinates of a selection rect inside the epub iframe.

function getIframeScreenRect(iframe: HTMLIFrameElement | null, rect: DOMRect) {
  if (!iframe) return { x: rect.left + rect.width / 2, y: rect.top };
  const fr = iframe.getBoundingClientRect();
  return {
    x: fr.left + rect.left + rect.width / 2,
    y: fr.top  + rect.top,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EpubReaderClient({
  url, title, author, coverUrl, genreColor, bookId,
}: EpubReaderClientProps) {

  // Refs that must survive re-renders without causing them
  const renditionRef    = useRef<any>(null);
  const highlightsRef   = useRef<Highlight[]>([]);   // always current, no closure issues
  const bookmarksRef    = useRef<Bookmark[]>([]);
  const locationRef     = useRef<string>('');
  const currentPageRef  = useRef<number>(0);
  const hideTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state
  const [prefs,         setPrefs]         = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [location,      setLocation]      = useState<string | number>(0);
  const [toc,           setToc]           = useState<TocItem[]>([]);
  const [currentPage,   setCurrentPage]   = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [bookmarks,     setBookmarks]     = useState<Bookmark[]>([]);
  const [highlights,    setHighlights]    = useState<Highlight[]>([]);
  const [popover,       setPopover]       = useState<Popover | null>(null);
  const [showOpening,   setShowOpening]   = useState(true);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [showTOC,       setShowTOC]       = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const [isBookmarked,  setIsBookmarked]  = useState(false);
  const [bookmarkFlash, setBookmarkFlash] = useState(false);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInput,     setPageInput]     = useState('');

  const theme: ReaderTheme = READER_THEMES[prefs.themeId];
  const t = theme.chrome;

  // Keep refs in sync with state (avoids stale closures in event callbacks)
  useEffect(() => { highlightsRef.current  = highlights;  }, [highlights]);
  useEffect(() => { bookmarksRef.current   = bookmarks;   }, [bookmarks]);
  useEffect(() => { locationRef.current    = typeof location === 'string' ? location : ''; }, [location]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // ── Initial load from localStorage ─────────────────────────────────────────
  useEffect(() => {
    const p    = loadPrefs();
    const bms  = loadBookmarks(bookId);
    const hls  = loadHighlights(bookId);
    const pos  = loadPosition(bookId);
    setPrefs(p);
    setBookmarks(bms);
    setHighlights(hls);
    highlightsRef.current = hls;
    bookmarksRef.current  = bms;
    if (pos) setLocation(pos);
  }, [bookId]);

  // ── Inject highlight stylesheet into every iframe document ─────────────────
  const injectHighlightStyles = useCallback((rendition: any) => {
    try {
      rendition.getContents()?.forEach((c: any) => {
        const doc = c?.document;
        if (!doc) return;
        if (!doc.getElementById('co-hl-styles')) {
          const style = doc.createElement('style');
          style.id = 'co-hl-styles';
          style.textContent = HIGHLIGHT_CSS;
          doc.head.appendChild(style);
        }
      });
    } catch { /* chapter not loaded yet */ }
  }, []);

  // ── Re-draw all highlights on the current rendition ─────────────────────────
  const applyHighlights = useCallback((rendition: any, hls: Highlight[]) => {
    injectHighlightStyles(rendition);
    hls.forEach(hl => {
      try {
        rendition.annotations.remove(hl.cfi, 'highlight');
        rendition.annotations.highlight(
          hl.cfi,
          {},
          (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const rect   = target.getBoundingClientRect();
            const iframe  = rendition.manager?.container?.querySelector('iframe') as HTMLIFrameElement | null;
            const pos    = getIframeScreenRect(iframe, rect);
            setPopover({ ...pos, cfi: hl.cfi, text: hl.text });
          },
          HIGHLIGHT_CLASS[hl.color]    || 'epub-hl-yellow',
          HIGHLIGHT_SVG_STYLE[hl.color] || HIGHLIGHT_SVG_STYLE.yellow,
        );
      } catch { /* CFI not in current chapter – will be applied when chapter loads */ }
    });
  }, [injectHighlightStyles]);

  // ── Apply reader preferences to epub theme ──────────────────────────────────
  const applyPrefs = useCallback((rendition: any, p: ReaderPrefs) => {
    const th = READER_THEMES[p.themeId];
    rendition.themes.register('chapterone', {
      body: {
        ...th.epubBody,
        'font-family': FONT_FAMILIES[p.fontFamily],
        'font-size':   `${p.fontSize}%`,
        'line-height': String(p.lineHeight),
        padding:       `0 ${MARGIN_MAP[p.margin]}`,
      },
      p:  { margin: '0 0 1em 0' },
      h1: { 'margin-bottom': '0.5em' },
      h2: { 'margin-bottom': '0.5em' },
    });
    rendition.themes.select('chapterone');
  }, []);

  // Re-apply prefs whenever they change (after initial load)
  useEffect(() => {
    if (renditionRef.current) {
      applyPrefs(renditionRef.current, prefs);
      savePrefs(prefs);
    }
  }, [prefs, applyPrefs]);

  // ── getRendition – called once when react-reader mounts ─────────────────────
  // IMPORTANT: do NOT put `highlights` in the dep array here; use highlightsRef instead.
  const getRendition = useCallback((rendition: any) => {
    renditionRef.current = rendition;

    applyPrefs(rendition, prefs);
    // Use ref so we always get current highlights even though this callback
    // is only created once (avoids stale closure)
    applyHighlights(rendition, highlightsRef.current);

    // ── Text selection → popover ─────────────────────────────────────────────
    rendition.on('selected', (cfiRange: string, contents: any) => {
      try {
        const sel = contents?.window?.getSelection();
        if (!sel || sel.toString().trim().length < 3) return;
        const text  = sel.toString().trim();
        const range = sel.getRangeAt(0);
        const rect  = range.getBoundingClientRect();
        const iframe = rendition.manager?.container?.querySelector('iframe') as HTMLIFrameElement | null;
        const pos   = getIframeScreenRect(iframe, rect);
        setPopover({ ...pos, cfi: cfiRange, text });
      } catch { /* ignore */ }
    });

    // ── Click outside annotation → dismiss popover ───────────────────────────
    rendition.on('click', (e: any) => {
      const tag = (e?.target?.tagName ?? '').toLowerCase();
      if (['svg', 'rect', 'path', 'mark'].includes(tag)) return;
      setPopover(null);
    });

    // ── On each chapter render: re-inject styles & re-draw highlights ─────────
    // This is the KEY fix: highlights were lost on chapter navigation in the original.
    rendition.on('rendered', () => {
      injectHighlightStyles(rendition);
      applyHighlights(rendition, highlightsRef.current);
    });

    // ── Generate locations for progress tracking ──────────────────────────────
    rendition.book.ready
      .then(() => rendition.book.locations.generate(1600))
      .then(() => {
        setTotalPages(rendition.book.locations.total);
        const loc = rendition.currentLocation();
        if (loc?.start) {
          setCurrentPage(rendition.book.locations.locationFromCfi(loc.start.cfi));
        }
      })
      .catch(console.error);

    // ── Track page position ───────────────────────────────────────────────────
    rendition.on('relocated', (loc: any) => {
      if (!loc?.start) return;
      const locs = rendition.book.locations;
      if (locs?.total > 0) {
        const pg = locs.locationFromCfi(loc.start.cfi);
        setCurrentPage(pg);
        setTotalPages(locs.total);
      } else {
        setCurrentPage(loc.start.displayed?.page   ?? 0);
        setTotalPages (loc.start.displayed?.total  ?? 0);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty: rendition object is stable; refs keep data current.

  // ── TOC ──────────────────────────────────────────────────────────────────────
  const tocChanged = useCallback((items: TocItem[]) => setToc(items), []);

  // ── Toolbar auto-hide ────────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setToolbarHidden(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    // User requested to disable auto-hide:
    // hideTimerRef.current = setTimeout(() => setToolbarHidden(true), 3500);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [resetHideTimer]);

  // ── Bookmark ─────────────────────────────────────────────────────────────────
  // Uses refs so the keyboard handler (which is created once) always sees fresh data.
  const handleBookmark = useCallback(() => {
    const cfi = locationRef.current;
    if (!cfi || !renditionRef.current) return;

    const exists  = bookmarksRef.current.find(b => b.cfi === cfi);
    const updated = exists
      ? bookmarksRef.current.filter(b => b.cfi !== cfi)
      : [...bookmarksRef.current, { cfi, label: `Loc ${currentPageRef.current}`, timestamp: Date.now() }];

    bookmarksRef.current = updated;
    setBookmarks(updated);
    saveBookmarks(bookId, updated);
    setIsBookmarked(!exists);
    setBookmarkFlash(true);
    setTimeout(() => setBookmarkFlash(false), 600);
  }, [bookId]);

  useEffect(() => {
    if (typeof location === 'string') {
      setIsBookmarked(bookmarks.some(b => b.cfi === location));
    }
  }, [location, bookmarks]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'Escape':
          if (showSettings) { setShowSettings(false); return; }
          if (showTOC)      { setShowTOC(false);      return; }
          window.history.back();
          return;
        case 't': case 'T':
          if (!showSettings) setShowTOC(v => !v);
          break;
        case 'b': case 'B':
          handleBookmark();
          break;
        case 's': case 'S':
          if (!showTOC) setShowSettings(v => !v);
          break;
      }
      resetHideTimer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSettings, showTOC, handleBookmark, resetHideTimer]);

  // Helper to detect if a new selection overlaps an existing highlight
  const getOverlappingHighlight = useCallback((p: Popover | null, hls: Highlight[]) => {
    if (!p) return undefined;
    
    // 1. Exact match
    let match = hls.find(h => h.cfi === p.cfi);
    if (match) return match;

    // 2. DOM Range intersection match (Robust for partial overlaps)
    const rendition = renditionRef.current;
    if (rendition) {
      try {
        const contents = rendition.getContents()[0];
        if (contents) {
          const sel = contents.window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const selRange = sel.getRangeAt(0);
            match = hls.find(h => {
              try {
                // Returns a DOM Range for the highlight CFI
                const hlRange = rendition.getRange(h.cfi);
                if (!hlRange) return false;
                
                // Check if selRange overlaps hlRange
                // END_TO_START (3): compares selRange.end to hlRange.start. selRange.end >= hlRange.start -> returns 1 or 0
                // START_TO_END (1): compares selRange.start to hlRange.end. selRange.start <= hlRange.end -> returns -1 or 0
                const startBeforeEnd = selRange.compareBoundaryPoints(3, hlRange) <= 0;
                const endAfterStart = selRange.compareBoundaryPoints(1, hlRange) >= 0;
                
                return startBeforeEnd && endAfterStart;
              } catch (e) {
                return false;
              }
            });
            if (match) return match;
          }
        }
      } catch (e) {
        /* ignore DOM errors */
      }
    }

    // 3. Fuzzy Text match (Fallback for identical full texts in same chapter)
    return hls.find(h => 
      h.cfi.split('!')[0] === p.cfi.split('!')[0] && 
      (h.text.includes(p.text) || p.text.includes(h.text))
    );
  }, []);

  // ── Highlight actions ────────────────────────────────────────────────────────
  const handleHighlight = useCallback((color: string) => {
    if (!popover || !renditionRef.current) return;

    // Remove any existing annotation for this CFI or overlapping CFI
    const target = getOverlappingHighlight(popover, highlightsRef.current);
    if (target) {
      try { renditionRef.current.annotations.remove(target.cfi, 'highlight'); } catch {}
    }
    const baseList = target ? highlightsRef.current.filter(h => h.cfi !== target.cfi) : highlightsRef.current;

    const newHl: Highlight = {
      cfi:       popover.cfi,
      text:      popover.text,
      color,
      timestamp: Date.now(),
    };

    // Draw the new annotation
    try {
      renditionRef.current.annotations.highlight(
        popover.cfi,
        {},
        (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const rect   = target.getBoundingClientRect();
          const iframe  = renditionRef.current?.manager?.container?.querySelector('iframe') as HTMLIFrameElement | null;
          const pos    = getIframeScreenRect(iframe, rect);
          setPopover({ ...pos, cfi: popover.cfi, text: popover.text });
        },
        HIGHLIGHT_CLASS[color]    || 'epub-hl-yellow',
        HIGHLIGHT_SVG_STYLE[color] || HIGHLIGHT_SVG_STYLE.yellow,
      );
    } catch { /* chapter might have changed */ }

    const updated = [...baseList, newHl];
    highlightsRef.current = updated;
    setHighlights(updated);
    saveHighlights(bookId, updated);
    setPopover(null);
    // Clear text selection
    try {
      renditionRef.current.getContents()?.forEach((c: any) =>
        c?.window?.getSelection()?.removeAllRanges()
      );
    } catch {}
  }, [popover, bookId]);

  const handleEraseHighlight = useCallback(() => {
    if (!popover || !renditionRef.current) return;
    const target = getOverlappingHighlight(popover, highlightsRef.current);
    
    if (target) {
      try { renditionRef.current.annotations.remove(target.cfi, 'highlight'); } catch {}
      const updated = highlightsRef.current.filter(h => h.cfi !== target.cfi);
      highlightsRef.current = updated;
      setHighlights(updated);
      saveHighlights(bookId, updated);
    }
    setPopover(null);
    // Clear text selection
    try {
      renditionRef.current.getContents()?.forEach((c: any) =>
        c?.window?.getSelection()?.removeAllRanges()
      );
    } catch {}
  }, [popover, bookId]);

  const handleDeleteHighlight = useCallback((cfi: string) => {
    try { renditionRef.current?.annotations.remove(cfi, 'highlight'); } catch {}
    const updated = highlightsRef.current.filter(h => h.cfi !== cfi);
    highlightsRef.current = updated;
    setHighlights(updated);
    saveHighlights(bookId, updated);
  }, [bookId]);

  // ── Copy selection text ──────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (popover?.text) navigator.clipboard.writeText(popover.text).catch(() => {});
  }, [popover]);

  // ── Location change (user navigates a page) ──────────────────────────────────
  const handleLocationChange = useCallback((cfi: string) => {
    setLocation(cfi);
    setPopover(null);
    if (cfi) savePosition(bookId, cfi);
  }, [bookId]);

  // ── Navigate to a CFI from bookmark/highlight list ───────────────────────────
  const navigateToCfi = useCallback((cfi: string) => {
    renditionRef.current?.display(cfi);
  }, []);

  // ── Style helpers ─────────────────────────────────────────────────────────────
  const iconBtn = (active = false): React.CSSProperties => ({
    width:           36,
    height:          36,
    borderRadius:    8,
    background:      active ? 'rgba(99,102,241,0.2)' : 'transparent',
    border:          `1px solid ${active ? '#6366f1' : t.border}`,
    color:           active ? '#6366f1' : t.text,
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    fontSize:        16,
    transition:      'all 0.15s ease',
    flexShrink:      0,
    padding:         0,
  });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     9999,
        background: theme.epubBody.background,
        display:    'flex',
        flexDirection: 'column',
        overflow:   'hidden',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Book-opening animation */}
      {showOpening && (
        <ReaderOpeningAnimation
          coverUrl={coverUrl}
          theme={theme}
          onComplete={() => setShowOpening(false)}
        />
      )}

      {/* ── Top toolbar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          height:        56,
          background:    t.bg,
          borderBottom:  `1px solid ${t.border}`,
          backdropFilter:'blur(16px)',
          display:       'flex',
          alignItems:    'center',
          paddingInline: 16,
          gap:           8,
          zIndex:        30,
          flexShrink:    0,
          opacity:       toolbarHidden ? 0 : 1,
          transform:     toolbarHidden ? 'translateY(-8px)' : 'translateY(0)',
          pointerEvents: toolbarHidden ? 'none' : 'auto',
          transition:    'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        <button
          style={iconBtn(showTOC)}
          onClick={() => setShowTOC(v => !v)}
          title="Table of Contents (T)"
          aria-label="Toggle table of contents"
        >
          ☰
        </button>

        <button
          onClick={() => window.history.back()}
          style={{
            ...iconBtn(),
            fontSize:     13,
            paddingInline:12,
            width:        'auto',
            gap:          6,
          }}
          title="Close Reader (Esc)"
          aria-label="Exit reader"
        >
          ← Exit
        </button>

        {/* Title + author + progress */}
        <div style={{
          flex:        1,
          textAlign:   'center',
          overflow:    'hidden',
          display:     'flex',
          flexDirection:'column',
          alignItems:  'center',
          justifyContent:'center',
        }}>
          <div style={{
            color:        t.text,
            fontWeight:   600,
            fontSize:     13,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            width:        '100%',
          }}>
            {title}
          </div>
          <div style={{
            color:     t.textMuted,
            fontSize:  11,
            display:   'flex',
            gap:       6,
            alignItems:'center',
            marginTop: 2,
          }}>
            {author && <span>{author}</span>}
            {author && totalPages > 0 && <span>•</span>}
            {totalPages > 0 && (
              isEditingPage ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const page = parseInt(pageInput, 10);
                    if (page > 0 && page <= totalPages) {
                      const r = renditionRef.current;
                      if (r?.book?.locations) {
                        const cfi = r.book.locations.cfiFromLocation(page);
                        if (cfi) setLocation(cfi);
                      }
                    }
                    setIsEditingPage(false);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <span>Loc </span>
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={() => setIsEditingPage(false)}
                    style={{
                      width: 40,
                      height: 16,
                      fontSize: 11,
                      background: 'transparent',
                      border: `1px solid ${t.border}`,
                      color: t.text,
                      textAlign: 'center',
                      borderRadius: 4,
                      margin: '0 4px',
                      pointerEvents: 'auto'
                    }}
                  />
                  <span> of {totalPages}</span>
                </form>
              ) : (
                <span 
                  onClick={() => { setIsEditingPage(true); setPageInput(String(currentPage > 0 ? currentPage : 1)); }}
                  style={{ cursor: 'pointer', textDecoration: 'underline decoration-dotted', textUnderlineOffset: 2, pointerEvents: 'auto' }}
                  title="Click to jump to a page"
                >
                  Loc {currentPage > 0 ? currentPage : 1} of {totalPages}
                </span>
              )
            )}
          </div>
        </div>

        {/* Bookmark button */}
        <button
          style={{
            ...iconBtn(isBookmarked),
            fontSize:  18,
            transform: bookmarkFlash ? 'scale(1.3)' : 'scale(1)',
            transition:'all 0.2s ease',
          }}
          onClick={handleBookmark}
          title="Bookmark this page (B)"
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {isBookmarked ? '🔖' : '🔗'}
        </button>

        {/* Settings button */}
        <button
          style={iconBtn(showSettings)}
          onClick={() => setShowSettings(v => !v)}
          title="Reading settings (S)"
          aria-label="Open reading settings"
        >
          ⚙
        </button>
      </div>

      {/* ── Reader body ──────────────────────────────────────────────────────── */}
      <div style={{
        flex:       1,
        position:   'relative',
        overflow:   'hidden',
        opacity:    showOpening ? 0 : 1,
        transition: 'opacity 0.5s ease 0.2s',
      }}>
        <ReactReader
          url={url}
          location={location}
          locationChanged={handleLocationChange}
          getRendition={getRendition}
          tocChanged={tocChanged}
          showToc={false}
          epubInitOptions={{ openAs: 'epub' }}
          epubOptions={{
            flow:    'paginated',
            manager: 'continuous',
            spread:  'none',
          }}
        />

        <ReaderFooter
          hidden={toolbarHidden}
          theme={theme}
          currentPage={currentPage}
          totalPages={totalPages}
          genreColor={genreColor}
        />

        {/* Bookmark ribbon */}
        {isBookmarked && (
          <div style={{
            position:   'absolute',
            top:        0,
            right:      24,
            zIndex:     10,
            width:      18,
            height:     36,
            background: genreColor || '#6366f1',
            clipPath:   'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
          }} />
        )}
      </div>

      {/* ── Highlight / selection popover ─────────────────────────────────────── */}
      {popover && (
        <HighlightPopover
          x={popover.x}
          y={popover.y}
          theme={theme}
          onHighlight={handleHighlight}
          onCopy={handleCopy}
          onClose={() => setPopover(null)}
          existingColor={getOverlappingHighlight(popover, highlights)?.color}
          onErase={handleEraseHighlight}
        />
      )}

      {/* ── TOC / bookmarks / highlights drawer ──────────────────────────────── */}
      <ReaderTOCDrawer
        open={showTOC}
        onClose={() => setShowTOC(false)}
        toc={toc}
        currentLocation={location}
        theme={theme}
        bookTitle={title}
        coverUrl={coverUrl}
        onNavigate={(href) => { setLocation(href); setShowTOC(false); }}
        bookmarks={bookmarks}
        highlights={highlights}
        onDeleteBookmark={(cfi) => {
          const updated = bookmarks.filter(b => b.cfi !== cfi);
          setBookmarks(updated);
          saveBookmarks(bookId, updated);
        }}
        onDeleteHighlight={handleDeleteHighlight}
        onNavigateToCfi={(cfi) => { navigateToCfi(cfi); setShowTOC(false); }}
        totalPages={totalPages}
        onJumpToLocation={(locNumber) => {
          const r = renditionRef.current;
          if (r?.book?.locations) {
            const cfi = r.book.locations.cfiFromLocation(locNumber);
            if (cfi) { setLocation(cfi); setShowTOC(false); }
          }
        }}
      />

      {/* ── Settings panel ───────────────────────────────────────────────────── */}
      <ReaderSettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        prefs={prefs}
        onPrefsChange={(p) => { setPrefs(p); savePrefs(p); }}
        theme={theme}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}
