import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleTeamTool } from '../../../src/tools/teams';
import { handlePurchaseOrderTool } from '../../../src/tools/purchaseorders';
import { handleEnhancedPartsTool } from '../../../src/tools/parts';

const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Live IIQ GET list: pages only via $p/$s and reports Paging.TotalRows (verified 2026-11-06). */
function listHandler(path: string, rows: object[]) {
  return http.get(`${BASE}${path}`, ({ request }) => {
    const url = new URL(request.url);
    const p = Number(url.searchParams.get('$p') ?? 0);
    const s = Number(url.searchParams.get('$s') ?? 20);
    const items = rows.slice(p * s, p * s + s);
    return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { PageIndex: p, PageSize: s, TotalRows: rows.length } });
  });
}

/** Live IIQ rejects POST searches on these resources with 405 (verified 2026-11-06). */
const postRejected = (path: string) => http.post(`${BASE}${path}`, () => new HttpResponse(null, { status: 405 }));

const json = (result: { content: Array<{ text: string }> }) => JSON.parse(result.content[0].text);

describe('team_search', () => {
  beforeEach(() =>
    server.use(
      postRejected('/teams'),
      listHandler('/teams/all', [
        { TeamId: 't1', TeamName: 'Network Team', Description: 'Wi-Fi and switching' },
        { TeamId: 't2', TeamName: 'Device Repair', Description: 'Chromebook depot' },
        { TeamId: 't3', TeamName: 'Help Desk', Description: 'Tier 1 phones' },
      ])
    )
  );

  it('filters the team list by name or description', async () => {
    const result = json(await handleTeamTool('team_search', { searchText: 'chromebook' }));
    expect(result.Items.map((t: any) => t.TeamId)).toEqual(['t2']);
    expect(result.Paging.TotalRows).toBe(1);
  });

  it('pages the filtered list', async () => {
    const result = json(await handleTeamTool('team_search', { pageSize: 2, pageIndex: 1 }));
    expect(result.Items.map((t: any) => t.TeamId)).toEqual(['t3']);
    expect(result.Paging).toMatchObject({ PageIndex: 1, PageSize: 2, PageCount: 2, TotalRows: 3 });
  });
});

describe('purchaseorder_search', () => {
  beforeEach(() =>
    server.use(
      postRejected('/purchaseorders'),
      listHandler('/purchaseorders', [
        { PurchaseOrderId: 'po1', PoNumber: 'PO-2026-001', Notes: 'Chromebook screens', IsApproved: false, IsClosed: false, CreatedDate: '2026-01-10T00:00:00' },
        { PurchaseOrderId: 'po2', PoNumber: 'PO-2026-002', Notes: 'Projector bulbs', IsApproved: true, IsClosed: false, CreatedDate: '2026-03-02T00:00:00' },
        { PurchaseOrderId: 'po3', PoNumber: 'PO-2025-090', Notes: 'Cables', IsApproved: true, IsClosed: true, CreatedDate: '2025-11-20T00:00:00' },
      ])
    )
  );

  it('filters by text in the PO number or notes', async () => {
    expect(json(await handlePurchaseOrderTool('purchaseorder_search', { searchText: 'projector' })).Items.map((p: any) => p.PurchaseOrderId)).toEqual(['po2']);
    expect(json(await handlePurchaseOrderTool('purchaseorder_search', { searchText: '2026-001' })).Items.map((p: any) => p.PurchaseOrderId)).toEqual(['po1']);
  });

  it('maps status onto IsApproved/IsClosed', async () => {
    const ids = async (status: string) =>
      json(await handlePurchaseOrderTool('purchaseorder_search', { status })).Items.map((p: any) => p.PurchaseOrderId);
    expect(await ids('pending')).toEqual(['po1']);
    expect(await ids('approved')).toEqual(['po2']);
    expect(await ids('completed')).toEqual(['po3']);
  });

  it('filters by creation date range', async () => {
    const result = json(await handlePurchaseOrderTool('purchaseorder_search', { dateFrom: '2026-01-01', dateTo: '2026-02-01' }));
    expect(result.Items.map((p: any) => p.PurchaseOrderId)).toEqual(['po1']);
  });

  it('treats both date bounds as inclusive whole days', async () => {
    server.use(
      listHandler('/purchaseorders', [
        { PurchaseOrderId: 'late', PoNumber: 'PO-1', CreatedDate: '2026-02-01T21:45:00' },
        { PurchaseOrderId: 'early', PoNumber: 'PO-2', CreatedDate: '2026-01-01T00:05:00' },
        { PurchaseOrderId: 'after', PoNumber: 'PO-3', CreatedDate: '2026-02-02T00:01:00' },
      ])
    );
    const result = json(await handlePurchaseOrderTool('purchaseorder_search', { dateFrom: '2026-01-01', dateTo: '2026-02-01' }));
    expect(result.Items.map((p: any) => p.PurchaseOrderId)).toEqual(['late', 'early']);
  });

  it('flags the result when the PO list was too large to read completely', async () => {
    // 10 full pages of 1000 with more remaining hits the iiqListAll cap.
    const rows = Array.from({ length: 10_500 }, (_, i) => ({ PurchaseOrderId: `po${i}`, PoNumber: `PO-${i}` }));
    server.use(listHandler('/purchaseorders', rows));
    const result = json(await handlePurchaseOrderTool('purchaseorder_search', {}));
    expect(result.Truncated).toBe(true);
    expect(result.Paging.TotalRows).toBe(10_000);
  });
});

describe('parts searches', () => {
  // Live GET /parts items: Name, PartId, QuantityOnHand, StandardCostEach, StandardSupplierId (no PartNumber/Category).
  beforeEach(() =>
    server.use(
      postRejected('/parts'),
      listHandler('/parts', [
        { PartId: 'p1', Name: 'Chromebook 3100 Screen', QuantityOnHand: 4, StandardCostEach: 45, StandardSupplierId: 's1' },
        { PartId: 'p2', Name: 'Chromebook 3100 Keyboard', QuantityOnHand: 9, StandardCostEach: 30, StandardSupplierId: 's2' },
        { PartId: 'p3', Name: 'iPad Charger', QuantityOnHand: 12, StandardCostEach: 19, StandardSupplierId: 's1' },
      ])
    )
  );

  it('parts_search filters the parts list by text and supplier', async () => {
    const text = (await handleEnhancedPartsTool('parts_search', { searchText: 'chromebook', supplierId: 's1' })).content[0].text;
    expect(text).toContain('Found 1 parts');
    expect(text).toContain('Chromebook 3100 Screen');
    expect(text).not.toContain('Keyboard');
    expect(text).not.toContain('iPad');
  });

  it('parts_get_chromebook_parts lists only Chromebook parts', async () => {
    const text = (await handleEnhancedPartsTool('parts_get_chromebook_parts', { model: '3100' })).content[0].text;
    expect(text).toContain('Chromebook 3100 Screen');
    expect(text).toContain('Chromebook 3100 Keyboard');
    expect(text).not.toContain('iPad');
  });

  it('parts_find_by_number matches the part name/number case-insensitively', async () => {
    const text = (await handleEnhancedPartsTool('parts_find_by_number', { partNumber: 'ipad charger' })).content[0].text;
    expect(text).toContain('Name: iPad Charger');
    expect(text).toContain('ID: p3');
  });

  it('parts_find_by_number reports a missing part', async () => {
    const text = (await handleEnhancedPartsTool('parts_find_by_number', { partNumber: 'NOPE-1' })).content[0].text;
    expect(text).toBe('No part found with number: NOPE-1');
  });
});
