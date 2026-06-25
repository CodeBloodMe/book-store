'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Bookmark, LogOut, X } from 'lucide-react';
import { logout } from '@/app/login/actions';

interface ProfileSidebarProps {
  isAuthenticated: boolean;
}

export default function ProfileSidebar({ isAuthenticated }: ProfileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center w-10 h-10 bg-white border-2 border-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0a0a0a] transition-all rounded-full text-[#0a0a0a]"
        title="Menu"
      >
        <User size={18} strokeWidth={2.5} />
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
          <h2 className="text-xl font-bold uppercase tracking-widest text-[#0a0a0a]">Profile</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[#f5e642] rounded-full transition-colors border-2 border-transparent hover:border-[#0a0a0a]"
          >
            <X size={20} strokeWidth={2.5} className="text-[#0a0a0a]" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-2 flex-1 bg-white overflow-y-auto">
          
          {/* ── Account Links ── */}
          {isAuthenticated ? (
            <div className="flex flex-col flex-1">
              <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest px-3 py-2">My Library</h3>
              <Link 
                href="/my-books" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f5e642] border-2 border-transparent hover:border-[#0a0a0a] transition-all text-[#0a0a0a] font-bold shadow-none hover:shadow-[3px_3px_0_#0a0a0a]"
              >
                <Bookmark size={18} strokeWidth={2.5} />
                Saved Books
              </Link>
              
              <div className="mt-auto pt-6 border-t-2 border-[#0a0a0a]/10">
                <form action={logout}>
                  <button 
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#ffe5e5] text-red-600 font-bold transition-colors"
                  >
                    <LogOut size={18} strokeWidth={2.5} />
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="mt-auto pt-6 border-t-2 border-[#0a0a0a]/10">
              <Link 
                href="/login" 
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white text-[#0a0a0a] border-2 border-[#0a0a0a] rounded-lg shadow-[3px_3px_0_#0a0a0a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0a0a0a] transition-all font-bold"
              >
                <User size={18} strokeWidth={2.5} />
                Log In
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
