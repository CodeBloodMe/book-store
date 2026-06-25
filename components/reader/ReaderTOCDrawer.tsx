"use client";

import React, { useState } from 'react';
import { ReaderTheme } from '@/lib/reader-themes';

interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

interface Bookmark {
  cfi: string;
  label: string;
  timestamp: number;
}

interface Highlight {
  cfi: string;
  text: string;
  color: string;
  timestamp: number;
}

interface ReaderTOCDrawerProps {
  open: boolean;
  onClose: () => void;
  toc: TocItem[];
  currentLocation: string | number;
  theme: ReaderTheme;
  bookTitle: string;
  coverUrl?: string | null;
  onNavigate: (href: string) => void;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  onDeleteBookmark: (cfi: string) => void;
  onDeleteHighlight: (cfi: string) => void;
  onNavigateToCfi: (cfi: string) => void;
  totalPages: number;
  onJumpToLocation: (locNumber: number) => void;
}

type DrawerTab = 'chapters' | 'bookmarks' | 'highlights';

const TAB_ICONS = {
  chapters: '',
  bookmarks: '',
  highlights: '',
};

export default function ReaderTOCDrawer({
  open, onClose, toc, theme, bookTitle, coverUrl,
  onNavigate, bookmarks, highlights, onDeleteBookmark, onDeleteHighlight, onNavigateToCfi,
  totalPages, onJumpToLocation,
}: ReaderTOCDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('chapters');
  const [jumpInput, setJumpInput] = useState('');
  const t = theme.chrome;

  const HIGHLIGHT_COLORS: Record<string, string> = {
    yellow: 'rgba(255, 220, 0, 0.55)',
    green: 'rgba(52, 211, 153, 0.50)',
    blue: 'rgba(96, 165, 250, 0.50)',
    pink: 'rgba(244, 114, 182, 0.50)',
  };

  const renderTocItem = (item: TocItem, depth = 0) => (
    <div key={item.href}>
      <button
        className="toc-chapter-item"
        onClick={() => { onNavigate(item.href); onClose(); }}
        style={{
          paddingLeft: `${20 + depth * 16}px`,
          color: t.text,
          background: 'transparent',
          border: 'none',
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {item.label}
      </button>
      {item.subitems?.map(sub => renderTocItem(sub, depth + 1))}
    </div>
  );

  return (
    <>
      {open && (
        <div className="toc-drawer-backdrop" onClick={onClose} />
      )}

      <div className={`toc-drawer${open ? ' open' : ''}`} style={{ background: t.drawerBg, borderRight: `1px solid ${t.border}` }}>

        {/* Book Info */}
        <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          {coverUrl ? (
            <img src={coverUrl} alt="" style={{ width: 44, height: 66, objectFit: 'cover', borderRadius: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 66, background: '#1f2937', borderRadius: 5, flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: t.text, fontWeight: 700, fontSize: 13, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {bookTitle}
            </div>
            <button onClick={onClose} style={{ color: t.textMuted, fontSize: 11, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
              Close ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          {(['chapters', 'bookmarks', 'highlights'] as DrawerTab[]).map(tabId => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === tabId ? '2px solid #1f2937' : '2px solid transparent',
                color: tab === tabId ? '#1f2937' : t.textMuted,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transition: 'color 0.15s ease',
                fontFamily: 'inherit',
              }}
            >
              {TAB_ICONS[tabId]} {tabId.charAt(0).toUpperCase() + tabId.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

          {/* Chapters */}
          {tab === 'chapters' && (
            <>
              {totalPages > 0 && (
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    placeholder={`Jump to loc (1-${totalPages})`}
                    style={{
                      flex: 1,
                      background: theme.epubBody.background,
                      border: `1px solid ${t.border}`,
                      color: t.text,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const loc = parseInt(jumpInput);
                        if (!isNaN(loc) && loc >= 1 && loc <= totalPages) {
                          onJumpToLocation(loc);
                          setJumpInput('');
                          onClose();
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const loc = parseInt(jumpInput);
                      if (!isNaN(loc) && loc >= 1 && loc <= totalPages) {
                        onJumpToLocation(loc);
                        setJumpInput('');
                        onClose();
                      }
                    }}
                    style={{
                      background: '#1f2937',
                      color: '#fff',
                      border: 'none',
                      padding: '0 16px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </div>
              )}
              {toc.length === 0 ? (
                <p style={{ color: t.textMuted, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                  No table of contents available.
                </p>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  {toc.map(item => renderTocItem(item))}
                </div>
              )}
            </>
          )}

          {/* Bookmarks */}
          {tab === 'bookmarks' && (
            bookmarks.length === 0 ? (
              <p style={{ color: t.textMuted, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                No bookmarks yet.<br />
                <span style={{ fontSize: 11, marginTop: 4, display: 'block' }}>Press <strong>B</strong> or click the bookmark icon to save a page.</span>
              </p>
            ) : (
              bookmarks.map(bm => (
                <div key={bm.cfi} style={{ padding: '10px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🔖</span>
                  <button
                    onClick={() => { onNavigateToCfi(bm.cfi); onClose(); }}
                    style={{ flex: 1, textAlign: 'left', color: t.text, fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {bm.label || 'Bookmark'}
                  </button>
                  <button
                    onClick={() => onDeleteBookmark(bm.cfi)}
                    style={{ color: t.textMuted, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )
          )}

          {/* Highlights */}
          {tab === 'highlights' && (
            highlights.length === 0 ? (
              <p style={{ color: t.textMuted, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                No highlights yet.<br />
                <span style={{ fontSize: 11, marginTop: 4, display: 'block' }}>Select text while reading to highlight it.</span>
              </p>
            ) : (
              highlights.map((hl, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${t.border}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <div
                    onClick={() => { onNavigateToCfi(hl.cfi); onClose(); }}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      background: HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow,
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: t.text,
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {hl.text}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteHighlight(hl.cfi); }}
                    title="Remove highlight"
                    style={{
                      color: t.textMuted,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: '4px 6px',
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 2,
                      transition: 'color 0.15s ease, background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = 'transparent'; }}
                  >
                    🗑
                  </button>
                </div>
              ))
            )
          )}

        </div>
      </div>
    </>
  );
}
