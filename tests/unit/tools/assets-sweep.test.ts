import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedAssetTool, enhancedAssetTools } from '../../../src/tools/assets';

/**
 * #98 assets sweep (A1-A7). Response shapes are the ones production IIQ returns (verified
 * 2026-11-07): exact tag/serial lookups answer `{ Items: [asset], Paging: { TotalRows: 1 } }`,
 * asset rows carry nested names (Model.Name, Status.Name, Owner.Name, ...) and no flat
 * ModelName/StatusName/AssignedUserName, and the tag/serial searches page by $p/$s.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const run = async (name: string, args: object) => (await (handleEnhancedAssetTool as Handler)(name, args)).content[0].text;
const bullets = (text: string) => text.split('\n').filter((line) => line.trimStart().startsWith('• '));
const schemaOf = (name: string) => enhancedAssetTools.find((tool) => tool.name === name)?.inputSchema.properties as Record<string, any> | undefined;

/** One asset as production sends it: nested names only, AssetTypeName flat. */
const liveAsset = (i = 0) => ({
  AssetId: `a${i}`,
  AssetTag: `T-${i}`,
  SerialNumber: `SN${i}`,
  AssetTypeName: 'Devices',
  Model: { Name: 'Chromebook 3110', Manufacturer: { Name: 'Dell' } },
  Status: { Name: 'In Service' },
  Owner: { Name: 'Ana Lopez' },
  OwnerId: 'u1',
  Location: { Name: 'Central High' },
  LocationRoom: { Name: 'Room 101' },
  FundingSource: { Name: 'ESSER' },
  PurchasedDate: '2023-08-01T00:00:00',
  WarrantyExpirationDate: '2026-08-01T00:00:00',
  Notes: 'Loaner',
});
const envelope = (items: object[], total = items.length) =>
  HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: total } });

const DETAIL = `Type: Devices
Model: Chromebook 3110
Manufacturer: Dell
Serial: SN0
Status: In Service
Location: Central High
Room: Room 101
Assigned To: Ana Lopez
Purchase Date: 2023-08-01T00:00:00
Warranty: 2026-08-01T00:00:00
Funding: ESSER
Notes: Loaner`;

const ROW = `• T-0 - Devices
  Model: Chromebook 3110 | Serial: SN0
  Status: In Service | Location: Central High
  User: Ana Lopez`;

describe('A1 exact lookups read Items[0] and nested names', () => {
  it('asset_find_by_tag renders the asset inside the Items envelope', async () => {
    server.use(http.get(`${BASE}/assets/assettag/:tag`, () => envelope([liveAsset()])));
    expect(await run('asset_find_by_tag', { assetTag: 'T-0' })).toBe(`Asset Found: T-0\n${DETAIL}`);
  });

  it('asset_find_by_tag still accepts an { Item } response', async () => {
    server.use(http.get(`${BASE}/assets/assettag/:tag`, () => HttpResponse.json({ Item: liveAsset() })));
    expect(await run('asset_find_by_tag', { assetTag: 'T-0' })).toBe(`Asset Found: T-0\n${DETAIL}`);
  });

  it('asset_find_by_tag reports an empty Items envelope as not found', async () => {
    server.use(http.get(`${BASE}/assets/assettag/:tag`, () => envelope([])));
    expect(await run('asset_find_by_tag', { assetTag: 'NOPE' })).toBe('No asset found with tag: NOPE');
  });

  it('asset_find_by_serial renders the asset inside the Items envelope', async () => {
    server.use(http.get(`${BASE}/assets/serial/:serial`, () => envelope([liveAsset()])));
    expect(await run('asset_find_by_serial', { serialNumber: 'SN0' })).toBe(`Asset Found by Serial: SN0\nTag: T-0\n${DETAIL}`);
  });

  it('asset_find_by_serial reports an empty Items envelope as not found', async () => {
    server.use(http.get(`${BASE}/assets/serial/:serial`, () => envelope([])));
    expect(await run('asset_find_by_serial', { serialNumber: 'NOPE' })).toBe('No asset found with serial: NOPE');
  });

  it('asset_get_spares renders nested names', async () => {
    server.use(http.get(`${BASE}/assets/spares/assettag/:tag`, () => envelope([liveAsset()])));
    expect(await run('asset_get_spares', { assetTag: 'T-9' })).toBe(`Spare Parts for T-9 (1):\n\n${ROW}`);
  });
});

describe('A2 tag and serial searches page on the server', () => {
  /** GET search honouring $p/$s with a 20-row default, as live IIQ does. Records each URL. */
  const searchServer = (path: string, total: number, urls: URL[] = []) => {
    server.use(http.get(`${BASE}/${path}/:pattern`, ({ request }) => {
      const url = new URL(request.url);
      urls.push(url);
      const p = Number(url.searchParams.get('$p') ?? 0);
      const s = Number(url.searchParams.get('$s') ?? 20);
      const items = Array.from({ length: Math.max(0, Math.min(s, total - p * s)) }, (_, i) => liveAsset(p * s + i));
      return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: items.length ? total : 0 } });
    }));
    return urls;
  };

  it.each([
    ['asset_search_by_tag', 'assets/assettag/search', 'tagPattern'],
    ['asset_search_by_serial', 'assets/serial/search', 'serialPattern'],
  ])('%s defaults to 25 rows per page and reports the server total', async (tool, path, arg) => {
    const urls = searchServer(path, 9994);
    const text = await run(tool, { [arg]: 'T' });
    expect(urls[0].searchParams.get('$p')).toBe('0');
    expect(urls[0].searchParams.get('$s')).toBe('25');
    expect(text.startsWith('Found 9994 assets (showing 25):\n\n• T-0 - Devices\n  Model: Chromebook 3110')).toBe(true);
    expect(bullets(text)).toHaveLength(25);
    expect(text.endsWith('Page 1 of 400')).toBe(true);
  });

  it.each([
    ['asset_search_by_tag', 'assets/assettag/search', 'tagPattern'],
    ['asset_search_by_serial', 'assets/serial/search', 'serialPattern'],
  ])('%s reaches a later page via pageIndex/pageSize', async (tool, path, arg) => {
    const urls = searchServer(path, 47881);
    const text = await run(tool, { [arg]: 'SN1', pageIndex: 2, pageSize: 10 });
    expect(urls[0].pathname.endsWith('/SN1')).toBe(true);
    expect(urls[0].searchParams.get('$p')).toBe('2');
    expect(urls[0].searchParams.get('$s')).toBe('10');
    expect(text.startsWith('Found 47881 assets (showing 10):\n\n• T-20 - Devices')).toBe(true);
    expect(text.endsWith('Page 3 of 4789')).toBe(true);
  });

  it('asset_search_by_serial says when nothing matches', async () => {
    searchServer('assets/serial/search', 0);
    expect(await run('asset_search_by_serial', { serialPattern: 'ZZZ' })).toBe('No assets found matching serial pattern: ZZZ');
  });

  it('asset_search_by_tag says when nothing matches', async () => {
    searchServer('assets/assettag/search', 0);
    expect(await run('asset_search_by_tag', { tagPattern: 'ZZZ' })).toBe('No assets found matching tag pattern: ZZZ');
  });

  it('both search schemas advertise pageSize and pageIndex', () => {
    for (const tool of ['asset_search_by_tag', 'asset_search_by_serial']) {
      expect(schemaOf(tool)).toHaveProperty('pageSize');
      expect(schemaOf(tool)).toHaveProperty('pageIndex');
    }
  });
});

describe('A3 asset_search_advanced room and user filters', () => {
  const bodies: any[] = [];
  const capture = () => {
    bodies.length = 0;
    server.use(http.post(`${BASE}/assets`, async ({ request }) => {
      bodies.push(await request.json());
      return envelope([]);
    }));
  };

  it('sends roomId as the room facet', async () => {
    capture();
    await run('asset_search_advanced', { roomId: 'room-1' });
    expect(bodies[0].Filters).toEqual([{ Facet: 'room', Id: 'room-1' }]);
  });

  it('sends assignedUserId as the user facet', async () => {
    capture();
    await run('asset_search_advanced', { assignedUserId: 'user-1' });
    expect(bodies[0].Filters).toEqual([{ Facet: 'user', Id: 'user-1' }]);
  });

  it('sends whole-number body paging (fractional/negative input is normalised like the page label)', async () => {
    capture();
    await run('asset_search_advanced', { pageIndex: 1.9, pageSize: -4 });
    expect(bodies[0].Paging).toEqual({ PageIndex: 1, PageSize: 1 });
  });

  it('no longer advertises fundingType (IIQ has no funding facet)', () => {
    expect(schemaOf('asset_search_advanced')).not.toHaveProperty('fundingType');
  });
});

describe('A4 favorites and storage units', () => {
  it('asset_get_favorites uses the /true variant for includeAll', async () => {
    const urls: string[] = [];
    server.use(http.get(`${BASE}/assets/favorites/*`, ({ request }) => {
      urls.push(new URL(request.url).pathname);
      return envelope([]);
    }));
    expect(await run('asset_get_favorites', { userId: 'u1', includeAll: true })).toBe('No favorite assets found for this user.');
    expect(urls).toEqual(['/api/v1.0/assets/favorites/u1/true']);
  });

  it('asset_get_by_storage says when the unit is empty', async () => {
    server.use(http.get(`${BASE}/assets/storageunit/:locationId/:unit`, () => envelope([])));
    expect(await run('asset_get_by_storage', { locationId: 'loc-1', unitNumber: '12' })).toBe('No assets found in storage unit 12.');
  });
});

describe('X2 room, user, favorite and storage lists page on the server', () => {
  /** GET list honouring $p/$s with a 100-row default, as live /assets/rooms does. Records each URL. */
  const pagedServer = (pattern: string, total: number, urls: URL[] = []) => {
    server.use(http.get(`${BASE}/${pattern}`, ({ request }) => {
      const url = new URL(request.url);
      urls.push(url);
      const p = Number(url.searchParams.get('$p') ?? 0);
      const s = Number(url.searchParams.get('$s') ?? 100);
      const items = Array.from({ length: Math.max(0, Math.min(s, total - p * s)) }, (_, i) => liveAsset(p * s + i));
      return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: items.length ? total : 0 } });
    }));
    return urls;
  };

  const CASES: Array<[string, string, object, string, string]> = [
    ['asset_get_by_room', 'assets/rooms/:roomId', { roomId: 'r1' }, '/api/v1.0/assets/rooms/r1', 'assets in this room'],
    ['asset_get_user_devices', 'assets/for/:userId', { userId: 'u1' }, '/api/v1.0/assets/for/u1', 'assigned devices'],
    ['asset_get_favorites', 'assets/favorites/*', { userId: 'u1' }, '/api/v1.0/assets/favorites/u1', 'favorite assets'],
    ['asset_get_by_storage', 'assets/storageunit/:locationId/:unit', { locationId: 'loc-1', unitNumber: '12' },
      '/api/v1.0/assets/storageunit/loc-1/12', 'assets in storage unit 12'],
  ];

  it.each(CASES)('%s defaults to 25 rows per page ($p=0, $s=25) and reports the server total', async (tool, pattern, args, path, noun) => {
    const urls = pagedServer(pattern, 4548);
    const text = await run(tool, args);
    expect(urls).toHaveLength(1);
    expect(urls[0].pathname).toBe(path);
    expect(urls[0].searchParams.get('$p')).toBe('0');
    expect(urls[0].searchParams.get('$s')).toBe('25');
    expect(text.startsWith(`Found 4548 ${noun} (showing 25):\n\n`)).toBe(true);
    expect(bullets(text)).toHaveLength(25);
    expect(text.endsWith('\n\nPage 1 of 182')).toBe(true);
  });

  it.each(CASES)('%s reaches a later page via pageIndex/pageSize', async (tool, pattern, args, _path, noun) => {
    const urls = pagedServer(pattern, 4548);
    const text = await run(tool, { ...args, pageIndex: 3, pageSize: 10 });
    expect(urls[0].searchParams.get('$p')).toBe('3');
    expect(urls[0].searchParams.get('$s')).toBe('10');
    expect(text.startsWith(`Found 4548 ${noun} (showing 10):`)).toBe(true);
    expect(text).toContain('• T-30 - Devices');
    expect(text.endsWith('Page 4 of 455')).toBe(true);
  });

  it.each(CASES)('%s schema advertises pageSize (default: 25) and pageIndex', (tool) => {
    expect(schemaOf(tool)?.pageSize.description).toMatch(/default: 25/);
    expect(schemaOf(tool)).toHaveProperty('pageIndex');
  });

  it('asset_get_by_room renders one page grouped by type, with the page footer', async () => {
    server.use(http.get(`${BASE}/assets/rooms/:roomId`, () => envelope([liveAsset()])));
    expect(await run('asset_get_by_room', { roomId: 'r1' })).toBe(
      `Found 1 assets in this room (showing 1):\n\nDevices (1):\n\n${ROW}\n\nPage 1 of 1`
    );
  });

  it('asset_get_user_devices renders nested names with the page footer', async () => {
    server.use(http.get(`${BASE}/assets/for/:userId`, () => envelope([liveAsset()])));
    expect(await run('asset_get_user_devices', { userId: 'u1' })).toBe(
      `Found 1 assigned devices (showing 1):\n\n${ROW}\n\nPage 1 of 1`
    );
  });

  it('asset_get_by_room says when the room is empty', async () => {
    pagedServer('assets/rooms/:roomId', 0);
    expect(await run('asset_get_by_room', { roomId: 'r1' })).toBe('No assets found in this room.');
  });

  it('asset_get_user_devices says when the user has no devices', async () => {
    pagedServer('assets/for/:userId', 0);
    expect(await run('asset_get_user_devices', { userId: 'u1' })).toBe('No devices assigned to this user.');
  });
});

describe('X4 asset_get_user_devices has no includeInactive /true variant', () => {
  it('no longer advertises includeInactive', () => {
    expect(schemaOf('asset_get_user_devices')).not.toHaveProperty('includeInactive');
  });

  it('always reads /assets/for/{userId}, even when includeInactive is passed', async () => {
    const urls: string[] = [];
    server.use(http.get(`${BASE}/assets/for/*`, ({ request }) => {
      urls.push(new URL(request.url).pathname);
      return envelope([]);
    }));
    await run('asset_get_user_devices', { userId: 'u1', includeInactive: true });
    expect(urls).toEqual(['/api/v1.0/assets/for/u1']);
  });
});

describe('X4 OnlyShowDeleted flags say IIQ returns only deleted rows', () => {
  it('asset_search_advanced includeDeleted', () => {
    expect(schemaOf('asset_search_advanced')?.includeDeleted.description)
      .toBe('Show only deleted assets (sent as OnlyShowDeleted; default: false)');
  });

  it('asset_get_inventory_counts includeDeleted', () => {
    expect(schemaOf('asset_get_inventory_counts')?.includeDeleted.description)
      .toBe('Count only deleted assets (sent as OnlyShowDeleted; default: false)');
  });
});

describe('A5 asset_get_spares', () => {
  it('reports a 404 (asset has no spares) as no spares, not an error', async () => {
    server.use(http.get(`${BASE}/assets/spares/assettag/:tag`, () => new HttpResponse(null, { status: 404 })));
    expect(await run('asset_get_spares', { assetTag: 'T-1' })).toBe('No spare parts found for asset: T-1');
  });
});

describe('A6 asset_get_inventory_counts', () => {
  /** POST /assets returning TotalRows per filter; POST /assets/count the overall total. */
  const countServer = (counts: Record<string, number>, total: number, seen: { bodies: any[]; inFlight: number; maxInFlight: number }) => {
    server.use(
      http.post(`${BASE}/assets/count`, async ({ request }) => {
        seen.bodies.push({ count: await request.json() });
        return HttpResponse.json({ Items: [], Paging: { TotalRows: total } });
      }),
      http.post(`${BASE}/assets`, async ({ request }) => {
        const body = (await request.json()) as any;
        seen.bodies.push(body);
        seen.inFlight++;
        seen.maxInFlight = Math.max(seen.maxInFlight, seen.inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        seen.inFlight--;
        const id = body.Filters?.[0]?.Id;
        return HttpResponse.json({ Items: [], ItemCount: 0, Paging: { TotalRows: counts[id] ?? 0 } });
      }),
    );
  };
  const fresh = () => ({ bodies: [] as any[], inFlight: 0, maxInFlight: 0 });

  it('without groupBy reports the total from POST /assets/count', async () => {
    const seen = fresh();
    countServer({}, 89718, seen);
    expect(await run('asset_get_inventory_counts', {})).toBe('Asset Inventory Counts:\n\nTotal Assets: 89718');
    expect(seen.bodies).toEqual([{ count: { OnlyShowDeleted: false, FilterByViewPermission: false } }]);
  });

  it('includeDeleted maps to OnlyShowDeleted', async () => {
    const seen = fresh();
    countServer({}, 12, seen);
    await run('asset_get_inventory_counts', { includeDeleted: true });
    expect(seen.bodies[0].count.OnlyShowDeleted).toBe(true);
  });

  it('groupBy type counts each asset type with the AssetType facet and a 1-row page', async () => {
    const seen = fresh();
    countServer({ 'type-devices': 80000, 'type-networking': 700 }, 89718, seen);
    expect(await run('asset_get_inventory_counts', { groupBy: 'type' })).toBe(
      'Asset Inventory Counts by Type:\n\n  Devices: 80000\n  Networking: 700\n  Other/none: 9018\n\nTotal Assets: 89718'
    );
    const devices = seen.bodies.find((b) => b.Filters?.[0]?.Id === 'type-devices');
    expect(devices).toEqual({
      OnlyShowDeleted: false,
      FilterByViewPermission: false,
      Filters: [{ Facet: 'AssetType', Id: 'type-devices' }],
      Paging: { PageIndex: 0, PageSize: 1 },
    });
  });

  it('groupBy status uses the assetstatus facet', async () => {
    const seen = fresh();
    countServer({ 'status-in-service': 50, 'status-broken': 5 }, 55, seen);
    expect(await run('asset_get_inventory_counts', { groupBy: 'status' })).toBe(
      'Asset Inventory Counts by Status:\n\n  In Service: 50\n  Broken: 5\n\nTotal Assets: 55'
    );
    expect(seen.bodies.some((b) => b.Filters?.[0]?.Facet === 'assetstatus')).toBe(true);
  });

  it('groupBy location uses the location facet over every location, at most 4 in flight', async () => {
    const seen = fresh();
    const locations = Array.from({ length: 10 }, (_, i) => ({ LocationId: `loc-${i}`, Name: `School ${i}` }));
    server.use(http.get(`${BASE}/locations/all`, () => envelope(locations)));
    countServer({ 'loc-0': 30, 'loc-9': 10 }, 40, seen);
    expect(await run('asset_get_inventory_counts', { groupBy: 'location' })).toBe(
      'Asset Inventory Counts by Location:\n\n  School 0: 30\n  School 9: 10\n\nTotal Assets: 40'
    );
    expect(seen.bodies.filter((b) => b.Filters?.[0]?.Facet === 'location')).toHaveLength(10);
    expect(seen.maxInFlight).toBeLessThanOrEqual(4);
  });

  it('no longer offers funding or manufacturer grouping', () => {
    expect(schemaOf('asset_get_inventory_counts')?.groupBy.enum).toEqual(['type', 'status', 'location']);
  });
});

describe('A7 asset_toggle_favorite', () => {
  it('is no longer advertised', () => {
    expect(enhancedAssetTools.map((tool) => tool.name)).not.toContain('asset_toggle_favorite');
  });
});
