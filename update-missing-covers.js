const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://xpmpzpdjsdzhiloykmfi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbXB6cGRqc2R6aGlsb3lrbWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTkwODIsImV4cCI6MjA5NjkzNTA4Mn0.ZnI6ZI5JE14W1Sr9WkuYqGhmL1aqbb8avBZIQWmV7Uw'
);

async function check() {
  const { data, error } = await supabase.from('books').select('id, title, author, cover_image_url');
  if (error) return console.error(error);
  
  const missing = data.filter(b => !b.cover_image_url || b.cover_image_url === '');
  console.log(`Found ${missing.length} missing covers`);
  
  for (const book of missing) {
    console.log(`\nTesting OpenLibrary for: ${book.title} by ${book.author}`);
    let cover = null;
    
    try {
      const q = encodeURIComponent(`${book.title}`);
      const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=5`);
      const json = await res.json();
      const doc = json.docs?.find(d => d.cover_i);
      
      if (doc && doc.cover_i) {
        cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        console.log('Found OpenLibrary cover:', cover);
      }
    } catch(e) { console.error('OL Error', e.message); }

    if (!cover) {
      console.log('Testing Google Books instead...');
      try {
        const qTitle = encodeURIComponent(book.title);
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${qTitle}&maxResults=3`);
        const json = await res.json();
        
        if (json.items) {
          const item = json.items.find(i => i.volumeInfo?.imageLinks?.thumbnail);
          if (item) {
            cover = item.volumeInfo.imageLinks.thumbnail.replace('&edge=curl', '').replace('zoom=1', 'zoom=0').replace('http:', 'https:');
            console.log('Found Google Books cover:', cover);
          }
        }
      } catch(e) { console.error('GB Error', e.message); }
    }

    if (cover) {
      const { error: updateError } = await supabase.from('books').update({ cover_image_url: cover }).eq('id', book.id);
      if (updateError) {
        console.error('Failed to update:', updateError);
      } else {
        console.log('Successfully updated DB.');
      }
    } else {
      console.log('Not found anywhere.');
    }
    
    // sleep to prevent rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
}
check();
