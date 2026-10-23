import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

interface BookDetails {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  description: string | null;
  expert_rating: number | null;
  community_rating: number | null;
  difficulty_level: string | null;
  genre_id: string | null;
  tags: string[] | null;
  vibe: string | null;
  published_year: number | null;
  genres?: { id: string; name: string; slug: string; icon: string; color: string } | null;
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

/**
 * Intelligent Dynamic Path Synthesizer
 * If the precomputed static graph does not connect two books, this fallback
 * discovers a catalog-backed stepping stone bridge book between them.
 */
async function buildDynamicBridge(fromId: string, toId: string) {
  try {
    const { data: books, error: bErr } = await supabaseAdmin
      .from('books')
      .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, genre_id, tags, vibe, published_year, genres(id, name, slug, icon, color)')
      .in('id', [fromId, toId]);

    if (bErr || !books || books.length < 2) return null;

    const bookA = (books as unknown as BookDetails[]).find((b) => b.id === fromId);
    const bookB = (books as unknown as BookDetails[]).find((b) => b.id === toId);
    if (!bookA || !bookB) return null;

    // 1. Same author (1-hop)
    if (bookA.author && bookB.author && bookA.author.toLowerCase() === bookB.author.toLowerCase()) {
      return {
        found: true,
        path: [bookA, bookB],
        edges: [{
          from: bookA.id,
          to: bookB.id,
          relationship: 'same_author',
          weight: 0.3,
          similarityScore: 0.95,
          evidence: `Both written by ${bookA.author}`,
        }],
        totalWeight: 0.3,
        depth: 1,
      };
    }

    // 2. Same genre (1-hop)
    if (bookA.genre_id && bookB.genre_id && bookA.genre_id === bookB.genre_id) {
      const genreName = bookA.genres?.name || 'Shared Genre';
      return {
        found: true,
        path: [bookA, bookB],
        edges: [{
          from: bookA.id,
          to: bookB.id,
          relationship: 'same_genre',
          weight: 1.0,
          similarityScore: 0.85,
          evidence: `Shared genre: ${genreName}`,
        }],
        totalWeight: 1.0,
        depth: 1,
      };
    }

    // 3. Shared themes/tags (1-hop)
    const tagsA = new Set(bookA.tags || []);
    const sharedTags = (bookB.tags || []).filter((t: string) => tagsA.has(t));
    if (sharedTags.length > 0) {
      return {
        found: true,
        path: [bookA, bookB],
        edges: [{
          from: bookA.id,
          to: bookB.id,
          relationship: 'shared_tags',
          weight: 1.2,
          similarityScore: 0.8,
          evidence: `Shared themes: ${sharedTags.slice(0, 3).join(', ')}`,
        }],
        totalWeight: 1.2,
        depth: 1,
      };
    }

    // 4. Find stepping-stone bridge book C in either genre or matching keywords
    const filterOr = [
      bookA.genre_id ? `genre_id.eq.${bookA.genre_id}` : null,
      bookB.genre_id ? `genre_id.eq.${bookB.genre_id}` : null,
    ].filter(Boolean).join(',');

    const query = supabaseAdmin
      .from('books')
      .select('id, title, author, cover_image_url, description, expert_rating, community_rating, difficulty_level, genre_id, tags, vibe, published_year, genres(id, name, slug, icon, color)')
      .neq('id', bookA.id)
      .neq('id', bookB.id)
      .not('description', 'is', null)
      .order('expert_rating', { ascending: false })
      .limit(30);

    const { data: candidates } = filterOr ? await query.or(filterOr) : await query;

    if (candidates && candidates.length > 0) {
      const wordsA = new Set(
        `${bookA.title} ${bookA.description || ''} ${(bookA.tags || []).join(' ')}`
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3)
      );
      const wordsB = new Set(
        `${bookB.title} ${bookB.description || ''} ${(bookB.tags || []).join(' ')}`
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3)
      );

      let bestBridge = candidates[0] as unknown as BookDetails;
      let bestScore = -1;

      for (const c of candidates as unknown as BookDetails[]) {
        const cWords = `${c.title} ${c.description || ''} ${(c.tags || []).join(' ')}`
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3);
        const hitsA = cWords.filter((w) => wordsA.has(w)).length;
        const hitsB = cWords.filter((w) => wordsB.has(w)).length;
        const score = (hitsA + 1) * (hitsB + 1) * (Number(c.expert_rating) || 3);
        if (score > bestScore) {
          bestScore = score;
          bestBridge = c;
        }
      }

      const genreAName = bookA.genres?.name || 'Literature';
      const genreBName = bookB.genres?.name || 'Literature';
      const bridgeGenre = bestBridge.genres?.name || genreAName;

      return {
        found: true,
        path: [bookA, bestBridge, bookB],
        edges: [
          {
            from: bookA.id,
            to: bestBridge.id,
            relationship: bestBridge.genre_id === bookA.genre_id ? 'same_genre' : 'connected',
            weight: 1.2,
            similarityScore: 0.8,
            evidence: bestBridge.genre_id === bookA.genre_id ? `Genre: ${genreAName}` : `Thematic transition into ${bridgeGenre}`,
          },
          {
            from: bestBridge.id,
            to: bookB.id,
            relationship: bestBridge.genre_id === bookB.genre_id ? 'same_genre' : 'connected',
            weight: 1.4,
            similarityScore: 0.75,
            evidence: bestBridge.genre_id === bookB.genre_id ? `Genre: ${genreBName}` : `Thematic connection leading to ${bookB.title}`,
          },
        ],
        totalWeight: 2.6,
        depth: 2,
      };
    }
  } catch (bridgeErr) {
    console.error('[BookWeb API] Dynamic bridge construction error:', bridgeErr);
  }

  return null;
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
    // 1. Try finding a precomputed path via Dijkstra RPC
    let foundPath = false;
    let result: PathResult | undefined;

    try {
      const { data: pathResult, error: pathError } = await supabase.rpc('find_reading_path', {
        start_id: fromId,
        end_id: toId,
        max_depth: 6,
      });

      if (!pathError && pathResult && Array.isArray(pathResult) && pathResult.length > 0) {
        const candidate = pathResult[0] as PathResult;
        if (Array.isArray(candidate.path) && candidate.path.length >= 2) {
          result = candidate;
          foundPath = true;
        }
      }
    } catch (rpcErr) {
      console.warn('[BookWeb API] Weighted path RPC threw, trying dynamic bridge:', rpcErr);
    }

    // 2. If precomputed Dijkstra path is missing, use intelligent catalog bridge fallback
    if (!foundPath || !result) {
      const fallbackBridge = await buildDynamicBridge(fromId, toId);
      if (fallbackBridge) {
        return NextResponse.json(fallbackBridge, { headers: { 'Cache-Control': 'private, no-store' } });
      }
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
