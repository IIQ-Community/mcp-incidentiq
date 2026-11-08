import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedIssuesTool, enhancedIssuesTools } from '../../../src/tools/issues';

/**
 * #98 sweep, issues (I1-I6). Live IIQ (verified 2026-11-07): POST /issues/types pages via $p/$s
 * (1,307 types: IssueTypeId, Name, ProductId, Scope 'Global'|'Site'; no Category/IsActive);
 * GET /issues/types returns only 50; GET /issues/types/{id} returns { Item }.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const run = async (name: string, args: object = {}) => (await (handleEnhancedIssuesTool as Handler)(name, args)).content[0].text;
const bullets = (text: string) => text.split('\n').filter((line) => line.trimStart().startsWith('• '));
const schemaOf = (name: string) => enhancedIssuesTools.find((t) => t.name === name)?.inputSchema.properties as Record<string, unknown>;

let seen: URL[] = [];
const types = Array.from({ length: 60 }, (_, i) => ({
  IssueTypeId: `t${i}`, Name: `Type ${i}`, ProductId: 'prod', Scope: i % 3 === 0 ? 'Site' : 'Global',
}));
const useTypes = () => {
  seen = [];
  server.use(
    // GET is the unpaged 50-row list; the tool must not rely on it.
    http.get(`${BASE}/issues/types`, () => HttpResponse.json({ Items: types.slice(0, 50), ItemCount: 50 })),
    http.post(`${BASE}/issues/types`, ({ request }) => {
      const url = new URL(request.url);
      seen.push(url);
      const p = Number(url.searchParams.get('$p') ?? 0);
      const s = Number(url.searchParams.get('$s') ?? 20);
      const items = types.slice(p * s, p * s + s);
      return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: types.length } });
    })
  );
};

describe('I1 issues_get_type_details', () => {
  it('renders GET /issues/types/{id} Item', async () => {
    server.use(http.get(`${BASE}/issues/types/:id`, ({ params }) =>
      HttpResponse.json({ Item: { IssueTypeId: params.id, Name: 'Broken screen', Scope: 'Global', ProductId: 'prod' } })));
    expect(await run('issues_get_type_details', { typeId: 'abc' })).toBe(
      'Issue Type Details:\nName: Broken screen\nScope: Global\nProduct ID: prod\nID: abc'
    );
  });

  it('tolerates a bare object', async () => {
    server.use(http.get(`${BASE}/issues/types/:id`, () => HttpResponse.json({ IssueTypeId: 'x', Name: 'Bare', Scope: 'Site' })));
    expect(await run('issues_get_type_details', { typeId: 'x' })).toContain('Name: Bare\nScope: Site');
  });
});

describe('I2 issues_get_types', () => {
  it('reads every type (POST with $p/$s), pages 25 by default with real fields', async () => {
    useTypes();
    const text = await run('issues_get_types', { pageIndex: 2 });
    expect(text).toBe(
      'Found 60 issue types (showing 10):\n\n' +
      Array.from({ length: 10 }, (_, k) => 50 + k).map((i) => `• Type ${i}\n  Scope: ${i % 3 === 0 ? 'Site' : 'Global'} | ID: t${i}`).join('\n\n') +
      '\n\nPage 3 of 3'
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((url) => url.searchParams.has('$s'))).toBe(true);
  });

  it('keeps the scope filter, on the Scope values IIQ sends', async () => {
    useTypes();
    const text = await run('issues_get_types', { scope: 'Site', pageSize: 100 });
    expect(text.startsWith('Found 20 issue types (showing 20):')).toBe(true);
    expect(bullets(text)[1]).toBe('• Type 3');
    expect(schemaOf('issues_get_types').scope).toMatchObject({ enum: ['Global', 'Site', 'All'] });
  });

  it('no longer offers includeInactive (here or on issues_get_site_issues)', () => {
    expect(schemaOf('issues_get_types')).not.toHaveProperty('includeInactive');
    expect(schemaOf('issues_get_types')).toHaveProperty('pageSize');
    expect(schemaOf('issues_get_site_issues')).not.toHaveProperty('includeInactive');
  });
});

describe('I3 removed arguments', () => {
  it('drops isCommon, buildingId and gradeLevel', () => {
    expect(schemaOf('issues_search_types')).not.toHaveProperty('isCommon');
    expect(schemaOf('issues_get_classroom_tech')).not.toHaveProperty('buildingId');
    expect(schemaOf('issues_get_student_devices')).not.toHaveProperty('gradeLevel');
  });
});

describe('I4-I6 removed issues tools', () => {
  it('no longer advertises tools IIQ cannot back', () => {
    const names = enhancedIssuesTools.map((t) => t.name);
    const removed = ['issues_get_common_issues', 'issues_find_by_keyword', 'issues_get_categories', 'issues_get_category_hierarchy',
      'issues_get_common_categories', 'issues_get_priorities', 'issues_get_priority_sla', 'issues_get_chromebook_issues',
      'issues_get_network_issues', 'issues_get_parent_portal', 'issues_get_templates', 'issues_get_by_building',
      'issues_get_recurring', 'issues_get_seasonal'];
    expect(removed.filter((name) => names.includes(name))).toEqual([]);
  });
});

describe('X1 issues_get_site_issues', () => {
  // Live GET /issues/site (verified 2026-11-07): { Items } with no Paging; rows carry only IssueId
  // and empty role arrays. GET /issues/{IssueId} returns the issue (envelope unverified).
  const siteRows = Array.from({ length: 60 }, (_, i) => ({ IssueId: `iss${i}`, EnabledRoles: [], DisabledRoles: [] }));
  let detailCalls: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const useSite = (detail: (id: string) => Response) => {
    detailCalls = []; inFlight = 0; maxInFlight = 0;
    server.use(
      http.get(`${BASE}/issues/site`, () => HttpResponse.json({ Items: siteRows })),
      http.get(`${BASE}/issues/:id`, async ({ params }) => {
        const id = String(params.id);
        detailCalls.push(id);
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight--;
        return detail(id);
      })
    );
  };
  const issue = (id: string) => ({ IssueId: id, Name: `Issue ${id.slice(3)}`, IssueCategoryName: 'Hardware', Scope: 'Site' });

  it('pages 25 by default and fetches details for only that page, at most 4 at a time', async () => {
    useSite((id) => HttpResponse.json({ Item: issue(id) }));
    const text = await run('issues_get_site_issues');
    expect(text).toBe(
      'Found 60 site issues (showing 25):\n\n' +
      Array.from({ length: 25 }, (_, i) => `• Issue ${i} (Hardware)`).join('\n\n') +
      '\n\nPage 1 of 3'
    );
    expect([...detailCalls].sort()).toEqual(Array.from({ length: 25 }, (_, i) => `iss${i}`).sort());
    expect(maxInFlight).toBeLessThanOrEqual(4);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it('honours pageSize/pageIndex, accepts a bare object, and falls back to the IssueId', async () => {
    useSite((id) => (id === 'iss11' ? new HttpResponse(null, { status: 500 })
      : id === 'iss12' ? HttpResponse.json({ IssueId: id }) : HttpResponse.json(issue(id))));
    const text = await run('issues_get_site_issues', { pageSize: 5, pageIndex: 2 });
    expect(text).toBe(
      'Found 60 site issues (showing 5):\n\n• Issue 10 (Hardware)\n\n• iss11\n\n• iss12\n\n• Issue 13 (Hardware)\n\n• Issue 14 (Hardware)\n\nPage 3 of 12' +
      '\n\nNote: 2 of 5 issue names could not be read; those rows show the IssueId.'
    );
    expect([...detailCalls].sort()).toEqual(['iss10', 'iss11', 'iss12', 'iss13', 'iss14']);
  });

  it('fetches nothing for a page past the end', async () => {
    useSite((id) => HttpResponse.json({ Item: issue(id) }));
    expect(await run('issues_get_site_issues', { pageIndex: 9 })).toBe('Page 10 is past the end: 60 site issues match (3 pages).');
    expect(detailCalls).toEqual([]);
  });

  it('advertises paging and says what it does', () => {
    expect(schemaOf('issues_get_site_issues')).toHaveProperty('pageSize');
    expect(schemaOf('issues_get_site_issues')).toHaveProperty('pageIndex');
    expect(enhancedIssuesTools.find((t) => t.name === 'issues_get_site_issues')?.description).toContain('/issues/{IssueId}');
  });
});

describe('X3 issues_search_types scope and fields', () => {
  it('offers the live Scope values and renders no Active/Usage lines', async () => {
    useTypes();
    expect(schemaOf('issues_search_types').scope).toMatchObject({ enum: ['Global', 'Site', 'All'] });
    // 'Type 4' matches Type 4 and 40-49; only 42, 45 and 48 are Site.
    const text = await run('issues_search_types', { scope: 'Site', searchText: 'Type 4' });
    expect(text).toBe('Found 3 issue types (showing 3):\n\n' +
      ['42', '45', '48'].map((i) => `• Type ${i}\n  Scope: Site | ID: t${i}`).join('\n\n') + '\n\nPage 1 of 1');
  });
});

describe('X4 issues_search_types includeDeleted description', () => {
  it('says it shows only deleted types', () => {
    expect(schemaOf('issues_search_types').includeDeleted).toMatchObject({
      description: 'Show only deleted types (sent as OnlyShowDeleted; default: false)',
    });
  });
});

describe('X4 issues_search_types category', () => {
  it('no longer offers category (live issue types carry no Category; searchText already matches the name)', () => {
    expect(schemaOf('issues_search_types')).not.toHaveProperty('category');
  });
});

describe('X4 classroom and student-device issue lists are paged, not capped at 5', () => {
  const named = (names: string[]) => names.map((Name, i) => ({ IssueTypeId: `n${i}`, Name, ProductId: 'prod', Scope: 'Global' }));
  const useNamed = (rows: object[]) => server.use(http.post(`${BASE}/issues/types`, ({ request }) => {
    const url = new URL(request.url);
    const p = Number(url.searchParams.get('$p') ?? 0);
    const s = Number(url.searchParams.get('$s') ?? 20);
    return HttpResponse.json({ Items: rows.slice(p * s, p * s + s), Paging: { TotalRows: rows.length } });
  }));

  it('issues_get_student_devices pages every match (25 by default), grouped by device on the page', async () => {
    useNamed(named([...Array.from({ length: 27 }, (_, i) => `Chromebook issue ${i}`), 'iPad will not charge', 'Password reset']));
    const page1 = await run('issues_get_student_devices', {});
    expect(page1.startsWith('Found 28 student device issue types (showing 25):\n\nChromebook:\n  • Chromebook issue 0\n')).toBe(true);
    expect(bullets(page1)).toHaveLength(25);
    expect(page1.endsWith('\n\nPage 1 of 2')).toBe(true);
    expect(await run('issues_get_student_devices', { pageIndex: 1 })).toBe(
      'Found 28 student device issue types (showing 3):\n\nChromebook:\n  • Chromebook issue 25\n  • Chromebook issue 26\n\niPad:\n  • iPad will not charge\n\nPage 2 of 2'
    );
  });

  it('issues_get_classroom_tech pages every match, including more than five "other" classroom issues', async () => {
    useNamed(named([...Array.from({ length: 6 }, (_, i) => `Interactive display ${i}`), 'Projector bulb']));
    expect(await run('issues_get_classroom_tech', {})).toBe(
      'Found 7 classroom technology issue types (showing 7):\n\nProjector Issues:\n  • Projector bulb\n\nOther Classroom Issues:\n' +
      Array.from({ length: 6 }, (_, i) => `  • Interactive display ${i}`).join('\n') + '\n\nPage 1 of 1'
    );
  });

  it.each(['issues_get_student_devices', 'issues_get_classroom_tech'])('%s offers pageSize/pageIndex', (name) => {
    expect(schemaOf(name)).toHaveProperty('pageSize');
    expect(schemaOf(name)).toHaveProperty('pageIndex');
  });
});
