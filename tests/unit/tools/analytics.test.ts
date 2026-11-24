import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { analyticsTools, handleAnalyticsTool } from '../../../src/tools/analytics';

/**
 * Analytics tools (#112). Live IIQ analytics responses are `{ ItemCount, Items }` with no
 * Paging, and `$p`/`$s` are ignored (probe 2026-11-24), so every fixture here uses that shape.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

let hits: string[];

beforeAll(() => server.listen());
beforeEach(() => {
  hits = [];
  // Catch-all that records analytics requests; tests override specific endpoints with server.use.
  server.use(
    http.all(`${BASE}/analytics/*`, ({ request }) => {
      hits.push(new URL(request.url).pathname);
      return HttpResponse.json({ ItemCount: 0, Items: [] });
    })
  );
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const textOf = async (name: string, args: object = {}) =>
  (await handleAnalyticsTool(name, args)).content[0].text;

const ADVERTISED = [
  'analytics_asset_audit_coverage',
  'analytics_asset_audit_status',
  'analytics_asset_verification_location',
  'analytics_asset_verification_type',
  'analytics_list_reports',
  'analytics_get_report',
];
const REMOVED = [
  'analytics_asset_audit_by_policy',
  'analytics_asset_audit_by_schedule',
  'analytics_dashboard_summary',
  'analytics_get_report_elements',
  'analytics_get_report_queries',
];

describe('analytics tool set (N2, N3, N4)', () => {
  it('defines exactly the 6 tools IncidentIQ backs', () => {
    expect(analyticsTools.map((t) => t.name).sort()).toEqual([...ADVERTISED].sort());
  });

  it.each(REMOVED)('%s is gone: unknown-tool text and no request', async (name) => {
    expect(await textOf(name, { reportId: '0f8fad5b-d9cb-469f-a165-70867728950e', policyId: 'x', scheduleId: 'x' }))
      .toMatch(/Unknown analytics tool/);
    expect(hits).toHaveLength(0);
  });
});

const points = (...pairs: Array<[string, number]>) => ({
  ItemCount: pairs.length,
  Items: pairs.map(([Name, Value]) => ({ Name, Value, Id: '00000000-0000-0000-0000-000000000000' })),
});
const serve = (path: string, body: object) =>
  server.use(http.get(`${BASE}${path}`, ({ request }) => {
    hits.push(new URL(request.url).pathname);
    return HttpResponse.json(body);
  }));
const bullets = (text: string) => text.split('\n').filter((line) => line.startsWith('• '));

describe('asset-verification breakdowns (N7)', () => {
  it('renders count, share and total, sorted by count then name', async () => {
    // The 4 live verification-type points (probe 2026-11-24), served out of order.
    serve('/analytics/assets/by-verification-type', points(
      ['Scan', 1], ['iiQ Web - Manual', 8546], ['Mobile Manual', 1], ['iiQ App Update - Automatic', 55067],
    ));
    expect(await textOf('analytics_asset_verification_type')).toBe(
      'Asset Verification by Type (63,615 assets):\n\n' +
      '• iiQ App Update - Automatic: 55,067 assets (86.6%)\n' +
      '• iiQ Web - Manual: 8,546 assets (13.4%)\n' +
      '• Mobile Manual: 1 asset (0.0%)\n' +
      '• Scan: 1 asset (0.0%)'
    );
  });

  it('shows counts without a share when the total is 0 (no NaN)', async () => {
    serve('/analytics/assets/by-audit-policy-coverage', points(['Covered', 0], ['Not Covered', 0]));
    const text = await textOf('analytics_asset_audit_coverage');
    expect(text).toBe('Asset Audit Policy Coverage (0 assets):\n\n• Covered: 0 assets\n• Not Covered: 0 assets');
    expect(text).not.toMatch(/NaN|%/);
  });

  it('keeps the empty-state text when IIQ returns no points', async () => {
    serve('/analytics/assets/by-audit-status', { ItemCount: 0, Items: [] });
    expect(await textOf('analytics_asset_audit_status')).toBe('No audit status data available.');
  });
});

describe('analytics_asset_verification_location paging (N5)', () => {
  // 63 locations with counts 1..63 (total 2,016), served in a scrambled order.
  const locations = Array.from({ length: 63 }, (_, i) => [`School ${String(i + 1).padStart(2, '0')}`, i + 1] as [string, number])
    .sort((a, b) => ((a[1] * 37) % 63) - ((b[1] * 37) % 63));
  const run = (args: object = {}) => {
    serve('/analytics/assets/by-verification-location', points(...locations));
    return textOf('analytics_asset_verification_location', args);
  };
  const counts = (text: string) => bullets(text).map((line) => Number(line.match(/: ([\d,]+) asset/)![1].replace(/,/g, '')));

  it('advertises pageIndex and pageSize', () => {
    const tool = analyticsTools.find((t) => t.name === 'analytics_asset_verification_location');
    expect(Object.keys(tool?.inputSchema.properties ?? {}).sort()).toEqual(['pageIndex', 'pageSize']);
  });

  it('shows the first 25 of all 63, largest first, under the grand total', async () => {
    const text = await run();
    expect(text.startsWith('Found 63 locations (showing 25):\n\nTotal assets verified: 2,016\n\n')).toBe(true);
    expect(counts(text)).toEqual(Array.from({ length: 25 }, (_, i) => 63 - i));
    expect(bullets(text)[0]).toBe('• School 63: 63 assets (3.1%)');
    expect(text.endsWith('Page 1 of 3')).toBe(true);
  });

  it('shows the last 13 on page 3', async () => {
    const text = await run({ pageIndex: 2 });
    expect(counts(text)).toEqual(Array.from({ length: 13 }, (_, i) => 13 - i));
    expect(text).toContain('Total assets verified: 2,016');
    expect(text.endsWith('Page 3 of 3')).toBe(true);
  });

  it('says a page past the end is past the end', async () => {
    expect(await run({ pageIndex: 3 })).toBe('Page 4 is past the end: 63 locations match (3 pages).');
  });
});
