import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
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
