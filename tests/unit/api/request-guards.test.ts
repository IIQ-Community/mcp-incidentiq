/**
 * Request guards (context: IncidentIQ /services 405 incident, 2026-11-24).
 *
 * Live facts the guards encode:
 * - An explicit `FilterByProduct: false` in a search body widens results to every IIQ product
 *   (all tickets 140,479 -> 174,045; open 4,934 -> 8,303). Omitting it keeps the token's product.
 * - `/services/*` (IIQ's browser API) now returns 405/HTML to API clients; only `/api/v1.0` works.
 *
 * Both guards must refuse the request BEFORE it is sent, so each test counts server hits.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { IncidentIQClient } from '../../../src/api/client';
import { server } from '../../mocks/server';

const BASE = 'https://test.incidentiq.com/api/v1.0';
const PAGE = { Items: [], ItemCount: 0, Paging: { PageIndex: 0, PageSize: 1, TotalRows: 0, PageCount: 0 } };

let hits: { url: string; body: unknown }[];

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  hits = [];
  const record = async ({ request }: { request: Request }) => {
    const text = await request.text();
    let body: unknown = text || undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // Non-JSON body: keep the raw text. The hit itself is what refusal tests count.
    }
    hits.push({ url: request.url, body });
    return HttpResponse.json(PAGE);
  };
  server.use(
    http.post('https://test.incidentiq.com/*', record),
    http.get('https://test.incidentiq.com/*', record),
  );
});

describe('FilterByProduct: false guard', () => {
  let client: IncidentIQClient;
  beforeEach(() => {
    client = new IncidentIQClient(BASE, 'test-api-key');
  });

  it('refuses searchTickets with FilterByProduct: false and sends nothing', async () => {
    await expect(client.searchTickets({ FilterByProduct: false } as never)).rejects.toThrow(/FilterByProduct/);
    expect(hits).toHaveLength(0);
  });

  it.each(['false', 'False', 'FALSE'])('refuses the string form %j', async (value) => {
    await expect(
      client.request({ method: 'POST', url: '/users', data: { FilterByProduct: value } }),
    ).rejects.toThrow(/FilterByProduct/);
    expect(hits).toHaveLength(0);
  });

  it('refuses a raw client.request body (tool handlers that bypass the search helpers)', async () => {
    await expect(
      client.request({ method: 'POST', url: '/assets', data: { OnlyShowDeleted: false, FilterByProduct: false } }),
    ).rejects.toThrow(/FilterByProduct/);
    expect(hits).toHaveLength(0);
  });

  it('refuses a JSON-string body carrying FilterByProduct: false', async () => {
    await expect(
      client.request({ method: 'POST', url: '/tickets', data: JSON.stringify({ FilterByProduct: false }) }),
    ).rejects.toThrow(/FilterByProduct/);
    expect(hits).toHaveLength(0);
  });

  it.each([
    ['Buffer', () => Buffer.from(JSON.stringify({ FilterByProduct: false }))],
    ['Uint8Array', () => new TextEncoder().encode(JSON.stringify({ FilterByProduct: false }))],
    ['FormData', () => { const form = new FormData(); form.append('FilterByProduct', 'false'); return form; }],
    ['URLSearchParams', () => new URLSearchParams({ FilterByProduct: 'false' })],
    // axios sends a non-Buffer view's WHOLE backing buffer, so a 1-byte view still sends the full JSON.
    ['partial Uint8Array view', () => new Uint8Array(new TextEncoder().encode(JSON.stringify({ FilterByProduct: false })).buffer, 0, 1)],
  ])('refuses a %s body carrying FilterByProduct false', async (_kind, makeBody) => {
    await expect(client.request({ method: 'POST', url: '/tickets', data: makeBody() })).rejects.toThrow(/FilterByProduct/);
    expect(hits).toHaveLength(0);
  });

  it('sends FilterByProduct: true unchanged (the valid product-scoped form)', async () => {
    await client.request({ method: 'POST', url: '/tickets', data: { FilterByProduct: true, ProductId: 'p' } });
    expect(hits).toHaveLength(1);
    expect(hits[0].body).toEqual({ FilterByProduct: true, ProductId: 'p' });
  });

  it('sends a valid Buffer slice whose backing memory holds other JSON (axios sends only the slice)', async () => {
    // The backing memory is ONE complete JSON document with FilterByProduct false; the slice is its valid inner object.
    const inner = JSON.stringify({ OnlyShowDeleted: false });
    const document = JSON.stringify({ FilterByProduct: false, x: { OnlyShowDeleted: false } });
    const backing = Buffer.alloc(Buffer.byteLength(document)); // unpooled: its ArrayBuffer is exactly `document`
    backing.write(document);
    const start = backing.indexOf(inner);
    const slice = backing.subarray(start, start + inner.length);
    await client.request({ method: 'POST', url: '/tickets', data: slice });
    expect(hits).toHaveLength(1);
    expect(hits[0].body).toEqual({ OnlyShowDeleted: false });
  });

  it('sends the string form "true" unchanged', async () => {
    await client.request({ method: 'POST', url: '/tickets', data: { FilterByProduct: 'true' } });
    expect(hits).toHaveLength(1);
    expect(hits[0].body).toEqual({ FilterByProduct: 'true' });
  });

  it('sends the default search body (no FilterByProduct) unchanged', async () => {
    await client.searchTickets({});
    expect(hits).toHaveLength(1);
    expect(hits[0].body).toEqual({ OnlyShowDeleted: false, FilterByViewPermission: false });
  });
});

describe('/services path guard', () => {
  it('refuses every request when IIQ_API_BASE_URL points at /services, naming /api/v1.0', async () => {
    const client = new IncidentIQClient('https://test.incidentiq.com/services', 'test-api-key');
    await expect(client.request({ method: 'POST', url: '/tickets/all/all/Open', data: {} })).rejects.toThrow(
      /\/services.*\/api\/v1\.0/s,
    );
    expect(hits).toHaveLength(0);
  });

  it('refuses an absolute /services URL on a correctly configured client', async () => {
    const client = new IncidentIQClient(BASE, 'test-api-key');
    await expect(
      client.request({ method: 'GET', url: 'https://test.incidentiq.com/services/tickets/all/all/Open' }),
    ).rejects.toThrow(/\/services/);
    expect(hits).toHaveLength(0);
  });

  it.each(['https://test.incidentiq.com/%73ervices', 'https://test.incidentiq.com/%73%65rvices'])(
    'refuses a percent-encoded services segment (%s)',
    async (base) => {
      const client = new IncidentIQClient(base, 'test-api-key');
      await expect(client.request({ method: 'POST', url: '/tickets/all/all/Open', data: {} })).rejects.toThrow(
        /\/services/,
      );
      expect(hits).toHaveLength(0);
    },
  );

  it.each(['/assets/assettag/services', '/users/search/services'])(
    'allows a lookup value equal to "services" under /api/v1.0 (%s)',
    async (path) => {
      const client = new IncidentIQClient(BASE, 'test-api-key');
      await client.request({ method: 'GET', url: path });
      expect(hits).toHaveLength(1);
      expect(new URL(hits[0].url).pathname).toBe(`/api/v1.0${path}`);
    },
  );

  it('refuses to follow a redirect into /services (the target receives nothing)', async () => {
    server.use(
      http.get(`${BASE}/redirects-away`, () =>
        new HttpResponse(null, { status: 302, headers: { Location: 'https://test.incidentiq.com/services/tickets' } })),
    );
    const client = new IncidentIQClient(BASE, 'test-api-key');
    await expect(client.request({ method: 'GET', url: '/redirects-away' })).rejects.toThrow(/\/services/);
    expect(hits.filter((hit) => new URL(hit.url).pathname.startsWith('/services'))).toHaveLength(0);
  });

  it('keeps the redirect check when a caller supplies its own beforeRedirect, and still runs the caller hook', async () => {
    server.use(
      http.get(`${BASE}/redirects-away`, () =>
        new HttpResponse(null, { status: 302, headers: { Location: 'https://test.incidentiq.com/services/tickets' } })),
      http.get(`${BASE}/moved`, () => new HttpResponse(null, { status: 302, headers: { Location: `${BASE}/tickets/statuses` } })),
    );
    const client = new IncidentIQClient(BASE, 'test-api-key');
    const seen: string[] = [];
    const beforeRedirect = (options: Record<string, unknown>) => { seen.push(String(options.path)); };
    await expect(client.request({ method: 'GET', url: '/redirects-away', beforeRedirect })).rejects.toThrow(/\/services/);
    expect(hits.filter((hit) => new URL(hit.url).pathname.startsWith('/services'))).toHaveLength(0);
    await client.request({ method: 'GET', url: '/moved', beforeRedirect });
    expect(seen).toEqual(['/api/v1.0/tickets/statuses']);
  });

  it('still follows an ordinary redirect within /api/v1.0', async () => {
    server.use(
      http.get(`${BASE}/moved`, () => new HttpResponse(null, { status: 302, headers: { Location: `${BASE}/tickets/statuses` } })),
    );
    const client = new IncidentIQClient(BASE, 'test-api-key');
    await client.request({ method: 'GET', url: '/moved' });
    expect(hits.map((hit) => new URL(hit.url).pathname)).toEqual(['/api/v1.0/tickets/statuses']);
  });

  it('allows /api/v1.0 paths that merely contain the letters "services"', async () => {
    const client = new IncidentIQClient(BASE, 'test-api-key');
    await client.request({ method: 'GET', url: '/assets/servicestatus' });
    expect(hits).toHaveLength(1);
    expect(new URL(hits[0].url).pathname).toBe('/api/v1.0/assets/servicestatus');
  });
});
