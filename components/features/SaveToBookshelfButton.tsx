'use client';

import { useState } from 'react';
import { Bookmark, Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SaveToBookshelfButtonProps {
  bookId: string;
  initialStatus: string | null;
  isAuthenticated: boolean;
}

export default function SaveToBookshelfButton({ bookId, initialStatus, isAuthenticated }: SaveToBookshelfButtonProps) {
  const [isSaved, setIsSaved] = useState(!!initialStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      if (isSaved) {
        // Remove from saved
        const res = await fetch(`/api/shelves?bookId=${bookId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setIsSaved(false);
          router.refresh();
        }
      } else {
        // Add to saved
        const res = await fetch('/api/shelves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, status: 'want_to_read' }), // Default status under the hood
        });
        if (res.ok) {
          setIsSaved(true);
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative ml-auto sm:ml-0">
      <button 
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 px-6 py-3 font-bold border-2 transition-all ${
          isSaved 
            ? 'bg-[#f5e642] border-[#0a0a0a] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0a0a0a]' 
            : 'bg-white border-[#0a0a0a] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0a0a0a]'
        }`}
        style={{ borderRadius: '12px' }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : (isSaved ? <Bookmark size={18} /> : <Plus size={18} />)}
        {isSaved ? 'Saved' : 'Save Book'}
      </button>
    </div>
  );
}
