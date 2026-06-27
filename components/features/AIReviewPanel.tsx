'use client';

import { useState } from 'react';
import type { Book } from '@/types/database';
import RatingStars from '@/components/ui/RatingStars';

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

      {!hasReview && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <p className="text-sm mb-6 text-gray-500 max-w-sm">
            We haven't generated an AI consensus for this book yet. Click below to analyze reader reviews and discussions!
          </p>
          <button 
            onClick={generateReview} 
            className="bg-gray-600 text-white font-semibold rounded-xl px-6 py-3 hover:bg-gray-700 transition-colors"
          >
            Generate AI Consensus
          </button>
          {error && <p className="text-red-500 text-xs mt-4">{error}</p>}
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-600 rounded-full animate-spin mb-6" />
          <p className="font-semibold text-gray-900 animate-pulse">
            Analyzing reader consensus...
          </p>
          <p className="text-sm mt-2 text-gray-500">Gathering insights from reviews</p>
        </div>
      )}

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
                    <span className="mt-0.5 flex-shrink-0 text-gray-600">
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
                    <span className="mt-0.5 flex-shrink-0 text-gray-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
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
