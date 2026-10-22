import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { getAllGenres } from '@/lib/queries';

// The sitemap depends on live catalog data. Generate it at request time so CI
// builds do not need production database access just to prerender /sitemap.xml.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://book-store-eight-zeta.vercel.app';

  const [booksResult, genresResult] = await Promise.allSettled([
    supabase
      .from('books')
      .select('id, updated_at')
      .order('updated_at', { ascending: false }),
    getAllGenres(),
  ]);

  // Keep /sitemap.xml valid during a transient catalog outage. In production,
  // successful database queries still populate book and genre URLs.
  const books =
    booksResult.status === 'fulfilled' && !booksResult.value.error
      ? booksResult.value.data ?? []
      : [];
  const genres =
    genresResult.status === 'fulfilled' ? genresResult.value : [];

  if (
    booksResult.status === 'rejected' ||
    (booksResult.status === 'fulfilled' && booksResult.value.error)
  ) {
    console.error('[Sitemap] Could not load books; returning the available URLs.');
  }
  if (genresResult.status === 'rejected') {
    console.error('[Sitemap] Could not load genres; returning the available URLs.');
  }

  const now = new Date().toISOString();

  const bookUrls: MetadataRoute.Sitemap = books.map((book) => ({
    url: `${baseUrl}/books/${book.id}`,
    lastModified: book.updated_at
      ? new Date(book.updated_at).toISOString()
      : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const genreUrls: MetadataRoute.Sitemap = genres.map((genre) => ({
    url: `${baseUrl}/genres/${genre.slug}`,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/fiction`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...genreUrls,
    ...bookUrls,
  ];
}
