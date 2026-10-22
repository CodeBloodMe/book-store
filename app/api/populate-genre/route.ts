import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/require-role';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const access = await requireRole(['Admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers: { 'Cache-Control': 'no-store' } });

  const body = await request.json().catch(() => null) as { slug?: unknown } | null;
  const querySlug = new URL(request.url).searchParams.get('slug');
  const slugValue = typeof body?.slug === 'string' ? body.slug : querySlug;
  const slug = slugValue?.trim() ?? '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
    return NextResponse.json({ error: 'Provide a valid genre slug.' }, { status: 400 });
  }

  const { data: genre, error: genreError } = await supabaseAdmin
    .from('genres').select('id, name').eq('slug', slug).single();
  if (genreError || !genre) {
    return NextResponse.json({ error: 'Genre not found.' }, { status: 404 });
  }

  try {
    const query = encodeURIComponent(`subject:${genre.name} OR "${genre.name}"`);
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=40&langRestrict=en&orderBy=relevance`,
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
          industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
        };
      }) => {
        const info = item.volumeInfo ?? {};
        const yearText = info.publishedDate?.slice(0, 4) ?? '';
        const year = /^\d{4}$/.test(yearText) ? Number(yearText) : null;
        const isbn = info.industryIdentifiers?.find((entry) => entry.type === 'ISBN_13')?.identifier
          ?? info.industryIdentifiers?.[0]?.identifier ?? null;
        return {
          genre_id: genre.id,
          title: String(info.title).slice(0, 500),
          author: (info.authors ?? []).join(', ').slice(0, 500) || 'Unknown Author',
          description: (info.description ?? `Catalog metadata imported for ${genre.name}.`).slice(0, 20000),
          cover_image_url: info.imageLinks?.thumbnail?.replace(/^http:/, 'https:') ?? null,
          page_count: Number.isInteger(info.pageCount) && (info.pageCount ?? 0) > 0 ? info.pageCount : null,
          published_year: year,
          isbn,
          expert_rating: null,
          community_rating: typeof info.averageRating === 'number' && info.averageRating >= 0 && info.averageRating <= 5 ? info.averageRating : null,
          total_reviews: Number.isInteger(info.ratingsCount) && (info.ratingsCount ?? 0) >= 0 ? info.ratingsCount : 0,
          difficulty_level: null,
          external_id: `google:${item.id}`,
          is_featured: false,
          is_editors_pick: false,
          is_bestseller: false,
          tags: ['AUTO_IMPORTED'],
        };
      });

    if (records.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, message: 'No books were returned for this genre.' });
    }

    const { data, error } = await supabaseAdmin
      .from('books')
      .upsert(records, { onConflict: 'external_id', ignoreDuplicates: true })
      .select('id');
    if (error) throw error;

    revalidatePath(`/genres/${slug}`);

    return NextResponse.json({ success: true, inserted: data?.length ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[populate-genre] Import failed:', error);
    return NextResponse.json({ error: 'Book import failed.' }, { status: 502 });
  }
}
