async function test() {
  const authorName = "Frank Herbert";
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(authorName)}&pithumbsize=500&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  console.log(pages[pageId].thumbnail?.source || 'No image');
}
test();
