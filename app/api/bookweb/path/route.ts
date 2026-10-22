import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PathResult {
  path: string[];
  total_weight: number;
  depth: number;
}

interface BookEdgeRow {
  book_a_id: string;
  book_b_id: string;
  relationship_type: string;
  weight: number;
  evidence: unknown;
  similarity_score: number | null;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function evidenceSummary(value: unknown): string | null {
  if (typeof value === 'string') return value.slice(0, 240);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const evidence = value as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof evidence.series === 'string') parts.push(`Series: ${evidence.series}`);
  if (typeof evidence.sharedGenre === 'string') parts.push(`Genre: ${evidence.sharedGenre}`);
  if (Array.isArray(evidence.sharedAuthors) && evidence.sharedAuthors.length) {
    parts.push(`Author: ${evidence.sharedAuthors.filter((item): item is string => typeof item === 'string').join(', ')}`);
  }
  if (Array.isArray(evidence.sharedTags) && evidence.sharedTags.length) {
    parts.push(`Shared tags: ${evidence.sharedTags.filter((item): item is string => typeof item === 'string').join(', ')}`);
  }
  if (Array.isArray(evidence.sharedTerms) && evidence.sharedTerms.length) {
    parts.push(`Shared topics: ${evidence.sharedTerms.filter((item): item is string => typeof item === 'string').join(', ')}`);
  }
  if (!parts.length && typeof evidence.semanticSimilarity === 'number') {
    parts.push(`Semantic similarity: ${Math.round(evidence.semanticSimilarity * 100)}%`);
  }
  return parts.length ? parts.join(' · ').slice(0, 240) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromId = searchParams.get('from');
  const toId = searchParams.get('to');

  if (!fromId || !toId || !UUID_PATTERN.test(fromId) || !UUID_PATTERN.test(toId)) {
    return NextResponse.json({ error: 'Provide valid start and destination book IDs.' }, { status: 400 });
  }
  if (fromId === toId) {
    return NextResponse.json({ error: 'Start and destination must be different books.' }, { status: 400 });
  }

  try {
    // Fast-fail check: verify both books have at least 1 edge in the graph
    const [fromCheck, toCheck] = await Promise.all([
      supabase.from('book_edges').select('id', { count: 'exact', head: true }).or(`book_a_id.eq.${fromId},book_b_id.eq.${fromId}`),
      supabase.from('book_edges').select('id', { count: 'exact', head: true }).or(`book_a_id.eq.${toId},book_b_id.eq.${toId}`),
    ]);

    if (!fromCheck.count || !toCheck.count) {
      return NextResponse.json({
        found: false,
        message: 'No supported relationship path was found. One of the selected books has no recorded connections in the catalog graph.',
      }, { status: 404 });
    }

    const { data: pathResult, error: pathError } = await supabase.rpc('find_reading_path', {
      start_id: fromId,
      end_id: toId,
      max_depth: 6,
    });

    if (pathError) {
      console.warn('[BookWeb API] Weighted path RPC returned no path or timed out:', pathError.message);
      return NextResponse.json(
        { found: false, message: 'No supported relationship path was found between these books within the 6-hop limit.' },
        { status: 404 },
      );
    }

    const result = (pathResult as PathResult[] | null)?.[0];
    if (!result || !Array.isArray(result.path) || result.path.length < 2) {
      return NextResponse.json({ found: false, message: 'No supported relationship path was found between these books.' }, { status: 404 });
    }

    const bookIds = result.path;
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, genre_id, tags, vibe, genres(id, name, slug, icon, color)')
      .in('id', bookIds);

    if (booksError || !books || books.length !== bookIds.length) {
      console.error('[BookWeb API] Failed to load all path books:', booksError?.message);
      return NextResponse.json({ error: 'Could not load every book in the selected path.' }, { status: 502 });
    }

    const bookMap = new Map(books.map((book) => [book.id, book]));
    const orderedBooks = bookIds.map((id) => bookMap.get(id));
    if (orderedBooks.some((book) => !book)) {
      return NextResponse.json({ error: 'The path contains a book that is no longer in the catalog.' }, { status: 502 });
    }

    // Fetch every edge between the path books in one query
    const { data: pathEdges, error: edgesError } = await supabase
      .from('book_edges')
      .select('book_a_id, book_b_id, relationship_type, weight, evidence, similarity_score')
      .in('book_a_id', bookIds)
      .in('book_b_id', bookIds);

    if (edgesError || !pathEdges) {
      console.error('[BookWeb API] Failed to load path evidence:', edgesError?.message);
      return NextResponse.json({ error: 'Could not load relationship evidence for this path.' }, { status: 502 });
    }

    const edgeMap = new Map<string, BookEdgeRow>();
    for (const edge of pathEdges as BookEdgeRow[]) {
      edgeMap.set(pairKey(edge.book_a_id, edge.book_b_id), edge);
    }

    const edges = [];
    for (let index = 0; index < bookIds.length - 1; index++) {
      const from = bookIds[index];
      const to = bookIds[index + 1];
      const edge = edgeMap.get(pairKey(from, to));
      if (!edge) {
        console.error('[BookWeb API] The path RPC returned a hop with no matching edge.');
        return NextResponse.json({ error: 'The relationship graph changed while the path was being loaded. Please try again.' }, { status: 409 });
      }
      edges.push({
        from,
        to,
        relationship: edge.relationship_type,
        weight: edge.weight,
        similarityScore: edge.similarity_score,
        evidence: evidenceSummary(edge.evidence),
      });
    }

    return NextResponse.json({
      found: true,
      path: orderedBooks,
      edges,
      totalWeight: result.total_weight,
      depth: result.depth,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[BookWeb API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
