'use client';

// ============================================================
// RecommendWizard — AI-powered book recommendation wizard.
// All 3 steps visible at once for minimal friction.
// Calls /api/recommend and shows results inline.
// ============================================================

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ── Data ─────────────────────────────────────────────────────

const GOALS = [
  { value: 'Learn a skill',      emoji: '🛠️',  label: 'Learn a Skill' },
  { value: 'Explore a topic',    emoji: '🔭',  label: 'Explore a Topic' },
  { value: 'Be entertained',     emoji: '🎭',  label: 'Be Entertained' },
  { value: 'Grow as a person',   emoji: '🌱',  label: 'Personal Growth' },
  { value: 'Be challenged',      emoji: '🧠',  label: 'Be Challenged' },
  { value: 'Relax and escape',   emoji: '🌅',  label: 'Relax & Escape' },
];

const AREAS: Record<string, { value: string; emoji: string; label: string }[]> = {
  'Learn a skill': [
    { value: 'Programming',          emoji: '💻', label: 'Programming' },
    { value: 'Data Science',         emoji: '📊', label: 'Data Science' },
    { value: 'Web Development',      emoji: '🌐', label: 'Web Dev' },
    { value: 'Machine Learning & AI',emoji: '🤖', label: 'AI & ML' },
    { value: 'Cybersecurity',        emoji: '🔐', label: 'Cybersecurity' },
    { value: 'Finance & Investing',  emoji: '💰', label: 'Finance' },
    { value: 'Marketing',            emoji: '📣', label: 'Marketing' },
    { value: 'Leadership & Management',emoji:'👥', label: 'Leadership' },
  ],
  'Explore a topic': [
    { value: 'Physics',        emoji: '⚛️',  label: 'Physics' },
    { value: 'Biology',        emoji: '🧬',  label: 'Biology' },
    { value: 'Neuroscience',   emoji: '🧠',  label: 'Neuroscience' },
    { value: 'History',        emoji: '📜',  label: 'History' },
    { value: 'Philosophy',     emoji: '🏛️',  label: 'Philosophy' },
    { value: 'Economics',      emoji: '📈',  label: 'Economics' },
    { value: 'Mathematics',    emoji: '∑',   label: 'Mathematics' },
    { value: 'Psychology',     emoji: '🔬',  label: 'Psychology' },
  ],
  'Be entertained': [
    { value: 'Science Fiction',    emoji: '🚀', label: 'Sci-Fi' },
    { value: 'Fantasy',            emoji: '🐉', label: 'Fantasy' },
    { value: 'Mystery & Thriller', emoji: '🔍', label: 'Mystery' },
    { value: 'Romance',            emoji: '💕', label: 'Romance' },
    { value: 'Horror',             emoji: '👻', label: 'Horror' },
    { value: 'Historical Fiction', emoji: '🏰', label: 'Historical' },
    { value: 'Literary Fiction',   emoji: '📖', label: 'Literary' },
    { value: 'Graphic Novels',     emoji: '🎨', label: 'Graphic Novels' },
  ],
  'Grow as a person': [
    { value: 'Self-Help',                emoji: '✨', label: 'Self-Help' },
    { value: 'Productivity & Habits',    emoji: '⏰', label: 'Productivity' },
    { value: 'Spirituality & Mindfulness',emoji:'🧘',label: 'Mindfulness' },
    { value: 'Mental Health',           emoji: '💚', label: 'Mental Health' },
    { value: 'Relationships',           emoji: '🤝', label: 'Relationships' },
    { value: 'Health & Fitness',        emoji: '🏃', label: 'Health' },
    { value: 'Philosophy',             emoji: '🏛️', label: 'Philosophy' },
    { value: 'Psychology',             emoji: '🔬', label: 'Psychology' },
  ],
  'Be challenged': [
    { value: 'Mathematics',    emoji: '∑',   label: 'Mathematics' },
    { value: 'Physics',        emoji: '⚛️',  label: 'Physics' },
    { value: 'Philosophy',     emoji: '🏛️',  label: 'Philosophy' },
    { value: 'Economics',      emoji: '📈',  label: 'Economics' },
    { value: 'Neuroscience',   emoji: '🧠',  label: 'Neuroscience' },
    { value: 'Literary Fiction',emoji:'📖',  label: 'Literary Fiction' },
    { value: 'Machine Learning & AI',emoji:'🤖',label:'AI & ML' },
    { value: 'Cloud & DevOps', emoji: '☁️', label: 'Cloud & DevOps' },
  ],
  'Relax and escape': [
    { value: 'Fantasy',            emoji: '🐉', label: 'Fantasy' },
    { value: 'Romance',            emoji: '💕', label: 'Romance' },
    { value: 'Comedy & Humor',     emoji: '😂', label: 'Humor' },
    { value: 'Historical Fiction', emoji: '🏰', label: 'Historical' },
    { value: 'Science Fiction',    emoji: '🚀', label: 'Sci-Fi' },
    { value: 'Mystery & Thriller', emoji: '🔍', label: 'Mystery' },
    { value: 'Graphic Novels',     emoji: '🎨', label: 'Graphic Novels' },
    { value: 'Spirituality & Mindfulness',emoji:'🧘',label:'Mindfulness' },
  ],
};

const STYLES = [
  { value: 'Beginner',        emoji: '🌱', label: 'Complete Beginner',   sub: 'No prior knowledge needed' },
  { value: 'Intermediate',    emoji: '📘', label: 'Some Background',     sub: 'I know the basics' },
  { value: 'Advanced',        emoji: '🚀', label: 'Deep Dive',           sub: 'I want expert-level content' },
  { value: 'Highly rated only',emoji:'⭐', label: 'Highest Rated Only',  sub: 'Only the absolute best' },
  { value: 'Quick Read',      emoji: '⚡', label: 'Quick Read',          sub: 'Under 250 pages' },
];

// ── Types ─────────────────────────────────────────────────────

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
}

// ── Chip Component ────────────────────────────────────────────

function Chip({
  selected, onClick, emoji, label, sub
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{
        background: selected ? '#0a0a0a' : '#ffffff',
        color: selected ? '#ffffff' : '#0a0a0a',
        border: `2px solid ${selected ? '#0a0a0a' : '#e5e5e5'}`,
        boxShadow: selected ? '3px 3px 0 rgba(0,0,0,0.3)' : '2px 2px 0 #e5e5e5',
        transform: selected ? 'translate(-1px, -1px)' : 'none',
        cursor: 'pointer',
      }}
    >
      <span className="text-base">{emoji}</span>
      <span>{label}</span>
      {sub && <span className="text-xs opacity-60 hidden sm:inline">· {sub}</span>}
    </button>
  );
}

// ── Result Card ───────────────────────────────────────────────

function ResultCard({ book, rank }: { book: RecommendedBook; rank: number }) {
  const [imgError, setImgError] = useState(false);
  const rating = book.expert_rating ?? book.community_rating ?? 0;

  return (
    <Link href={`/books/${book.id}`} className="block group">
      <div
        className="flex gap-4 p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: '#ffffff',
          border: '2px solid #0a0a0a',
          boxShadow: '4px 4px 0 #0a0a0a',
        }}
      >
        {/* Rank badge */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
            style={{
              background: rank === 1 ? '#f5e642' : '#f5f5f0',
              border: '2px solid #0a0a0a',
              color: '#0a0a0a',
            }}
          >
            {rank}
          </div>
        </div>

        {/* Cover */}
        <div
          className="flex-shrink-0 rounded-lg overflow-hidden"
          style={{ width: 56, height: 80, background: '#f0f0f0', border: '1px solid #e5e5e5' }}
        >
          {book.cover_image_url && !imgError ? (
            <Image
              src={book.cover_image_url}
              alt={book.title}
              width={56}
              height={80}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-sm leading-tight mb-0.5 line-clamp-2 group-hover:underline"
            style={{ color: '#0a0a0a' }}
          >
            {book.title}
          </h3>
          <p className="text-xs mb-2" style={{ color: '#666' }}>{book.author}</p>

          {/* Why this book */}
          <p
            className="text-xs leading-relaxed mb-2 line-clamp-2"
            style={{ color: '#444', fontStyle: 'italic' }}
          >
            {book.why}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {rating > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#f5e642', color: '#0a0a0a', border: '1px solid #0a0a0a' }}
              >
                ⭐ {rating.toFixed(1)}
              </span>
            )}
            {book.difficulty_level && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: '#f5f5f0', color: '#0a0a0a', border: '1px solid #e5e5e5' }}
              >
                {book.difficulty_level}
              </span>
            )}
            {book.genres && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: '#f5f5f0', color: '#0a0a0a', border: '1px solid #e5e5e5' }}
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

// ── Main Wizard ───────────────────────────────────────────────

export default function RecommendWizard() {
  const [goal, setGoal]   = useState<string | null>(null);
  const [area, setArea]   = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<RecommendedBook[] | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const currentAreas = goal ? (AREAS[goal] ?? []) : [];
  const canSubmit = !!goal && !!area;

  const handleGoalChange = (g: string) => {
    setGoal(prev => prev === g ? null : g);
    setArea(null); // Reset area when goal changes
    setResults(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, area, style }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to get recommendations');
      setResults(data.books ?? []);

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* ── Wizard Card ── */}
      <div
        className="rounded-3xl p-6 sm:p-8"
        style={{
          background: '#ffffff',
          border: '3px solid #0a0a0a',
          boxShadow: '8px 8px 0 #0a0a0a',
        }}
      >
        {/* Step 1: Goal */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#888' }}>
            01 — What do you want from this book?
          </p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <Chip
                key={g.value}
                selected={goal === g.value}
                onClick={() => handleGoalChange(g.value)}
                emoji={g.emoji}
                label={g.label}
              />
            ))}
          </div>
        </div>

        {/* Step 2: Area (only shown after goal is selected) */}
        {goal && currentAreas.length > 0 && (
          <div
            className="mb-6 pt-6"
            style={{ borderTop: '2px dashed #e5e5e5' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#888' }}>
              02 — Pick your area
            </p>
            <div className="flex flex-wrap gap-2">
              {currentAreas.map(a => (
                <Chip
                  key={a.value}
                  selected={area === a.value}
                  onClick={() => setArea(prev => prev === a.value ? null : a.value)}
                  emoji={a.emoji}
                  label={a.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Style (only shown after area is selected) */}
        {area && (
          <div
            className="mb-6 pt-6"
            style={{ borderTop: '2px dashed #e5e5e5' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#888' }}>
              03 — Your reading style <span className="font-normal normal-case text-xs" style={{ color: '#aaa' }}>(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <Chip
                  key={s.value}
                  selected={style === s.value}
                  onClick={() => setStyle(prev => prev === s.value ? null : s.value)}
                  emoji={s.emoji}
                  label={s.label}
                  sub={s.sub}
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        {canSubmit && (
          <div className="pt-4" style={{ borderTop: '2px solid #e5e5e5' }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-base transition-all flex items-center justify-center gap-2"
              style={{
                background: loading ? '#ccc' : '#0a0a0a',
                color: '#ffffff',
                border: '2px solid #0a0a0a',
                boxShadow: loading ? 'none' : '4px 4px 0 rgba(0,0,0,0.3)',
                cursor: loading ? 'wait' : 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI is finding your perfect books...
                </>
              ) : (
                <>✨ Find My Perfect Books</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          className="mt-4 p-4 rounded-xl text-sm"
          style={{ background: '#fff0f0', border: '2px solid #ff4444', color: '#cc0000' }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── Results ── */}
      {results !== null && (
        <div ref={resultsRef} className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-xl font-black"
              style={{ color: '#0a0a0a', fontFamily: 'var(--font-bebas)', letterSpacing: '0.02em', fontSize: 28 }}
            >
              {results.length > 0 ? `📚 Your ${results.length} Perfect Matches` : '😔 No Matches Found'}
            </h2>
            {results.length > 0 && (
              <button
                onClick={() => { setGoal(null); setArea(null); setStyle(null); setResults(null); }}
                className="text-xs underline"
                style={{ color: '#666', cursor: 'pointer' }}
              >
                Start over
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <p className="text-sm" style={{ color: '#666' }}>
              Try adjusting your selections above, or use our{' '}
              <Link href="/recommend" className="underline font-medium">AI search page</Link> to describe what you want in your own words.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((book, i) => (
                <ResultCard key={book.id} book={book} rank={i + 1} />
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/recommend"
              className="inline-flex items-center gap-2 text-sm font-medium underline"
              style={{ color: '#444' }}
            >
              🔍 Describe exactly what you want in your own words →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
