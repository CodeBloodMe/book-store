'use client';

import { useState, useEffect } from 'react';
import type { Author } from '@/types/database';

interface AuthorBioPanelProps {
  authorName: string;
}

export default function AuthorBioPanel({ authorName }: AuthorBioPanelProps) {
  const [authorData, setAuthorData] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBio() {
      try {
        const res = await fetch('/api/generate-author-bio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorName }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setAuthorData(data.data);
        } else {
          setError(data.error || 'Failed to load bio');
        }
      } catch (err) {
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchBio();
  }, [authorName]);

  if (loading) {
    return (
      <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 md:p-10 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded-full w-24"></div>
          <div className="h-8 bg-gray-200 rounded-full w-24"></div>
          <div className="h-8 bg-gray-200 rounded-full w-24"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 border-2 border-red-200 rounded-xl bg-red-50">Error: {error}</div>;
  }

  if (!authorData?.ai_bio) {
    return null;
  }

  return (
    <div className="bg-[#f0f0ee] border-3 border-[#0a0a0a] rounded-2xl p-6 md:p-10" style={{ boxShadow: '8px 8px 0 #0a0a0a' }}>
      <h2 className="text-xl font-black uppercase tracking-widest mb-4" style={{ color: '#0a0a0a' }}>
        About the Author
      </h2>
      <div className="prose prose-p:text-gray-700 prose-p:leading-relaxed max-w-none mb-8 whitespace-pre-wrap">
        {authorData.ai_bio}
      </div>

      {authorData.ai_style && authorData.ai_style.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">
            Hallmarks & Style
          </h3>
          <div className="flex flex-wrap gap-2">
            {authorData.ai_style.map((styleItem, idx) => (
              <span 
                key={idx}
                className="px-4 py-2 bg-white border-2 border-[#0a0a0a] rounded-xl text-sm font-bold shadow-[2px_2px_0_#0a0a0a]"
              >
                {styleItem}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
