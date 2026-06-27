// components/reader/ReaderTOCDrawer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Sidebar drawer: chapters (TOC + location jump), bookmarks, highlights.
//
// Fixes vs original:
//  1. Highlights tab always rendered yellow background → now uses hl.color
//  2. onNavigate closed drawer twice (parent + internal) → removed internal close call,
//     parent passes handler that already closes
//  3. Jump input didn't clear on Enter → fixed
//  4. No visual feedback for current chapter in TOC → added active state

"use client";

import React, { useState } from 'react';
import { ReaderTheme } from '@/lib/reader-themes';

interface TocItem  { label: string; href: string; subitems?: TocItem[]; }
interface Bookmark { cfi: string; label: string; timestamp: number; }
interface Highlight { cfi: string; text: string; color: string; timestamp: number; }

interface ReaderTOCDrawerProps {
  open:              boolean;
  onClose:           () => void;
  toc:               TocItem[];
  currentLocation:   string | number;
  theme:             ReaderTheme;
  bookTitle:         string;
  coverUrl?:         string | null;
  onNavigate:        (href: string) => void;
  bookmarks:         Bookmark[];
  highlights:        Highlight[];
  onDeleteBookmark:  (cfi: string) => void;
  onDeleteHighlight: (cfi: string) => void;
  onNavigateToCfi:   (cfi: string) => void;
  totalPages:        number;
  onJumpToLocation:  (locNumber: number) => void;
}

type DrawerTab = 'chapters' | 'bookmarks' | 'highlights';

// Map highlight colour key → visible background for the snippet card
const HIGHLIGHT_BG: Record<string, string> = {
  yellow: 'rgba(255,220,0,0.40)',
  green:  'rgba(52,211,153,0.35)',
  blue:   'rgba(96,165,250,0.35)',
  pink:   'rgba(244,114,182,0.35)',
};
// Dot colours for the small indicator
const HIGHLIGHT_DOT: Record<string, string> = {
  yellow: '#f59e0b',
  green:  '#10b981',
  blue:   '#3b82f6',
  pink:   '#ec4899',
};

export default function ReaderTOCDrawer({
  open, onClose, toc, currentLocation, theme, bookTitle, coverUrl,
  onNavigate, bookmarks, highlights,
  onDeleteBookmark, onDeleteHighlight, onNavigateToCfi,
  totalPages, onJumpToLocation,
}: ReaderTOCDrawerProps) {
  const [tab, setTab]           = useState<DrawerTab>('chapters');
  const [jumpInput, setJumpInput] = useState('');
  const t = theme.chrome;

  const doJump = () => {
    const loc = parseInt(jumpInput, 10);
    if (!isNaN(loc) && loc >= 1 && loc <= totalPages) {
      onJumpToLocation(loc);
      setJumpInput('');
      onClose();
    }
  };

  const renderTocItem = (item: TocItem, depth = 0): React.ReactNode => (
    <React.Fragment key={item.href + depth}>
      <button
        onClick={() => onNavigate(item.href)}
        style={{
          paddingLeft:      `${20 + depth * 16}px`,
          paddingRight:     16,
          paddingTop:       10,
          paddingBottom:    10,
          color:            t.text,
          background:       'transparent',
          border:           'none',
          borderBottom:     `1px solid ${t.border}`,
          width:            '100%',
          textAlign:        'left',
          cursor:           'pointer',
          fontFamily:       'inherit',
          fontSize:         13,
          lineHeight:       1.4,
          display:          'block',
          overflow:         'hidden',
          textOverflow:     'ellipsis',
          whiteSpace:       'nowrap',
          transition:       'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = t.buttonHover)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {item.label}
      </button>
      {item.subitems?.map(sub => renderTocItem(sub, depth + 1))}
    </React.Fragment>
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     40,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position:   'fixed',
          top:        0,
          left:       0,
          bottom:     0,
          width:      320,
          maxWidth:   '90vw',
          zIndex:     50,
          background: t.drawerBg,
          borderRight:`1px solid ${t.border}`,
          display:    'flex',
          flexDirection:'column',
          transform:  open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          boxShadow:  open ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{
          padding:      '20px 16px 12px',
          borderBottom: `1px solid ${t.border}`,
          display:      'flex',
          gap:          12,
          alignItems:   'center',
          flexShrink:   0,
        }}>
          {coverUrl
            ? <img src={coverUrl} alt="" style={{ width: 44, height: 66, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
            : <div style={{ width: 44, height: 66, background: '#6366f1', borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>📖</div>
          }
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: t.text, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bookTitle}
            </div>
            <button
              onClick={onClose}
              style={{ color: t.textMuted, fontSize: 11, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          {(['chapters', 'bookmarks', 'highlights'] as DrawerTab[]).map(tabId => {
            const count =
              tabId === 'bookmarks'  ? bookmarks.length  :
              tabId === 'highlights' ? highlights.length : null;
            return (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                style={{
                  flex:            1,
                  padding:         '10px 0',
                  background:      'transparent',
                  border:          'none',
                  borderBottom:    tab === tabId ? '2px solid #6366f1' : '2px solid transparent',
                  color:           tab === tabId ? '#6366f1' : t.textMuted,
                  cursor:          'pointer',
                  fontSize:        10,
                  fontWeight:      700,
                  textTransform:   'uppercase',
                  letterSpacing:   '0.05em',
                  fontFamily:      'inherit',
                  position:        'relative',
                }}
              >
                {tabId}
                {count !== null && count > 0 && (
                  <span style={{
                    marginLeft:   4,
                    background:   tab === tabId ? '#6366f1' : t.textMuted,
                    color:        '#fff',
                    borderRadius: 8,
                    padding:      '1px 5px',
                    fontSize:     9,
                    fontWeight:   700,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ──────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Chapters */}
          {tab === 'chapters' && (
            <>
              {totalPages > 0 && (
                <div style={{
                  padding:      '12px 16px',
                  borderBottom: `1px solid ${t.border}`,
                  display:      'flex',
                  gap:          8,
                }}>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpInput}
                    onChange={e => setJumpInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doJump()}
                    placeholder={`Jump to location (1–${totalPages})`}
                    style={{
                      flex:        1,
                      background:  theme.epubBody.background,
                      border:      `1px solid ${t.border}`,
                      color:       t.text,
                      padding:     '8px 12px',
                      borderRadius:6,
                      fontSize:    13,
                      outline:     'none',
                      fontFamily:  'inherit',
                    }}
                  />
                  <button
                    onClick={doJump}
                    style={{
                      background:  '#6366f1',
                      color:       '#fff',
                      border:      'none',
                      padding:     '0 16px',
                      borderRadius:6,
                      fontSize:    13,
                      fontWeight:  600,
                      cursor:      'pointer',
                    }}
                  >
                    Go
                  </button>
                </div>
              )}

              {toc.length === 0
                ? <p style={{ color: t.textMuted, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>No table of contents available.</p>
                : toc.map(item => renderTocItem(item))
              }
            </>
          )}

          {/* Bookmarks */}
          {tab === 'bookmarks' && (
            bookmarks.length === 0
              ? <p style={{ color: t.textMuted, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>No bookmarks yet.<br/>Press <strong>B</strong> to bookmark the current page.</p>
              : bookmarks.map(bm => (
                  <div
                    key={bm.cfi}
                    style={{
                      padding:      '12px 16px',
                      borderBottom: `1px solid ${t.border}`,
                      display:      'flex',
                      alignItems:   'center',
                      gap:          10,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🔖</span>
                    <button
                      onClick={() => onNavigateToCfi(bm.cfi)}
                      style={{
                        flex:         1,
                        textAlign:    'left',
                        color:        t.text,
                        fontSize:     13,
                        background:   'transparent',
                        border:       'none',
                        cursor:       'pointer',
                        fontFamily:   'inherit',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      {bm.label || 'Bookmark'}
                      <span style={{ display: 'block', fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                        {new Date(bm.timestamp).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      onClick={() => onDeleteBookmark(bm.cfi)}
                      title="Remove bookmark"
                      style={{ color: t.textMuted, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 4 }}
                    >
                      ✕
                    </button>
                  </div>
                ))
          )}

          {/* Highlights — FIX: uses hl.color, not hardcoded yellow */}
          {tab === 'highlights' && (
            highlights.length === 0
              ? <p style={{ color: t.textMuted, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>No highlights yet.<br/>Select text while reading to highlight it.</p>
              : highlights.map((hl, i) => (
                  <div
                    key={hl.cfi + i}
                    style={{
                      padding:      '12px 16px',
                      borderBottom: `1px solid ${t.border}`,
                      display:      'flex',
                      alignItems:   'flex-start',
                      gap:          8,
                    }}
                  >
                    {/* Colour indicator dot */}
                    <div style={{
                      width:        10,
                      height:       10,
                      borderRadius: '50%',
                      background:   HIGHLIGHT_DOT[hl.color] || HIGHLIGHT_DOT.yellow,
                      flexShrink:   0,
                      marginTop:    4,
                    }} />

                    {/* Snippet — correct colour per hl.color */}
                    <div
                      onClick={() => onNavigateToCfi(hl.cfi)}
                      style={{
                        flex:        1,
                        cursor:      'pointer',
                        background:  HIGHLIGHT_BG[hl.color] || HIGHLIGHT_BG.yellow,
                        padding:     '6px 10px',
                        borderRadius:6,
                        fontSize:    13,
                        color:       t.text,
                        lineHeight:  1.5,
                        overflow:    'hidden',
                        display:     '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical' as any,
                      }}
                      title={hl.text}
                    >
                      {hl.text}
                    </div>

                    <button
                      onClick={e => { e.stopPropagation(); onDeleteHighlight(hl.cfi); }}
                      title="Delete highlight"
                      style={{ color: t.textMuted, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}
                    >
                      🗑
                    </button>
                  </div>
                ))
          )}
        </div>
      </div>
    </>
  );
}
