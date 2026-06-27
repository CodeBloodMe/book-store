'use client';
// Global error boundary — required to be a Client Component by Next.js
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="text-center max-w-md px-6">
        <p className="text-6xl mb-6"></p>
        <h1 className="font-extrabold text-2xl mb-3" style={{ color: 'var(--text-primary)' }}>
          Something went wrong
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary text-sm">
            Try Again
          </button>
          <Link href="/" className="btn-ghost text-sm">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
