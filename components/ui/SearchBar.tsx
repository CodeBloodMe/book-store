'use client';

// ============================================================
// SearchBar — Client Component for the global search input.
// Handles input state and pushes to /search?q= on submit.
// ============================================================

import { useState, useCallback, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SearchBarProps {
  placeholder?: string;
  initialValue?: string;
  /** If true, renders a larger hero-style search bar */
  hero?: boolean;
  /** If true, takes up 100% width */
  fullWidth?: boolean;
}

export default function SearchBar({
  placeholder = 'Search books, authors, topics…',
  initialValue = '',
  hero = false,
  fullWidth = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      startTransition(() => {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      });
    },
    [query, router]
  );

  if (!hero && pathname === '/search') {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="relative flex flex-col"
      style={{ width: fullWidth ? '100%' : (hero ? '100%' : '260px') }}
    >
      <div className="relative flex items-center">
        {/* Search Icon / Spinner */}
        <span
          className="absolute left-3 pointer-events-none flex items-center justify-center"
          aria-hidden="true"
          style={{ color: isPending ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'color 0.2s' }}
        >
          {isPending ? (
            <svg className="animate-spin" width={hero ? 20 : 16} height={hero ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
          ) : (
            <svg width={hero ? 20 : 16} height={hero ? 20 : 16} viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx={11} cy={11} r={8} />
              <line x1={21} y1={21} x2={16.65} y2={16.65} />
            </svg>
          )}
        </span>

        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isPending ? 'Searching…' : placeholder}
          className="input-base"
          disabled={isPending}
          style={{
            paddingLeft: hero ? '48px' : '38px',
            paddingRight: query && !isPending ? '48px' : '14px',
            fontSize: hero ? '16px' : '14px',
            height: hero ? '52px' : '40px',
            borderRadius: hero ? '12px' : '8px',
            opacity: isPending ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
          aria-label="Search books"
          autoComplete="off"
        />

        {/* Clear button — only visible when there's text and not loading */}
        {query && !isPending && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 flex items-center justify-center rounded-full"
            style={{
              color: 'var(--text-muted)',
              width: 20, height: 20,
              background: 'var(--bg-surface)',
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Loading progress bar shown under the input when pending */}
      {isPending && (
        <div className="h-[2px] w-full rounded-full overflow-hidden mt-1" style={{ background: 'var(--border-default)' }}>
          <div
            className="h-full rounded-full"
            style={{
              background: 'var(--text-primary)',
              animation: 'search-progress 1.5s ease-in-out infinite',
              width: '40%',
            }}
          />
        </div>
      )}
    </form>
  );
}
