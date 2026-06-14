'use client';

import { useState, useTransition } from 'react';
import { updateBookGenre } from '@/app/actions/update-genre';

interface Genre {
  id: string;
  name: string;
  icon: string | null;
}

interface GenreEditorProps {
  bookId: string;
  currentGenreId: string;
  genres: Genre[];
}

export default function GenreEditor({ bookId, currentGenreId, genres }: GenreEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelect = async (newGenreId: string) => {
    if (newGenreId === currentGenreId) {
      setIsEditing(false);
      return;
    }
    
    startTransition(async () => {
      await updateBookGenre(bookId, newGenreId);
      setIsEditing(false);
    });
  };

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="text-xs ml-3 px-2 py-1 rounded-md transition-colors opacity-60 hover:opacity-100"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
        disabled={isPending}
      >
        {isPending ? 'Updating...' : '✎ Edit Genre'}
      </button>
    );
  }

  return (
    <div className="relative ml-3 inline-block">
      <select
        autoFocus
        defaultValue={currentGenreId}
        onChange={(e) => handleSelect(e.target.value)}
        onBlur={() => setIsEditing(false)}
        disabled={isPending}
        className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer appearance-none pr-6"
        style={{ 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--indigo-500)', 
          color: 'var(--text-primary)' 
        }}
      >
        <option value="" disabled>Select a genre...</option>
        {genres.map((g) => (
          <option key={g.id} value={g.id}>
            {g.icon} {g.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2" style={{ color: 'var(--text-muted)' }}>
        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  );
}
