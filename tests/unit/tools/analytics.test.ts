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
