import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedAssetTool } from '../../../src/tools/assets';
import { handleEnhancedUserTool } from '../../../src/tools/users';
import { handleEnhancedLocationTool } from '../../../src/tools/locations';

/**
 * IIQ filters users by `role` + RoleId and assets by `AssetType` / `assetstatus` + id; it silently
 * ignores a `UserType` facet, a `Status` facet and an asset-type name (verified 2026-11-07). The
 * tools resolve names through GET /sites/roles, GET /assets/types and GET /assets/status/types.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';
const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const userText = async (name: string, args: object) => (await (handleEnhancedUserTool as Handler)(name, args)).content[0].text;
const assetText = async (name: string, args: object) => (await (handleEnhancedAssetTool as Handler)(name, args)).content[0].text;

const ROLES = ['Agent', 'Faculty', 'Guest', 'No Access', 'Parent / Guardian', 'Staff', 'Student'].map((Name) => ({ RoleId: `role-${Name}`, Name }));
const lookups = { roles: 0, types: 0, statuses: 0 };
const bodies: any[] = [];

beforeEach(() => {
  lookups.roles = lookups.types = lookups.statuses = 0;
  bodies.length = 0;
  const capture = async ({ request }: { request: Request }) => {
    bodies.push(await request.json());
    return HttpResponse.json({ Items: [], ItemCount: 0, Paging: { TotalRows: 0 } });
  };
  server.use(
    http.get(`${BASE}/sites/roles`, () => { lookups.roles++; return HttpResponse.json({ Items: ROLES, ItemCount: ROLES.length }); }),
    http.get(`${BASE}/assets/types`, () => { lookups.types++; return HttpResponse.json({ Items: [{ AssetTypeId: 'type-devices', Name: 'Devices' }, { AssetTypeId: 'type-net', Name: 'Networking' }] }); }),
    http.get(`${BASE}/assets/status/types`, () => { lookups.statuses++; return HttpResponse.json({ Items: [{ AssetStatusTypeId: 'status-in', Name: 'In Service' }, { AssetStatusTypeId: 'status-broken', Name: 'Broken' }] }); }),
    http.post(`${BASE}/users`, capture),
    http.post(`${BASE}/assets`, capture),
  );
});

describe('user role filters', () => {
  it('user_search_advanced filters by the resolved role, not the ignored UserType facet', async () => {
    await userText('user_search_advanced', { userType: 'Student' });
    expect(bodies[0].Filters).toEqual([{ Facet: 'role', Id: 'role-Student' }]);
  });

  it('matches a role name ignoring case, and "Parent" to "Parent / Guardian"', async () => {
    await userText('user_search_advanced', { userType: 'parent' });
    expect(bodies[0].Filters).toEqual([{ Facet: 'role', Id: 'role-Parent / Guardian' }]);
  });

  it('reports an unknown role with the district roles', async () => {
    expect(await userText('user_search_advanced', { userType: 'Janitor' })).toBe(
      'Error: Unknown role "Janitor". Available: Agent, Faculty, Guest, No Access, Parent / Guardian, Staff, Student'
    );
    expect(bodies).toHaveLength(0);
  });

  it('does not look roles up when text search ignores the role filter', async () => {
    server.use(http.get(`${BASE}/users/search/:term`, () => HttpResponse.json({ Items: [], ItemCount: 0, Paging: { TotalRows: 0 } })));
    await userText('user_search_advanced', { searchText: 'lee', userType: 'Student' });
    expect(lookups.roles).toBe(0);
  });

  it('user_get_students filters by the Student role', async () => {
    await userText('user_get_students', {});
    expect(bodies[0].Filters).toEqual([{ Facet: 'role', Id: 'role-Student' }]);
  });

  it('user_get_staff filters by Staff OR Faculty', async () => {
    await userText('user_get_staff', {});
    expect(bodies[0].Filters).toEqual([{ Facet: 'role', Id: 'role-Staff' }, { Facet: 'role', Id: 'role-Faculty' }]);
  });

  it('user_get_staff still works in a district without a Faculty role', async () => {
    server.use(http.get(`${BASE}/sites/roles`, () => HttpResponse.json({ Items: ROLES.filter((r) => r.Name !== 'Faculty') })));
    await userText('user_get_staff', {});
    expect(bodies[0].Filters).toEqual([{ Facet: 'role', Id: 'role-Staff' }]);
  });
});

describe('user type label comes from Role.Name', () => {
  const staff = { UserId: 'u1', Name: 'Ann Lee', Email: 'a@x.test', Role: { RoleId: 'role-Staff', Name: 'Staff' } };
  const one = () => HttpResponse.json({ Items: [staff], ItemCount: 1, Paging: { TotalRows: 1 } });

  it('in user_search_advanced rows', async () => {
    server.use(http.post(`${BASE}/users`, one));
    expect(await userText('user_search_advanced', {})).toContain('  Type: Staff | Email: a@x.test');
  });

  it('in user_get_staff rows', async () => {
    server.use(http.post(`${BASE}/users`, one));
    expect(await userText('user_get_staff', {})).toContain('  Role: Staff | Email: a@x.test');
  });

  it('in user_get_details', async () => {
    server.use(http.get(`${BASE}/users/:id`, () => HttpResponse.json(staff)));
    const text = await userText('user_get_details', { userId: 'u1' });
    expect(text).toContain('\nType: Staff\nRole: Staff\n');
    expect(text).not.toContain('[object Object]');
  });

  it('in user_get_by_location rows', async () => {
    server.use(http.post(`${BASE}/users`, one));
    expect(await userText('user_get_by_location', { locationId: 'l1' })).toContain('• Ann Lee (Staff)\n');
  });

  it('in user_quick_search rows', async () => {
    server.use(http.get(`${BASE}/users/quick`, () => HttpResponse.json({ Items: [staff] })));
    expect(await userText('user_quick_search', { query: 'ann' })).toContain('• Ann Lee (Staff)');
  });
});

describe('asset type and status filters', () => {
  it('asset_search_advanced resolves type and status names to the ids IIQ filters on', async () => {
    await assetText('asset_search_advanced', { assetType: 'devices', status: 'In service' });
    expect(bodies[0].Filters).toEqual([{ Facet: 'AssetType', Id: 'type-devices' }, { Facet: 'assetstatus', Id: 'status-in' }]);
  });

  it('passes a GUID through without a lookup', async () => {
    await assetText('asset_search_advanced', { assetType: GUID, status: GUID });
    expect(bodies[0].Filters).toEqual([{ Facet: 'AssetType', Id: GUID }, { Facet: 'assetstatus', Id: GUID }]);
    expect(lookups.types + lookups.statuses).toBe(0);
  });

  it('reports an unknown status with the district statuses', async () => {
    expect(await assetText('asset_search_advanced', { status: 'Active' })).toBe(
      'Error: Unknown asset status "Active". Available: In Service, Broken'
    );
  });

  it.each([
    ['In Service first', ['In Service', 'In Storage']],
    ['In Storage first', ['In Storage', 'In Service']],
  ])('rejects a prefix matching several statuses instead of picking one (%s)', async (_order, names) => {
    server.use(http.get(`${BASE}/assets/status/types`, () =>
      HttpResponse.json({ Items: names.map((Name) => ({ AssetStatusTypeId: `status-${Name}`, Name })) })));
    expect(await assetText('asset_search_advanced', { status: 'in' })).toBe(
      `Error: Ambiguous asset status "in" matches: ${names.join(', ')}`
    );
    expect(bodies).toHaveLength(0);
  });

  it('location_get_assets resolves an asset type name', async () => {
    await (handleEnhancedLocationTool as Handler)('location_get_assets', { locationId: 'l1', assetType: 'Networking' });
    expect(bodies[0].Filters).toEqual([{ Facet: 'location', Id: 'l1' }, { Facet: 'AssetType', Id: 'type-net' }]);
  });
});
