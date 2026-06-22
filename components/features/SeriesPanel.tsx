'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SeriesPanelProps {
  title: string;
  author: string;
}

interface SeriesData {
  hasSeries: boolean;
  seriesName?: string;
  books?: string[];
}

export default function SeriesPanel({ title, author }: SeriesPanelProps) {
  const [data, setData] = useState<SeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchSeries() {
      try {
        const res = await fetch('/api/book-series', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, author }),
        });
        if (!res.ok) throw new Error('Failed to fetch series');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchSeries();
  }, [title, author]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-100 rounded"></div>
          <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
          <div className="h-4 w-4/6 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.hasSeries || !data.books || data.books.length <= 1) {
    // If it's not a series, or an error occurred, don't show the panel at all to keep the UI clean
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-6">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
        <h3 className="font-bold text-gray-900 font-serif text-lg">
          {data.seriesName || 'Series Information'}
        </h3>
      </div>
      
      <div className="relative border-l-2 border-indigo-100 ml-3 space-y-6">
        {data.books.map((bookTitle, index) => {
          const isCurrentBook = bookTitle.toLowerCase() === title.toLowerCase() || 
                                new RegExp(`\\b${bookTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i').test(title);
          
          return (
            <div key={index} className="relative pl-6">
              {/* Timeline dot */}
              <div 
                className={`absolute left-[-9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                  isCurrentBook ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-gray-300'
                }`}
              ></div>
              
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Part {index + 1}
                </span>
                {isCurrentBook ? (
                  <span className="text-indigo-900 font-bold bg-indigo-50 inline-block px-3 py-1 rounded-lg w-fit">
                    {bookTitle} (Current)
                  </span>
                ) : (
                  <Link 
                    href={`/search?q=${encodeURIComponent(bookTitle + ' ' + author)}`}
                    className="text-gray-700 font-medium hover:text-indigo-600 hover:underline transition-colors w-fit"
                  >
                    {bookTitle}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
