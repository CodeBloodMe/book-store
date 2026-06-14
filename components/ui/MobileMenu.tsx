'use client';

// ============================================================
// MobileMenu — Client Component for the hamburger menu.
// Extracted from Navbar so Navbar stays a Server Component.
// ============================================================

import { useState } from 'react';
import Link from 'next/link';
import type { Genre } from '@/types/database';
import { getGenreIcon } from './GenreIcon';
import { BookOpen } from 'lucide-react';
import SearchBar from './SearchBar';

interface MobileMenuProps {
  groups: { name: string; genres: Genre[] }[];
}

export default function MobileMenu({ groups }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      {/* Hamburger toggle */}
      <button
        className="lg:hidden btn-ghost p-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          {isOpen ? (
            <>
              <line x1={18} y1={6} x2={6} y2={18} />
              <line x1={6} y1={6} x2={18} y2={18} />
            </>
          ) : (
            <>
              <line x1={3} y1={6} x2={21} y2={6} />
              <line x1={3} y1={12} x2={21} y2={12} />
              <line x1={3} y1={18} x2={21} y2={18} />
            </>
          )}
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-in drawer */}
      <aside
        className="fixed top-0 right-0 h-full w-72 z-50 lg:hidden overflow-y-auto"
        style={{
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-default)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center">
              <div className="h-20 w-20 rounded-full border-2 border-gray-900 bg-[#f5f5f0] flex items-center justify-center overflow-hidden" style={{ boxShadow: '3px 3px 0 #0a0a0a' }}>
                <img src="/logo.png" alt="ChapterOne Logo" className="h-full w-full object-contain mix-blend-multiply grayscale contrast-125 brightness-110 scale-125 pl-1" />
              </div>
              <span className="sr-only">ChapterOne</span>
            </Link>
            <button onClick={() => setIsOpen(false)} aria-label="Close menu"
              className="btn-ghost p-1.5">✕</button>
          </div>

          <div className="mb-6">
            <SearchBar fullWidth placeholder="Search books..." />
          </div>

          <Link href="/fiction" onClick={() => setIsOpen(false)}
            className="btn-primary w-full justify-center mb-4 text-sm flex items-center gap-1.5">
            <BookOpen size={16} />
            Fiction Finder
          </Link>

          {groups.map(({ name, genres }) => (
            <div key={name} className="mb-2">
              <button
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg
                  text-sm font-semibold text-left"
                style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}
                onClick={() => setExpanded(expanded === name ? null : name)}
              >
                {name}
                <span style={{ color: 'var(--text-muted)' }}>
                  {expanded === name ? '▲' : '▼'}
                </span>
              </button>
              {expanded === name && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {genres.map((g) => (
                    <Link
                      key={g.id}
                      href={`/genres/${g.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="opacity-60">{getGenreIcon(g.slug, "w-4 h-4")}</span>
                      <span>{g.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
