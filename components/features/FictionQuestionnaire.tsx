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
  { value: 'Dark', label: 'Dark & Gritty' },
  { value: 'Cozy', label: 'Cozy & Warm' },
  { value: 'Mind-Bending', label: 'Mind-Bending' },
  { value: 'Romantic', label: 'Romantic' },
  { value: 'Thrilling', label: 'Thrilling' },
  { value: 'Adventurous', label: 'Adventurous' },
  { value: 'Funny', label: 'Comedy & Humor' },
  { value: 'Atmospheric', label: 'Atmospheric' },
];

const PLOTS = [
  { value: 'Mystery',        label: 'Mystery / Whodunit' },
  { value: 'Epic Quest',     label: 'Epic Quest / Adventure' },
  { value: 'Dystopia',       label: 'Dystopia / Sci-Fi' },
  { value: 'Romance',        label: 'Slow Burn Romance' },
  { value: 'Horror',         label: 'Horror / Supernatural' },
  { value: 'Coming-of-Age',  label: 'Coming-of-Age' },
  { value: 'Political Intrigue', label: 'Political Intrigue' },
  { value: 'Satire',         label: 'Satire / Comedy' },
];

const LENGTHS = [
  { value: 'Quick Read', label: 'Quick Read',  sub: 'Under 250 pages' },
  { value: 'Standard',   label: 'Standard',    sub: '250–500 pages' },
  { value: 'Epic',       label: 'Epic',        sub: '500+ pages' },
];

const STEP_TITLES = [
  "What's your vibe?",
  "What kind of plot?",
  "How much do you want to read?",
];

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}

function OptionButton({ selected, onClick, label, sub }: OptionButtonProps) {
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
      {sub && <span className="text-xs font-bold text-[#555] uppercase tracking-wider">{sub}</span>}
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
    <div className="max-w-3xl mx-auto px-2">
      {/* Step Indicator & Title */}
      <div className="text-center mb-10">
        <div className="inline-block px-4 py-1 mb-4 text-xs font-black uppercase tracking-widest text-[#0a0a0a] bg-[#f5f5f0] border-[3px] border-[#0a0a0a] rounded-full shadow-[3px_3px_0_#0a0a0a]">
          Step {step} of 3
        </div>
        <h2 className="font-black text-[#0a0a0a]" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '0.02em' }}>
          {STEP_TITLES[step - 1]}
        </h2>
      </div>

      {/* Options Grid */}
      {step === 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VIBES.map((v) => (
            <OptionButton
              key={v.value}
              selected={answers.vibe === v.value}
              onClick={() => setAnswer('vibe', v.value)}
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
              label={l.label}
              sub={l.sub}
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
          disabled={step === 1}
          style={{ opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? 'none' : 'auto' }}
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {/* Step dots */}
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`w-3 h-3 rounded-full border-[2px] border-[#0a0a0a] transition-colors ${
                s <= step ? 'bg-[#0a0a0a]' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center px-8 py-3 font-black uppercase tracking-wider text-sm transition-all bg-[#f5e642] text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center px-8 py-3 font-black uppercase tracking-wider text-sm transition-all bg-[#0a0a0a] text-[#f5e642] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
          >
            Find My Books
          </button>
        )}
      </div>
    </div>
  );
}
