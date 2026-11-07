import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedAssetTool } from '../../../src/tools/assets';
import { handleEnhancedUserTool } from '../../../src/tools/users';

/**
 * #96: asset_search_advanced and user_search_advanced page on the IIQ server, so every row of the
 * returned page must be rendered (rows 11..pageSize were unreachable). Live behaviour modelled:
 * POST /assets pages by body Paging; POST /users and GET /users/search/{term} by $p/$s; the total
 * is Paging.TotalRows (verified on production 2026-11-07).
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const assetText = async (args: object) => (await (handleEnhancedAssetTool as Handler)('asset_search_advanced', args)).content[0].text;
const userText = async (args: object) => (await (handleEnhancedUserTool as Handler)('user_search_advanced', args)).content[0].text;
const bullets = (text: string) => text.split('\n').filter((line) => line.startsWith('• '));

/** POST /assets honouring body Paging, as live IIQ does. Records each request body. */
function assetServer(total: number, bodies: any[] = []) {
  server.use(http.post(`${BASE}/assets`, async ({ request }) => {
    const body = (await request.json()) as any;
    bodies.push(body);
    const { PageIndex = 0, PageSize = 20 } = body?.Paging ?? {};
    const items = Array.from({ length: Math.max(0, Math.min(PageSize, total - PageIndex * PageSize)) }, (_, i) => {
      const n = PageIndex * PageSize + i;
      return { AssetId: `a${n}`, AssetTag: `T-${n}` };
    });
    // Live IIQ reports TotalRows 0 for an empty page past the end (verified 2026-11-07).
    return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: items.length ? total : 0 } });
  }));
  return bodies;
}

/** POST /users and GET /users/search/{term} paging by $p/$s. Records each request URL. */
function userServer(total: number, urls: URL[] = []) {
  const respond = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    urls.push(url);
    const p = Number(url.searchParams.get('$p') ?? 0);
    const s = Number(url.searchParams.get('$s') ?? 20);
    const items = Array.from({ length: Math.max(0, Math.min(s, total - p * s)) }, (_, i) => ({ UserId: `u${p * s + i}`, Name: `User ${p * s + i}` }));
    return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: items.length ? total : 0 } });
  };
  server.use(http.post(`${BASE}/users`, respond), http.get(`${BASE}/users/search/:term`, respond));
  return urls;
}

describe('asset_search_advanced renders the whole server page (#96)', () => {
  it('renders all 30 rows of a 30-row page, with no "...and N more" line', async () => {
    assetServer(100);
    const text = await assetText({ pageSize: 30 });
    expect(bullets(text)).toHaveLength(30);
    expect(text.startsWith('Found 100 assets (showing 30):')).toBe(true);
    expect(text).not.toContain('more assets');
    expect(text.endsWith('Page 1 of 4')).toBe(true);
  });

  it('page 2 starts with the row after page 1 ends, so no row is skipped', async () => {
    assetServer(100);
    const first = bullets(await assetText({ pageSize: 30 }));
    const second = bullets(await assetText({ pageSize: 30, pageIndex: 1 }));
    expect(first.at(-1)).toMatch(/^• T-29 /);
    expect(second[0]).toMatch(/^• T-30 /);
  });

  it('asks IIQ for 25 rows by default', async () => {
    const bodies = assetServer(100);
    const text = await assetText({});
    expect(bodies[0].Paging).toEqual({ PageIndex: 0, PageSize: 25 });
    expect(text.endsWith('Page 1 of 4')).toBe(true);
  });

  it('says a page past the end is past the end instead of "No assets found"', async () => {
    assetServer(89718);
    expect(await assetText({ pageIndex: 99999 })).toBe('Page 100000 is past the end: 89718 assets match (3589 pages).');
  });

  it('renders the model, status, location and owner IIQ actually sends', async () => {
    server.use(http.post(`${BASE}/assets`, () => HttpResponse.json({
      Items: [{
        AssetId: 'a1', AssetTag: 'T-1', AssetTypeName: 'Devices', SerialNumber: 'S1',
        Model: { Name: 'Dell 3110' }, Status: { Name: 'In Service' }, Location: { Name: 'Central High' }, Owner: { Name: 'Ann Lee' },
      }],
      ItemCount: 1, Paging: { TotalRows: 1 },
    })));
    expect(await assetText({})).toBe(
      'Found 1 assets (showing 1):\n\n' +
      '• T-1 - Devices\n  Model: Dell 3110 | Serial: S1\n  Status: In Service | Location: Central High\n  User: Ann Lee\n\n' +
      'Page 1 of 1'
    );
  });
});

describe('user_search_advanced renders the whole server page (#96)', () => {
  it('renders all 30 rows of a 30-row list page', async () => {
    userServer(100);
    const text = await userText({ pageSize: 30 });
    expect(bullets(text)).toHaveLength(30);
    expect(text).not.toContain('more users');
    expect(text.endsWith('Page 1 of 4')).toBe(true);
  });

  it('renders all 30 rows of a 30-row text-search page', async () => {
    userServer(40);
    const text = await userText({ searchText: 'smith', pageSize: 30 });
    expect(bullets(text)).toHaveLength(30);
    expect(text.endsWith('Page 1 of 2')).toBe(true);
  });

  it('asks IIQ for 25 rows by default on both paths', async () => {
    const urls = userServer(100);
    await userText({});
    await userText({ searchText: 'smith' });
    expect(urls.map((u) => u.searchParams.get('$s'))).toEqual(['25', '25']);
  });

  it('says a page past the end is past the end instead of "No users found"', async () => {
    userServer(157);
    expect(await userText({ searchText: 'smith', pageIndex: 9 })).toBe('Page 10 is past the end: 157 users match (7 pages).');
  });

  it('keeps the filter note when text search matches nothing', async () => {
    userServer(0);
    expect(await userText({ searchText: 'zzz', locationId: 'l1' })).toBe(
      'No users found matching your criteria.\n\nNote: locationId not applied - IIQ text search does not combine with filters.'
    );
  });

  it('keeps the filter note on a page past the end', async () => {
    userServer(5);
    expect(await userText({ searchText: 'smith', locationId: 'l1', pageIndex: 3 })).toBe(
      'Page 4 is past the end: 5 users match (1 page).\n\nNote: locationId not applied - IIQ text search does not combine with filters.'
    );
  });

  it('renders the Name IIQ actually sends', async () => {
    userServer(1);
    expect(bullets(await userText({}))).toEqual(['• User 0']);
  });
});
