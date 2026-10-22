/**
 * Build a sparse, explainable BookWeb graph from catalog metadata.
 *
 * Candidate generation uses inverted indexes (author, series, and informative
 * content terms), avoiding the old all-pairs O(n²) comparison. Candidate pairs
 * are ranked with IDF-weighted TF-IDF cosine similarity plus tags, genre,
 * difficulty, and publication-era signals. Only each book's strongest
 * confidence-qualified neighbors are retained.
 *
 * Requires the BookWeb evidence migration and a server-side Supabase key.
 * Usage: npx tsx scripts/build_book_graph.ts
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;
const GRAPH_VERSION = 'bookweb-hybrid-v2';
const MAX_NEIGHBORS_PER_BOOK = 12;
const MIN_CONFIDENCE = 0.32;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface BookRow {
  id: string;
  title: string;
  author: string | null;
  genre_id: string | null;
  tags: string[] | null;
  difficulty_level: string | null;
  published_year: number | null;
  vibe: string | null;
  description: string | null;
  series_name: string | null;
  genres?: { name?: string | null } | { name?: string | null }[] | null;
}

interface PreparedBook {
  source: BookRow;
  authors: Set<string>;
  series: string;
  tags: Set<string>;
  terms: Map<string, number>;
}

interface Edge {
  book_a_id: string;
  book_b_id: string;
  weight: number;
  relationship_type: string;
  evidence: Record<string, unknown>;
  similarity_score: number;
  algorithm_version: string;
}

interface ScoredCandidate {
  edge: Edge;
  score: number;
}

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'among', 'because', 'been', 'being', 'book',
  'books', 'from', 'have', 'into', 'more', 'most', 'over', 'their', 'there',
  'these', 'they', 'this', 'those', 'through', 'under', 'using', 'very', 'what',
  'when', 'where', 'which', 'while', 'with', 'would', 'your',
]);

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokens(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function getAuthors(value: string | null): Set<string> {
  return new Set((value ?? '')
    .split(/[,;]|\s+&\s+|\s+and\s+/i)
    .map(normalizeText)
    .filter((name) => name.length > 1 && !['unknown', 'unknown author', 'various'].includes(name)));
}

function getGenreName(book: BookRow): string | null {
  const joined = Array.isArray(book.genres) ? book.genres[0] : book.genres;
  return joined?.name ?? null;
}

function prepareBooks(books: BookRow[]): PreparedBook[] {
  const preliminary = books.map((source) => {
    const tags = new Set((source.tags ?? []).flatMap(tokens));
    const terms = new Map<string, number>();
    const addTerms = (values: string[], fieldWeight: number) => {
      for (const term of values) terms.set(term, (terms.get(term) ?? 0) + fieldWeight);
    };

    addTerms(tokens(source.title), 2.4);
    addTerms([...tags], 2.2);
    addTerms(tokens(source.vibe), 1.8);
    addTerms(tokens(getGenreName(source)), 1.0);
    // Descriptions provide useful context, but are downweighted and bounded so
    // boilerplate and long imported descriptions cannot dominate the profile.
    addTerms(tokens(source.description?.slice(0, 3500)), 0.55);

    return {
      source,
      authors: getAuthors(source.author),
      series: normalizeText(source.series_name),
      tags,
      terms,
    };
  });

  const documentFrequency = new Map<string, number>();
  for (const book of preliminary) {
    for (const term of book.terms.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const docCount = Math.max(preliminary.length, 1);
  return preliminary.map((book) => {
    const weighted = new Map<string, number>();
    for (const [term, fieldWeight] of book.terms) {
      const frequency = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (docCount + 0.5) / (frequency + 0.5));
      weighted.set(term, fieldWeight * idf);
    }
    return { ...book, terms: weighted };
  });
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, value] of a) {
    normA += value * value;
    const other = b.get(term);
    if (other !== undefined) dot += value * other;
  }
  for (const value of b.values()) normB += value * value;
  if (normA === 0 || normB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

function sharedValues(a: Set<string>, b: Set<string>, weights?: Map<string, number>): string[] {
  return [...a].filter((value) => b.has(value))
    .sort((left, right) => (weights?.get(right) ?? 0) - (weights?.get(left) ?? 0))
    .slice(0, 6);
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function getCandidates(books: PreparedBook[]): Set<string> {
  const candidates = new Set<string>();
  const addPair = (left: string, right: string) => {
    if (left === right) return;
    candidates.add(pairKey(left, right));
  };

  const authorIndex = new Map<string, string[]>();
  const seriesIndex = new Map<string, string[]>();
  const termIndex = new Map<string, string[]>();
  for (const book of books) {
    for (const author of book.authors) authorIndex.set(author, [...(authorIndex.get(author) ?? []), book.source.id]);
    if (book.series) seriesIndex.set(book.series, [...(seriesIndex.get(book.series) ?? []), book.source.id]);
    for (const term of book.terms.keys()) termIndex.set(term, [...(termIndex.get(term) ?? []), book.source.id]);
  }

  const addGroups = (index: Map<string, string[]>, maxGroupSize: number) => {
    for (const ids of index.values()) {
      if (ids.length < 2 || ids.length > maxGroupSize) continue;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) addPair(ids[i], ids[j]);
      }
    }
  };

  addGroups(authorIndex, 100);
  addGroups(seriesIndex, 150);

  // Skip ubiquitous words and cap term buckets to keep candidate generation
  // sparse on large catalogs while retaining rare, informative overlaps.
  const maxTermFrequency = Math.max(30, Math.ceil(books.length * 0.04));
  addGroups(termIndex, maxTermFrequency);

  return candidates;
}

function buildScoredEdge(
  a: PreparedBook,
  b: PreparedBook,
  semanticSimilarity: number | null,
): ScoredCandidate | null {
  const sameAuthors = sharedValues(a.authors, b.authors);
  const sameSeries = a.series.length > 0 && a.series === b.series;
  const sameGenre = Boolean(a.source.genre_id && a.source.genre_id === b.source.genre_id);
  const sameDifficulty = Boolean(a.source.difficulty_level &&
    a.source.difficulty_level === b.source.difficulty_level);
  const yearA = a.source.published_year;
  const yearB = b.source.published_year;
  const yearDistance = Number.isInteger(yearA) && Number.isInteger(yearB)
    ? Math.abs((yearA as number) - (yearB as number))
    : null;

  const textSimilarity = cosineSimilarity(a.terms, b.terms);
  const tagSimilarity = jaccard(a.tags, b.tags);
  const availableSignals: Array<[number, number]> = [[0.68, textSimilarity], [0.18, tagSimilarity]];
  if (a.source.genre_id && b.source.genre_id) availableSignals.push([0.08, sameGenre ? 1 : 0]);
  if (a.source.difficulty_level && b.source.difficulty_level) availableSignals.push([0.03, sameDifficulty ? 1 : 0]);
  if (yearDistance !== null) availableSignals.push([0.03, Math.max(0, 1 - yearDistance / 80)]);

  const signalWeight = availableSignals.reduce((total, [weight]) => total + weight, 0);
  const metadataScore = availableSignals.reduce((total, [weight, value]) => total + weight * value, 0) / signalWeight;
  // Fuse model-matched embedding similarity with transparent metadata scoring.
  // A vector-only neighbor still has to clear the confidence threshold below.
  let score = semanticSimilarity === null
    ? metadataScore
    : metadataScore * 0.55 + semanticSimilarity * 0.45;
  if (sameSeries) score = Math.max(score, 0.98);
  else if (sameAuthors.length > 0) score = Math.max(score, 0.92);
  score = Math.max(0, Math.min(1, score));

  if (!sameSeries && sameAuthors.length === 0 && score < MIN_CONFIDENCE) return null;

  const sharedTerms = sharedValues(new Set(a.terms.keys()), new Set(b.terms.keys()), a.terms);
  const sharedTags = sharedValues(a.tags, b.tags);
  const relation = sameSeries
    ? 'same_series'
    : sameAuthors.length > 0
      ? 'same_author'
      : tagSimilarity >= textSimilarity * 0.75 && sharedTags.length > 0
        ? 'shared_tags'
        : sameGenre
          ? 'same_genre'
          : semanticSimilarity !== null && semanticSimilarity > textSimilarity
            ? 'semantic_similarity'
            : 'shared_themes';

  const evidence: Record<string, unknown> = {
    algorithm: GRAPH_VERSION,
    sharedAuthors: sameAuthors,
    ...(sameSeries ? { series: a.source.series_name } : {}),
    ...(sameGenre ? { sharedGenre: getGenreName(a.source) ?? a.source.genre_id } : {}),
    ...(sharedTags.length ? { sharedTags } : {}),
    ...(sharedTerms.length ? { sharedTerms } : {}),
    ...(semanticSimilarity !== null ? { semanticSimilarity: Number(semanticSimilarity.toFixed(4)) } : {}),
    signals: {
      text: Number(textSimilarity.toFixed(4)),
      tags: Number(tagSimilarity.toFixed(4)),
      sameGenre,
      sameDifficulty: a.source.difficulty_level && b.source.difficulty_level ? sameDifficulty : null,
      publicationYearDistance: yearDistance,
    },
  };

  const [bookA, bookB] = a.source.id < b.source.id
    ? [a.source.id, b.source.id]
    : [b.source.id, a.source.id];
  const edge: Edge = {
    book_a_id: bookA,
    book_b_id: bookB,
    // Positive travel cost; stronger confidence means a cheaper transition.
    weight: Number((0.1 + 1.9 * (1 - score)).toFixed(4)),
    relationship_type: relation,
    evidence,
    similarity_score: Number(score.toFixed(4)),
    algorithm_version: GRAPH_VERSION,
  };
  return { edge, score };
}

async function fetchBooks(): Promise<BookRow[]> {
  const allBooks: BookRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, genre_id, tags, difficulty_level, published_year, vibe, description, series_name, genres(name)')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not load catalog: ${error.message}`);
    if (!data?.length) break;
    allBooks.push(...(data as unknown as BookRow[]));
    if (data.length < pageSize) break;
  }
  return allBooks;
}

async function persistEdges(edges: Edge[]): Promise<void> {
  const batchSize = 100;
  for (let offset = 0; offset < edges.length; offset += batchSize) {
    const batch = edges.slice(offset, offset + batchSize);
    let attempts = 0;
    while (attempts < 5) {
      try {
        const { error } = await supabase
          .from('book_edges')
          .upsert(batch, { onConflict: 'book_a_id,book_b_id' });
        if (error) throw error;
        break;
      } catch (err: any) {
        attempts++;
        if (attempts >= 5) {
          throw new Error(`Graph write failed at batch ${Math.floor(offset / batchSize) + 1}; existing edges were kept: ${err?.message || err}`);
        }
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
    await new Promise(r => setTimeout(r, 25));
    if ((offset + batchSize) % 2000 === 0 || offset + batch.length === edges.length) {
      console.log(`  Saved ${Math.min(offset + batch.length, edges.length)}/${edges.length} edges`);
    }
  }

  // Prune stale edges only after every new edge was saved successfully. If an
  // upsert fails, the script exits before this point and the old graph remains.
  console.log('Pruning stale edges from older algorithm versions...');
  const { error: pruneError } = await supabase
    .from('book_edges')
    .delete()
    .or(`algorithm_version.is.null,algorithm_version.neq.${GRAPH_VERSION}`);
  if (pruneError) {
    throw new Error(`New graph was saved, but stale-edge cleanup failed: ${pruneError.message}`);
  }
  console.log('✓ Successfully pruned stale edges');
}

async function buildGraph() {
  console.log(`BookWeb graph builder (${GRAPH_VERSION})`);
  const sourceBooks = await fetchBooks();
  console.log(`Loaded ${sourceBooks.length} books`);
  if (sourceBooks.length < 2) {
    throw new Error('At least two catalog books are required; existing graph was left untouched.');
  }

  const books = prepareBooks(sourceBooks);
  const byId = new Map(books.map((book) => [book.source.id, book]));
  const candidatePairs = getCandidates(books);

  const semanticScores = new Map<string, number>();
  const { data: vectorCandidates, error: vectorError } = await supabase.rpc(
    'get_bookweb_vector_candidates',
    { neighbor_limit: 16 },
  );
  if (vectorError) {
    console.warn(`Vector candidates are unavailable; using metadata-only scoring: ${vectorError.message}`);
  } else {
    for (const candidate of vectorCandidates ?? []) {
      if (typeof candidate.book_a_id !== 'string' || typeof candidate.book_b_id !== 'string') continue;
      const similarity = Number(candidate.similarity);
      if (!Number.isFinite(similarity)) continue;
      const key = pairKey(candidate.book_a_id, candidate.book_b_id);
      candidatePairs.add(key);
      semanticScores.set(key, Math.max(0, Math.min(1, similarity)));
    }
    console.log(`Added ${semanticScores.size} model-matched vector neighbor pairs`);
  }

  console.log(`Scoring ${candidatePairs.size} candidate pairs`);

  const scored: ScoredCandidate[] = [];
  for (const pair of candidatePairs) {
    const [aId, bId] = pair.split(':');
    const a = byId.get(aId);
    const b = byId.get(bId);
    if (!a || !b) continue;
    const result = buildScoredEdge(a, b, semanticScores.get(pair) ?? null);
    if (result) scored.push(result);
  }

  const selected = new Map<string, ScoredCandidate>();
  const candidatesByBook = new Map<string, ScoredCandidate[]>();
  for (const candidate of scored) {
    for (const id of [candidate.edge.book_a_id, candidate.edge.book_b_id]) {
      const list = candidatesByBook.get(id) ?? [];
      list.push(candidate);
      candidatesByBook.set(id, list);
    }
  }
  for (const book of books) {
    const ranked = (candidatesByBook.get(book.source.id) ?? [])
      .sort((left, right) => right.score - left.score || left.edge.book_a_id.localeCompare(right.edge.book_a_id));
    for (const candidate of ranked.slice(0, MAX_NEIGHBORS_PER_BOOK)) {
      selected.set(pairKey(candidate.edge.book_a_id, candidate.edge.book_b_id), candidate);
    }
  }

  const edges = [...selected.values()].map(({ edge }) => edge);
  if (sourceBooks.length > 1 && edges.length === 0) {
    throw new Error('No credible edges were found. Existing graph was left untouched. Check catalog metadata before rebuilding.');
  }

  const counts = edges.reduce<Record<string, number>>((result, edge) => {
    result[edge.relationship_type] = (result[edge.relationship_type] ?? 0) + 1;
    return result;
  }, {});
  console.log(`Generated ${edges.length} sparse, evidence-backed edges; persisting without clearing the existing graph first.`);
  await persistEdges(edges);

  console.log('BookWeb graph build complete.');
  console.log(`Books: ${sourceBooks.length}; edges: ${edges.length}; algorithm: ${GRAPH_VERSION}`);
  for (const [type, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

buildGraph().catch((error) => {
  console.error('BookWeb graph build failed:', error);
  process.exit(1);
});
