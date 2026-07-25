'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, Book } from 'lucide-react';

export default function VibeSearchBox() {
  const [input, setInput] = useState('');
  const [searchMode, setSearchMode] = useState<'ai' | 'standard'>('standard');
  const router = useRouter();

  const handleSearch = () => {
    if (input.trim() === '') return;
    
    if (searchMode === 'ai') {
      router.push(`/recommend?q=${encodeURIComponent(input.trim())}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(input.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-12 flex flex-col items-center">
      
      {/* Search Mode Toggle */}
      <div className="flex bg-[#e5e5e5] p-1 rounded-full mb-4 w-11/12 max-w-sm sm:max-w-none sm:w-auto">
        <button
          onClick={() => setSearchMode('standard')}
          className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
            searchMode === 'standard' 
              ? 'bg-white text-[#0a0a0a] shadow-[2px_2px_0_#0a0a0a] border-2 border-[#0a0a0a]' 
              : 'text-[#555] hover:text-[#0a0a0a] border-2 border-transparent'
          }`}
        >
          <Book size={14} className="flex-shrink-0" /> <span className="truncate">Title / Author</span>
        </button>
        <button
          onClick={() => setSearchMode('ai')}
          className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
            searchMode === 'ai' 
              ? 'bg-[#f5e642] text-[#0a0a0a] shadow-[2px_2px_0_#0a0a0a] border-2 border-[#0a0a0a]' 
              : 'text-[#555] hover:text-[#0a0a0a] border-2 border-transparent'
          }`}
        >
          <Sparkles size={14} className="flex-shrink-0" /> <span className="truncate">AI Search</span>
        </button>
      </div>

      <div className="w-full px-4 sm:px-0 group">
        <div className="relative">
          {/* Actual Input Container */}
          <div className="relative flex items-center bg-white rounded-2xl border-2 border-[#e5e5e5] group-focus-within:border-[#0a0a0a] transition-colors overflow-hidden">

            <div className="pl-3 sm:pl-6 text-[#888] flex-shrink-0">
              {searchMode === 'ai' ? (
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 group-focus-within:text-[#0a0a0a] transition-colors" />
              ) : (
                <Search className="w-5 h-5 sm:w-6 sm:h-6 group-focus-within:text-[#0a0a0a] transition-colors" />
              )}
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
              placeholder={searchMode === 'ai' ? "e.g. A cozy sci-fi..." : "Search title, author..."}
              className="w-full py-3.5 sm:py-5 px-2.5 sm:px-4 text-sm sm:text-lg outline-none bg-transparent text-[#0a0a0a] placeholder:text-[#aaa]"
            />

            <div className="pr-1.5 sm:pr-3 flex-shrink-0">
              <button
                onClick={handleSearch}
                disabled={input.trim() === ''}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all"
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
    </div>
  );
}
