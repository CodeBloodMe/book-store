'use client';

import { useState, type FormEvent } from 'react';

interface GenreOption {
  id: string;
  name: string;
  slug: string;
}

interface ImportResult {
  success?: boolean;
  inserted?: number;
  message?: string;
  error?: string;
}

export default function AdminGenreImporter({ genres }: { genres: GenreOption[] }) {
  const [slug, setSlug] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug || pending) return;

    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/populate-genre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const result = await response.json() as ImportResult;

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'The import could not be completed.');
      }

      setFeedback({
        kind: 'success',
        message: result.message ?? `Import complete. ${result.inserted ?? 0} new book${result.inserted === 1 ? '' : 's'} added; existing titles were skipped.`,
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The import could not be completed.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleImport} className="mt-5">
      <label htmlFor="admin-import-genre" className="mb-2 block text-sm font-bold">Choose a genre</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          id="admin-import-genre"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          disabled={pending || genres.length === 0}
          required
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="" disabled>Select a genre</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.slug}>{genre.name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || !slug || genres.length === 0}
          className="min-h-11 rounded-lg border-2 border-[#0a0a0a] bg-[#f5e642] px-4 text-sm font-black shadow-[3px_3px_0_#0a0a0a] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? 'Importing…' : 'Import books'}
        </button>
      </div>
      {genres.length === 0 && (
        <p className="mt-2 text-sm text-gray-600">No genres are available to import into.</p>
      )}
      {feedback && (
        <p
          className={`mt-4 rounded-lg border p-3 text-sm ${feedback.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}
    </form>
  );
}
