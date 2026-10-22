import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/require-role';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const access = await requireRole(['Admin']);
  if (!access.ok && access.status === 401) redirect('/login');

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black">Access denied</h1>
        <p className="mt-3 text-gray-600">This dashboard is available to administrators only.</p>
        <Link href="/" className="mt-6 inline-block font-bold underline">Return to ChapterOne</Link>
      </section>
    );
  }

  let counts: { books: number; reviews: number; users: number } | null = null;
  let loadError = false;

  try {
    const [books, reviews, users] = await Promise.all([
      prisma.book.count(),
      prisma.review.count(),
      prisma.user.count(),
    ]);
    counts = { books, reviews, users };
  } catch (error) {
    console.error('[Admin dashboard] Failed to load database counts:', error);
    loadError = true;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[#f5e642] p-6 shadow-[5px_5px_0_#0a0a0a] sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em]">ChapterOne administration</p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">Database dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base">
          Signed in as an administrator. These counts are read from PostgreSQL through Prisma.
        </p>
      </div>

      {loadError || !counts ? (
        <div role="alert" className="mt-8 rounded-xl border border-red-300 bg-red-50 p-5 text-red-800">
          Database statistics are temporarily unavailable. Check the server database connection.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            ['Books', counts.books],
            ['Reviews', counts.reviews],
            ['User profiles', counts.users],
          ].map(([label, value]) => (
            <article key={label} className="rounded-xl border-2 border-[#0a0a0a] bg-white p-6 shadow-[4px_4px_0_#0a0a0a]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">{label}</h2>
              <p className="mt-2 text-4xl font-black">{value}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
