import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

/**
 * user_get_current. IIQ has no GET /users/me (404 live, 2026-11-08); the API key is a JWT whose
 * `sub` claim is the key owner's UserId, and GET /users/{sub} returns that user.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';
const OWNER_ID = '6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b';
const ORIGINAL_KEY = process.env.IIQ_API_KEY;

const b64url = (value: string) => Buffer.from(value).toString('base64url');
const jwt = (payload: string) => `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url(payload)}.c2lnbmF0dXJl`;
const claims = (extra: object) => JSON.stringify({ iss: 'issuer', scope: 'api', exp: 4102444800, ...extra });

/** Fresh module graph, so the users tools build their client from this key. */
async function runWithKey(apiKey: string): Promise<string> {
  vi.resetModules();
  process.env.IIQ_API_KEY = apiKey;
  const { handleEnhancedUserTool } = await import('../../../src/tools/users');
  const result = (await handleEnhancedUserTool('user_get_current', {})) as { content: Array<{ text: string }> };
  return result.content[0].text;
}

/** Records every request path; GET /users/me answers 404 as production does. */
function recordRequests(paths: string[], user: object | null = null) {
  server.use(
    http.all(`${BASE}/*`, ({ request }) => {
      const path = new URL(request.url).pathname;
      paths.push(path);
      if (user && path === `/api/v1.0/users/${OWNER_ID}`) return HttpResponse.json({ Item: user });
      return new HttpResponse(null, { status: 404 });
    })
  );
}

const OWNER = {
  UserId: OWNER_ID,
  Name: 'Key Owner',
  FirstName: 'Key',
  LastName: 'Owner',
  Username: 'kowner',
  Email: 'kowner@district.test',
  Role: { RoleId: 'role-agent', Name: 'Agent' },
  LocationName: 'District Office',
  Phone: '555-0100',
  IsActive: true,
  CreatedDate: '2020-08-01T00:00:00',
};

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  process.env.IIQ_API_KEY = ORIGINAL_KEY;
});
afterAll(() => server.close());

describe('user_get_current', () => {
  it('looks up the API key owner by the token sub claim, not /users/me', async () => {
    const paths: string[] = [];
    recordRequests(paths, OWNER);
    const text = await runWithKey(jwt(claims({ sub: OWNER_ID, jti: 'f0e1d2c3-b4a5-4968-8776-655443322110' })));
    expect(paths).toEqual([`/api/v1.0/users/${OWNER_ID}`]);
    expect(text).toContain('Current User (API key owner):');
    expect(text).toContain('Name: Key Owner');
    expect(text).toContain('Email: kowner@district.test');
    expect(text).toContain('Role: Agent');
    expect(text).toContain('Location: District Office');
    expect(text).toContain('Status: Active');
    // IIQ never sends these; they rendered as "0 permissions" / "undefined".
    expect(text).not.toMatch(/Permissions|undefined/);
  });

  it.each([
    ['a key that is not a JWT', 'test-api-key'],
    ['a JWT without sub', jwt(claims({}))],
    ['a JWT whose sub is not a GUID', jwt(claims({ sub: '../users/me' }))],
    ['a JWT whose payload is not JSON', jwt('not json')],
    ['a JWT whose payload is null', jwt('null')],
  ])('says the key has no user, without calling IIQ, for %s', async (_case, apiKey) => {
    const paths: string[] = [];
    recordRequests(paths);
    const text = await runWithKey(apiKey);
    expect(paths).toEqual([]);
    expect(text).toMatch(/API key does not identify a user/);
  });

  it('reports a key owner IIQ cannot find', async () => {
    const paths: string[] = [];
    recordRequests(paths);
    const text = await runWithKey(jwt(claims({ sub: OWNER_ID })));
    expect(paths).toEqual([`/api/v1.0/users/${OWNER_ID}`]);
    expect(text).toMatch(/API key's user was not found/);
  });
});
