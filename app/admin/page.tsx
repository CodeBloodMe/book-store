import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  Heart,
  Network,
  Search,
  Sparkles,
} from 'lucide-react';
import { requireRole } from '@/lib/require-role';
import { supabase } from '@/lib/supabase';
import AdminGenreImporter from '@/components/features/AdminGenreImporter';

export const dynamic = 'force-dynamic';

const reviewTools = [
  {
    title: 'Search the catalog',
    description: 'Check title, author, and topic search against the book collection.',
    href: '/search',
    icon: Search,
    label: 'Open search',
  },
  {
    title: 'Explore BookWeb',
    description: 'Review book relationships and test graph-based reading paths.',
    href: '/bookweb',
    icon: Network,
    label: 'Open BookWeb',
  },
  {
    title: 'Test AI Finder',
    description: 'Try the recommendation flow with different reader interests.',
    href: '/recommend',
    icon: Sparkles,
    label: 'Open AI Finder',
  },
  {
    title: 'Review Blind Date',
    description: 'Check the anonymous book-matching experience from a reader view.',
    href: '/blind-date',
    icon: Heart,
    label: 'Open Blind Date',
  },
];

export default async function AdminDashboardPage() {
  const access = await requireRole(['Admin']);
  if (!access.ok && access.status === 401) redirect('/login');

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black">Access denied</h1>
        <p className="mt-3 text-gray-600">This workspace is available to administrators only.</p>
        <Link href="/" className="mt-6 inline-block font-bold underline">Return to ChapterOne</Link>
      </section>
    );
  }

  let genres: { id: string; name: string; slug: string }[] = [];
  let genreLoadFailed = false;
  const { data, error } = await supabase
    .from('genres')
    .select('id, name, slug')
    .order('name');

  if (error) {
    genreLoadFailed = true;
    console.error('[Admin dashboard] Could not load genres for catalog import:', error);
  } else {
    genres = data ?? [];
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border-2 border-[#0a0a0a] bg-[#f5e642] p-6 shadow-[5px_5px_0_#0a0a0a] sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em]">ChapterOne administration</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black sm:text-5xl">Admin workspace</h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base">
              Add catalog titles by genre, then review the reading and discovery features your readers use.
            </p>
          </div>
          <Link href="/" className="inline-flex w-fit items-center gap-2 rounded-lg border-2 border-[#0a0a0a] bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] transition-transform hover:-translate-y-0.5">
            <BookOpen size={16} /> View storefront
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1.4fr]" aria-label="Catalog administration">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Catalog action</p>
          <h2 className="mt-2 text-2xl font-black">Import books by genre</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Fetches English-language book metadata from Google Books. Existing external IDs are skipped, and imported titles are marked for later review.
          </p>
          {genreLoadFailed ? (
            <p role="status" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Genre choices could not be loaded. The rest of the admin workspace is still available; check the database connection before importing.
            </p>
          ) : (
            <AdminGenreImporter genres={genres} />
          )}
          <p className="mt-4 text-xs leading-5 text-gray-500">
            Imports can add up to 40 titles for one genre. Review imported metadata in the public catalog after the import completes.
          </p>
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Quality review</p>
              <h2 className="mt-1 text-2xl font-black">Check the reader experience</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {reviewTools.map(({ title, description, href, icon: Icon, label }) => (
              <Link key={href} href={href} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-900">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <ArrowUpRight size={17} className="text-gray-400 transition group-hover:text-gray-900" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 min-h-12 text-sm leading-5 text-gray-600">{description}</p>
                <span className="mt-3 inline-block text-sm font-bold underline decoration-gray-300 underline-offset-4 group-hover:decoration-gray-900">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <p className="mt-8 border-t border-gray-200 pt-5 text-xs leading-5 text-gray-500">
        Admin access is required for this page and catalog imports. User, payment, order, and fulfillment management tools are not part of the current application.
      </p>
    </main>
  );
}
