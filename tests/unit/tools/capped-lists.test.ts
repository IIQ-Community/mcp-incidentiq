import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedAssetTool } from '../../../src/tools/assets';
import { handleEnhancedUserTool } from '../../../src/tools/users';
import { handleEnhancedLocationTool } from '../../../src/tools/locations';
import { handleEnhancedPartsTool, enhancedPartsTools } from '../../../src/tools/parts';
import { enhancedLocationTools } from '../../../src/tools/locations';

/**
 * The seven tools that showed only the first N rows with no way to reach the rest now page
 * through every row (pageIndex/pageSize, default 25). Response shapes and field names are the
 * ones production IIQ returns (verified 2026-11-07): rooms default to a 20-row page of 4,927,
 * agents to 200 of 300, so whole lists are read with $p/$s before filtering.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const textOf = async (handler: Handler, name: string, args: object) => (await handler(name, args)).content[0].text;
const bullets = (text: string) => text.split('\n').filter((line) => line.trimStart().startsWith('• '));

/** Live IIQ GET list: pages by $p/$s with a 20-row default, reports Paging.TotalRows. */
const paged = (rows: object[]) => ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const p = Number(url.searchParams.get('$p') ?? 0);
  const s = Number(url.searchParams.get('$s') ?? 20);
  const items = rows.slice(p * s, p * s + s);
  return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: rows.length } });
};
const many = <T,>(n: number, row: (i: number) => T) => Array.from({ length: n }, (_, i) => row(i));

describe('location_get_all_rooms', () => {
  const run = (args: object) => textOf(handleEnhancedLocationTool as Handler, 'location_get_all_rooms', args);
  const room = (i: number, type = 'Classroom') => ({ LocationRoomId: `r${i}`, Name: `Room ${i}`, LocationName: 'Central High', LocationRoomTypeName: type });

  it('counts and pages every room, not just the 20-row default page', async () => {
    server.use(http.get(`${BASE}/locations/rooms`, paged(many(60, (i) => room(i)))));
    const text = await run({ pageIndex: 2 });
    expect(text.startsWith('Found 60 rooms (showing 10):')).toBe(true);
    expect(bullets(text)[0]).toBe('• Room 50 - Central High');
    expect(text.endsWith('Page 3 of 3')).toBe(true);
  });

  it('filters by the room type IIQ sends, across every page, ignoring case', async () => {
    server.use(http.get(`${BASE}/locations/rooms`, paged([...many(30, (i) => room(i, 'Office')), room(99, 'Library')])));
    expect(await run({ roomType: 'library' })).toBe(
      'Found 1 rooms (showing 1):\n\n• Room 99 - Central High\n  Type: Library\n\nPage 1 of 1'
    );
  });

  it('no longer offers minCapacity (IIQ rooms have no capacity)', () => {
    const schema = enhancedLocationTools.find((t) => t.name === 'location_get_all_rooms')!.inputSchema.properties as Record<string, unknown>;
    expect(schema).not.toHaveProperty('minCapacity');
    expect(schema).toHaveProperty('pageIndex');
  });
});

describe('user_get_all_agents', () => {
  const run = (args: object) => textOf(handleEnhancedUserTool as Handler, 'user_get_all_agents', args);
  const agent = (i: number) => ({ UserId: `u${i}`, Name: `Agent ${i}`, Email: `a${i}@x.test`, Phone: '555-0100', LocationName: 'District Office' });

  it('counts every agent and pages them 25 at a time by default', async () => {
    server.use(http.get(`${BASE}/users/agents`, paged(many(300, agent))));
    const text = await run({ pageIndex: 11 });
    expect(text.startsWith('Found 300 IT support agents (showing 25):')).toBe(true);
    expect(bullets(text)[0]).toBe('• Agent 275');
    expect(text).toContain('Page 12 of 12');
  });

  it('renders the Phone IIQ sends', async () => {
    server.use(http.get(`${BASE}/users/agents`, paged([agent(0)])));
    expect(await run({})).toContain('• Agent 0\n  Email: a0@x.test | Phone: 555-0100\n  Location: District Office');
  });
});

describe('parts_get_orders', () => {
  const run = (args: object) => textOf(handleEnhancedPartsTool as Handler, 'parts_get_orders', args);
  const po = (i: number, flags: object = {}) => ({
    PurchaseOrderId: `po-${i}-0000`, PoNumber: `PO-${i}`, CreatedDate: '2026-10-01', PurchaseTotalCosts: 120, Purchases: [{}, {}], IsApproved: false, IsClosed: false, ...flags,
  });

  it('renders every order with the fields IIQ sends', async () => {
    server.use(http.get(`${BASE}/purchaseorders`, paged([po(1)])));
    expect(await run({})).toBe(
      'Found 1 purchase orders (showing 1):\n\n• PO PO-1\n  Status: Open | Created: 2026-10-01\n  Total: $120 | Items: 2\n\nPage 1 of 1'
    );
  });

  it('filters by a status derived from IsClosed / IsApproved', async () => {
    server.use(http.get(`${BASE}/purchaseorders`, paged([po(1), po(2, { IsApproved: true }), po(3, { IsApproved: true, IsClosed: true })])));
    expect(bullets(await run({ status: 'Approved' }))).toEqual(['• PO PO-2']);
    expect(bullets(await run({ status: 'closed' }))).toEqual(['• PO PO-3']);
    expect(bullets(await run({ status: 'Open' }))).toEqual(['• PO PO-1']);
  });

  it('offers the statuses that can actually match', () => {
    const schema = enhancedPartsTools.find((t) => t.name === 'parts_get_orders')!.inputSchema.properties as any;
    expect(schema.status.enum).toEqual(['Open', 'Approved', 'Closed']);
  });

  it('pages past 10 orders', async () => {
    server.use(http.get(`${BASE}/purchaseorders`, paged(many(12, (i) => po(i)))));
    const text = await run({ pageSize: 12 });
    expect(bullets(text)).toHaveLength(12);
  });
});

describe('asset_get_history', () => {
  const run = (args: object) => textOf(handleEnhancedAssetTool as Handler, 'asset_get_history', args);
  const activity = (i: number) => ({ ActivityDate: `2026-01-${String(i + 1).padStart(2, '0')}`, ActivityType: 3, Details: `Change ${i}`, UserId: 'u-1' });

  it('pages through every activity instead of the first 10', async () => {
    server.use(http.get(`${BASE}/assets/:id/activities`, () => HttpResponse.json({ Items: many(24, activity), ItemCount: 24 })));
    const text = await run({ assetId: 'a1', pageIndex: 1, pageSize: 20 });
    expect(text.startsWith('Found 24 activities (showing 4):')).toBe(true);
    expect(bullets(text)[0]).toBe('• 2026-01-21 - 3');
    expect(text).toContain('  Change 20\n  By: u-1');
  });
});

describe('location_get_assets', () => {
  const run = (args: object) => textOf(handleEnhancedLocationTool as Handler, 'location_get_assets', args);

  it('searches POST /assets with a location filter and pages on the server', async () => {
    const bodies: any[] = [];
    server.use(http.post(`${BASE}/assets`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ Items: [{ AssetId: 'a1', AssetTag: 'T-1', AssetTypeName: 'Devices', Location: { Name: 'Central High' } }], ItemCount: 1, Paging: { TotalRows: 991 } });
    }));
    const text = await run({ locationId: 'loc-1', pageIndex: 3 });
    expect(bodies[0].Filters).toEqual([{ Facet: 'location', Id: 'loc-1' }]);
    expect(bodies[0].Paging).toEqual({ PageIndex: 3, PageSize: 25 });
    expect(text).toBe(
      'Found 991 assets (showing 1):\n\n• T-1 - Devices\n  Model: N/A | Serial: N/A\n  Status: Unknown | Location: Central High\n  User: Unassigned\n\nPage 4 of 40'
    );
  });

  it('keeps its nothing-found text', async () => {
    server.use(http.post(`${BASE}/assets`, () => HttpResponse.json({ Items: [], ItemCount: 0, Paging: { TotalRows: 0 } })));
    expect(await run({ locationId: 'loc-1' })).toBe('No assets found at this location.');
  });
});

describe('user_get_staff and user_get_students page on the server', () => {
  const urls: URL[] = [];
  const use = (total: number, row: (i: number) => object) => {
    urls.length = 0;
    server.use(http.post(`${BASE}/users`, ({ request }) => {
      const url = new URL(request.url);
      urls.push(url);
      const p = Number(url.searchParams.get('$p') ?? 0);
      const s = Number(url.searchParams.get('$s') ?? 20);
      const items = Array.from({ length: Math.max(0, Math.min(s, total - p * s)) }, (_, i) => row(p * s + i));
      // Live IIQ reports TotalRows 0 for an empty page past the end (verified 2026-11-07).
      return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: items.length ? total : 0 } });
    }));
  };

  it('user_get_staff renders every row of the requested page', async () => {
    use(60, (i) => ({ UserId: `s${i}`, Name: `Staff ${i}` }));
    const text = await textOf(handleEnhancedUserTool as Handler, 'user_get_staff', { pageIndex: 1 });
    expect(urls[0].searchParams.get('$p')).toBe('1');
    expect(urls[0].searchParams.get('$s')).toBe('25');
    expect(text.startsWith('Found 60 staff members (showing 25):')).toBe(true);
    expect(bullets(text)).toHaveLength(25);
    expect(bullets(text)[0]).toBe('• Staff 25');
    expect(text.endsWith('Page 2 of 3')).toBe(true);
  });

  it('user_get_students lists every student on the page, grouped by grade', async () => {
    use(9, (i) => ({ UserId: `k${i}`, Name: `Kid ${i}`, Grade: i < 7 ? '09' : '10' }));
    const text = await textOf(handleEnhancedUserTool as Handler, 'user_get_students', { pageSize: 9 });
    expect(text).toBe(
      'Found 9 students (showing 9):\n\n' +
      'Grade 09 (7):\n' + many(7, (i) => `  • Kid ${i}`).join('\n') + '\n\n' +
      'Grade 10 (2):\n  • Kid 7\n  • Kid 8\n\n' +
      'Page 1 of 1'
    );
  });

  it('user_get_students reaches a later page', async () => {
    use(60, (i) => ({ UserId: `k${i}`, Name: `Kid ${i}`, Grade: '09' }));
    const text = await textOf(handleEnhancedUserTool as Handler, 'user_get_students', { pageIndex: 2 });
    expect(urls[0].searchParams.get('$p')).toBe('2');
    expect(text.startsWith('Found 60 students (showing 10):')).toBe(true);
    expect(text.endsWith('Page 3 of 3')).toBe(true);
  });

  it.each([
    ['user_get_staff', 'staff members'],
    ['user_get_students', 'students'],
  ])('%s says a page past the end is past the end', async (tool, noun) => {
    use(30, (i) => ({ UserId: `x${i}`, Name: `X ${i}`, Grade: '09' }));
    expect(await textOf(handleEnhancedUserTool as Handler, tool, { pageIndex: 7 })).toBe(`Page 8 is past the end: 30 ${noun} match (2 pages).`);
  });
});

describe('location_get_assets past the end', () => {
  it('says a page past the end is past the end (IIQ reports TotalRows 0 there)', async () => {
    server.use(http.post(`${BASE}/assets`, async ({ request }) => {
      const { Paging } = (await request.json()) as any;
      const items = Paging.PageIndex === 0 ? [{ AssetId: 'a1', AssetTag: 'T-1' }] : [];
      return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: items.length ? 40 : 0 } });
    }));
    expect(await textOf(handleEnhancedLocationTool as Handler, 'location_get_assets', { locationId: 'l1', pageIndex: 9 })).toBe(
      'Page 10 is past the end: 40 assets match (2 pages).'
    );
  });
});
