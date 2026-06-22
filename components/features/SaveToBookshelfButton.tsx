'use client';

import { useState } from 'react';
import { Bookmark, Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import FlyingCover from '../ui/FlyingCover';

interface SaveToBookshelfButtonProps {
  bookId: string;
  coverUrl?: string;
  initialStatus: string | null;
  isAuthenticated: boolean;
}


export default function SaveToBookshelfButton({ bookId, coverUrl, initialStatus, isAuthenticated }: SaveToBookshelfButtonProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(!!initialStatus);
  const [loading, setLoading] = useState(false);
  const [flyingRect, setFlyingRect] = useState<DOMRect | null>(null);

  const handleToggle = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setLoading(true);
    
    try {
      if (isSaved) {
        const response = await fetch(`/api/shelves?bookId=${bookId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setIsSaved(false);
          router.refresh();
        }
      } else {
        const response = await fetch('/api/shelves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: bookId, status: 'want_to_read' }),
        });
        
        if (response.ok) {
          const coverElement = document.getElementById('main-book-cover');
          
          if (coverElement && coverUrl) {
            setFlyingRect(coverElement.getBoundingClientRect());
          }
          
          setIsSaved(true);
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  };


  
  const baseButtonClasses = "flex items-center gap-2 px-6 py-3 font-bold border-2 transition-colors";
  
  let dynamicButtonClasses = "";
  if (isSaved) {
    dynamicButtonClasses = "bg-[#f5e642] border-[#0a0a0a] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a]";
  } else {
    dynamicButtonClasses = "bg-white border-[#0a0a0a] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a]";
  }

  return (
    <>
      <div className="relative ml-auto sm:ml-0">
        <motion.button 
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={loading}
          className={`${baseButtonClasses} ${dynamicButtonClasses}`}
          style={{ borderRadius: '12px' }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isSaved ? (
            <Bookmark size={18} />
          ) : (
            <Plus size={18} />
          )}
          
          {isSaved ? 'Saved' : 'Save Book'}
        </motion.button>
      </div>
      
      <AnimatePresence>
        {flyingRect && coverUrl && (
          <FlyingCover
            key={`flying-${bookId}`}
            coverUrl={coverUrl}
            startRect={flyingRect}
            onAnimationComplete={() => setFlyingRect(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
