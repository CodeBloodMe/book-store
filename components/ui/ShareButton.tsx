'use client';

import { useState, useEffect } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  author: string;
}

export default function ShareButton({ title, author }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = () => setShowMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showMenu]);

  const shareData = {
    title: `${title} by ${author}`,
    text: `Check out "${title}" by ${author} on ChapterOne!`,
    url: typeof window !== 'undefined' ? window.location.href : '',
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Use Web Share API on mobile if available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or API failed — fall through to copy
      }
    }

    // Fallback: copy link to clipboard
    handleCopyLink();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setShowMenu(false);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md border-2"
        style={{
          background: copied ? '#059669' : '#f5f5f0',
          color: copied ? '#fff' : '#0a0a0a',
          borderColor: copied ? '#059669' : '#0a0a0a',
          boxShadow: copied ? 'none' : '3px 3px 0 #0a0a0a',
        }}
        aria-label="Share this book"
      >
        {copied ? (
          <>
            <Check size={18} />
            Copied!
          </>
        ) : (
          <>
            <Share2 size={18} />
            Share
          </>
        )}
      </button>

      {/* Toast notification */}
      {copied && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-bold text-white whitespace-nowrap z-50 animate-toast-in"
          style={{ background: '#059669' }}
        >
          Link copied to clipboard!
        </div>
      )}
    </div>
  );
}
