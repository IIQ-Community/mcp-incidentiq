import { describe, it, expect } from 'vitest';
import { analyticsTools } from '../../../src/tools/analytics';

/** #98 N1: analytics_dashboard_summary advertises only the argument its handler reads. */
describe('N1 analytics_dashboard_summary schema', () => {
  it('advertises includeAssets only (includeTickets, includeUsers, dateRange were never read)', () => {
    const tool = analyticsTools.find((t) => t.name === 'analytics_dashboard_summary');
    expect(Object.keys(tool?.inputSchema.properties ?? {})).toEqual(['includeAssets']);
  });
});
