import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedAssetTool } from '../../../src/tools/assets';
import { handleEnhancedUserTool } from '../../../src/tools/users';
import { handleEnhancedLocationTool } from '../../../src/tools/locations';
import { handleEnhancedPartsTool } from '../../../src/tools/parts';

/**
 * Exact-text output that the #96 paging/filter fixes must leave unchanged: rows with only the
 * fields both the old and new code read, the nothing-matched texts, and the user filter note.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const textOf = async (handler: Handler, name: string, args: object) => (await handler(name, args)).content[0].text;
const page = (items: object[], total = items.length) => HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: total } });

describe('asset_search_advanced unchanged output', () => {
  const run = (args: object) => textOf(handleEnhancedAssetTool as Handler, 'asset_search_advanced', args);

  it('renders a short page exactly', async () => {
    server.use(http.post(`${BASE}/assets`, () => page([
      { AssetId: 'a1', AssetTag: 'T-1', AssetTypeName: 'Devices', SerialNumber: 'S1' },
      { AssetId: 'a2', AssetTag: 'T-2' },
    ])));
    expect(await run({})).toBe(
      'Found 2 assets (showing 2):\n\n' +
      '• T-1 - Devices\n  Model: N/A | Serial: S1\n  Status: Unknown | Location: N/A\n  User: Unassigned\n\n' +
      '• T-2 - Unknown Type\n  Model: N/A | Serial: N/A\n  Status: Unknown | Location: N/A\n  User: Unassigned\n\n' +
      'Page 1 of 1'
    );
  });

  it('renders nothing-matches exactly', async () => {
    server.use(http.post(`${BASE}/assets`, () => page([], 0)));
    expect(await run({})).toBe('No assets found matching your criteria.');
  });
});

describe('user_search_advanced unchanged output', () => {
  const run = (args: object) => textOf(handleEnhancedUserTool as Handler, 'user_search_advanced', args);
  const user = { UserId: 'u1', FirstName: 'Ann', LastName: 'Lee', Email: 'a@x.test', Username: 'alee', LocationName: 'Central', IsActive: true };
  const row = '• Ann Lee\n  Type: Unknown | Email: a@x.test\n  Location: Central\n  Username: alee | Status: Active';

  it('renders a short page exactly', async () => {
    server.use(http.post(`${BASE}/users`, () => page([user])));
    expect(await run({})).toBe(`Found 1 users (showing 1):\n\n${row}\n\nPage 1 of 1`);
  });

  it('renders the filter note after a text-search page exactly', async () => {
    server.use(http.get(`${BASE}/users/search/:term`, () => page([user])));
    expect(await run({ searchText: 'lee', locationId: 'l1' })).toBe(
      `Found 1 users (showing 1):\n\n${row}\n\nPage 1 of 1\n\nNote: locationId not applied - IIQ text search does not combine with filters.`
    );
  });

  it('renders nothing-matches exactly', async () => {
    server.use(http.post(`${BASE}/users`, () => page([], 0)));
    expect(await run({})).toBe('No users found matching your criteria.');
  });
});

describe('capped tools: nothing-found texts unchanged', () => {
  const empty = () => page([], 0);
  const cases: Array<[string, Handler, string, object, () => void]> = [
    ['asset_get_history', handleEnhancedAssetTool as Handler, 'No history available for this asset.', { assetId: 'a1' },
      () => server.use(http.get(`${BASE}/assets/:id/activities`, empty))],
    ['user_get_all_agents', handleEnhancedUserTool as Handler, 'No IT support agents found.', {},
      () => server.use(http.get(`${BASE}/users/agents`, empty))],
    ['location_get_all_rooms', handleEnhancedLocationTool as Handler, 'No rooms found.', {},
      () => server.use(http.get(`${BASE}/locations/rooms`, empty))],
    ['parts_get_orders', handleEnhancedPartsTool as Handler, 'No purchase orders found.', {},
      () => server.use(http.get(`${BASE}/purchaseorders`, empty))],
  ];

  it.each(cases)('%s', async (tool, handler, expected, args, use) => {
    use();
    expect(await textOf(handler, tool, args)).toBe(expected);
  });
});
