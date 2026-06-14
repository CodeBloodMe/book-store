'use client';

// ============================================================
// SearchBar — Client Component for the global search input.
// Handles input state and pushes to /search?q= on submit.
// ============================================================

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  placeholder?: string;
  initialValue?: string;
  /** If true, renders a larger hero-style search bar */
  hero?: boolean;
}

export default function SearchBar({
  placeholder = 'Search books, authors, topics…',
  initialValue = '',
  hero = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [query, router]
  );

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="relative flex items-center"
      style={{ width: hero ? '100%' : '260px' }}
    >
      {/* Search Icon */}
      <span
        className="absolute left-3 pointer-events-none"
        aria-hidden="true"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg width={hero ? 20 : 16} height={hero ? 20 : 16} viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx={11} cy={11} r={8} />
          <line x1={21} y1={21} x2={16.65} y2={16.65} />
        </svg>
      </span>

      <input
        id="global-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="input-base"
        style={{
          paddingLeft: hero ? '48px' : '38px',
          paddingRight: query ? '48px' : '14px',
          fontSize: hero ? '16px' : '14px',
          height: hero ? '52px' : '40px',
          borderRadius: hero ? '12px' : '8px',
        }}
        aria-label="Search books"
        autoComplete="off"
      />

      {/* Clear button — only visible when there's text */}
      {query && (
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
    </form>
  );
}
