import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { createToolRouter } from '../../src/router';

const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('tool router', () => {
  const router = createToolRouter();

  it('routes every advertised tool to a handler', () => {
    const unroutable = router
      .listTools()
      .map((tool) => tool.name)
      .filter((name) => router.routeFor(name) === undefined);
    expect(unroutable).toEqual([]);
  });

  it('has a handler for every advertised tool (none answers "Unknown tool")', async () => {
    // Every IIQ request fails fast: only the dispatch is under test here.
    server.use(http.all(`${BASE}/*`, () => new HttpResponse(null, { status: 404 })));
    const unhandled: string[] = [];
    for (const tool of router.listTools()) {
      const required = (tool.inputSchema.required as string[] | undefined) ?? [];
      const args = Object.fromEntries(required.map((key) => [key, '0f8fad5b-d9cb-469f-a165-70867728950e']));
      const text = (await router.callTool(tool.name, args)).content[0]?.text ?? '';
      if (/unknown\b.*\btool/i.test(text)) unhandled.push(tool.name);
    }
    expect(unhandled).toEqual([]);
  });

  it('no longer advertises tools IIQ cannot back (no endpoint, writes, duplicates, canned text)', () => {
    const removed = [
      'user_get_parents', 'user_get_permissions', 'user_get_groups', 'user_get_user_groups',
      'asset_toggle_favorite',
      'location_get_campuses', 'location_get_hierarchy', 'location_get_available_rooms', 'location_get_children',
      'location_get_users', 'location_get_tickets',
      'parts_get_order_details', 'parts_get_pending_orders', 'parts_get_compatible', 'parts_get_ticket_parts',
      'parts_get_common_repairs', 'parts_get_repair_costs', 'parts_get_by_location', 'parts_record_usage', 'parts_transfer',
      'issues_get_categories', 'issues_get_category_hierarchy', 'issues_get_common_categories', 'issues_get_priorities',
      'issues_get_priority_sla', 'issues_get_chromebook_issues', 'issues_get_network_issues', 'issues_get_parent_portal',
      'issues_get_templates', 'issues_get_by_building', 'issues_get_recurring', 'issues_get_seasonal',
      'issues_get_common_issues', 'issues_find_by_keyword',
      'customfield_get_location_values', 'customfield_get_device_fields', 'customfield_get_compliance_fields',
      'customfield_validate_value', 'customfield_get_by_entity', 'customfield_search_values',
    ];
    const names = new Set(router.listTools().map((tool) => tool.name));
    expect(removed).toHaveLength(40);
    expect(removed.filter((name) => names.has(name))).toEqual([]);
  });

  it('advertises the tools implemented for #98', () => {
    const added = [
      'user_search_agents', 'asset_search_by_serial', 'asset_get_favorites', 'asset_get_by_storage',
      'location_get_room_details', 'parts_get_details', 'parts_check_stock', 'parts_get_supplier_details',
      'parts_get_ipad_parts', 'issues_get_type_details', 'customfield_get_details', 'customfield_get_type_details',
      'customfield_get_asset_values', 'customfield_get_user_values', 'customfield_get_options',
    ];
    const names = new Set(router.listTools().map((tool) => tool.name));
    expect(added.filter((name) => !names.has(name))).toEqual([]);
    // 159 before #98, minus the 40 removed; the 15 above were already advertised (unhandled).
    expect(names.size).toBe(119);
  });

  it.each([
    ['asset_get_user_devices', { userId: '../users/me' }],
    ['asset_get_favorites', { userId: '../users/me' }],
    ['asset_get_by_room', { roomId: '../users/me' }],
    ['asset_get_history', { assetId: '../users/me' }],
    ['user_get_details', { userId: '../users/me' }],
    ['location_get_details', { locationId: '../users/me' }],
    ['parts_get_details', { partId: '../users/me' }],
    ['parts_check_stock', { partId: '../users/me' }],
    ['parts_get_supplier_details', { supplierId: '../users/me' }],
    ['issues_get_type_details', { typeId: '../users/me' }],
    ['customfield_get_details', { fieldId: '../users/me' }],
    ['customfield_get_type_details', { typeId: '../users/me' }],
    ['customfield_get_options', { fieldId: '../users/me' }],
    ['customfield_get_asset_values', { assetId: '../users/me' }],
    ['customfield_get_user_values', { userId: '../users/me' }],
    ['customfield_get_ticket_values', { ticketId: '../users/me' }],
  ])('%s encodes its id as one path segment (no ../ traversal)', async (name, args) => {
    const paths: string[] = [];
    server.use(http.all(`${BASE}/*`, ({ request }) => {
      paths.push(new URL(request.url).pathname);
      return new HttpResponse(null, { status: 404 });
    }));
    await router.callTool(name, args);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((p) => p.endsWith('/users/me'))).toEqual([]);
    expect(paths.some((p) => p.includes('..%2Fusers%2Fme'))).toBe(true);
  });

  // '.'/'..' survive encodeURIComponent and URL normalisation treats even %2E%2E as a dot segment,
  // so a dot-only id must be rejected before any request is made.
  it.each([
    ['parts_get_details', { partId: '..' }],
    ['parts_get_supplier_details', { supplierId: '.' }],
    ['asset_get_by_room', { roomId: '..' }],
    ['asset_find_by_tag', { assetTag: '..' }],
    ['asset_search_by_tag', { tagPattern: '.' }],
    ['user_get_details', { userId: '..' }],
    ['location_get_room_details', { roomId: '..' }],
    ['issues_get_type_details', { typeId: '..' }],
    ['customfield_get_details', { fieldId: '..' }],
    ['customfield_get_asset_values', { assetId: '.' }],
  ])('%s rejects a dot-only id without calling IIQ', async (name, args) => {
    const paths: string[] = [];
    server.use(http.all(`${BASE}/*`, ({ request }) => {
      paths.push(new URL(request.url).pathname);
      return HttpResponse.json({ Item: { Name: 'leaked' }, Items: [{ Name: 'leaked' }] });
    }));
    const text = (await router.callTool(name, args)).content[0]?.text ?? '';
    expect(paths).toEqual([]);
    expect(text).toMatch(/must be an ID/);
    expect(text).not.toContain('leaked');
  });

  it('advertises each tool name once', () => {
    const names = router.listTools().map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('rejects a name no route claims', async () => {
    await expect(router.callTool('nope_tool', {})).rejects.toThrow('Unknown tool: nope_tool');
  });

  it('passes an MCP {content} result through without re-encoding it', async () => {
    server.use(
      http.get(`${BASE}/parts`, () =>
        HttpResponse.json({ Items: [], ItemCount: 0, Paging: { PageIndex: 0, PageCount: 0, PageSize: 50, TotalRows: 0 } })
      )
    );
    const result = await router.callTool('parts_get_all', {});
    expect(result.content).toEqual([{ type: 'text', text: 'No parts found in inventory.' }]);
  });

  it('JSON-encodes raw handler data', async () => {
    server.use(http.get(`${BASE}/slas`, () => HttpResponse.json({ Items: [{ Name: 'Standard' }] })));
    const result = await router.callTool('sla_list', {});
    expect(result.content[0].text).toContain('Standard');
  });
});
