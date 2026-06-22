import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('books')
    .select('title, cover_image_url')
    .ilike('title', '%One Piece%')
    .limit(5);
    
  console.log('Error:', error);
  console.log('Data:', data);
}
main();
