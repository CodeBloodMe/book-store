import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromId = searchParams.get('from');
  const toId = searchParams.get('to');

  if (!fromId || !toId) {
    return NextResponse.json({ error: 'Missing from and to parameters' }, { status: 400 });
  }

  if (fromId === toId) {
    return NextResponse.json({ error: 'Start and end books must be different' }, { status: 400 });
  }

  try {
    // 1. Try strict graph traversal first
    const { data: pathResult, error: pathError } = await supabase.rpc('find_reading_path', {
      start_id: fromId,
      end_id: toId,
      max_depth: 6,
    });

    if (!pathError && pathResult && pathResult.length > 0 && pathResult[0].path.length > 0) {
      const result = pathResult[0];
      const bookIds: string[] = result.path;

      const { data: books } = await supabase
        .from('books')
        .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, genre_id, tags, vibe, genres(id, name, slug, icon, color)')
        .in('id', bookIds);

      if (books && books.length > 0) {
        const bookMap = new Map(books.map(b => [b.id, b]));
        const orderedBooks = bookIds.map(id => bookMap.get(id)).filter(Boolean);

        const edges: Array<{ from: string; to: string; relationship: string; weight: number }> = [];
        for (let i = 0; i < bookIds.length - 1; i++) {
          const [a, b] = [bookIds[i], bookIds[i + 1]];
          const { data: edgeData } = await supabase
            .from('book_edges')
            .select('relationship_type, weight')
            .or(`and(book_a_id.eq.${a},book_b_id.eq.${b}),and(book_a_id.eq.${b},book_b_id.eq.${a})`)
            .limit(1)
            .single();

          edges.push({
            from: a,
            to: b,
            relationship: edgeData?.relationship_type || 'connected',
            weight: edgeData?.weight || 1.0,
          });
        }

        return NextResponse.json({
          found: true,
          path: orderedBooks,
          edges,
          totalWeight: result.total_weight,
          depth: result.depth,
        });
      }
    }

    // 2. Fallback: Dynamic Bridge Generation (No AI, real DB books only)
    console.log('[BookWeb] Graph disconnected, using dynamic bridging...');
    
    // Fetch start and end books
    const { data: edgeBooks } = await supabase
      .from('books')
      .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, genre_id, tags, vibe, genres(id, name, slug, icon, color)')
      .in('id', [fromId, toId]);

    if (!edgeBooks || edgeBooks.length !== 2) {
      return NextResponse.json({ error: 'Start or end book not found in DB' }, { status: 404 });
    }

    const startBook = edgeBooks.find(b => b.id === fromId);
    const endBook = edgeBooks.find(b => b.id === toId);

    if (!startBook || !endBook) {
      return NextResponse.json({ error: 'Start or end book not found in DB' }, { status: 404 });
    }

    // Find Bridge 1 (same genre or vibe as start)
    const { data: bridge1Options } = await supabase
      .from('books')
      .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, genre_id, tags, vibe, genres(id, name, slug, icon, color)')
      .eq('genre_id', startBook.genre_id)
      .neq('id', startBook.id)
      .neq('id', endBook.id)
      .limit(10);
      
    const bridge1 = (bridge1Options && bridge1Options.length > 0) 
      ? bridge1Options[Math.floor(Math.random() * bridge1Options.length)] 
      : startBook; // If nothing found, just skip bridging

    // Find Bridge 2 (same genre or vibe as end)
    const { data: bridge2Options } = await supabase
      .from('books')
      .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, genre_id, tags, vibe, genres(id, name, slug, icon, color)')
      .eq('genre_id', endBook.genre_id)
      .neq('id', startBook.id)
      .neq('id', endBook.id)
      .neq('id', bridge1.id)
      .limit(10);

    const bridge2 = (bridge2Options && bridge2Options.length > 0)
      ? bridge2Options[Math.floor(Math.random() * bridge2Options.length)]
      : endBook;

    // Construct simple robust path
    const fullPath = [startBook];
    if (bridge1.id !== startBook.id) fullPath.push(bridge1);
    if (bridge2.id !== endBook.id && bridge2.id !== bridge1.id) fullPath.push(bridge2);
    fullPath.push(endBook);

    const edges = [];
    for (let i = 0; i < fullPath.length - 1; i++) {
      let rel = 'connected';
      if (i === 0 && bridge1.id !== startBook.id) rel = 'same_genre';
      else if (i === fullPath.length - 2 && bridge2.id !== endBook.id) rel = 'same_genre';
      else rel = 'wildcard_leap';
      
      edges.push({
        from: fullPath[i].id,
        to: fullPath[i+1].id,
        relationship: rel,
        weight: 1.0
      });
    }

    return NextResponse.json({
      found: true,
      path: fullPath,
      edges,
      totalWeight: edges.length * 1.0,
      depth: edges.length,
    });

  } catch (err) {
    console.error('[BookWeb API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
