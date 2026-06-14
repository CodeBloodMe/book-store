import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getAllGenres,
  getTopRatedBooks,
} from '@/lib/queries';
import BookCard from '@/components/ui/BookCard';
import GenreCard from '@/components/ui/GenreCard';
import RecommendWizard from '@/components/features/RecommendWizard';
import type { Genre } from '@/types/database';
import { Sparkles, Search, GraduationCap, BookOpen, Sprout } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ChapterOne — Find Your Perfect Book with AI',
  description:
    'Tell us what you want and our AI finds the perfect book for you instantly. 1,200+ curated books across every genre.',
};

export const revalidate = 0;

export default async function HomePage() {
  const [genres, topRated] = await Promise.all([
    getAllGenres().catch(() => []),
    getTopRatedBooks(8).catch(() => []),
  ]);

  const grouped = genres.reduce<Record<string, Genre[]>>((acc, g) => {
    const cat = g.super_categories?.name ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(g);
    return acc;
  }, {});
  const catOrder = ['Learning', 'Fiction', 'Personal Growth'];

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          HERO — AI Recommendation Wizard
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 px-4" style={{ background: '#f5f5f0' }}>
        <div className="max-w-4xl mx-auto">
          {/* Heading */}
          <div className="mb-10 text-center flex flex-col items-center">
            <div
              className="inline-block text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4"
              style={{
                background: '#f5e642',
                color: '#0a0a0a',
                border: '2px solid #0a0a0a',
                boxShadow: '3px 3px 0 #0a0a0a',
              }}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles size={14} /> AI-Powered Book Finder
              </span>
            </div>
            <h1
              className="font-black leading-none mb-2"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(36px, 10vw, 100px)',
                letterSpacing: '-0.02em',
                color: '#0a0a0a',
              }}
            >
              ChapterOne
            </h1>
            <h2 className="text-xl md:text-2xl font-bold mb-4 uppercase tracking-wide" style={{ color: '#0a0a0a' }}>
              Find Your Perfect Book
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: '#555' }}>
              Tell us what you want. Our AI instantly matches you with the best books from our 1,200+ curated collection.
            </p>
          </div>

          {/* The Wizard */}
          <RecommendWizard />

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: '#ddd' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>or describe it yourself</span>
            <div className="flex-1 h-px" style={{ background: '#ddd' }} />
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/recommend"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5"
              style={{
                background: '#0a0a0a',
                color: '#f5e642',
                border: '2px solid #0a0a0a',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.2)',
              }}
            >
              <Search size={16} /> Type exactly what you want →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TOP RATED BOOKS
          ══════════════════════════════════════════════════════ */}
      {topRated.length > 0 && (
        <section className="py-16" style={{ background: '#ffffff', borderTop: '3px solid #0a0a0a' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between mb-8 gap-4">
              <div>
                <h2
                  className="font-black mb-1"
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 'clamp(28px, 4vw, 40px)',
                    letterSpacing: '0.02em',
                    color: '#0a0a0a',
                  }}
                >
                  Highest Rated Right Now
                </h2>
                <p className="text-sm" style={{ color: '#777' }}>
                  Books with the strongest expert consensus across all genres.
                </p>
              </div>
              <Link
                href="/#genres"
                className="flex-shrink-0 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full"
                style={{
                  background: '#f5f5f0',
                  color: '#0a0a0a',
                  border: '2px solid #0a0a0a',
                  boxShadow: '3px 3px 0 #0a0a0a',
                }}
              >
                All Genres →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {topRated.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          GENRE BROWSER
          ══════════════════════════════════════════════════════ */}
      <section id="genres" className="py-16" style={{ background: '#f5f5f0', borderTop: '3px solid #0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2
              className="font-black mb-2"
              style={{
                fontFamily: 'var(--font-bebas)',
                fontSize: 'clamp(28px, 4vw, 40px)',
                letterSpacing: '0.02em',
                color: '#0a0a0a',
              }}
            >
              Browse by Genre
            </h2>
            <p className="text-sm" style={{ color: '#777' }}>
              Every genre curated with the absolute best books — ranked by expert consensus.
            </p>
          </div>

          {catOrder.filter((c) => grouped[c]).map((cat) => (
            <div key={cat} className="mb-12">
              <h3
                className="inline-block text-sm font-bold uppercase tracking-widest mb-6 px-5 py-2"
                style={{
                  color: '#0a0a0a',
                  background: '#ffffff',
                  border: '3px solid #0a0a0a',
                  borderRadius: '9999px',
                  boxShadow: '4px 4px 0 #0a0a0a',
                }}
              >
                <span className="inline-flex items-center gap-2">
                  {cat === 'Learning' && <GraduationCap size={16} />}
                  {cat === 'Fiction' && <BookOpen size={16} />}
                  {cat === 'Personal Growth' && <Sprout size={16} />} 
                  {cat}
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {grouped[cat].slice(0, 5).map((genre) => (
                  <GenreCard key={genre.id} genre={genre} />
                ))}
              </div>
              {grouped[cat].length > 5 && (
                <div className="mt-4">
                  <details>
                    <summary
                      className="text-xs font-bold uppercase tracking-widest cursor-pointer inline-flex items-center gap-1"
                      style={{ color: '#888', listStyle: 'none' }}
                    >
                      + {grouped[cat].length - 5} more {cat} genres
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                      {grouped[cat].slice(5).map((genre) => (
                        <GenreCard key={genre.id} genre={genre} />
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          AI RECOMMEND CTA
          ══════════════════════════════════════════════════════ */}
      <section
        className="py-16"
        style={{ background: '#0a0a0a', borderTop: '3px solid #0a0a0a' }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#555' }}>
            Can&apos;t find what you want?
          </p>
          <h2
            className="font-black leading-tight mb-4"
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 'clamp(36px, 5vw, 60px)',
              letterSpacing: '0.02em',
              color: '#ffffff',
            }}
          >
            Just Tell Us What You Want
          </h2>
          <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: '#888' }}>
            Type anything — &ldquo;a beginner book on investing&rdquo; or &ldquo;something like Harry Potter but darker&rdquo;. Our AI understands.
          </p>
          <Link
            href="/recommend"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base transition-all hover:-translate-y-1"
            style={{
              background: '#f5e642',
              color: '#0a0a0a',
              border: '3px solid #f5e642',
              boxShadow: '5px 5px 0 rgba(245,230,66,0.3)',
            }}
          >
            <Sparkles size={18} /> Start AI Book Search
          </Link>
        </div>
      </section>
    </>
  );
}