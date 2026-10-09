'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, X, Book, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import GeneratedCover from '@/components/ui/GeneratedCover';

// --- Types ---
type QuizAnswers = {
  mood?: string;
  pace?: string;
  complexity?: string;
  era?: string;
  length?: string;
};

interface MysteryBook {
  bookId: string;
  vibe: string;
  lengthCategory: string;
  difficultyLevel: string;
  expertRating: number;
  communityRating: number;
  genreName: string;
  genreColor: string;
  descriptionTeaser: string;
  tags: string[];
  matchScore: number;
}

interface RevealedBook {
  id: string;
  title: string;
  author: string;
  cover_image_url: string;
  description: string;
}

interface QuizQuestion {
  id: keyof QuizAnswers;
  question: string;
  options: { label: string; value: string; emoji: string }[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'mood',
    question: 'How do you want to feel?',
    options: [
      { label: 'Adventurous', value: 'adventurous', emoji: '⚔️' },
      { label: 'Contemplative', value: 'contemplative', emoji: '🤔' },
      { label: 'Escapist', value: 'escapist', emoji: '🌌' },
      { label: 'Thrilled', value: 'thrilling', emoji: '🎢' },
    ],
  },
  {
    id: 'pace',
    question: 'What pacing do you prefer?',
    options: [
      { label: 'Fast (Sprint)', value: 'fast', emoji: '🏃' },
      { label: 'Moderate (Jog)', value: 'moderate', emoji: '🚶' },
      { label: 'Slow (Stroll)', value: 'slow', emoji: '🧘' },
    ],
  },
  {
    id: 'complexity',
    question: 'How complex should it be?',
    options: [
      { label: 'Simple & Fun', value: 'simple', emoji: '🎈' },
      { label: 'Layered', value: 'layered', emoji: '🧅' },
      { label: 'Brain-Melting', value: 'complex', emoji: '🧠' },
    ],
  },
  {
    id: 'era',
    question: 'Pick an era',
    options: [
      { label: 'Classic', value: 'classic', emoji: '🏛️' },
      { label: 'Modern', value: 'modern', emoji: '🏙️' },
      { label: 'Any', value: 'any', emoji: '🕰️' },
    ],
  },
  {
    id: 'length',
    question: 'How long?',
    options: [
      { label: 'Quick Read', value: 'quick read', emoji: '⏱️' },
      { label: 'Standard', value: 'standard', emoji: '📖' },
      { label: 'Epic', value: 'epic', emoji: '📚' },
    ],
  },
];

export default function BlindDateClient() {
  const [step, setStep] = useState<'intro' | 'quiz' | 'loading' | 'mystery' | 'revealed'>('intro');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  
  const [mysteryMatch, setMysteryMatch] = useState<MysteryBook | null>(null);
  const [revealedBook, setRevealedBook] = useState<RevealedBook | null>(null);
  const [stats, setStats] = useState({ acceptedDates: 0, datesThisWeek: 0 });
  const [error, setError] = useState<string | null>(null);

  // Fetch stats on load
  useEffect(() => {
    fetch('/api/blind-date/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(() => {});
  }, []);

  const handleAnswer = (value: string) => {
    const question = QUIZ_QUESTIONS[currentQuestionIdx];
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    if (currentQuestionIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: QuizAnswers) => {
    setStep('loading');
    setError(null);
    try {
      const res = await fetch('/api/blind-date/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...finalAnswers }),
      });
      const data = await res.json();
      
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to match');
      if (!data.found) throw new Error(data.message || 'No match found');
      
      setMysteryMatch(data.mystery);
      // Fake a dramatic 3s loading time
      setTimeout(() => setStep('mystery'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('intro');
    }
  };

  const handleAccept = async () => {
    if (!mysteryMatch) return;
    
    // Optimistically go to reveal step (shows unblurring)
    setStep('revealed');
    
    try {
      const res = await fetch('/api/blind-date/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, bookId: mysteryMatch.bookId, accepted: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setRevealedBook(data.book);
      // Update stats
      setStats(s => ({ ...s, acceptedDates: s.acceptedDates + 1 }));
    } catch {
      // Revert if failed
      setStep('mystery');
      setError('Failed to reveal book. Try again.');
    }
  };

  const handleReject = async () => {
    if (!mysteryMatch) return;
    setStep('loading');
    try {
      await fetch('/api/blind-date/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, bookId: mysteryMatch.bookId, accepted: false }),
      });
      // Just fetch another match immediately
      submitQuiz(answers);
    } catch {
      setStep('mystery');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f5f0] flex flex-col items-center justify-center p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />

      <div className="w-full max-w-xl relative z-10">
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-center text-sm font-medium">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* --- STEP 1: INTRO --- */}
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border-2 border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a] rounded-full text-xs font-black uppercase tracking-widest text-[#0a0a0a] mb-8">
                <Sparkles className="w-3.5 h-3.5 text-[#0a0a0a]" />
                AI MATCHMAKER
              </div>
              <h1 className="font-black text-[#0a0a0a] mb-6 tracking-tight leading-none" style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(50px, 12vw, 120px)' }}>
                BLIND DATE<br/>WITH A BOOK
              </h1>
              <p className="text-lg font-bold text-[#555] mb-10 max-w-md mx-auto">
                No covers. No titles. Just pure vibes. Take the quiz and let the algorithm find your perfect match.
              </p>
              <button
                onClick={() => setStep('quiz')}
                className="px-8 py-4 bg-[#f5e642] text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] rounded-xl font-black uppercase tracking-widest text-lg
                  hover:bg-[#e5d632] hover:-translate-y-1 transition-all"
              >
                Find My Match
              </button>
            </motion.div>
          )}

          {/* --- STEP 2: QUIZ --- */}
          {step === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full"
            >
              <div className="mb-8 flex justify-between items-center text-[#0a0a0a] text-xs font-black uppercase tracking-widest">
                <span>Question {currentQuestionIdx + 1} of {QUIZ_QUESTIONS.length}</span>
                <div className="flex gap-1.5">
                  {QUIZ_QUESTIONS.map((_, i) => (
                    <div key={i} className={`h-2 border border-[#0a0a0a] rounded-full transition-all ${i === currentQuestionIdx ? 'w-8 bg-[#f5e642]' : 'w-2 bg-white'}`} />
                  ))}
                </div>
              </div>
              
              <h2 className="text-4xl font-black text-[#0a0a0a] mb-8 text-center" style={{ fontFamily: 'var(--font-bebas)' }}>
                {QUIZ_QUESTIONS[currentQuestionIdx].question}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {QUIZ_QUESTIONS[currentQuestionIdx].options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="p-6 bg-white border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] rounded-xl text-left
                      hover:-translate-y-1 transition-all group"
                  >
                    <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform origin-left">
                      {opt.emoji}
                    </span>
                    <span className="text-lg font-black text-[#0a0a0a]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* --- STEP 3: LOADING --- */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-20 text-center"
            >
              <div className="relative mb-8">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="w-24 h-24 border-[4px] border-dashed border-[#0a0a0a] rounded-full"
                />
                <Book className="absolute inset-0 m-auto w-8 h-8 text-[#0a0a0a] animate-pulse" />
              </div>
              <h3 className="text-3xl font-black text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>Consulting the Algorithm</h3>
              <p className="text-[#555] font-bold">Finding a book that matches your exact vibe...</p>
            </motion.div>
          )}

          {/* --- STEP 4: MYSTERY REVEAL --- */}
          {step === 'mystery' && mysteryMatch && (
            <motion.div
              key="mystery"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white border-[3px] border-[#0a0a0a] shadow-[8px_8px_0_#0a0a0a] p-6 sm:p-8 rounded-xl text-center"
            >
              <div className="inline-flex px-4 py-1.5 bg-[#f5e642] border-2 border-[#0a0a0a] shadow-[2px_2px_0_#0a0a0a] rounded-full text-xs font-black text-[#0a0a0a] mb-6 uppercase tracking-widest">
                98% Match
              </div>

              <div className="w-40 h-60 mx-auto bg-[#0a0a0a] rounded-xl mb-8 relative overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.2)] flex items-center justify-center border-[3px] border-[#0a0a0a]">
                <span className="text-6xl text-white font-serif\">?</span>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <span className="px-3 py-1 bg-[#f5f5f0] border border-[#0a0a0a] text-[#0a0a0a] rounded-full text-xs font-bold uppercase tracking-wider">{mysteryMatch.vibe}</span>
                <span className="px-3 py-1 bg-[#f5f5f0] border border-[#0a0a0a] text-[#0a0a0a] rounded-full text-xs font-bold uppercase tracking-wider">{mysteryMatch.genreName}</span>
                <span className="px-3 py-1 bg-[#f5f5f0] border border-[#0a0a0a] text-[#0a0a0a] rounded-full text-xs font-bold uppercase tracking-wider">{mysteryMatch.lengthCategory}</span>
              </div>

              <p className="text-[#0a0a0a] font-bold mb-8 max-w-sm mx-auto leading-relaxed">
                &quot;{mysteryMatch.descriptionTeaser}&quot;
              </p>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleReject}
                  className="w-14 h-14 rounded-full bg-white border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] text-[#0a0a0a] flex items-center justify-center hover:-translate-y-1 transition-transform"
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 max-w-[200px] h-14 bg-[#f5e642] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] text-[#0a0a0a] rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
                >
                  <Heart className="w-5 h-5 fill-current" />
                  Accept Date
                </button>
              </div>
            </motion.div>
          )}

          {/* --- STEP 5: REVEALED --- */}
          {step === 'revealed' && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border-[3px] border-[#0a0a0a] shadow-[8px_8px_0_#0a0a0a] rounded-xl p-6 sm:p-8 text-center text-[#0a0a0a]"
            >
              <h2 className="text-5xl font-black mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>
                IT&apos;S A MATCH!
              </h2>
              <p className="text-[#555] font-bold mb-8">Hope you two hit it off.</p>

              {revealedBook ? (
                <motion.div
                  initial={{ filter: 'blur(20px)', scale: 0.9 }}
                  animate={{ filter: 'blur(0px)', scale: 1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="mb-8"
                >
                  <div className="relative w-48 h-72 mx-auto rounded-xl overflow-hidden border-[3px] border-[#0a0a0a] shadow-[6px_6px_0_#0a0a0a] mb-6">
                    {revealedBook.cover_image_url ? (
                      <Image src={revealedBook.cover_image_url} alt={revealedBook.title} fill className="object-cover" unoptimized={true} />
                    ) : (
                      <GeneratedCover title={revealedBook.title} author={revealedBook.author} />
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-[#0a0a0a] uppercase tracking-wide">{revealedBook.title}</h3>
                  <p className="text-[#555] font-bold">{revealedBook.author}</p>
                </motion.div>
              ) : (
                <div className="w-48 h-72 mx-auto bg-gray-100 rounded-xl border-[3px] border-[#0a0a0a] mb-8 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#0a0a0a] animate-spin" />
                </div>
              )}

              {revealedBook && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={`/books/${revealedBook.id}`}
                    className="flex-1 py-4 bg-[#f5e642] text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:-translate-y-1 transition-transform"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => { setStep('intro'); setAnswers({}); setCurrentQuestionIdx(0); }}
                    className="py-4 px-6 bg-white border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] text-[#0a0a0a] rounded-xl font-black uppercase tracking-widest text-sm hover:-translate-y-1 transition-transform"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      {step === 'intro' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-8 text-center text-[#555] text-xs font-black uppercase tracking-widest"
        >
          <span className="text-[#0a0a0a]">{stats.acceptedDates.toLocaleString()}</span> readers found a match so far
        </motion.div>
      )}
    </div>
  );
}
