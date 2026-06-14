'use client';

// ============================================================
// GenreBookList — Client Component for the genre page.
// Receives pre-fetched books as props (from Server Component parent).
// Provides client-side: level filter, sort control, tag filter.
// ============================================================

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Book, DifficultyLevel, SortOption } from '@/types/database';
import BookCard from '@/components/ui/BookCard';

interface GenreBookListProps {
  books: Book[];
  isLearning: boolean;
}

const LEVELS: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const SORTS: { label: string; value: SortOption }[] = [
  { label: 'Best Expert Rating', value: 'expert_rating' },
  { label: 'Most Reviews',       value: 'community_rating' },
  { label: 'Newest',             value: 'published_year' },
];

export default function GenreBookList({ books, isLearning }: GenreBookListProps) {
  const [activeLevel, setActiveLevel] = useState<DifficultyLevel | 'All'>('All');
  const [sort, setSort]               = useState<SortOption>('expert_rating');
  const [activeTags, setActiveTags]   = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState<number>(24);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();
    if (node) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 24);
        }
      }, { rootMargin: '400px' });
      observer.current.observe(node);
    }
  }, [visibleCount]);

  // Collect all unique tags from the books for the filter chips
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    books.forEach((b) => b.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [books]);

  // Apply filters + sort client-side (data was already fetched)
  const filtered = useMemo(() => {
    let result = [...books];

    if (isLearning && activeLevel !== 'All') {
      result = result.filter((b) => b.difficulty_level === activeLevel);
    }

    if (activeTags.size > 0) {
      result = result.filter((b) =>
        b.tags?.some((t) => activeTags.has(t))
      );
    }

    result.sort((a, b) => {
      const aVal = (a[sort] as number | null) ?? 0;
      const bVal = (b[sort] as number | null) ?? 0;
      return bVal - aVal;
    });

    return result;
  }, [books, activeLevel, activeTags, sort, isLearning]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(24);
  }, [filtered]);

  return (
    <div>
      {/* ── Filter Toolbar ──────────────────────────────────── */}
      <div
        className="flex flex-col gap-4 p-4 rounded-xl mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Level Filter (Learning genres only) */}
          {isLearning && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}>
                Level:
              </span>
              {(['All', ...LEVELS] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setActiveLevel(level)}
                  className="badge transition-all"
                  style={{
                    background: activeLevel === level ? 'var(--indigo-500)' : 'var(--bg-surface)',
                    color: activeLevel === level ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${activeLevel === level ? 'var(--indigo-500)' : 'var(--border-default)'}`,
                    cursor: 'pointer',
                    padding: '5px 12px',
                    fontSize: '12px',
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          )}

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}>
              Sort:
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="input-base text-xs"
              style={{ width: 'auto', padding: '5px 10px', height: '32px' }}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tag Filter Chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="text-xs px-2.5 py-1 rounded-full transition-colors"
                style={{
                  background: activeTags.has(tag) ? 'var(--indigo-500)22' : 'var(--bg-surface)',
                  color: activeTags.has(tag) ? 'var(--indigo-400)' : 'var(--text-muted)',
                  border: `1px solid ${activeTags.has(tag) ? 'var(--indigo-500)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Result Count ────────────────────────────────────── */}
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> books
        {activeLevel !== 'All' && ` for ${activeLevel} level`}
      </p>

      {/* ── Books Grid ──────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold">No books match your filters.</p>
          <button
            className="btn-ghost mt-4 text-sm"
            onClick={() => { setActiveLevel('All'); setActiveTags(new Set()); }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
            {filtered.slice(0, visibleCount).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          
          {/* Infinite Scroll Trigger */}
          {visibleCount < filtered.length && (
            <div ref={loadMoreRef} className="py-12 flex justify-center items-center w-full">
              <div className="animate-pulse flex items-center gap-2 text-gray-500">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-medium">Loading more books...</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
