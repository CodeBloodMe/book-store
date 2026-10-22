import { timingSafeEqual } from 'node:crypto';

function matchesConfiguredSecret(expected: string | undefined, supplied: string | null): boolean {
  // Missing or short secrets always fail closed, including in development.
  if (!expected || expected.length < 32 || !supplied) return false;
  if (/(placeholder|replace[-_ ]?with|generate[-_ ]?a|example|dummy|ci[-_])/i.test(expected)) return false;
  const expectedBytes = Buffer.from(expected, 'utf8');
  const suppliedBytes = Buffer.from(supplied, 'utf8');
  if (expectedBytes.length !== suppliedBytes.length) return false;
  return timingSafeEqual(expectedBytes, suppliedBytes);
}

/** Require a cron token in Authorization: Bearer <CRON_SECRET>. */
export function isCronRequest(request: Request): boolean {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  return matchesConfiguredSecret(process.env.CRON_SECRET, authorization.slice('Bearer '.length));
}
