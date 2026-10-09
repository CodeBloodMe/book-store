'use client';

import { useState } from 'react';
import type { Book } from '@/types/database';
import RatingStars from '@/components/ui/RatingStars';
import { Sparkles, AlertCircle } from 'lucide-react';

interface AIReviewPanelProps {
  book: Book;
}

export default function AIReviewPanel({ book }: AIReviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [aiData, setAiData] = useState({
    summary: book.ai_review_summary,
    pros: book.ai_pros,
    cons: book.ai_cons,
    rating: book.ai_rating,
    updatedAt: book.ai_last_updated,
  });

  const hasReview = Boolean(aiData.summary);

  const generateReview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate review');
      }
      
      setAiData({
        summary: data.data.summary,
        pros: data.data.pros,
        cons: data.data.cons,
        rating: data.data.rating,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        <h2 className="font-bold text-gray-900 font-serif text-2xl">AI Consensus</h2>
        
        {hasReview && (
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">
              {aiData.rating?.toFixed(1)} <span className="text-gray-400 text-sm font-normal">/ 5.0</span>
            </span>
            <div className="flex text-gray-500">
              <RatingStars rating={aiData.rating ?? 0} size="sm" />
            </div>
          </div>
        )}
      </div>

      {/* ── Empty State with Book Preview ── */}
      {!hasReview && !loading && (
        <div className="flex-1 flex flex-col py-4">
          {/* Show existing description as a teaser */}
          {book.description && (
            <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Book Overview</p>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                {book.description}
              </p>
            </div>
          )}
          
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm mb-6 text-gray-500 max-w-sm">
              Generate an AI-powered analysis that aggregates expert reviews and reader discussions to give you the full picture.
            </p>
            <button 
              onClick={generateReview} 
              className="bg-gray-900 text-white font-bold rounded-xl px-6 py-3 hover:bg-gray-800 transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Sparkles size={16} />
              Generate AI Analysis
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Failed to generate analysis</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Loading State (Skeleton matching final layout) ── */}
      {loading && (
        <div className="flex-1 flex flex-col gap-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Analyzing reader consensus...</p>
              <p className="text-xs text-gray-400">Gathering insights from reviews across the web</p>
            </div>
          </div>

          {/* Skeleton blocks matching the real layout */}
          <div className="animate-pulse space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded-full w-full" />
              <div className="h-4 bg-gray-100 rounded-full w-5/6" />
              <div className="h-4 bg-gray-100 rounded-full w-4/6" />
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-3">
                <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                <div className="h-3 bg-gray-50 rounded-full w-full" />
                <div className="h-3 bg-gray-50 rounded-full w-5/6" />
                <div className="h-3 bg-gray-50 rounded-full w-4/6" />
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                <div className="h-3 bg-gray-50 rounded-full w-full" />
                <div className="h-3 bg-gray-50 rounded-full w-5/6" />
                <div className="h-3 bg-gray-50 rounded-full w-4/6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loaded Review ── */}
      {hasReview && !loading && (
        <div className="flex-1 flex flex-col fade-in-up">
          {(() => {
            let parsedSummary = null;
            try {
              if (typeof aiData.summary === 'string' && aiData.summary.trim().startsWith('{')) {
                parsedSummary = JSON.parse(aiData.summary);
              }
            } catch (e) {}

            if (parsedSummary) {
              return (
                <div className="flex flex-col gap-4 mb-8">
                  {parsedSummary.expert_consensus && (
                    <p className="text-gray-600 leading-relaxed">
                      <strong className="text-gray-900 font-semibold mr-2">Expert Consensus:</strong> 
                      {parsedSummary.expert_consensus}
                    </p>
                  )}
                  {parsedSummary.community_consensus && (
                    <p className="text-gray-600 leading-relaxed">
                      <strong className="text-gray-900 font-semibold mr-2">Community Consensus:</strong> 
                      {parsedSummary.community_consensus}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <p className="text-gray-600 leading-relaxed mb-8">
                {aiData.summary}
              </p>
            );
          })()}

          <div className="grid md:grid-cols-2 gap-8 mt-auto">
            {/* Key Strengths */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">
                KEY STRENGTHS
              </h4>
              <ul className="flex flex-col gap-3">
                {aiData.pros?.map((pro, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-3 items-start">
                    <span className="mt-0.5 flex-shrink-0 text-emerald-600">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </span>
                    <span className="leading-snug">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Common Critique */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">
                COMMON CRITIQUE
              </h4>
              <ul className="flex flex-col gap-3">
                {aiData.cons?.map((con, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-3 items-start">
                    <span className="mt-0.5 flex-shrink-0 text-amber-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </span>
                    <span className="leading-snug">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Public Users cannot refresh consensus to prevent API drain */}
        </div>
      )}
    </div>
  );
}
