/**
 * build_book_graph.ts
 * 
 * Reads all books from Supabase and generates weighted edges in the book_edges table.
 * This creates the graph that powers the BookWeb "shortest reading path" feature.
 * 
 * Edge weight rules (lower = stronger connection):
 *   - Same author:           0.3
 *   - Same genre:            0.5
 *   - >3 shared tags:        0.6
 *   - 2-3 shared tags:       0.8
 *   - Same difficulty_level: 0.8
 *   - Same decade published:  0.9
 * 
 * Usage: npx tsx scripts/build_book_graph.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface BookRow {
  id: string;
  title: string;
  author: string;
  genre_id: string;
  tags: string[] | null;
  difficulty_level: string | null;
  published_year: number | null;
  vibe: string | null;
}

interface Edge {
  book_a_id: string;
  book_b_id: string;
  weight: number;
  relationship_type: string;
}

function getDecade(year: number | null): number | null {
  if (!year) return null;
  return Math.floor(year / 10) * 10;
}

function getSharedTagCount(tagsA: string[] | null, tagsB: string[] | null): number {
  if (!tagsA || !tagsB) return 0;
  const setB = new Set(tagsB.map(t => t.toLowerCase()));
  return tagsA.filter(t => setB.has(t.toLowerCase())).length;
}

// Deduplicate edges: for each pair (a, b), keep only the lowest weight
function deduplicateEdges(edges: Edge[]): Edge[] {
  const edgeMap = new Map<string, Edge>();

  for (const edge of edges) {
    // Normalize the key so (a, b) and (b, a) don't create duplicate entries
    const [first, second] = [edge.book_a_id, edge.book_b_id].sort();
    const key = `${first}:${second}`;

    const existing = edgeMap.get(key);
    if (!existing || edge.weight < existing.weight) {
      edgeMap.set(key, {
        book_a_id: first,
        book_b_id: second,
        weight: edge.weight,
        relationship_type: edge.relationship_type,
      });
    }
  }

  return Array.from(edgeMap.values());
}

async function buildGraph() {
  console.log('📚 BookWeb Graph Builder');
  console.log('========================\n');

  // 1. Fetch all books with pagination
  console.log('⏳ Fetching all books...');
  let allBooks: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title, author, genre_id, tags, difficulty_level, published_year, vibe')
      .range(from, from + step - 1);
      
    if (error) {
      console.error('❌ Failed to fetch books:', error.message);
      process.exit(1);
    }
    
    if (!books || books.length === 0) break;
    allBooks = allBooks.concat(books);
    if (books.length < step) break;
    from += step;
  }
  const books = allBooks;

  console.log(`✅ Loaded ${books.length} books\n`);

  // 2. Generate edges
  console.log('⏳ Generating edges...');
  const edges: Edge[] = [];
  const typedBooks = books as BookRow[];

  for (let i = 0; i < typedBooks.length; i++) {
    for (let j = i + 1; j < typedBooks.length; j++) {
      const a = typedBooks[i];
      const b = typedBooks[j];

      // Same author → weight 0.2 (strongest connection)
      if (a.author && b.author && a.author.toLowerCase() === b.author.toLowerCase()) {
        edges.push({ book_a_id: a.id, book_b_id: b.id, weight: 0.2, relationship_type: 'same_author' });
        continue; // Skip weaker edges
      }

      const sharedTags = getSharedTagCount(a.tags, b.tags);
      const sameGenre = a.genre_id && b.genre_id && a.genre_id === b.genre_id;
      
      // Shared tags >= 2 → weight 0.4
      if (sharedTags >= 2) {
        edges.push({ book_a_id: a.id, book_b_id: b.id, weight: 0.4, relationship_type: 'shared_tags' });
        continue;
      }
      
      // Shared tags == 1 AND Same Genre → weight 0.6
      if (sharedTags === 1 && sameGenre) {
        edges.push({ book_a_id: a.id, book_b_id: b.id, weight: 0.6, relationship_type: 'shared_themes' });
        continue;
      }

      // Same genre AND same difficulty AND same decade → weight 0.8
      const decadeA = getDecade(a.published_year);
      const decadeB = getDecade(b.published_year);
      if (sameGenre && a.difficulty_level === b.difficulty_level && decadeA === decadeB && decadeA !== null) {
        edges.push({ book_a_id: a.id, book_b_id: b.id, weight: 0.8, relationship_type: 'highly_similar' });
        continue;
      }
    }

    // Progress log every 100 books
    if ((i + 1) % 100 === 0) {
      console.log(`  Processed ${i + 1}/${typedBooks.length} books (${edges.length} edges so far)`);
    }
  }

  console.log(`\n✅ Generated ${edges.length} raw edges`);

  // 3. Deduplicate — keep only the strongest connection per pair
  const uniqueEdges = deduplicateEdges(edges);
  console.log(`✅ Deduplicated to ${uniqueEdges.length} unique edges\n`);

  // 4. Clear existing edges and insert new ones
  console.log('⏳ Clearing old edges...');
  const { error: deleteError } = await supabase.from('book_edges').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('❌ Failed to clear edges:', deleteError.message);
    process.exit(1);
  }

  // 5. Insert in batches (Supabase has row limits per request)
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < uniqueEdges.length; i += BATCH_SIZE) {
    const batch = uniqueEdges.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase.from('book_edges').insert(batch);

    if (insertError) {
      console.error(`❌ Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError.message);
      // Continue with other batches — some might be duplicates from previous runs
      continue;
    }

    inserted += batch.length;
    console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${inserted}/${uniqueEdges.length})`);
  }

  // 6. Print summary
  console.log('\n=============================');
  console.log('📊 Graph Build Summary');
  console.log('=============================');
  console.log(`  Books processed: ${typedBooks.length}`);
  console.log(`  Edges created:   ${inserted}`);
  console.log(`  Edge types:`);

  const typeCounts: Record<string, number> = {};
  for (const edge of uniqueEdges) {
    typeCounts[edge.relationship_type] = (typeCounts[edge.relationship_type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }

  console.log('\n✅ BookWeb graph built successfully!');
}

buildGraph().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
