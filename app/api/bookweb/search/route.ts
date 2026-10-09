import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/bookweb/search?q={query}
 *
 * Lightweight book search for the BookWeb book picker.
 * Returns minimal book data (id, title, author, cover) for fast results.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ books: [] });
  }

  try {
    // Sanitize for PostgREST ilike
    const sanitized = query.replace(/[\\%_'"(),.]/g, '').trim();
    if (!sanitized) return NextResponse.json({ books: [] });

    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, cover_image_url')
      .or(`title.ilike.%${sanitized}%,author.ilike.%${sanitized}%`)
      .order('expert_rating', { ascending: false })
      .limit(8);

    if (error) {
      console.error('[BookWeb Search] Error:', error.message);
      return NextResponse.json({ books: [] });
    }

    return NextResponse.json(
      { books: data || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('[BookWeb Search] Unexpected error:', err);
    return NextResponse.json({ books: [] });
  }
}
