'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Network, BookOpen, Sparkles, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import GeneratedCover from '@/components/ui/GeneratedCover';

interface PathBook {
  id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  description: string | null;
  expert_rating: number | null;
  genres?: { name: string; color: string; slug: string } | null;
}

interface PathEdge {
  from: string;
  to: string;
  relationship: string;
  weight: number;
  evidence: string | null;
}

interface SearchResult {
  id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
}

const RELATIONSHIP_LABELS: Record<string, { label: string; emoji: string }> = {
  same_author: { label: 'Same Author', emoji: '✍️' },
  same_genre: { label: 'Same Genre', emoji: '📚' },
  shared_tags: { label: 'Shared Themes', emoji: '🏷️' },
  same_era: { label: 'Same Era', emoji: '📅' },
  same_difficulty: { label: 'Same Level', emoji: '📊' },
  connected: { label: 'Connected', emoji: '🔗' },
};

function BookSearchInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: SearchResult | null;
  onChange: (book: SearchResult | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchBooks = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/bookweb/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.books || []);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (value) onChange(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchBooks(val), 300);
  };

  const selectBook = (book: SearchResult) => {
    onChange(book);
    setQuery(book.title);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    onChange(null);
    setQuery('');
    setResults([]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border-[3px] border-[#0a0a0a] rounded-lg text-sm font-bold
            focus:shadow-[4px_4px_0_#0a0a0a] focus:ring-0 focus:outline-none transition-all bg-white text-[#0a0a0a] placeholder-gray-400"
        />
        {(value || isSearching) && (
          <button
            onClick={clearSelection}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Selected indicator */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f0] border-2 border-[#0a0a0a] rounded-lg text-xs font-black uppercase tracking-widest text-[#0a0a0a] shadow-[2px_2px_0_#0a0a0a]"
        >
          ✓ {value.title} by {value.author}
        </motion.div>
      )}

      {/* Search dropdown */}
      <AnimatePresence>
        {showDropdown && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 top-full mt-2 w-full bg-white rounded-lg border-[3px] border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] max-h-72 overflow-y-auto"
          >
            {results.map((book) => (
              <button
                key={book.id}
                onClick={() => selectBook(book)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
              >
                {book.cover_image_url ? (
                  <Image
                    src={book.cover_image_url}
                    alt=""
                    width={32}
                    height={48}
                    className="rounded object-cover flex-shrink-0"
                    unoptimized={true}
                  />
                ) : (
                  <div className="w-8 h-12 bg-gray-100 rounded flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{book.title}</p>
                  <p className="text-xs text-gray-500 truncate">{book.author}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PathVisualizer({
  path,
  edges,
  totalWeight,
}: {
  path: PathBook[];
  edges: PathEdge[];
  totalWeight: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-8 px-4 py-3 bg-[#f5e642] rounded-lg border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] overflow-x-auto">
        <span className="text-xs font-black uppercase tracking-widest text-[#0a0a0a] whitespace-nowrap">
          {path.length} books in path
        </span>
        <span className="text-xs text-[#0a0a0a]">•</span>
        <span className="text-xs font-black uppercase tracking-widest text-[#0a0a0a] whitespace-nowrap">
          Hops: {edges.length}
        </span>
        <span className="text-xs text-[#0a0a0a]">•</span>
        <span className="text-xs font-black uppercase tracking-widest text-[#0a0a0a] whitespace-nowrap">
          Path Strength: {totalWeight.toFixed(2)}
        </span>
      </div>

      {/* Path timeline */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-6 snap-x snap-mandatory">
        {path.map((book, idx) => (
          <div key={book.id} className="flex items-stretch snap-start">
            {/* Book card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15, duration: 0.4 }}
            >
              <Link
                href={`/books/${book.id}`}
                className="group flex flex-col items-center w-40 flex-shrink-0 p-3 rounded-2xl
                  hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="relative w-24 h-36 mb-3 rounded-lg overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                  {book.cover_image_url ? (
                    <Image
                      src={book.cover_image_url}
                      alt={book.title}
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                  ) : (
                    <GeneratedCover title={book.title} author={book.author} />
                  )}
                  {/* Position badge */}
                  <div className="absolute -top-0 -left-0 w-7 h-7 bg-gray-900 text-white rounded-br-lg flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                </div>
                <h3 className="text-xs font-bold text-gray-900 text-center line-clamp-2 leading-tight">
                  {book.title}
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5 text-center truncate w-full">
                  {book.author}
                </p>
                {book.genres && (
                  <span
                    className="mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${book.genres.color}15`,
                      color: book.genres.color,
                    }}
                  >
                    {book.genres.name}
                  </span>
                )}
              </Link>
            </motion.div>

            {/* Edge connector */}
            {idx < path.length - 1 && edges[idx] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.15 + 0.1, duration: 0.3 }}
                className="flex flex-col items-center justify-center px-1 flex-shrink-0"
              >
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 bg-gray-300" />
                  <div className="flex flex-col items-center px-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <span className="text-base leading-none">
                      {RELATIONSHIP_LABELS[edges[idx].relationship]?.emoji || '🔗'}
                    </span>
                    <span className="text-[9px] font-semibold text-gray-500 mt-0.5 whitespace-nowrap">
                      {edges[idx].evidence || RELATIONSHIP_LABELS[edges[idx].relationship]?.label || 'Connected'}
                    </span>
                  </div>
                  <div className="w-6 h-0.5 bg-gray-300" />
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function BookWebClient() {
  const [bookA, setBookA] = useState<SearchResult | null>(null);
  const [bookB, setBookB] = useState<SearchResult | null>(null);
  const [path, setPath] = useState<PathBook[] | null>(null);
  const [edges, setEdges] = useState<PathEdge[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const findPath = async () => {
    if (!bookA || !bookB) return;

    setIsLoading(true);
    setError(null);
    setNotFound(false);
    setPath(null);

    try {
      const res = await fetch(
        `/api/bookweb/path?from=${bookA.id}&to=${bookB.id}`
      );
      const data = await res.json();

      if (res.status === 404) {
        setNotFound(true);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Failed to find path');
        return;
      }

      if (!data.found) {
        setNotFound(true);
        return;
      }

      setPath(data.path);
      setEdges(data.edges);
      setTotalWeight(data.totalWeight);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[#f5f5f0] border-b-[3px] border-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative w-full flex flex-col items-center"
          >
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 bg-white text-[#0a0a0a] border-2 border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a]">
              <Network className="w-3.5 h-3.5" />
              POWERED BY GRAPH TRAVERSAL
            </div>

            <h1 className="font-black leading-none mb-4 text-[#0a0a0a]" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 8vw, 90px)', letterSpacing: '-0.02em' }}>
              BookWeb
            </h1>
            <p className="text-base font-bold text-[#555] max-w-2xl mx-auto leading-relaxed">
              Find the <span className="text-[#0a0a0a]">shortest reading path</span> between
              any two books. Like Google Maps, but for your reading journey.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border-[3px] border-[#0a0a0a] p-6 sm:p-8"
          style={{ boxShadow: '8px 8px 0 #0a0a0a' }}
        >
          <div className="flex flex-col sm:flex-row gap-6">
            <BookSearchInput
              label="Start Book"
              value={bookA}
              onChange={setBookA}
              placeholder="e.g. Harry Potter"
            />

            <div className="flex items-end pb-3 sm:pb-0 sm:pt-6 justify-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-gray-500" />
              </div>
            </div>

            <BookSearchInput
              label="Destination Book"
              value={bookB}
              onChange={setBookB}
              placeholder="e.g. Thinking Fast & Slow"
            />
          </div>

          <motion.button
            onClick={findPath}
            disabled={!bookA || !bookB || isLoading}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="mt-8 w-full py-4 bg-[#f5e642] text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] rounded-xl font-black text-sm uppercase tracking-widest
              flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed
              hover:bg-[#e5d632] transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Finding the shortest path...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Find Reading Path
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Results */}
        <div className="mt-12">
          <AnimatePresence mode="wait">
            {/* Loading */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-16"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin border-t-gray-900" />
                  <Network className="absolute inset-0 m-auto w-6 h-6 text-gray-400" />
                </div>
                <p className="mt-4 text-sm text-gray-500 font-medium">Traversing the book graph...</p>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center"
              >
                <p className="text-sm font-medium text-red-700">{error}</p>
              </motion.div>
            )}

            {/* Not Found */}
            {notFound && (
              <motion.div
                key="not-found"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-center"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Network className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Path Found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  These two books are too far apart in the graph — they don&apos;t share enough
                  connections through authors, genres, or themes. Try books that are closer in topic.
                </p>
              </motion.div>
            )}

            {/* Path Found */}
            {path && path.length > 0 && (
              <motion.div
                key="path"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <PathVisualizer path={path} edges={edges} totalWeight={totalWeight} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
