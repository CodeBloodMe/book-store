import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://xpmpzpdjsdzhiloykmfi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbXB6cGRqc2R6aGlsb3lrbWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTkwODIsImV4cCI6MjA5NjkzNTA4Mn0.ZnI6ZI5JE14W1Sr9WkuYqGhmL1aqbb8avBZIQWmV7Uw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('🔍 Checking Supabase Tables...');
  
  const { error: edgesErr } = await supabase.from('book_edges').select('id').limit(1);
  const { error: profErr } = await supabase.from('user_reader_profiles').select('id').limit(1);
  const { error: intErr } = await supabase.from('blind_date_interactions').select('id').limit(1);
  
  console.log('book_edges:', edgesErr ? '❌ ' + edgesErr.message : '✅ Exists');
  console.log('user_reader_profiles:', profErr ? '❌ ' + profErr.message : '✅ Exists');
  console.log('blind_date_interactions:', intErr ? '❌ ' + intErr.message : '✅ Exists');
  
  console.log('\n🔍 Checking Supabase RPC Functions...');
  // Dummy check to see if function exists (it will error with arguments if it doesn't exist, or return empty/success if it does)
  const { error: pathErr } = await supabase.rpc('find_reading_path', { start_id: '00000000-0000-0000-0000-000000000000', end_id: '00000000-0000-0000-0000-000000000000' });
  const { error: matchErr } = await supabase.rpc('match_mystery_book', { p_session_id: 'test' });
  
  // If it's a 404/not found error, the function is missing.
  console.log('find_reading_path():', (pathErr && pathErr.message.includes('function')) ? '❌ ' + pathErr.message : '✅ Exists');
  console.log('match_mystery_book():', (matchErr && matchErr.message.includes('function')) ? '❌ ' + matchErr.message : '✅ Exists');
}

check();
