import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedPartsTool, enhancedPartsTools } from '../../../src/tools/parts';

/**
 * #98 sweep, parts & purchase orders (P1-P6). Shapes are the live IIQ ones (verified 2026-11-07):
 * GET /parts items carry Name, QuantityOnHand, StandardCostEach, StandardSupplier{Name} and no
 * Category/DeviceType/ReorderPoint; GET /parts/{id} and /parts/suppliers/{id} return { Item }.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const run = async (name: string, args: object = {}) => (await (handleEnhancedPartsTool as Handler)(name, args)).content[0].text;
const bullets = (text: string) => text.split('\n').filter((line) => line.trimStart().startsWith('• '));
const schemaOf = (name: string) => enhancedPartsTools.find((t) => t.name === name)?.inputSchema.properties as Record<string, unknown>;

let seen: URL[] = [];
const paged = (rows: object[]) => ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  seen.push(url);
  const p = Number(url.searchParams.get('$p') ?? 0);
  const s = Number(url.searchParams.get('$s') ?? 20);
  const items = rows.slice(p * s, p * s + s);
  return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: rows.length } });
};
const part = (i: number, extra: object = {}) => ({
  PartId: `p${i}`, Name: `Part ${i}`, QuantityOnHand: 10, StandardCostEach: 5, StandardSupplierId: 's1', StandardSupplier: { Name: 'Acme' }, ...extra,
});
const useParts = (rows: object[]) => { seen = []; server.use(http.get(`${BASE}/parts`, paged(rows))); };

describe('P1 parts_get_orders', () => {
  const po = (id: string, created: string) => ({ PurchaseOrderId: `${id}-0000`, PoNumber: id, CreatedDate: created, PurchaseTotalCosts: 1, Purchases: [] });
  const usePos = () => server.use(http.get(`${BASE}/purchaseorders`, paged([
    po('EARLY', '2026-01-01T00:05:00.00'), po('LATE', '2026-02-01T21:45:00.00'), po('AFTER', '2026-02-02T00:01:00.00'), po('BEFORE', '2025-12-31T23:59:00.00'),
  ])));

  it('treats dateFrom/dateTo as inclusive whole days on CreatedDate', async () => {
    usePos();
    expect(bullets(await run('parts_get_orders', { dateFrom: '2026-01-01', dateTo: '2026-02-01' }))).toEqual(['• PO EARLY', '• PO LATE']);
    expect(bullets(await run('parts_get_orders', { dateFrom: '2026-02-01' }))).toEqual(['• PO LATE', '• PO AFTER']);
    expect(bullets(await run('parts_get_orders', { dateTo: '2025-12-31' }))).toEqual(['• PO BEFORE']);
  });

  it('rejects an invalid date with an error result', async () => {
    usePos();
    expect(await run('parts_get_orders', { dateFrom: '01/02/2026' })).toBe('Error: dateFrom must be a date in YYYY-MM-DD form (got "01/02/2026").');
    expect(await run('parts_get_orders', { dateTo: '2026-02-30' })).toBe('Error: dateTo must be a date in YYYY-MM-DD form (got "2026-02-30").');
    // A month/day out of range makes Date invalid; toISOString() must not throw "Invalid time value".
    expect(await run('parts_get_orders', { dateFrom: '2026-13-40' })).toBe('Error: dateFrom must be a date in YYYY-MM-DD form (got "2026-13-40").');
  });

  it('no longer offers supplierId (purchase orders carry no supplier)', () => {
    expect(schemaOf('parts_get_orders')).not.toHaveProperty('supplierId');
  });
});

describe('P2 parts_get_details / parts_get_supplier_details / parts_check_stock', () => {
  it('parts_get_details renders GET /parts/{id} Item', async () => {
    server.use(http.get(`${BASE}/parts/:id`, ({ params }) => HttpResponse.json({ Item: part(7, { PartId: params.id, CreatedDate: '2026-01-02T03:04:05', ModifiedDate: '2026-03-04T05:06:07' }) })));
    expect(await run('parts_get_details', { partId: 'abc' })).toBe(
      'Part Details:\nName: Part 7\nStock: 10\nCost: $5\nSupplier: Acme\nCreated: 2026-01-02T03:04:05\nModified: 2026-03-04T05:06:07\nID: abc'
    );
  });

  it('parts_get_supplier_details renders GET /parts/suppliers/{id} Item', async () => {
    server.use(http.get(`${BASE}/parts/suppliers/:id`, ({ params }) =>
      HttpResponse.json({ Item: { PartSupplierId: params.id, Name: 'Acme', CreatedDate: '2026-01-02', ModifiedDate: '2026-01-03' } })));
    expect(await run('parts_get_supplier_details', { supplierId: 's9' })).toBe(
      'Supplier Details:\nName: Acme\nCreated: 2026-01-02\nModified: 2026-01-03\nID: s9'
    );
  });

  it('parts_check_stock with partId reports that part\'s QuantityOnHand', async () => {
    server.use(http.get(`${BASE}/parts/:id`, () => HttpResponse.json({ Item: part(3, { QuantityOnHand: 4 }) })));
    expect(await run('parts_check_stock', { partId: 'p3' })).toBe('Stock for Part 3: 4 on hand (ID: p3)');
  });

  it('parts_check_stock without partId lists stock of every part, paged 25 by default', async () => {
    useParts(Array.from({ length: 30 }, (_, i) => part(i, { QuantityOnHand: i })));
    const text = await run('parts_check_stock');
    expect(text.startsWith('Found 30 parts (showing 25):\n\n• Part 0: 0 on hand\n\n• Part 1: 1 on hand')).toBe(true);
    expect(text.endsWith('Page 1 of 2')).toBe(true);
    expect(seen.every((url) => url.searchParams.has('$s'))).toBe(true);
  });

  it('parts_check_stock no longer offers locationId', () => {
    expect(schemaOf('parts_check_stock')).not.toHaveProperty('locationId');
  });
});

describe('P3 parts_get_ipad_parts', () => {
  it('lists only iPad parts, matching model and category against Name', async () => {
    useParts([part(1, { Name: 'iPad 9 Screen' }), part(2, { Name: 'iPad 9 Battery' }), part(3, { Name: 'iPad Air Screen' }), part(4, { Name: 'Chromebook Screen' })]);
    const all = await run('parts_get_ipad_parts');
    expect(all).toContain('iPad 9 Screen');
    expect(all).toContain('iPad Air Screen');
    expect(all).not.toContain('Chromebook');
    const narrowed = await run('parts_get_ipad_parts', { model: 'ipad 9', category: 'Screen' });
    expect(bullets(narrowed).map((b) => b.trim())).toEqual(['• iPad 9 Screen - Stock: 10 - $5']);
  });

  it('says when there are no iPad parts', async () => {
    useParts([part(4, { Name: 'Chromebook Screen' })]);
    expect(await run('parts_get_ipad_parts')).toBe('No iPad parts found.');
  });
});

describe('P4 parts_get_all', () => {
  it('renders real fields for every part, paged 25 by default', async () => {
    useParts(Array.from({ length: 27 }, (_, i) => part(i)));
    const text = await run('parts_get_all', { pageIndex: 1 });
    expect(text).toBe(
      'Found 27 parts (showing 2):\n\n' +
      '• Part 25\n  Stock: 10 | Cost: $5 | Supplier: Acme\n  ID: p25\n\n' +
      '• Part 26\n  Stock: 10 | Cost: $5 | Supplier: Acme\n  ID: p26\n\n' +
      'Page 2 of 2'
    );
  });

  it('honours pageSize and keeps its empty text', async () => {
    useParts(Array.from({ length: 3 }, (_, i) => part(i)));
    expect(bullets(await run('parts_get_all', { pageSize: 2 }))).toEqual(['• Part 0', '• Part 1']);
    useParts([]);
    expect(await run('parts_get_all')).toBe('No parts found in inventory.');
  });

  it('no longer offers includeInactive', () => {
    expect(schemaOf('parts_get_all')).not.toHaveProperty('includeInactive');
    expect(schemaOf('parts_get_all')).toHaveProperty('pageSize');
  });
});

describe('P5 parts_search lowStock and parts_get_low_stock', () => {
  const stock = [part(1, { QuantityOnHand: 0 }), part(2, { QuantityOnHand: 4, Name: 'Screen kit' }), part(3, { QuantityOnHand: 5 }), part(4, { QuantityOnHand: 2, Name: 'Hinge' })];

  it('parts_search lowStock keeps only parts below 5 on hand', async () => {
    useParts(stock);
    expect(bullets(await run('parts_search', { lowStock: true }))).toEqual(['• Part 1', '• Screen kit', '• Hinge']);
  });

  it('parts_search no longer offers locationId or includeDeleted', () => {
    expect(schemaOf('parts_search')).not.toHaveProperty('locationId');
    expect(schemaOf('parts_search')).not.toHaveProperty('includeDeleted');
  });

  it('parts_get_low_stock filters category on Name', async () => {
    useParts(stock);
    expect(bullets(await run('parts_get_low_stock', { category: 'screen' }))).toEqual(['• Screen kit']);
  });

  it('parts_get_low_stock critical keeps only parts with none on hand', async () => {
    useParts(stock);
    expect(await run('parts_get_low_stock', { critical: true })).toBe(
      'Low Stock Parts (1):\n\n• Part 1\n  Stock: 0 | Cost: $5 | Supplier: Acme\n  ID: p1'
    );
  });
});

describe('P6 removed parts tools', () => {
  it('no longer advertises tools IIQ cannot back', () => {
    const names = enhancedPartsTools.map((t) => t.name);
    const removed = ['parts_get_order_details', 'parts_get_pending_orders', 'parts_get_compatible', 'parts_get_ticket_parts',
      'parts_get_common_repairs', 'parts_get_repair_costs', 'parts_get_by_location', 'parts_record_usage', 'parts_transfer'];
    expect(removed.filter((name) => names.includes(name))).toEqual([]);
  });
});

describe('X4 parts_get_suppliers', () => {
  it('no longer offers preferred (suppliers carry no IsPreferred)', () => {
    expect(schemaOf('parts_get_suppliers')).not.toHaveProperty('preferred');
  });

  it('lists every supplier with no preferred marker', async () => {
    server.use(http.get(`${BASE}/parts/suppliers`, () => HttpResponse.json({ Items: [
      { PartSupplierId: 's1', Name: 'Acme', CreatedDate: '2026-01-01', ModifiedDate: '2026-01-02', IsPreferred: true },
    ] })));
    const text = await run('parts_get_suppliers', { preferred: true });
    expect(text.startsWith('Suppliers (1):\n\n• Acme\n')).toBe(true);
    expect(text).not.toContain('Preferred');
  });

  it('shows only the fields IIQ sends (no Contact/Phone/Email/Lead Time placeholders)', async () => {
    server.use(http.get(`${BASE}/parts/suppliers`, () => HttpResponse.json({ Items: [
      { PartSupplierId: 's1', Name: 'Acme', CreatedDate: '2026-01-01', ModifiedDate: '2026-01-02' },
      { PartSupplierId: 's2', Name: 'Bolt Co', CreatedDate: '2026-01-01', ModifiedDate: '2026-01-02' },
    ] })));
    expect(await run('parts_get_suppliers', {})).toBe('Suppliers (2):\n\n• Acme\n  ID: s1\n\n• Bolt Co\n  ID: s2');
  });
});

describe('X4 parts ghost fields (live parts carry no Category, PartNumber or QuantityAvailable)', () => {
  it('parts_get_chromebook_parts lists rows without an always-"Other" category heading', async () => {
    useParts([part(1, { Name: 'Chromebook 3100 Screen' }), part(2, { Name: 'Chromebook 3100 Keyboard', QuantityOnHand: 2 })]);
    expect(await run('parts_get_chromebook_parts')).toBe(
      'Chromebook Parts (2):\n\n• Chromebook 3100 Screen - Stock: 10 - $5\n• Chromebook 3100 Keyboard - Stock: 2 - $5'
    );
  });

  it('parts_find_by_number shows only the fields IIQ sends', async () => {
    useParts([part(3, { Name: 'iPad Charger' })]);
    expect(await run('parts_find_by_number', { partNumber: 'ipad charger' })).toBe(
      'Part Found:\nName: iPad Charger\nStock: 10\nCost: $5\nSupplier: Acme\nID: p3'
    );
  });
});
