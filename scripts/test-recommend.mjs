async function test() {
  const res = await fetch('http://localhost:3000/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'best indian novels' }),
  });
  const data = await res.json();
  if (data.error) {
    console.log('ERROR:', data.error);
    return;
  }
  console.log('Books found:', data.books?.length);
  for (const [i, b] of (data.books || []).entries()) {
    console.log(`${i + 1}. "${b.title}" by ${b.author}`);
    console.log(`   Why: ${b.why}`);
    console.log(`   Cover: ${b.cover_image_url ? 'YES' : 'NO'}`);
    console.log(`   Genre: ${b.genres?.name ?? 'N/A'}`);
    console.log('');
  }
}
test();
