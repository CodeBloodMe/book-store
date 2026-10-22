// Local smoke checks for unauthenticated access to protected ChapterOne endpoints.
// Start the application locally, then run: npm run test:security
// This script never calls Supabase directly and never prints credentials.

const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
const base = new URL(baseUrl);

if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
  console.error('APP_BASE_URL must point to a local application instance.');
  process.exit(2);
}

const checks = [];

async function check(name, path, expectedStatuses, inspectBody, init) {
  try {
    const response = await fetch(new URL(path, base), init);
    const body = await response.json().catch(() => null);
    const statusOk = expectedStatuses.includes(response.status);
    const bodyOk = !inspectBody || inspectBody(body);
    const passed = statusOk && bodyOk;
    checks.push({ name, passed, status: response.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name} (HTTP ${response.status})`);
  } catch (error) {
    checks.push({ name, passed: false, error });
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : 'request failed'}`);
  }
}

async function main() {
  await check(
    'Admin database API rejects signed-out requests',
    '/api/admin/database-stats',
    [401],
  );
  await check(
    'Prisma review API rejects signed-out requests',
    '/api/dbms-demo/reviews',
    [401],
  );
  await check(
    'AI recommendations reject signed-out requests',
    '/api/recommend',
    [401],
    null,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'a short mystery' }) },
  );
  await check(
    'Learning-path generation rejects signed-out requests',
    '/api/recommend-path',
    [401],
    null,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'database systems' }) },
  );
  await check(
    'Test-data GET is informational and does not mutate data',
    '/api/test-data?action=add',
    [200],
    (body) => body?.instructions?.add?.startsWith('POST /api/test-data') && body?.instructions?.remove?.startsWith('POST /api/test-data'),
  );
  await check(
    'Bulk import no longer accepts a mutating GET request',
    '/api/populate-all',
    [405],
  );
  await check(
    'Bulk import rejects signed-out POST requests',
    '/api/populate-all',
    [401],
    null,
    { method: 'POST' },
  );
  await check(
    'Genre import no longer accepts a mutating GET request',
    '/api/populate-genre?slug=fiction',
    [405],
  );
  await check(
    'Genre import rejects signed-out POST requests',
    '/api/populate-genre?slug=fiction',
    [401],
    null,
    { method: 'POST' },
  );
  await check(
    'Test-data mutations are unavailable to production clients',
    '/api/test-data',
    [401, 404],
    null,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add' }) },
  );
  await check(
    'Embedding cron rejects requests without a bearer secret',
    '/api/cron/embed',
    [401, 503],
  );

  const failed = checks.filter((result) => !result.passed);
  console.log(`\n${checks.length - failed.length}/${checks.length} security checks passed.`);
  if (failed.length > 0) process.exitCode = 1;
}

main();
