import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/bookweb/neighbors?bookId={uuid}&limit=10
 *
 * Returns the direct neighbors of a book in the BookWeb graph,
 * with full book details and the relationship type/weight.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 30);

  if (!bookId) {
    return NextResponse.json(
      { error: 'Missing required parameter: bookId' },
      { status: 400 }
    );
  }

  try {
    // 1. Call the get_book_neighbors RPC
    const { data: neighbors, error: rpcError } = await supabase.rpc('get_book_neighbors', {
      target_book_id: bookId,
      neighbor_limit: limit,
    });

    if (rpcError) {
      console.error('[BookWeb Neighbors] RPC error:', rpcError.message);
      return NextResponse.json(
        { error: 'Failed to fetch neighbors' },
        { status: 500 }
      );
    }

    if (!neighbors || neighbors.length === 0) {
      return NextResponse.json({ neighbors: [] });
    }

    // 2. Fetch full book details for the neighbors
    const neighborIds = neighbors.map((n: { book_id: string }) => n.book_id);

    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, genre_id, genres(id, name, slug, icon, color)')
      .in('id', neighborIds);

    if (booksError || !books) {
      console.error('[BookWeb Neighbors] Failed to fetch book details:', booksError?.message);
      return NextResponse.json({ error: 'Failed to fetch book details' }, { status: 500 });
    }

    // 3. Merge book details with edge info
    const bookMap = new Map(books.map(b => [b.id, b]));
    const enrichedNeighbors = neighbors
      .map((n: { book_id: string; weight: number; relationship_type: string }) => ({
        ...bookMap.get(n.book_id),
        edge_weight: n.weight,
        relationship_type: n.relationship_type,
      }))
      .filter((n: { id?: string }) => n.id); // Filter out any missing books

    return NextResponse.json(
      { neighbors: enrichedNeighbors },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (err) {
    console.error('[BookWeb Neighbors API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
