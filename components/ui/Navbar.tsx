// ============================================================
// Navbar — Top navigation bar.
// Server Component: fetches genres for mega-menu server-side.
// SearchBar is extracted as a Client Component.
// ============================================================

import Link from 'next/link';
import { getAllGenres } from '@/lib/queries';
import SearchBar from './SearchBar';
import type { Genre } from '@/types/database';
import MobileMenu from './MobileMenu';
import { getGenreIcon } from './GenreIcon';
import { BookOpen, Sparkles } from 'lucide-react';

export default async function Navbar() {
  let genres: Genre[] = [];
  try {
    genres = await getAllGenres();
  } catch {
    // Don't crash if genre fetch fails — Navbar still renders
  }

  // Group genres by super-category for the mega-menu
  const grouped = genres.reduce<Record<string, Genre[]>>((acc, g) => {
    const catName = g.super_categories?.name ?? 'Other';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(g);
    return acc;
  }, {});

  const catOrder = ['Learning', 'Fiction', 'Personal Growth'];
  const sortedGroups = catOrder
    .filter((c) => grouped[c])
    .map((c) => ({ name: c, genres: grouped[c] }));

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b"
      style={{ borderBottomColor: 'var(--border-default)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 gap-4">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center flex-shrink-0 z-10"
            aria-label="ChapterOne Home"
          >
            <div className="h-20 w-20 rounded-full border-2 border-gray-900 bg-[#f5f5f0] flex items-center justify-center overflow-hidden transition-transform hover:scale-105" style={{ boxShadow: '3px 3px 0 #0a0a0a' }}>
              <img src="/logo.png" alt="ChapterOne Logo" className="h-full w-full object-contain mix-blend-multiply grayscale contrast-125 brightness-110 scale-125 pl-1" />
            </div>
            <span className="sr-only">ChapterOne</span>
          </Link>

          {/* ── Desktop Nav ───────────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Genre navigation">
            {sortedGroups.map(({ name, genres: catGenres }) => (
              <div key={name} className="relative group/cat">
                <button
                  className="btn-ghost text-sm px-3 py-2"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  {name}
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2.5} className="ml-1"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Dropdown mega-menu */}
                <div
                  className="absolute left-0 top-full mt-1 w-64 rounded-xl shadow-2xl
                    opacity-0 invisible group-hover/cat:opacity-100 group-hover/cat:visible
                    transition-all duration-200"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    padding: '8px',
                  }}
                >
                  {catGenres.map((g) => (
                    <Link
                      key={g.id}
                      href={`/genres/${g.slug}`}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                        hover:text-white transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="opacity-60">{getGenreIcon(g.slug, "w-4 h-4")}</span>
                      <span className="font-medium">{g.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <Link href="/fiction" className="btn-ghost text-sm px-3 py-2 flex items-center gap-1.5">
              <BookOpen size={16} />
              Fiction Finder
            </Link>
            <Link
              href="/recommend"
              className="text-sm px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all hover:-translate-y-0.5"
              style={{
                background: '#f5e642',
                color: '#0a0a0a',
                border: '2px solid #0a0a0a',
                boxShadow: '3px 3px 0 #0a0a0a',
              }}
            >
              <Sparkles size={16} /> AI Finder
            </Link>
          </nav>

          {/* ── Search + Mobile + Auth ────────────────────────── */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <SearchBar />
            </div>

            {/* Mobile hamburger — client component for toggle */}
            <MobileMenu groups={sortedGroups} />
          </div>
        </div>
      </div>
    </header>
  );
}
