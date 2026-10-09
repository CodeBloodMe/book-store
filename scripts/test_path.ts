import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://xpmpzpdjsdzhiloykmfi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbXB6cGRqc2R6aGlsb3lrbWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTkwODIsImV4cCI6MjA5NjkzNTA4Mn0.ZnI6ZI5JE14W1Sr9WkuYqGhmL1aqbb8avBZIQWmV7Uw');
async function test() {
  const { data: hp } = await supabase.from('books').select('id, title, genre_id').ilike('title', '%harry potter%').limit(1);
  const { data: hobbit } = await supabase.from('books').select('id, title, genre_id').ilike('title', '%hobbit%').limit(1);
  console.log('HP:', hp);
  console.log('Hobbit:', hobbit);
  
  if (!hp || hp.length === 0 || !hobbit || hobbit.length === 0) return;
  const hpId = hp[0].id;
  const hobbitId = hobbit[0].id;

  const { data: edges } = await supabase.from('book_edges').select('*').or(`book_a_id.eq.${hpId},book_b_id.eq.${hpId}`);
  console.log('HP edges count:', edges?.length);
  const { data: path } = await supabase.rpc('find_reading_path', { start_id: hpId, end_id: hobbitId, max_depth: 3 });
  console.log('Path depth 3:', path);
}
test();
