import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/require-role';

export const dynamic = 'force-dynamic';

export async function POST() {
  const access = await requireRole(['Admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers: { 'Cache-Control': 'no-store' } });

  const { data: genres, error: genreError } = await supabaseAdmin.from('genres').select('id, name');
  if (genreError || !genres) {
    console.error('[populate-all] Failed to load genres:', genreError);
    return NextResponse.json({ error: 'Failed to load genres.' }, { status: 500 });
  }

  let imported = 0;
  let candidates = 0;
  const failures: string[] = [];

  for (const genre of genres) {
    try {
      const query = encodeURIComponent(`subject:${genre.name} OR "${genre.name}"`);
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=20&langRestrict=en&orderBy=relevance`,
        { signal: AbortSignal.timeout(10000), cache: 'no-store' },
      );
      if (!response.ok) throw new Error(`Google Books returned HTTP ${response.status}`);

      const payload = await response.json();
      const items = Array.isArray(payload.items) ? payload.items : [];
      const records = items
        .filter((item: { id?: string; volumeInfo?: { title?: string } }) => Boolean(item.id && item.volumeInfo?.title))
        .map((item: {
          id: string;
          volumeInfo?: {
            title?: string; authors?: string[]; description?: string; imageLinks?: { thumbnail?: string };
            pageCount?: number; averageRating?: number; ratingsCount?: number; publishedDate?: string;
          };
        }) => {
          const info = item.volumeInfo ?? {};
          const yearPrefix = info.publishedDate?.slice(0, 4) ?? '';
          const year = /^\d{4}$/.test(yearPrefix) ? Number(yearPrefix) : null;
          return {
            genre_id: genre.id,
            title: String(info.title).slice(0, 500),
            author: (info.authors ?? []).join(', ').slice(0, 500) || 'Unknown Author',
            description: (info.description ?? `Catalog metadata imported for ${genre.name}.`).slice(0, 20000),
            cover_image_url: info.imageLinks?.thumbnail?.replace(/^http:/, 'https:') ?? null,
            page_count: Number.isInteger(info.pageCount) && (info.pageCount ?? 0) > 0 ? info.pageCount : null,
            published_year: year,
            expert_rating: null,
            community_rating: typeof info.averageRating === 'number' && info.averageRating >= 0 && info.averageRating <= 5 ? info.averageRating : null,
            total_reviews: Number.isInteger(info.ratingsCount) && (info.ratingsCount ?? 0) >= 0 ? info.ratingsCount : 0,
            difficulty_level: null,
            external_id: `google:${item.id}`,
            is_bestseller: false,
            tags: ['REAL_GOOGLE_BOOKS'],
          };
        });

      candidates += records.length;
      if (records.length === 0) continue;
      const { data, error } = await supabaseAdmin
        .from('books')
        .upsert(records, { onConflict: 'external_id', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;
      imported += data?.length ?? 0;
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`[populate-all] ${genre.name}:`, error);
      failures.push(genre.name);
    }
  }

  return NextResponse.json({
    success: failures.length === 0,
    inserted: imported,
    candidates,
    genresProcessed: genres.length - failures.length,
    failedGenres: failures,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
