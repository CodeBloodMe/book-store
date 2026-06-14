// Run with: node scripts/import-books.mjs
// Uses OpenLibrary API (free, no key needed, millions of real books)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xpmpzpdjsdzhiloykmfi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbXB6cGRqc2R6aGlsb3lrbWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTkwODIsImV4cCI6MjA5NjkzNTA4Mn0.ZnI6ZI5JE14W1Sr9WkuYqGhmL1aqbb8avBZIQWmV7Uw';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('📚 Fetching genres from Supabase...');
  const { data: genres, error } = await supabase.from('genres').select('id, name');
  if (error) { console.error('ERROR fetching genres:', error.message); process.exit(1); }
  console.log(`✅ Found ${genres.length} genres.\n`);

  let totalImported = 0;

  for (const genre of genres) {
    if (genre.name === 'Global Catalog') continue;
    await delay(400);

    try {
      // OpenLibrary search API - completely free, no key needed
      const query = encodeURIComponent(genre.name);
      const url = `https://openlibrary.org/search.json?q=${query}&limit=40&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,ratings_average,ratings_count,subject,isbn`;
      
      console.log(`  🔍 Fetching: ${genre.name}...`);
      const res = await fetch(url, { headers: { 'User-Agent': 'BookSphere/1.0 (educational project)' } });
      
      if (!res.ok) {
        console.log(`  ⚠️  HTTP ${res.status} for: ${genre.name}`);
        continue;
      }
      
      const data = await res.json();

      if (!data.docs || data.docs.length === 0) {
        console.log(`  ⚠️  No results for: ${genre.name}`);
        continue;
      }

      const books = data.docs
        .filter(doc => doc.title && doc.author_name && doc.author_name.length > 0)
        .map(doc => ({
          genre_id: genre.id,
          title: doc.title,
          author: doc.author_name?.slice(0, 2).join(', ') ?? 'Unknown',
          description: `A book about ${genre.name} by ${doc.author_name?.[0] ?? 'Unknown'}.`,
          cover_image_url: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
          page_count: doc.number_of_pages_median ?? null,
          published_year: doc.first_publish_year ?? null,
          expert_rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
          community_rating: doc.ratings_average
            ? parseFloat(doc.ratings_average.toFixed(1))
            : parseFloat((Math.random() * 2 + 3).toFixed(1)),
          total_reviews: doc.ratings_count ?? Math.floor(Math.random() * 500),
          difficulty_level: ['Beginner', 'Intermediate', 'Advanced'][Math.floor(Math.random() * 3)],
          external_id: `ol:${doc.key?.replace('/works/', '') ?? doc.title}`,
          is_featured: false,
          is_editors_pick: false,
          is_bestseller: (doc.ratings_count ?? 0) > 1000,
          tags: ['REAL_IMPORT'],
        }));

      // Deduplicate against existing
      const extIds = books.map(b => b.external_id);
      const { data: existing } = await supabase.from('books').select('external_id').in('external_id', extIds);
      const seenIds = new Set((existing ?? []).map(e => e.external_id));
      const toInsert = books.filter(b => !seenIds.has(b.external_id));

      if (toInsert.length === 0) {
        console.log(`  ✅ ${genre.name}: already up to date`);
        continue;
      }

      const { error: insertError } = await supabase.from('books').insert(toInsert);
      if (insertError) {
        console.error(`  ❌ ${genre.name}: INSERT FAILED — ${insertError.message}`);
        // Print first failing book to debug
        console.error('     First book:', JSON.stringify(toInsert[0], null, 2));
      } else {
        totalImported += toInsert.length;
        console.log(`  ✅ ${genre.name}: imported ${toInsert.length} books`);
      }
    } catch (err) {
      console.error(`  ❌ ${genre.name}: exception — ${err.message}`);
    }
  }

  console.log(`\n🎉 Done! Imported ${totalImported} real books total.`);
}

run();
