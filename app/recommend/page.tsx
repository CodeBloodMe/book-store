'use client';


// /recommend — Free-text AI recommendation page
// User types what they want in plain English → Gemini + DB


import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AILoadingAnimation from '@/components/ui/AILoadingAnimation';

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
}

type SearchMode = 'books' | 'path';

const EXAMPLES = [
  "A dark academia thriller set in winter",
  "Cozy fantasy with a warm cup of tea vibe",
  "A rainy Sunday in a Parisian cafe",
  "Epic world-building but the protagonist is a bit chaotic",
  "Heartbreaking romance that will destroy me emotionally",
  "Books that feel like a Studio Ghibli movie",
];

function BookResultCard({ book, rank }: { book: RecommendedBook; rank: number }) {
  const [imgError, setImgError] = useState(false);
  const rating = book.expert_rating ?? book.community_rating ?? 0;

  return (
    <Link href={`/books/${book.id}`}>
      <div
        className="group flex gap-4 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1 cursor-pointer"
        style={{
          background: '#ffffff',
          border: '2px solid #0a0a0a',
          boxShadow: '5px 5px 0 #0a0a0a',
        }}
      >
        {/* Rank */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
          style={{
            background: rank === 1 ? '#f5e642' : rank === 2 ? '#e8e8e8' : '#f5f5f0',
            border: '2px solid #0a0a0a',
            color: '#0a0a0a',
          }}
        >
          {rank}
        </div>

        {/* Cover */}
        <div
          className="flex-shrink-0 rounded-lg overflow-hidden"
          style={{ width: 64, height: 92, background: '#f0f0ee', border: '2px solid #e5e5e5' }}
        >
          {book.cover_image_url && !imgError ? (
            <Image
              src={book.cover_image_url}
              alt={book.title}
              width={64}
              height={92}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">📚</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-black text-base leading-snug mb-1 group-hover:underline line-clamp-2"
            style={{ color: '#0a0a0a' }}
          >
            {book.title}
          </h3>
          <p className="text-sm mb-2 font-medium" style={{ color: '#555' }}>
            by <Link href={`/authors/${encodeURIComponent(book.author)}`} className="hover:underline hover:text-[#0a0a0a]">{book.author}</Link>
          </p>

          <p
            className="text-sm leading-relaxed mb-3 line-clamp-2"
            style={{ color: '#333', fontStyle: 'italic', borderLeft: '3px solid #f5e642', paddingLeft: 8 }}
          >
            {book.why}
          </p>

          <div className="flex flex-wrap gap-2 items-center">
            {rating > 0 && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: '#f5e642', color: '#0a0a0a', border: '2px solid #0a0a0a' }}
              >
                ⭐ {rating.toFixed(1)}
              </span>
            )}
            {book.difficulty_level && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: '#f5f5f0', color: '#0a0a0a', border: '1px solid #ddd' }}
              >
                {book.difficulty_level}
              </span>
            )}
            {book.genres && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: '#f5f5f0', color: '#0a0a0a', border: '1px solid #ddd' }}
              >
                {book.genres.icon} {book.genres.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RecommendPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendedBook[] | null>(null);
  const [noResultMsg, setNoResultMsg] = useState('');
  const [mode, setMode] = useState<SearchMode>('books');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery ?? input;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setNoResultMsg('');
    setSearchedQuery(q.trim());

    try {
      const endpoint = mode === 'path' ? '/api/recommend-path' : '/api/recommend';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const books = data.books ?? [];
      setResults(books);
      if (books.length === 0 && data.message) {
        setNoResultMsg(data.message);
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f0' }}>
      {/* Header */}
      <div
        className="py-12 px-4"
        style={{ background: '#0a0a0a', borderBottom: '3px solid #0a0a0a' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <Link href="/" className="text-xs font-bold uppercase tracking-widest mb-4 inline-block" style={{ color: '#888' }}>
            ← Back to ChapterOne
          </Link>
          <h1
            className="font-black leading-tight mb-4 flex items-center justify-center gap-4"
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 'clamp(40px, 7vw, 72px)',
              letterSpacing: '0.02em',
              color: '#ffffff',
            }}
          >
            <span className="text-[#f5e642]">✨</span> Vibe Check
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#aaa' }}>
            Describe the mood, aesthetic, or specific trope you're craving. Our AI searches real books
            to match your exact vibe right now.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-3xl mx-auto px-4 -mt-6">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full p-1" style={{ background: '#f5f5f0', border: '2px solid #0a0a0a' }}>
            <button
              onClick={() => setMode('books')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'books' ? 'bg-[#0a0a0a] text-white' : 'text-[#555] hover:text-[#0a0a0a]'}`}
            >
              Single Books
            </button>
            <button
              onClick={() => setMode('path')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'path' ? 'bg-[#0a0a0a] text-white' : 'text-[#555] hover:text-[#0a0a0a]'}`}
            >
              Learning Path
            </button>
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{
            background: '#ffffff',
            border: '3px solid #0a0a0a',
            boxShadow: '6px 6px 0 #0a0a0a',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
            placeholder="e.g. A cozy sci-fi about a space cafe, or a book that feels like autumn in New York..."
            rows={3}
            className="w-full resize-none text-base outline-none"
            style={{
              background: 'transparent',
              color: '#0a0a0a',
              border: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.6',
            }}
          />
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '2px dashed #e5e5e5' }}>
            <span className="text-xs" style={{ color: '#aaa' }}>Press Enter or click the button</span>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all"
              style={{
                background: loading || !input.trim() ? '#ddd' : '#0a0a0a',
                color: '#fff',
                border: '2px solid #0a0a0a',
                boxShadow: loading || !input.trim() ? 'none' : '3px 3px 0 rgba(0,0,0,0.3)',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
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

        {/* Example prompts */}
        {!results && !loading && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#888' }}>
              Try one of these →
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => { 
                    setInput(ex); 
                    inputRef.current?.focus(); 
                  }}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#ffffff',
                    color: '#0a0a0a',
                    border: '2px solid #0a0a0a',
                    boxShadow: '2px 2px 0 #0a0a0a',
                    cursor: 'pointer',
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Animation */}
        {loading && (
          <div className="mt-16" ref={resultsRef}>
            <AILoadingAnimation />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: '#fff0f0', border: '2px solid #ff4444', color: '#cc0000' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {results !== null && (
          <div className="mt-16" ref={resultsRef}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black" style={{ color: '#0a0a0a' }}>
                {mode === 'path' ? 'Your Learning Path' : 'Your Matches'}
              </h2>
              <button 
                onClick={() => { setResults(null); setInput(''); }}
                className="text-sm font-bold underline"
              >
                Start Over
              </button>
            </div>

            {results.length === 0 ? (
              <div
                className="p-6 rounded-2xl text-center"
                style={{ background: '#fff', border: '2px dashed #ccc' }}
              >
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-black text-lg mb-2" style={{ color: '#0a0a0a' }}>No books found for &ldquo;{searchedQuery}&rdquo;</h3>
                <p className="text-sm mb-5" style={{ color: '#666', maxWidth: 400, margin: '0 auto 16px' }}>
                  {noResultMsg || 'We couldn\'t find books matching your exact search in our library.'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-xs font-bold" style={{ color: '#888' }}>Try instead →</span>
                  {['python', 'machine learning', 'fiction thriller', 'self help', 'business', 'fantasy'].map(s => (
                    <button
                      key={s}
                      onClick={() => { 
                        setInput(s); 
                        inputRef.current?.focus(); 
                      }}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ background: '#f5f5f0', border: '2px solid #0a0a0a', boxShadow: '2px 2px 0 #0a0a0a', cursor: 'pointer', color: '#0a0a0a' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : mode === 'path' ? (
              <div className="relative border-l-4 border-[#0a0a0a] ml-4 pl-8 space-y-12">
                {results.map((book, i) => (
                  <div key={book.id} className="relative">
                    {/* Step indicator dot */}
                    <div className="absolute -left-[46px] top-4 w-6 h-6 rounded-full bg-[#f5e642] border-[3px] border-[#0a0a0a] z-10" />
                    
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-[#0a0a0a] text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                        Step {i + 1}: {book.path_level}
                      </span>
                    </div>
                    
                    <BookResultCard book={book} rank={i + 1} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {results.map((book, i) => (
                  <BookResultCard key={book.id} book={book} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
