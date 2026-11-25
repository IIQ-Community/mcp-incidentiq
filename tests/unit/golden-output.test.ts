/**
 * Golden output for every advertised tool (issue #116, Spec A).
 *
 * The tool-module refactor must not change what any tool prints or which requests it sends. Each case
 * calls one tool through the router with schema-valid args against a fixed IIQ-shaped body, and the
 * snapshot records its text plus every outbound `METHOD path?query`. The snapshot was recorded on
 * the code before the refactor; any change to it is a behaviour change, not a refresh.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createToolRouter } from '../../src/router';

const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

const ROW = {
  Name: 'Golden Row',
  TeamId: GUID, TeamName: 'Golden Team',
  UserId: GUID, FirstName: 'Gold', LastName: 'Row', Email: 'gold.row@example.org',
  AssetId: GUID, AssetTag: 'TAG-1', SerialNumber: 'SN-1',
  LocationId: GUID, LocationName: 'Golden School',
  TicketId: GUID, TicketNumber: 1001, Subject: 'Golden ticket',
  PartId: GUID, PartName: 'Golden Part', Quantity: 2,
  PurchaseOrderId: GUID, PurchaseOrderNumber: 'PO-1',
  CustomFieldId: GUID, CustomFieldTypeId: GUID, IssueTypeId: GUID, ReportId: GUID,
  Value: 3,
};

const BODY = {
  Item: ROW,
  Items: [ROW],
  ItemCount: 1,
  Paging: { TotalRows: 1, PageIndex: 0, PageSize: 1, PageCount: 1 },
};

// Values the schema does not constrain but the handler validates.
function stringFor(key: string): string {
  if (/email/i.test(key)) return 'gold.row@example.org';
  if (/date/i.test(key)) return '2026-01-01';
  if (/grade/i.test(key)) return '05';
  return GUID;
}

type Schema = { type?: string; enum?: unknown[]; items?: Schema };

function valueFor(key: string, schema: Schema): unknown {
  if (schema.enum?.length) return schema.enum[0];
  switch (schema.type) {
    case 'number':
    case 'integer':
      return 1;
    case 'boolean':
      return false;
    case 'array':
      return [valueFor(key, schema.items ?? { type: 'string' })];
    case 'object':
      return {};
    default:
      return stringFor(key);
  }
}

const router = createToolRouter();

function argsFor(toolName: string): Record<string, unknown> {
  const tool = router.listTools().find((t) => t.name === toolName)!;
  const properties = (tool.inputSchema.properties ?? {}) as Record<string, Schema>;
  const required = (tool.inputSchema.required as string[] | undefined) ?? [];
  return Object.fromEntries(required.map((key) => [key, valueFor(key, properties[key] ?? {})]));
}

// Second calls for optional or branch path segments, so every URL-building branch runs once.
const EXTRA_CASES: [string, Record<string, unknown>][] = [
  ['ticket_unassign', { ticketId: GUID, unassignFrom: 'sla' }],
  ['ticket_unassign', { ticketId: GUID, unassignFrom: 'team' }],
  ['purchaseorder_get_all', { status: 'pending' }],
];

const cases: [string, Record<string, unknown>][] = [
  ...router.listTools().map((tool): [string, Record<string, unknown>] => [tool.name, argsFor(tool.name)]),
  ...EXTRA_CASES,
];

const requests: string[] = [];
// The user tools resolve role names through /sites/roles, so it must list the names they look up.
const ROLES = ['Student', 'Staff / Faculty', 'Agent'].map((Name, i) => ({ Name, RoleId: `${GUID.slice(0, -1)}${i}` }));
const server = setupServer(
  http.get('https://test.incidentiq.com/api/v1.0/sites/roles', () =>
    HttpResponse.json({ Items: ROLES, ItemCount: ROLES.length, Paging: { TotalRows: ROLES.length, PageIndex: 0, PageSize: 100 } })
  ),
  http.all('https://test.incidentiq.com/api/v1.0/*', () => HttpResponse.json(BODY))
);
server.events.on('request:start', ({ request }) => {
  const url = new URL(request.url);
  const query = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  requests.push(`${request.method} ${url.pathname}${query.length ? `?${new URLSearchParams(query)}` : ''}`);
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('golden tool output', () => {
  it('covers every advertised tool', () => {
    expect(new Set(cases.map(([name]) => name)).size).toBe(router.listTools().length);
  });

  it.each(cases)('%s %j', async (name, args) => {
    requests.length = 0;
    let text: string;
    try {
      text = (await router.callTool(name, args)).content.map((c) => c.text).join('\n');
    } catch (error) {
      text = `THROWN: ${(error as Error).message}`;
    }
    expect({ text, requests: [...requests] }).toMatchSnapshot();
  });
});
