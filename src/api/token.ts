import { GUID } from './lookups.js';

/**
 * The UserId an IncidentIQ API key belongs to: the `sub` claim of the key's JWT payload. IIQ has
 * no GET /users/me (404, verified 2026-11-08), but GET /users/{sub} returns the key's owner.
 *
 * The signature is not verified: the claim only chooses which user to ask IIQ for, and IIQ still
 * authenticates the key on that request. Returns undefined when the key is not a JWT or its `sub`
 * is not a GUID.
 */
export function apiKeyUserId(apiKey: string): string | undefined {
  const segments = apiKey.split('.');
  if (segments.length !== 3) return undefined;
  try {
    const claims: unknown = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
    const sub = (claims as { sub?: unknown } | null)?.sub;
    return typeof sub === 'string' && GUID.test(sub) ? sub : undefined;
  } catch {
    return undefined;
  }
}
