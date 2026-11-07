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
