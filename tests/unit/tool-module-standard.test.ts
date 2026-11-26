/**
 * Pins the tool module standard (#116): every module's handler uses the client the router
 * passes it, and importing a module never builds a client (so it needs no API key).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { IncidentIQClient } from '../../src/api/client';
import { createToolRouter } from '../../src/router';

const ENV_HOST = new URL(process.env.IIQ_API_BASE_URL as string).host;
const INJECTED_HOST = 'injected.test';
const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

const PREFIXES = [
  'ticket_', 'user_', 'asset_', 'location_', 'team_', 'parts_', 'purchaseorder_', 'issues_',
  'customfield_', 'sla_', 'view_', 'notification_', 'analytics_',
];

// Static paths so the bundler resolves each module; a fresh import after vi.resetModules() re-runs its top level.
const MODULES: Record<string, () => Promise<unknown>> = {
  tickets: () => import('../../src/tools/tickets.js'),
  users: () => import('../../src/tools/users.js'),
  assets: () => import('../../src/tools/assets.js'),
  locations: () => import('../../src/tools/locations.js'),
  teams: () => import('../../src/tools/teams.js'),
  parts: () => import('../../src/tools/parts.js'),
  purchaseorders: () => import('../../src/tools/purchaseorders.js'),
  issues: () => import('../../src/tools/issues.js'),
  customfields: () => import('../../src/tools/customfields.js'),
  slas: () => import('../../src/tools/slas.js'),
  views: () => import('../../src/tools/views.js'),
  notifications: () => import('../../src/tools/notifications.js'),
  analytics: () => import('../../src/tools/analytics.js'),
};

const hosts: string[] = [];
const server = setupServer(
  http.all(`https://${INJECTED_HOST}/*`, ({ request }) => {
    hosts.push(new URL(request.url).host);
    return HttpResponse.json({ Item: null, Items: [], ItemCount: 0, Paging: { TotalRows: 0 } });
  }),
  http.all(`https://${ENV_HOST}/*`, ({ request }) => {
    hosts.push(new URL(request.url).host);
    return new HttpResponse(null, { status: 500 });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('tool module standard', () => {
  const router = createToolRouter(new IncidentIQClient(`https://${INJECTED_HOST}/api/v1.0`, 'k'));
  const tools = router.listTools().filter((tool) => tool.name !== 'test_connection');

  it('routes every advertised tool under one of the 13 module prefixes', () => {
    expect(tools.filter((tool) => !PREFIXES.some((p) => tool.name.startsWith(p))).map((t) => t.name)).toEqual([]);
  });

  it.each(PREFIXES)('%s tools call IIQ only through the injected client', async (prefix) => {
    hosts.length = 0;
    for (const tool of tools.filter((t) => t.name.startsWith(prefix))) {
      const required = (tool.inputSchema.required as string[] | undefined) ?? [];
      await router.callTool(tool.name, Object.fromEntries(required.map((key) => [key, GUID])));
    }
    expect(hosts.length).toBeGreaterThan(0);
    expect(hosts.filter((host) => host !== INJECTED_HOST)).toEqual([]);
  });

  it('imports every tool module and the router without an API key', async () => {
    const saved = process.env.IIQ_API_KEY;
    delete process.env.IIQ_API_KEY;
    try {
      vi.resetModules();
      // Building a client here would throw: the constructor requires a key.
      expect(() => new IncidentIQClient()).toThrow(/API key is required/);
      expect(Object.keys(MODULES)).toHaveLength(13);
      for (const [name, load] of Object.entries(MODULES)) {
        await expect(load(), name).resolves.toBeDefined();
      }
      await expect(import('../../src/router.js')).resolves.toHaveProperty('createToolRouter');
    } finally {
      process.env.IIQ_API_KEY = saved;
      vi.resetModules();
    }
  });
});
