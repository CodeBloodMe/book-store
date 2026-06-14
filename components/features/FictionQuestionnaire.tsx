'use client';

// ============================================================
// FictionQuestionnaire — 3-step Fiction Taste-Maker.
// Collects vibe, plot type, and length preference.
// Updates URL search params on submit, triggering server re-fetch.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3;

interface Answers {
  vibe: string | null;
  plot_type: string | null;
  length_category: string | null;
}

const VIBES = [
  { value: 'Dark', label: 'Dark & Gritty',    emoji: '🌑' },
  { value: 'Cozy', label: 'Cozy & Warm',       emoji: '☕' },
  { value: 'Mind-Bending', label: 'Mind-Bending', emoji: '🌀' },
  { value: 'Romantic', label: 'Romantic',       emoji: '💕' },
  { value: 'Thrilling', label: 'Thrilling',     emoji: '⚡' },
  { value: 'Adventurous', label: 'Adventurous', emoji: '🗺️' },
  { value: 'Funny', label: 'Comedy & Humor',   emoji: '😂' },
  { value: 'Atmospheric', label: 'Atmospheric', emoji: '🌫️' },
];

const PLOTS = [
  { value: 'Mystery',        label: 'Mystery / Whodunit',    emoji: '🔍' },
  { value: 'Epic Quest',     label: 'Epic Quest / Adventure', emoji: '⚔️' },
  { value: 'Dystopia',       label: 'Dystopia / Sci-Fi',     emoji: '🤖' },
  { value: 'Romance',        label: 'Slow Burn Romance',     emoji: '💞' },
  { value: 'Horror',         label: 'Horror / Supernatural', emoji: '👻' },
  { value: 'Coming-of-Age',  label: 'Coming-of-Age',         emoji: '🌱' },
  { value: 'Political Intrigue', label: 'Political Intrigue', emoji: '👑' },
  { value: 'Satire',         label: 'Satire / Comedy',       emoji: '🎭' },
];

const LENGTHS = [
  { value: 'Quick Read', label: 'Quick Read',  sub: 'Under 250 pages',  emoji: '📖' },
  { value: 'Standard',   label: 'Standard',    sub: '250–500 pages',    emoji: '📗' },
  { value: 'Epic',       label: 'Epic',        sub: '500+ pages',       emoji: '📚' },
];

const STEP_TITLES = [
  "What's your vibe?",
  "What kind of plot?",
  "How much do you want to read?",
];

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  sub?: string;
}
function OptionButton({ selected, onClick, emoji, label, sub }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-4 rounded-xl text-center
        transition-all duration-150 focus-visible:outline"
      style={{
        background: selected ? 'var(--indigo-500)22' : 'var(--bg-surface)',
        border: `2px solid ${selected ? 'var(--indigo-500)' : 'var(--border-subtle)'}`,
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      <span className="text-2xl" role="img" aria-hidden="true">{emoji}</span>
      <span className="text-sm font-semibold">{label}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
    </button>
  );
}

export default function FictionQuestionnaire() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>(1);
  const [answers, setAnswers] = useState<Answers>({
    vibe: null,
    plot_type: null,
    length_category: null,
  });

  const progress = ((step - 1) / 3) * 100;

  const setAnswer = (key: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }));
  };

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleSubmit = () => {
    const params = new URLSearchParams();
    if (answers.vibe)            params.set('vibe', answers.vibe);
    if (answers.plot_type)       params.set('plot', answers.plot_type);
    if (answers.length_category) params.set('length', answers.length_category);
    router.push(`/fiction?${params.toString()}`);
  };

  return (
    <div
      className="rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
    >
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Step {step} of 3
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {Math.round(progress)}% done
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(step / 3) * 100}%`,
              background: 'linear-gradient(90deg, var(--indigo-500), var(--gold-500))',
            }}
          />
        </div>
      </div>

      {/* Step Title */}
      <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
        {STEP_TITLES[step - 1]}
      </h2>

      {/* Options Grid */}
      {step === 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VIBES.map((v) => (
            <OptionButton
              key={v.value}
              selected={answers.vibe === v.value}
              onClick={() => setAnswer('vibe', v.value)}
              emoji={v.emoji}
              label={v.label}
            />
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PLOTS.map((p) => (
            <OptionButton
              key={p.value}
              selected={answers.plot_type === p.value}
              onClick={() => setAnswer('plot_type', p.value)}
              emoji={p.emoji}
              label={p.label}
            />
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-3 gap-4">
          {LENGTHS.map((l) => (
            <OptionButton
              key={l.value}
              selected={answers.length_category === l.value}
              onClick={() => setAnswer('length_category', l.value)}
              emoji={l.emoji}
              label={l.label}
              sub={l.sub}
            />
          ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-7 gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="btn-ghost text-sm"
          disabled={step === 1}
          style={{ opacity: step === 1 ? 0.4 : 1 }}
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          {/* Step dots */}
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className="w-2 h-2 rounded-full transition-colors"
              style={{
                background: s <= step ? 'var(--indigo-500)' : 'var(--border-default)',
              }}
            />
          ))}
        </div>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary text-sm"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary text-sm"
          >
            Find My Books ✨
          </button>
        )}
      </div>
    </div>
  );
}
