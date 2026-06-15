const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const matchUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const matchKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(matchUrl[1].trim(), matchKey[1].trim());

async function check() {
  const { data: genre, error } = await supabase.from('genres').select('id').eq('slug', 'global-catalog').single();
  console.log('Genre:', genre, 'Error:', error);
}
check();
