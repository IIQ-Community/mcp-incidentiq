import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { enhancedUserTools, handleEnhancedUserTool } from '../../../src/tools/users';

/**
 * #98 sweep, users (U1-U7). Response shapes are the ones production IIQ returns (verified
 * 2026-11-07, read-only probes).
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const run = async (name: string, args: object) => (await (handleEnhancedUserTool as Handler)(name, args)).content[0].text;
const schemaOf = (name: string) => enhancedUserTools.find((t) => t.name === name)?.inputSchema as
  { properties: Record<string, any>; required: string[] } | undefined;
const bullets = (text: string) => text.split('\n').filter((line) => line.trimStart().startsWith('• '));

const ROLES = ['Agent', 'Faculty', 'Guest', 'Parent / Guardian', 'Staff', 'Student'].map((Name) => ({ RoleId: `role-${Name}`, Name }));
const rolesHandler = http.get(`${BASE}/sites/roles`, () => HttpResponse.json({ Items: ROLES, ItemCount: ROLES.length }));

/** Live server-paged POST list: $p/$s query paging, Paging.TotalRows; records each request. */
function capturePost(path: string, rows: object[], seen: Array<{ url: URL; body: any }>) {
  return http.post(`${BASE}${path}`, async ({ request }) => {
    const url = new URL(request.url);
    seen.push({ url, body: await request.json() });
    const p = Number(url.searchParams.get('$p') ?? 0);
    const s = Number(url.searchParams.get('$s') ?? 20);
    const items = rows.slice(p * s, p * s + s);
    return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: rows.length } });
  });
}

describe('U1 user_get_all_agents includeInactive', () => {
  const agents = [
    { UserId: 'a1', Name: 'Active Agent', Email: 'a1@x.test', Phone: '555-0101', LocationName: 'District Office', IsActive: true },
    { UserId: 'a2', Name: 'Former Agent', Email: 'a2@x.test', Phone: '555-0102', LocationName: 'District Office', IsActive: false },
  ];
  const agentsHandler = http.get(`${BASE}/users/agents`, () =>
    HttpResponse.json({ Items: agents, ItemCount: agents.length, Paging: { TotalRows: agents.length } }));

  it('hides inactive agents by default', async () => {
    server.use(agentsHandler);
    expect(await run('user_get_all_agents', {})).toBe(
      'Found 1 IT support agents (showing 1):\n\n• Active Agent\n  Email: a1@x.test | Phone: 555-0101\n  Location: District Office\n\nPage 1 of 1'
      + '\n\n💡 These agents can be assigned to tickets and have elevated permissions'
    );
  });

  it('shows every agent with includeInactive: true', async () => {
    server.use(agentsHandler);
    const text = await run('user_get_all_agents', { includeInactive: true });
    expect(text.startsWith('Found 2 IT support agents (showing 2):')).toBe(true);
    expect(bullets(text)).toEqual(['• Active Agent', '• Former Agent']);
  });
});

describe('U2 user_get_staff role', () => {
  it('narrows to the one role named', async () => {
    const seen: Array<{ url: URL; body: any }> = [];
    server.use(rolesHandler, capturePost('/users', [], seen));
    await run('user_get_staff', { role: 'Faculty' });
    expect(seen[0].body.Filters).toEqual([{ Facet: 'role', Id: 'role-Faculty' }]);
  });

  it('defaults to Staff OR Faculty', async () => {
    const seen: Array<{ url: URL; body: any }> = [];
    server.use(rolesHandler, capturePost('/users', [], seen));
    await run('user_get_staff', {});
    expect(seen[0].body.Filters).toEqual([{ Facet: 'role', Id: 'role-Staff' }, { Facet: 'role', Id: 'role-Faculty' }]);
  });

  it('offers role as Staff|Faculty and no department', () => {
    const props = schemaOf('user_get_staff')!.properties;
    expect(props.role.enum).toEqual(['Staff', 'Faculty']);
    expect(props).not.toHaveProperty('department');
  });
});

describe('U3 user_search_advanced', () => {
  it('no longer offers isActive (IIQ has no active-status facet)', () => {
    expect(schemaOf('user_search_advanced')!.properties).not.toHaveProperty('isActive');
  });
});

describe('U4 user_search_agents', () => {
  const agent = (i: number) => ({ UserId: `a${i}`, Name: `Agent ${i}`, Email: `a${i}@x.test`, Phone: '555-0100', LocationName: 'Central High', IsActive: true });

  it('sends keyword, location and team filters to POST /users/agents, paged by $p/$s', async () => {
    const seen: Array<{ url: URL; body: any }> = [];
    server.use(capturePost('/users/agents', [agent(1)], seen));
    const text = await run('user_search_agents', { searchText: 'smith', locationId: 'loc-1', teamId: 'team-1' });
    expect(seen[0].body).toEqual({
      OnlyShowDeleted: false,
      FilterByViewPermission: false,
      Filters: [
        { Facet: 'keyword', Value: 'smith' },
        { Facet: 'location', Id: 'loc-1' },
        { Facet: 'team', Id: 'team-1' },
      ],
    });
    expect(seen[0].url.searchParams.get('$p')).toBe('0');
    expect(seen[0].url.searchParams.get('$s')).toBe('25');
    expect(text).toBe(
      'Found 1 IT support agents (showing 1):\n\n• Agent 1\n  Email: a1@x.test | Phone: 555-0100\n  Location: Central High\n\nPage 1 of 1'
    );
  });

  it('pages on the server and reports Paging.TotalRows', async () => {
    const seen: Array<{ url: URL; body: any }> = [];
    server.use(capturePost('/users/agents', Array.from({ length: 300 }, (_, i) => agent(i)), seen));
    const text = await run('user_search_agents', { pageIndex: 2, pageSize: 10 });
    expect(seen[0].url.searchParams.get('$p')).toBe('2');
    expect(seen[0].url.searchParams.get('$s')).toBe('10');
    expect(seen[0].body.Filters).toEqual([]);
    expect(text.startsWith('Found 300 IT support agents (showing 10):')).toBe(true);
    expect(bullets(text)[0]).toBe('• Agent 20');
    expect(text.endsWith('Page 3 of 30')).toBe(true);
  });

  it('reports no matches', async () => {
    server.use(capturePost('/users/agents', [], []));
    expect(await run('user_search_agents', { searchText: 'nobody' })).toBe('No IT support agents found matching your criteria.');
  });

  it('offers pageSize and pageIndex', () => {
    const props = schemaOf('user_search_agents')!.properties;
    expect(props).toHaveProperty('pageSize');
    expect(props).toHaveProperty('pageIndex');
  });
});

describe('U5 user_get_by_location', () => {
  const user = { UserId: 'u1', Name: 'Ann Lee', Email: 'ann@x.test', LocationName: 'Central High', Role: { RoleId: 'role-Staff', Name: 'Staff' } };

  it('filters POST /users by location and every non-student role by default', async () => {
    const seen: Array<{ url: URL; body: any }> = [];
    server.use(rolesHandler, capturePost('/users', [user], seen));
    const text = await run('user_get_by_location', { locationId: 'loc-1' });
    expect(seen[0].body.Filters).toEqual([
      { Facet: 'location', Id: 'loc-1' },
      ...['Agent', 'Faculty', 'Guest', 'Parent / Guardian', 'Staff'].map((name) => ({ Facet: 'role', Id: `role-${name}` })),
    ]);
    expect(seen[0].url.searchParams.get('$s')).toBe('25');
    expect(text).toBe('Found 1 users (showing 1):\n\n• Ann Lee (Staff)\n  Email: ann@x.test | Location: Central High\n\nPage 1 of 1');
  });

  it('sends only the location filter with includeStudents: true', async () => {
    const seen: Array<{ url: URL; body: any }> = [];
    server.use(rolesHandler, capturePost('/users', [user], seen));
    await run('user_get_by_location', { locationId: 'loc-1', includeStudents: true });
    expect(seen[0].body.Filters).toEqual([{ Facet: 'location', Id: 'loc-1' }]);
  });

  it('pages on the server', async () => {
    const seen: Array<{ url: URL; body: any }> = [];
    const rows = Array.from({ length: 822 }, (_, i) => ({ ...user, UserId: `u${i}`, Name: `User ${i}` }));
    server.use(rolesHandler, capturePost('/users', rows, seen));
    const text = await run('user_get_by_location', { locationId: 'loc-1', pageIndex: 1, pageSize: 100 });
    expect(seen[0].url.searchParams.get('$p')).toBe('1');
    expect(text.startsWith('Found 822 users (showing 100):')).toBe(true);
    expect(bullets(text)[0]).toBe('• User 100 (Staff)');
    expect(text.endsWith('Page 2 of 9')).toBe(true);
  });

  it('no longer calls GET /users/location/{id} (IIQ ignores the location there)', async () => {
    let calledLegacy = false;
    server.use(
      rolesHandler,
      capturePost('/users', [], []),
      http.get(`${BASE}/users/location/:id`, () => { calledLegacy = true; return HttpResponse.json({ Items: [], Paging: { TotalRows: 48465 } }); }),
    );
    expect(await run('user_get_by_location', { locationId: 'loc-1' })).toBe('No users found for this location.');
    expect(calledLegacy).toBe(false);
  });

  it('offers pageSize and pageIndex and describes the home location', () => {
    const tool = enhancedUserTools.find((t) => t.name === 'user_get_by_location')!;
    expect(tool.inputSchema.properties).toHaveProperty('pageSize');
    expect(tool.inputSchema.properties).toHaveProperty('pageIndex');
    expect(tool.description).toMatch(/home location/i);
  });
});

describe('U6 user_get_details', () => {
  const detail = (extra: object) => http.get(`${BASE}/users/:id`, () => HttpResponse.json({
    Item: { UserId: 'u1', Name: 'Ann Lee', Username: 'alee', Email: 'ann@x.test', LocationName: 'Central High', IsActive: true, CreatedDate: '2020-01-01', Role: { Name: 'Staff' }, ...extra },
  }));

  it('shows Phone, Home Phone and Job Title IIQ sends, and no Mobile or Last Login', async () => {
    server.use(detail({ Phone: '555-0100', HomePhone: '555-0199', JobTitle: 'Librarian' }));
    expect(await run('user_get_details', { userId: 'u1' })).toBe(`User Details:
Name: Ann Lee
Username: alee
Email: ann@x.test
Type: Staff
Role: Staff
Location: Central High
Phone: 555-0100
Home Phone: 555-0199
Job Title: Librarian
Status: Active
Created: 2020-01-01`);
  });

  it('omits Home Phone and Job Title when not set', async () => {
    server.use(detail({}));
    const text = await run('user_get_details', { userId: 'u1' });
    expect(text).toContain('\nPhone: N/A\nStatus: Active\n');
    expect(text).not.toMatch(/Home Phone|Job Title|Mobile|Last Login/);
  });
});

describe('U7 removed user tools', () => {
  it.each(['user_get_parents', 'user_get_permissions', 'user_get_groups', 'user_get_user_groups'])('%s is no longer advertised', (name) => {
    expect(enhancedUserTools.map((t) => t.name)).not.toContain(name);
  });
});

describe('X4 user_search_advanced includeDeleted', () => {
  it('says IIQ returns only deleted users (OnlyShowDeleted)', () => {
    expect(schemaOf('user_search_advanced')?.properties.includeDeleted.description)
      .toBe('Show only deleted users (sent as OnlyShowDeleted; default: false)');
  });
});

describe('user_quick_search query encoding', () => {
  it('sends "." as a query value (path-segment rules do not apply to ?q=)', async () => {
    let q: string | null = null;
    server.use(http.get(`${BASE}/users/quick`, ({ request }) => {
      q = new URL(request.url).searchParams.get('q');
      return HttpResponse.json({ Items: [] });
    }));
    await (handleEnhancedUserTool as (n: string, a: object) => Promise<unknown>)('user_quick_search', { query: '.' });
    expect(q).toBe('.');
  });
});
