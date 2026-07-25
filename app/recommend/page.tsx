'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AILoadingAnimation from '@/components/ui/AILoadingAnimation';
import { useSearchParams } from 'next/navigation';

interface RecommendedBook {
  id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  expert_rating: number | null;
  community_rating: number | null;
  description: string | null;
  difficulty_level: string | null;
  is_bestseller: boolean;
  genres?: { name: string; color: string; icon: string; slug: string } | null;
  why: string;
  path_level?: string;
  // New multi-dimensional fields
  mood_match?: number | null;
  theme_match?: number | null;
  style_match?: number | null;
  read_if?: string | null;
  skip_if?: string | null;
  emotional_arc?: string | null;
  discovery?: 'hidden-gem' | 'popular' | 'classic' | null;
}

interface HistoryItem {
  query: string;
  books: RecommendedBook[];
  mode: SearchMode;
}

type SearchMode = 'books' | 'path';

// Pre-written examples a user can click on to auto-fill the search box
const EXAMPLES = [
  "Sad story books for my friend",
  "A dark action thriller set in winter",
  "Cozy fantasy with a warm cup of tea vibe",
  "A rainy Sunday in a Parisian cafe",
  "Epic world building but the protagonist is a bit chaotic",
  "Heartbreaking romance that will destroy me emotionally",
  "Books that feel like a Studio Ghibli movie",
];

function MatchBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a] w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-white border-2 border-[#0a0a0a] shadow-[2px_2px_0_#0a0a0a] overflow-hidden">
        <div
          className="h-full transition-all duration-700 border-r-2 border-[#0a0a0a]"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-black text-[#0a0a0a] w-9 text-center bg-[#f5e642] px-1 py-0.5 border-2 border-[#0a0a0a] shadow-[2px_2px_0_#0a0a0a]">{value}%</span>
    </div>
  );
}

function DiscoveryBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    'hidden-gem': { label: '💎 Hidden Gem', bg: '#f0fdf4', text: '#166534', border: '#86efac' },
    'popular': { label: '🔥 Popular', bg: '#fefce8', text: '#854d0e', border: '#fde047' },
    'classic': { label: '👑 Classic', bg: '#faf5ff', text: '#6b21a8', border: '#d8b4fe' },
  };
  const c = config[type] || config['popular'];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function BookResultCard({ book }: { book: RecommendedBook }) {
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const rating = book.expert_rating ?? book.community_rating ?? null;
  const hasMatchData = book.mood_match != null || book.theme_match != null || book.style_match != null;

  return (
    <div className="group rounded-2xl transition-all duration-200 hover:-translate-y-1 bg-white border-2 border-[#0a0a0a] shadow-[5px_5px_0_#0a0a0a] overflow-hidden">
      <Link href={`/books/${book.id}`}>
        <div className="flex gap-4 p-5 cursor-pointer">
          <div className="flex-shrink-0 rounded-lg overflow-hidden w-16 h-[92px] bg-[#f0f0ee] border-2 border-[#e5e5e5]">
            {book.cover_image_url && !imgError ? (
              <Image
                src={book.cover_image_url}
                alt={book.title}
                width={64}
                height={92}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                unoptimized={true}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">📖</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-black text-base leading-snug group-hover:underline line-clamp-2 text-[#0a0a0a]">
                {book.title}
              </h3>
            </div>
            <p className="text-sm mb-2 font-medium text-[#555]">
              by {book.author}
            </p>

            <p className="text-sm leading-relaxed mb-3 italic text-[#333] border-l-[3px] border-[#f5e642] pl-2">
              {book.why}
            </p>

            <div className="flex flex-wrap gap-2 items-center">
              {rating != null && rating > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#f5e642] text-[#0a0a0a] border-2 border-[#0a0a0a]">
                  ★ {rating.toFixed(1)}
                </span>
              )}
              {book.difficulty_level && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[#f5f5f0] text-[#0a0a0a] border border-[#ddd]">
                  {book.difficulty_level}
                </span>
              )}
              {book.genres && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[#f5f5f0] text-[#0a0a0a] border border-[#ddd]">
                  {book.genres.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Expandable Deep Analysis Section */}
      {(hasMatchData || book.read_if || book.skip_if) && (
        <div className="border-t-[3px] border-[#0a0a0a]">
          <button
            onClick={(e) => { e.preventDefault(); setExpanded(!expanded); }}
            className="w-full px-5 py-3 flex items-center justify-between bg-[#0a0a0a] text-white hover:bg-[#222] transition-colors cursor-pointer group/btn"
          >
            <span className="text-[11px] font-black uppercase tracking-widest group-hover/btn:translate-x-1 transition-transform">{expanded ? '▾ Hide Analysis' : '▸ Why This Book?'}</span>
            {hasMatchData && !expanded && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#f5e642] border border-[#f5e642] px-2 py-0.5">
                Match: {Math.round(((book.mood_match || 0) + (book.theme_match || 0) + (book.style_match || 0)) / 3)}%
              </span>
            )}
          </button>

          {expanded && (
            <div className="px-5 py-6 space-y-6 animate-in fade-in duration-200 bg-[#f5f5f0]">
              {/* Match Bars */}
              {hasMatchData && (
                <div className="space-y-3">
                  {book.mood_match != null && <MatchBar label="Mood" value={book.mood_match} color="#f59e0b" />}
                  {book.theme_match != null && <MatchBar label="Theme" value={book.theme_match} color="#3b82f6" />}
                  {book.style_match != null && <MatchBar label="Style" value={book.style_match} color="#a855f7" />}
                </div>
              )}

              {/* Emotional Arc */}
              {book.emotional_arc && (
                <div className="bg-white border-2 border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] p-4 relative mt-2">
                  <div className="absolute -top-3 left-4 bg-[#f5e642] px-2 py-0.5 border-2 border-[#0a0a0a]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]">Emotional Journey</p>
                  </div>
                  <p className="text-sm font-medium text-[#0a0a0a] leading-relaxed mt-1">{book.emotional_arc}</p>
                </div>
              )}

              {/* Read If / Skip If */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                {book.read_if && (
                  <div className="bg-[#a3e635] border-2 border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] p-4 relative">
                    <div className="absolute -top-3 left-3 bg-white px-2 py-0.5 border-2 border-[#0a0a0a]">
                      <p className="text-[10px] font-black text-[#0a0a0a] uppercase tracking-widest">✓ READ THIS IF</p>
                    </div>
                    <p className="text-sm font-bold text-[#0a0a0a] leading-relaxed mt-1">{book.read_if.replace(/^Read this if you /i, 'You ')}</p>
                  </div>
                )}
                {book.skip_if && (
                  <div className="bg-[#f87171] border-2 border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] p-4 relative">
                    <div className="absolute -top-3 left-3 bg-white px-2 py-0.5 border-2 border-[#0a0a0a]">
                      <p className="text-[10px] font-black text-[#0a0a0a] uppercase tracking-widest">✗ SKIP THIS IF</p>
                    </div>
                    <p className="text-sm font-bold text-[#0a0a0a] leading-relaxed mt-1">{book.skip_if.replace(/^Skip this if you /i, 'You ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



export default function RecommendPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center font-bold text-[#0a0a0a]">Loading vibe check...</div>}>
      <RecommendPageContent />
    </Suspense>
  );
}

function RecommendPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [input, setInput] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendedBook[] | null>(null);
  const [noResultMsg, setNoResultMsg] = useState('');
  const [mode, setMode] = useState<SearchMode>('books');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasSearched = useRef(false);

  useEffect(() => {
    // Load search history from local storage
    const history = localStorage.getItem('vibeCheckHistoryItems');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    } else {
      localStorage.removeItem('vibeCheckHistory'); // clear old string-only history format
    }
  }, []);

  useEffect(() => {
    if (initialQuery && !hasSearched.current) {
      hasSearched.current = true;
      handleSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSearch = async (optionalSearchQuery?: string) => {
    const finalQuery = optionalSearchQuery ?? input;

    if (finalQuery.trim() === '') return;

    const trimmedQuery = finalQuery.trim();

    // Check cache first!
    const existingHistory = searchHistory.find(item => item.query.toLowerCase() === trimmedQuery.toLowerCase() && (item.mode || 'books') === mode);
    if (existingHistory) {
      setSearchedQuery(existingHistory.query);
      setResults(existingHistory.books);
      setNoResultMsg('');
      setError(null);
      // Move to top of history
      setSearchHistory(prev => {
        const newHistory = [
          existingHistory,
          ...prev.filter(item => !(item.query.toLowerCase() === trimmedQuery.toLowerCase() && (item.mode || 'books') === mode))
        ];
        localStorage.setItem('vibeCheckHistoryItems', JSON.stringify(newHistory));
        return newHistory;
      });
      return; // Stop here, no API call!
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setNoResultMsg('');
    setSearchedQuery(trimmedQuery);

    try {
      const apiEndpoint = mode === 'path' ? '/api/recommend-path' : '/api/recommend';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search');
      }

      const booksArray = data.books ?? [];

      // Preload the cover images in the background so they are ready
      if (booksArray.length > 0) {
        booksArray.forEach((book: RecommendedBook) => {
          if (book.cover_image_url) {
            const img = new window.Image();
            img.src = book.cover_image_url;
          }
        });
      }

      setResults(booksArray);

      // Update history with actual books
      setSearchHistory(prev => {
        const newHistory = [
          { query: trimmedQuery, books: booksArray, mode },
          ...prev.filter(item => !(item.query.toLowerCase() === trimmedQuery.toLowerCase() && (item.mode || 'books') === mode))
        ].slice(0, 10);
        localStorage.setItem('vibeCheckHistoryItems', JSON.stringify(newHistory));
        return newHistory;
      });

      if (booksArray.length === 0 && data.message) {
        setNoResultMsg(data.message);
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  const showExamplePrompts = results === null && !loading;
  const showEmptyResultsMessage = results !== null && results.length === 0;
  const showBookGrid = results !== null && results.length > 0 && mode === 'books';
  const showLearningPath = results !== null && results.length > 0 && mode === 'path';

  return (
    <div className="min-h-screen bg-[#f5f5f0]">

      {/* Page Header */}
      <div className="pt-8 pb-6 px-4 bg-transparent">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-widest mb-4 inline-block text-[#555] hover:text-[#0a0a0a] transition-colors"
          >
            ← Back to ChapterOne
          </Link>
          <h1 className="font-black leading-tight text-center text-[#0a0a0a]" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(40px, 7vw, 72px)', letterSpacing: '0.02em', color: '#0a0a0a' }}>
            Vibe Check
          </h1>
        </div>
      </div>

      {/* Search Area */}
      <div className="max-w-3xl mx-auto px-4 -mt-6">

        {/* Toggle between Single Books and Learning Path */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full p-1 bg-[#f5f5f0] border-2 border-[#0a0a0a]">
            <button
              onClick={() => {
                if (mode !== 'books') {
                  setMode('books');
                  setResults(null);
                  setSearchedQuery('');
                }
              }}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'books' ? 'bg-[#0a0a0a] text-white' : 'text-[#555] hover:text-[#0a0a0a]'}`}
            >
              Single Books
            </button>
            <button
              onClick={() => {
                if (mode !== 'path') {
                  setMode('path');
                  setResults(null);
                  setSearchedQuery('');
                }
              }}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'path' ? 'bg-[#0a0a0a] text-white' : 'text-[#555] hover:text-[#0a0a0a]'}`}
            >
              Learning Path
            </button>
          </div>
        </div>

        {/* The Text Box */}
        <div className="rounded-2xl p-4 bg-white border-[3px] border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            // Submit if user presses "Enter" (without holding Shift)
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="e.g. A cozy sci-fi about a space cafe, or a book that feels like autumn in New York..."
            rows={3}
            className="w-full resize-none text-base outline-none bg-transparent text-[#0a0a0a] border-none font-inherit leading-relaxed"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-dashed border-[#e5e5e5]">
            <span className="text-xs text-[#aaa]">Press Enter or click the button</span>

            <button
              onClick={() => handleSearch()}
              disabled={loading || input.trim() === ''}
              className="px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all border-2 border-[#0a0a0a]"
              style={{
                background: loading || input.trim() === '' ? '#ddd' : '#0a0a0a',
                color: '#fff',
                boxShadow: loading || input.trim() === '' ? 'none' : '3px 3px 0 rgba(0,0,0,0.3)',
                cursor: loading || input.trim() === '' ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : 'Find Books'}
            </button>
          </div>
        </div>

        {/* Display Recent Searches */}
        {searchHistory.filter(item => (item.mode || 'books') === mode).length > 0 && !loading && (
          <div className="mt-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#888]">
                Recent Searches
              </p>
              <button
                onClick={() => {
                  setSearchHistory(prev => {
                    const remaining = prev.filter(item => (item.mode || 'books') !== mode);
                    localStorage.setItem('vibeCheckHistoryItems', JSON.stringify(remaining));
                    return remaining;
                  });
                }}
                className="text-xs text-[#aaa] hover:text-[#0a0a0a] underline"
              >
                Clear History
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const historyItems = searchHistory.filter(item => (item.mode || 'books') === mode);
                const visibleItems = showAllHistory ? historyItems : historyItems.slice(0, 5);
                const remainingCount = historyItems.length - 5;

                return (
                  <>
                    {visibleItems.map((historyItem) => (
                      <button
                        key={historyItem.query}
                        onClick={() => {
                          if (searchedQuery.toLowerCase() === historyItem.query.toLowerCase() && results !== null) {
                            setResults(null);
                            setSearchedQuery('');
                          } else {
                            handleSearch(historyItem.query);
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5 bg-[#f0f0f0] text-[#0a0a0a] border border-[#ccc] cursor-pointer flex items-center gap-1"
                      >
                        {historyItem.query}
                      </button>
                    ))}
                    {!showAllHistory && remainingCount > 0 && (
                      <button
                        onClick={() => setShowAllHistory(true)}
                        className="text-xs px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5 bg-white text-[#0a0a0a] border border-dashed border-[#ccc] cursor-pointer font-bold"
                      >
                        +{remainingCount} More
                      </button>
                    )}
                    {showAllHistory && historyItems.length > 5 && (
                      <button
                        onClick={() => setShowAllHistory(false)}
                        className="text-xs px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5 bg-white text-[#0a0a0a] border border-dashed border-[#ccc] cursor-pointer font-bold"
                      >
                        Show Less
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Display the example prompt chips */}
        {showExamplePrompts && (
          <div className={searchHistory.filter(item => (item.mode || 'books') === mode).length > 0 ? "mt-4 border-t border-[#e5e5e5] pt-4" : "mt-6"}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-[#888]">
              Try one of these →
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((exampleText) => (
                <button
                  key={exampleText}
                  onClick={() => {
                    setInput(exampleText);
                    inputRef.current?.focus();
                  }}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5 bg-white text-[#0a0a0a] border-2 border-[#0a0a0a] shadow-[2px_2px_0_#0a0a0a] cursor-pointer"
                >
                  {exampleText}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Area */}

        {/* Loading Animation */}
        {loading && (
          <div className="mt-16 w-full flex justify-center py-12" ref={resultsRef}>
            <AILoadingAnimation />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 rounded-xl text-sm bg-[#fff0f0] border-2 border-[#ff4444] text-[#cc0000]">
            Error {error}
          </div>
        )}

        {/* Show Results Title */}
        {results !== null && (
          <div className="mt-16" ref={resultsRef}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-[#0a0a0a]">
                {mode === 'path' ? 'Your Learning Path' : 'Your Matches'}
              </h2>
              <button
                onClick={() => { setResults(null); setInput(''); }}
                className="text-sm font-bold underline"
              >
                Start Over
              </button>
            </div>

            {/* Display Empty State if no books found */}
            {showEmptyResultsMessage && (
              <div className="p-6 rounded-2xl text-center bg-white border-2 border-dashed border-[#ccc]">
                <div className="text-4xl mb-3"></div>
                <h3 className="font-black text-lg mb-2 text-[#0a0a0a]">No books found for "{searchedQuery}"</h3>
                <p className="text-sm mb-5 text-[#666] max-w-md mx-auto">
                  {noResultMsg || 'We couldn\'t find books matching your exact search in our library.'}
                </p>

                {/* Fallback topic buttons */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-xs font-bold text-[#888]">Try instead →</span>
                  {['python', 'machine learning', 'fiction thriller', 'self help', 'business', 'fantasy'].map(topic => (
                    <button
                      key={topic}
                      onClick={() => { setInput(topic); inputRef.current?.focus(); }}
                      className="text-xs px-3 py-1 rounded-full bg-[#f5f5f0] border-2 border-[#0a0a0a] shadow-[2px_2px_0_#0a0a0a] cursor-pointer text-[#0a0a0a]"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Display Learning Path Format */}
            {showLearningPath && (
              <div className="relative border-l-4 border-[#0a0a0a] ml-4 pl-8 space-y-12">
                {results.map((book, index) => (
                  <div key={book.id} className="relative">
                    {/* The yellow dot connecting to the timeline */}
                    <div className="absolute -left-[46px] top-4 w-6 h-6 rounded-full bg-[#f5e642] border-[3px] border-[#0a0a0a] z-10" />

                    {/* Step label */}
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-[#0a0a0a] text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                        Step {index + 1}: {book.path_level}
                      </span>
                    </div>

                    <BookResultCard book={book} />
                  </div>
                ))}
              </div>
            )}

            {/* Display Standard Grid Format */}
            {showBookGrid && (
              <div className="grid md:grid-cols-2 gap-6">
                {results.map((book, index) => (
                  <BookResultCard key={book.id} book={book} />
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
