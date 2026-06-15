
const { fetchAndImportExternalBook } = require('./lib/external-books');
async function test() {
  const id = await fetchAndImportExternalBook('ext_ol_OL2735738W');
  console.log('Imported ID:', id);
}
test();
