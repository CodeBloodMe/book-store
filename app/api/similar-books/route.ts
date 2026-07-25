import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/similar-books?bookId=<uuid>&count=10
 * 
 * Primary: Uses pgvector `find_similar_books` RPC (cosine similarity).
 * Fallback: If ML returns no results (no embeddings, or RPC missing),
 *           falls back to same-genre books sorted by expert_rating.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const count = Math.min(parseInt(searchParams.get('count') || '10', 10), 20);

  if (!bookId) {
    return NextResponse.json({ error: 'Missing bookId parameter' }, { status: 400 });
  }

  try {
    let similarBooks: any[] = [];

    // ── Strategy 1: ML-powered vector similarity ──
    try {
      const { data, error } = await supabase.rpc('find_similar_books', {
        source_book_id: bookId,
        match_count: count,
      });

      if (!error && data && data.length > 0) {
        similarBooks = data;
        console.log(`[Similar Books] ML found ${data.length} results for ${bookId}`);
      } else if (error) {
        console.warn('[Similar Books] RPC error (falling back to genre):', error.message);
      }
    } catch (rpcErr) {
      console.warn('[Similar Books] RPC unavailable (falling back to genre):', rpcErr);
    }

    // ── Strategy 2: Fallback — same genre, sorted by rating ──
    if (similarBooks.length === 0) {
      // First, get the source book's genre
      const { data: sourceBook } = await supabase
        .from('books')
        .select('genre_id')
        .eq('id', bookId)
        .single();

      if (sourceBook?.genre_id) {
        const { data: genreBooks } = await supabase
          .from('books')
          .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, is_bestseller, isbn, genre_id')
          .eq('genre_id', sourceBook.genre_id)
          .neq('id', bookId)
          .order('expert_rating', { ascending: false })
          .limit(count);

        if (genreBooks && genreBooks.length > 0) {
          similarBooks = genreBooks.map(b => ({ ...b, similarity: null }));
          console.log(`[Similar Books] Genre fallback found ${genreBooks.length} results`);
        }
      }
    }

    // ── Enrich with genre info ──
    const genreIds = [...new Set(similarBooks.map((b: any) => b.genre_id).filter(Boolean))];
    
    let genreMap: Record<string, any> = {};
    if (genreIds.length > 0) {
      const { data: genres } = await supabase
        .from('genres')
        .select('id, name, slug, icon, color')
        .in('id', genreIds);
      
      if (genres) {
        genreMap = Object.fromEntries(genres.map(g => [g.id, g]));
      }
    }

    const enrichedBooks = similarBooks.map((book: any) => ({
      ...book,
      genres: genreMap[book.genre_id] || null,
    }));

    return NextResponse.json(
      { books: enrichedBooks },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (err) {
    console.error('[Similar Books API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
