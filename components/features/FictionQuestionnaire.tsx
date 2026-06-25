'use client';

// ============================================================
// FictionQuestionnaire — 2-step Fiction Finder.
// Step 1: Pick one or more genres (multi-select).
// Step 2: Pick book length.
// Submits as URL params → triggers server re-fetch.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LengthCategory } from '@/types/database';

type Step = 1 | 2;

interface Answers {
  genre_slugs: string[];
  length_category: LengthCategory | null;
}

// These map directly to genre slugs in the DB.
const GENRES = [
  { slug: 'horror',             label: 'Horror',       description: 'Scary & suspenseful' },
  { slug: 'comedy-humor',       label: 'Comedy',       description: 'Funny & lighthearted' },
  { slug: 'fantasy',            label: 'Fantasy',      description: 'Magic & other worlds' },
  { slug: 'science-fiction',    label: 'Sci-Fi',       description: 'Space & the future' },
  { slug: 'mystery-thriller',   label: 'Mystery',      description: 'Puzzles & twists' },
  { slug: 'romance',            label: 'Romance',      description: 'Love stories' },
  { slug: 'historical-fiction', label: 'History',      description: 'Stories from the past' },
  { slug: 'literary-fiction',   label: 'Literary',     description: 'Deep & meaningful' },
];

const LENGTHS: { value: LengthCategory; label: string; sub: string }[] = [
  { value: 'Quick Read', label: 'Short & Fast',  sub: 'Under 300 pages' },
  { value: 'Standard',   label: 'Normal Size',   sub: 'Not too long' },
  { value: 'Epic',       label: 'Super Long',    sub: 'Takes a month to read' },
];

interface GenreTileProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  description: string;
}

function GenreTile({ selected, onClick, label, description }: GenreTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 p-4 text-center
        transition-all focus-visible:outline-none border-[3px] border-[#0a0a0a] relative
        ${selected
          ? 'bg-[#f5e642] shadow-[4px_4px_0_#0a0a0a] translate-x-[-2px] translate-y-[-2px]'
          : 'bg-white hover:bg-[#f5f5f0] shadow-none hover:shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5 hover:-translate-x-0.5'
        }
      `}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-[#0a0a0a] rounded-full flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
      <span className="text-sm font-black uppercase tracking-tight text-[#0a0a0a]">{label}</span>
      <span className="text-xs font-medium text-[#555]">{description}</span>
    </button>
  );
}

interface LengthButtonProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}

function LengthButton({ selected, onClick, label, sub }: LengthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-5 text-center
        transition-all focus-visible:outline-none border-[3px] border-[#0a0a0a]
        ${selected
          ? 'bg-[#f5e642] shadow-[4px_4px_0_#0a0a0a] translate-x-[-2px] translate-y-[-2px]'
          : 'bg-white hover:bg-[#f5f5f0] shadow-none hover:shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5 hover:-translate-x-0.5'
        }
      `}
    >
      <span className="text-sm font-black uppercase tracking-tight text-[#0a0a0a]">{label}</span>
      <span className="text-xs font-bold text-[#555] uppercase tracking-wider">{sub}</span>
    </button>
  );
}

export default function FictionQuestionnaire() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<Answers>({
    genre_slugs: [],
    length_category: null,
  });

  const progress = ((step - 1) / 1) * 100;

  const toggleGenre = (slug: string) => {
    setAnswers(prev => ({
      ...prev,
      genre_slugs: prev.genre_slugs.includes(slug)
        ? prev.genre_slugs.filter(s => s !== slug)
        : [...prev.genre_slugs, slug],
    }));
  };

  const setLength = (value: LengthCategory) => {
    setAnswers(prev => ({
      ...prev,
      length_category: prev.length_category === value ? null : value,
    }));
  };

  const handleNext = () => {
    if (step < 2) setStep(2);
  };

  const handleBack = () => {
    if (step > 1) setStep(1);
  };

  const handleSubmit = () => {
    const params = new URLSearchParams();
    if (answers.genre_slugs.length > 0) params.set('genres', answers.genre_slugs.join(','));
    if (answers.length_category) params.set('length', answers.length_category);
    router.push(`/fiction?${params.toString()}`);
  };

  const STEP_TITLES = [
    'What type of story?',
    'How long should it be?',
  ];

  const canProceed = step === 1 ? answers.genre_slugs.length > 0 : true;

  return (
    <div className="max-w-3xl mx-auto px-2">
      {/* Progress bar */}
      <div className="w-full h-1 bg-[#e5e5e5] rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-[#0a0a0a] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Indicator & Title */}
      <div className="text-center mb-10">
        <div className="inline-block px-4 py-1 mb-4 text-xs font-black uppercase tracking-widest text-[#0a0a0a] bg-[#f5f5f0] border-[3px] border-[#0a0a0a] rounded-full shadow-[3px_3px_0_#0a0a0a]">
          Step {step} of 2
        </div>
        <h2 className="font-black text-[#0a0a0a]" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '0.02em' }}>
          {STEP_TITLES[step - 1]}
        </h2>
        {step === 1 && (
          <p className="text-sm text-[#555] mt-2">
            Pick one or more genres — you can mix Horror and Comedy, or anything you like!
          </p>
        )}
      </div>

      {/* Step 1: Genre Multi-Select */}
      {step === 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-4">
          {GENRES.map((g) => (
            <GenreTile
              key={g.slug}
              label={g.label}
              description={g.description}
              selected={answers.genre_slugs.includes(g.slug)}
              onClick={() => toggleGenre(g.slug)}
            />
          ))}
        </div>
      )}

      {/* Step 2: Length */}
      {step === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
          {LENGTHS.map((l) => (
            <LengthButton
              key={l.value}
              label={l.label}
              sub={l.sub}
              selected={answers.length_category === l.value}
              onClick={() => setLength(l.value)}
            />
          ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-12 gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center px-6 py-3 font-bold text-sm transition-all bg-white text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"
          style={{ opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? 'none' : 'auto' }}
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {[1, 2].map((s) => (
            <span
              key={s}
              className={`w-3 h-3 rounded-full border-[2px] border-[#0a0a0a] transition-colors ${
                s <= step ? 'bg-[#0a0a0a]' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {step < 2 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="inline-flex items-center px-8 py-3 font-black uppercase tracking-wider text-sm transition-all bg-[#f5e642] text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center px-8 py-3 font-black uppercase tracking-wider text-sm transition-all bg-[#0a0a0a] text-[#f5e642] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
          >
            Find My Books ✦
          </button>
        )}
      </div>

      {/* Selected genres pill summary */}
      {step === 1 && answers.genre_slugs.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {answers.genre_slugs.map(slug => {
            const g = GENRES.find(g => g.slug === slug);
            return (
              <span key={slug} className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-[#0a0a0a] text-[#f5e642]">
                {g?.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
