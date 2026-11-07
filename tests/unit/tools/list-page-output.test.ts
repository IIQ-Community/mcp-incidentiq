import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedCustomFieldTool } from '../../../src/tools/customfields';
import { handleEnhancedIssuesTool } from '../../../src/tools/issues';
import { handleEnhancedLocationTool } from '../../../src/tools/locations';
import { handleEnhancedPartsTool } from '../../../src/tools/parts';

/**
 * Exact-text output of the four client-side list searches (customfield_search,
 * issues_search_types, location_search_advanced, parts_search). These pin the text that the
 * shared list-page formatter must reproduce byte for byte: header, rows, footer, empty text.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';
const TICKET = '888891ac-91aa-e711-80c2-100dffa00001';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Live IIQ list: pages only via $p/$s and reports Paging.TotalRows (verified 2026-11-06). */
const paged = (rows: object[]) => ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const p = Number(url.searchParams.get('$p') ?? 0);
  const s = Number(url.searchParams.get('$s') ?? 20);
  const items = rows.slice(p * s, p * s + s);
  return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: rows.length } });
};

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const textOf = async (handler: Handler, name: string, args: object) => (await handler(name, args)).content[0].text;

describe('customfield_search output', () => {
  const fields = [
    { CustomFieldId: 'f1', CustomFieldTypeId: 't1', EntityTypeId: TICKET, IsRequired: true, CustomFieldType: { Name: 'Room Number' } },
    { CustomFieldId: 'f2', CustomFieldTypeId: 't2', EntityTypeId: TICKET, IsRequired: false, CustomFieldType: { Name: 'Room Phone' } },
  ];
  const use = () => server.use(http.post(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: fields, ItemCount: fields.length })));
  const run = (args: object) => textOf(handleEnhancedCustomFieldTool as Handler, 'customfield_search', args);

  it('renders a page exactly', async () => {
    use();
    expect(await run({ searchText: 'room' })).toBe(
      'Found 2 custom fields (showing 2):\n\n' +
      `• Room Number (Required)\n  Entity: Ticket | Type ID: t1 | ID: f1\n\n` +
      `• Room Phone\n  Entity: Ticket | Type ID: t2 | ID: f2\n\n` +
      'Page 1 of 1'
    );
  });

  it('renders a later page exactly', async () => {
    use();
    expect(await run({ searchText: 'room', pageSize: 1, pageIndex: 1 })).toBe(
      'Found 2 custom fields (showing 1):\n\n• Room Phone\n  Entity: Ticket | Type ID: t2 | ID: f2\n\nPage 2 of 2'
    );
  });

  it('renders nothing-matches exactly', async () => {
    use();
    expect(await run({ searchText: 'zzz' })).toBe('No custom fields found matching your criteria.');
  });
});

describe('issues_search_types output', () => {
  const types = [
    { IssueTypeId: 'i1', Name: 'Projector bulb', Scope: 'Tickets', IsActive: true },
    { IssueTypeId: 'i2', Name: 'Projector remote', Scope: 'Tickets', IsActive: false, Category: 'AV', Metadata: { UsageCount: 3 } },
  ];
  const use = () => server.use(http.post(`${BASE}/issues/types`, paged(types)));
  const run = (args: object) => textOf(handleEnhancedIssuesTool as Handler, 'issues_search_types', args);

  it('renders a page exactly', async () => {
    use();
    expect(await run({ searchText: 'projector' })).toBe(
      'Found 2 issue types (showing 2):\n\n' +
      '• Projector bulb\n  Scope: Tickets | Active: Yes\n  \n\n' +
      '• Projector remote (AV)\n  Scope: Tickets | Active: No\n  Usage: 3 times\n\n' +
      'Page 1 of 1'
    );
  });

  it('renders a later page exactly', async () => {
    use();
    expect(await run({ searchText: 'projector', pageSize: 1, pageIndex: 1 })).toBe(
      'Found 2 issue types (showing 1):\n\n• Projector remote (AV)\n  Scope: Tickets | Active: No\n  Usage: 3 times\n\nPage 2 of 2'
    );
  });

  it('renders nothing-matches exactly', async () => {
    use();
    expect(await run({ searchText: 'zzz' })).toBe('No issue types found matching your criteria.');
  });
});

describe('location_search_advanced output', () => {
  const locations = [
    { LocationId: 'l1', Name: 'Central High', Abbreviation: 'CHS', LocationType: { Name: 'School' } },
    { LocationId: 'l2', Name: 'Central Annex' },
  ];
  const use = () => server.use(http.get(`${BASE}/locations/all`, paged(locations)));
  const run = (args: object) => textOf(handleEnhancedLocationTool as Handler, 'location_search_advanced', args);

  it('renders a page exactly', async () => {
    use();
    expect(await run({ searchText: 'central' })).toBe(
      'Found 2 locations (showing 2):\n\n' +
      '• Central High (CHS)\n  Type: School | ID: l1\n\n' +
      '• Central Annex\n  Type: Unknown | ID: l2\n\n' +
      'Page 1 of 1'
    );
  });

  it('renders a later page exactly', async () => {
    use();
    expect(await run({ searchText: 'central', pageSize: 1, pageIndex: 1 })).toBe(
      'Found 2 locations (showing 1):\n\n• Central Annex\n  Type: Unknown | ID: l2\n\nPage 2 of 2'
    );
  });

  it('renders nothing-matches exactly', async () => {
    use();
    expect(await run({ searchText: 'zzz' })).toBe('No locations found matching your criteria.');
  });
});

describe('parts_search output', () => {
  const parts = [
    { PartId: 'p1', Name: 'Hinge kit', QuantityOnHand: 4, StandardCostEach: 12.5, StandardSupplier: { Name: 'Acme' } },
    { PartId: 'p2', Name: 'Hinge cover' },
  ];
  const use = () => server.use(http.get(`${BASE}/parts`, paged(parts)));
  const run = (args: object) => textOf(handleEnhancedPartsTool as Handler, 'parts_search', args);

  it('renders a page exactly', async () => {
    use();
    expect(await run({ searchText: 'hinge' })).toBe(
      'Found 2 parts (showing 2):\n\n' +
      '• Hinge kit\n  Stock: 4 | Cost: $12.5 | Supplier: Acme\n  ID: p1\n\n' +
      '• Hinge cover\n  Stock: 0 | Cost: $N/A | Supplier: N/A\n  ID: p2\n\n' +
      'Page 1 of 1'
    );
  });

  it('renders a later page exactly', async () => {
    use();
    expect(await run({ searchText: 'hinge', pageSize: 1, pageIndex: 1 })).toBe(
      'Found 2 parts (showing 1):\n\n• Hinge cover\n  Stock: 0 | Cost: $N/A | Supplier: N/A\n  ID: p2\n\nPage 2 of 2'
    );
  });

  it('renders nothing-matches exactly', async () => {
    use();
    expect(await run({ searchText: 'zzz' })).toBe('No parts found matching your criteria.');
  });
});

/** One row factory + handler per tool, for the approved behaviour changes. */
const TOOLS: Array<{
  tool: string; noun: string; handler: Handler; use: (rows: object[]) => void; row: (i: number) => object; bullet: (i: number) => string;
}> = [
  {
    tool: 'customfield_search', noun: 'custom fields', handler: handleEnhancedCustomFieldTool as Handler,
    use: (rows) => server.use(http.post(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: rows, ItemCount: rows.length }))),
    row: (i) => ({ CustomFieldId: `f${i}`, CustomFieldTypeId: `t${i}`, EntityTypeId: TICKET, IsRequired: false, CustomFieldType: { Name: `Match ${i}` } }),
    bullet: (i) => `• Match ${i}\n`,
  },
  {
    tool: 'issues_search_types', noun: 'issue types', handler: handleEnhancedIssuesTool as Handler,
    use: (rows) => server.use(http.post(`${BASE}/issues/types`, paged(rows))),
    row: (i) => ({ IssueTypeId: `i${i}`, Name: `Match ${i}`, Scope: 'Tickets', IsActive: true }),
    bullet: (i) => `• Match ${i}\n`,
  },
  {
    tool: 'location_search_advanced', noun: 'locations', handler: handleEnhancedLocationTool as Handler,
    use: (rows) => server.use(http.get(`${BASE}/locations/all`, paged(rows))),
    row: (i) => ({ LocationId: `l${i}`, Name: `Match ${i}` }),
    bullet: (i) => `• Match ${i}\n`,
  },
  {
    tool: 'parts_search', noun: 'parts', handler: handleEnhancedPartsTool as Handler,
    use: (rows) => server.use(http.get(`${BASE}/parts`, paged(rows))),
    row: (i) => ({ PartId: `p${i}`, Name: `Match ${i}` }),
    bullet: (i) => `• Match ${i}\n`,
  },
];

describe.each(TOOLS)('$tool paging', ({ tool, noun, handler, use, row, bullet }) => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i));

  it('renders every row on the page, with no "...and N more on this page" line', async () => {
    use(rows(12));
    const text = await textOf(handler, tool, { searchText: 'match', pageSize: 12 });
    expect(text.startsWith(`Found 12 ${noun} (showing 12):\n\n`)).toBe(true);
    for (let i = 0; i < 12; i++) expect(text).toContain(bullet(i));
    expect(text).not.toContain('more');
    expect(text.endsWith('\n\nPage 1 of 1')).toBe(true);
  });

  it('shows rows 11+ of a page that the next page does not repeat', async () => {
    use(rows(25));
    const first = await textOf(handler, tool, { searchText: 'match', pageSize: 20 });
    const second = await textOf(handler, tool, { searchText: 'match', pageSize: 20, pageIndex: 1 });
    expect(first).toContain(bullet(19));
    expect(second).toContain(bullet(20));
    expect(second).not.toContain(bullet(19));
  });

  it('says a page past the end is past the end instead of "No ... found"', async () => {
    use(rows(2));
    expect(await textOf(handler, tool, { searchText: 'match', pageIndex: 5 })).toBe(`Page 6 is past the end: 2 ${noun} match (1 page).`);
  });

  it('pluralises the page count in the past-the-end message', async () => {
    use(rows(3));
    expect(await textOf(handler, tool, { searchText: 'match', pageSize: 2, pageIndex: 2 })).toBe(`Page 3 is past the end: 3 ${noun} match (2 pages).`);
  });
});

describe('location_search_advanced truncation note', () => {
  it('uses the shared truncation note', async () => {
    // 10 full pages of 1000 with more remaining hits the iiqListAll cap.
    const rows = Array.from({ length: 10_500 }, (_, i) => ({ LocationId: `l${i}`, Name: `Site ${i}` }));
    server.use(http.get(`${BASE}/locations/all`, paged(rows)));
    const text = await textOf(handleEnhancedLocationTool as Handler, 'location_search_advanced', { searchText: 'site 1' , pageSize: 1 });
    expect(text.endsWith('\n\nNote: the full list was too large to read completely; results may be incomplete.')).toBe(true);
  });
});
