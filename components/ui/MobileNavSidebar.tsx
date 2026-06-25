'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, BookOpen, Sparkles } from 'lucide-react';
import type { Genre } from '@/types/database';
import { getGenreIcon } from './GenreIcon';
import SearchBar from './SearchBar';

interface MobileNavSidebarProps {
  groups: { name: string; genres: Genre[] }[];
}

export default function MobileNavSidebar({ groups }: MobileNavSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center w-10 h-10 bg-white border-2 border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0a0a0a] transition-all rounded-xl text-[#0a0a0a]"
        title="Menu"
      >
        <Menu size={18} strokeWidth={2.5} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-[300px] bg-white border-l-2 border-[#0a0a0a] z-[101] shadow-2xl transition-transform duration-300 transform flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b-2 border-[#0a0a0a] bg-white">
          <h2 className="text-xl font-bold uppercase tracking-widest text-[#0a0a0a]">Menu</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[#f5e642] rounded-full transition-colors border-2 border-transparent hover:border-[#0a0a0a]"
          >
            <X size={20} strokeWidth={2.5} className="text-[#0a0a0a]" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-2 flex-1 bg-white overflow-y-auto">
          <div className="mb-2">
            <SearchBar fullWidth placeholder="Search books..." />
          </div>

          <Link href="/free-books" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f5f5f0] transition-colors text-[#0a0a0a] font-bold">
            <BookOpen size={18} strokeWidth={2} /> Free Books
          </Link>

          <Link href="/fiction" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f5f5f0] transition-colors text-[#0a0a0a] font-bold">
            <BookOpen size={18} strokeWidth={2} /> Fiction Finder
          </Link>

          <Link href="/recommend" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f5e642] hover:border-[#0a0a0a] border-2 border-transparent transition-all text-[#0a0a0a] font-bold">
            <Sparkles size={18} strokeWidth={2} /> AI Finder
          </Link>

          <div className="mt-2 space-y-1">
            <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest px-3 py-2">Genres</h3>
            {groups.map(({ name, genres }) => (
              <div key={name} className="flex flex-col">
                <button
                  className="w-full flex items-center justify-between p-3 rounded-lg font-bold text-left hover:bg-[#f5f5f0] transition-colors text-[#0a0a0a]"
                  onClick={() => setExpanded(expanded === name ? null : name)}
                >
                  {name}
                  <span className="text-gray-400">{expanded === name ? '▲' : '▼'}</span>
                </button>
                {expanded === name && (
                  <div className="flex flex-col gap-1 pl-4 pr-2 py-2 border-l-2 border-[#f5e642] ml-3 mb-2">
                    {genres.map((g) => (
                      <Link
                        key={g.id}
                        href={`/genres/${g.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-gray-600 hover:text-[#0a0a0a] hover:bg-gray-100 transition-colors"
                      >
                        <span className="opacity-50">{getGenreIcon(g.slug, "w-4 h-4")}</span>
                        {g.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
