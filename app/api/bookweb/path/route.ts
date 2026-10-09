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

        const edges: Array<{ from: string; to: string; relationship: string; weight: number; evidence: string | null }> = [];
        for (let i = 0; i < bookIds.length - 1; i++) {
          const [a, b] = [bookIds[i], bookIds[i + 1]];
          const { data: edgeData } = await supabase
            .from('book_edges')
            .select('relationship_type, weight, evidence, similarity_score')
            .or(`and(book_a_id.eq.${a},book_b_id.eq.${b}),and(book_a_id.eq.${b},book_b_id.eq.${a})`)
            .limit(1)
            .single();

          let evidenceText = null;
          if (edgeData?.evidence) {
            try {
              const ev = edgeData.evidence;
              if (ev.sharedGenres) {
                evidenceText = `Shared genre: ${ev.sharedGenres.join(', ')}`;
              } else if (ev.sharedSubjects) {
                evidenceText = `Shared subject: ${ev.sharedSubjects.join(', ')}`;
              } else if (ev.series) {
                evidenceText = `Same series: ${ev.series}`;
              } else if (ev.author) {
                evidenceText = `Same author`;
              }
            } catch (e) {
              // ignore json parse errors
            }
          }

          edges.push({
            from: a,
            to: b,
            relationship: edgeData?.relationship_type || 'connected',
            weight: edgeData?.weight || 1.0,
            evidence: evidenceText,
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

    // Graph disconnected, no valid reading path exists
    return NextResponse.json({ 
      found: false, 
      message: 'No strong reading path found.' 
    }, { status: 404 });

  } catch (err) {
    console.error('[BookWeb API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
