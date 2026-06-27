'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function VibeSearchBox() {
  const [input, setInput] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    if (input.trim() === '') return;
    router.push(`/recommend?q=${encodeURIComponent(input.trim())}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-12 group">
      <div className="relative">
        {/* Actual Input Container */}
        <div className="relative flex items-center bg-white rounded-2xl border-2 border-[#e5e5e5] group-focus-within:border-[#0a0a0a] transition-colors overflow-hidden">

          <div className="pl-4 sm:pl-6 text-[#888] flex-shrink-0">
            <Search size={22} className="group-focus-within:text-[#0a0a0a] transition-colors" />
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="e.g. A cozy sci-fi about a space cafe..."
            className="w-full py-4 sm:py-5 px-3 sm:px-4 text-base sm:text-lg outline-none bg-transparent text-[#0a0a0a] placeholder:text-[#aaa]"
          />

          <div className="pr-2 sm:pr-3 flex-shrink-0">
            <button
              onClick={handleSearch}
              disabled={input.trim() === ''}
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all"
              style={{
                background: input.trim() === '' ? '#f5f5f0' : '#0a0a0a',
                color: input.trim() === '' ? '#aaa' : '#fff',
                cursor: input.trim() === '' ? 'not-allowed' : 'pointer',
              }}
            >
              Search
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
