import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { getAllGenres } from '@/lib/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://book-store-eight-zeta.vercel.app';

  // Fetch all books (we only need id and updated_at)
  const { data: books } = await supabase
    .from('books')
    .select('id, updated_at')
    .order('updated_at', { ascending: false });

  // Fetch all populated genres
  const genres = await getAllGenres();

  const bookUrls = (books || []).map((book) => ({
    url: `${baseUrl}/books/${book.id}`,
    lastModified: new Date(book.updated_at || new Date()).toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const genreUrls = genres.map((genre) => ({
    url: `${baseUrl}/genres/${genre.slug}`,
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/fiction`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...genreUrls,
    ...bookUrls,
  ];
}
