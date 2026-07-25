'use client';
// Global error boundary — uses hardcoded styles for reliability
// (CSS variables may not be available when this renders)
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#f5f5f0' }}
    >
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6">📚</div>
        <h1
          className="font-extrabold text-2xl mb-3"
          style={{ color: '#0a0a0a', fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          Something went wrong
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: '#666' }}
        >
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0a0a0a',
              color: '#ffffff',
              fontWeight: 600,
              padding: '10px 22px',
              borderRadius: '12px',
              border: '2px solid #0a0a0a',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              color: '#0a0a0a',
              fontWeight: 600,
              padding: '10px 22px',
              borderRadius: '12px',
              border: '2px solid #0a0a0a',
              fontSize: '14px',
            }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
