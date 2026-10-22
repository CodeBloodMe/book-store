import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface BookPickerRow {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  expert_rating: number | null;
}

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** GET /api/bookweb/search?q={query} — database-only, relevance-ranked picker. */
export async function GET(request: NextRequest) {
  const rawQuery = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (rawQuery.length < 2) return NextResponse.json({ books: [] });

  // Keep PostgREST's OR filter grammar safe and cap work per keystroke.
  const query = rawQuery.slice(0, 80).replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (query.length < 2) return NextResponse.json({ books: [] });

  try {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, cover_image_url, expert_rating')
      .or(`title.ilike.%${query}%,author.ilike.%${query}%`)
      .limit(50);

    if (error) {
      console.error('[BookWeb Search] Catalog query failed:', error.message);
      return NextResponse.json({ error: 'Book search is temporarily unavailable.' }, { status: 503 });
    }

    const normalizedQuery = normalize(query);
    const terms = [...new Set(normalizedQuery.split(/\s+/).filter((term) => term.length >= 2))];
    const ranked = ((data ?? []) as BookPickerRow[])
      .map((book) => {
        const title = normalize(book.title);
        const author = normalize(book.author ?? '');
        const titleHits = terms.filter((term) => title.includes(term)).length;
        const authorHits = terms.filter((term) => author.includes(term)).length;
        const score =
          (title === normalizedQuery ? 1000 : 0) +
          (title.startsWith(normalizedQuery) ? 700 : 0) +
          (author === normalizedQuery ? 600 : 0) +
          (author.startsWith(normalizedQuery) ? 450 : 0) +
          (title.includes(normalizedQuery) ? 300 : 0) +
          (author.includes(normalizedQuery) ? 180 : 0) +
          titleHits * 40 + authorHits * 20 + Math.max(0, Number(book.expert_rating) || 0) * 0.1;
        return { book, score, titleHits, authorHits };
      })
      .filter((result) => result.titleHits > 0 || result.authorHits > 0)
      .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
      .slice(0, 8)
      .map(({ book }) => ({
        id: book.id,
        title: book.title,
        author: book.author ?? 'Unknown Author',
        cover_image_url: book.cover_image_url,
      }));

    return NextResponse.json({ books: ranked }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('[BookWeb Search] Unexpected failure:', error);
    return NextResponse.json({ error: 'Book search is temporarily unavailable.' }, { status: 503 });
  }
}
