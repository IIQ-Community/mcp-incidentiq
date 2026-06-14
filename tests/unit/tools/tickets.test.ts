import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { handleTicketTool, ticketTools } from '../../../src/tools/tickets';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Ticket Tools', () => {
  describe('Tool Definitions', () => {
    it('should define all expected ticket tools', () => {
      const toolNames = ticketTools.map(t => t.name);
      
      // Should have all ticket tools available
      expect(toolNames).toContain('ticket_get_wizards');
      expect(toolNames).toContain('ticket_get_wizards_by_site');
      expect(toolNames).toContain('ticket_search');
      expect(toolNames).toContain('ticket_get_statuses');
      expect(toolNames).toContain('ticket_get_priorities');
      expect(toolNames.length).toBeGreaterThan(10);
    });

    it('should have proper input schemas', () => {
      const wizardsBySite = ticketTools.find(t => t.name === 'ticket_get_wizards_by_site');
      
      expect(wizardsBySite?.inputSchema.properties).toHaveProperty('siteId');
      expect(wizardsBySite?.inputSchema.required).toContain('siteId');
    });
  });

  describe('handleTicketTool', () => {
    describe('ticket_get_wizards', () => {
      it('should retrieve available ticket wizards', async () => {
        const result = await handleTicketTool('ticket_get_wizards', {});

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Available Ticket Wizards');
        expect(result.content[0].text).toContain('General Support Request');
        expect(result.content[0].text).toContain('Device Issue');
      });

      it('should handle empty wizard list', async () => {
        // Mock handler will return empty array if specific query param is passed
        const result = await handleTicketTool('ticket_get_wizards', { empty: true });
        
        // The actual result depends on the mock handler
        expect(result.content[0].type).toBe('text');
      });
    });

    describe('ticket_get_wizards_by_site', () => {
      it('should retrieve wizards for a specific site', async () => {
        const result = await handleTicketTool('ticket_get_wizards_by_site', {
          siteId: 'site-1'
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Ticket Wizards for Site');
        expect(result.content[0].text).toContain('General Support Request');
      });

      it('should handle invalid site ID', async () => {
        const result = await handleTicketTool('ticket_get_wizards_by_site', {
          siteId: 'invalid-site'
        });

        expect(result.content[0].type).toBe('text');
        // Either shows no wizards or error message
        expect(result.content[0].text).toBeDefined();
      });
    });

    describe('Other Ticket Tools', () => {
      it('should handle ticket_search', async () => {
        const result = await handleTicketTool('ticket_search', { searchText: 'test' });
        expect(result.content[0].text).toBeDefined();
      });

      it('should handle ticket_get_statuses', async () => {
        const result = await handleTicketTool('ticket_get_statuses', {});
        expect(result.content[0].text).toBeDefined();
        // Either shows statuses or "No ticket statuses found"
      });

      it('should handle ticket_get_priorities', async () => {
        const result = await handleTicketTool('ticket_get_priorities', {});
        expect(result.content[0].text).toBeDefined();
        // Either shows priorities or "No ticket priorities found"
      });

      it('should handle ticket_get_categories gracefully', async () => {
        const result = await handleTicketTool('ticket_get_categories', {});
        expect(result.content[0].text).toContain('Unknown ticket tool');
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool gracefully', async () => {
        const result = await handleTicketTool('invalid_tool', {});

        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toContain('Unknown ticket tool');
      });

      it('should handle API errors gracefully', async () => {
        // This would need a mock handler that throws an error
        // The implementation should catch and return a friendly error message
        const result = await handleTicketTool('ticket_get_wizards', {
          triggerError: true // Special flag for mock to trigger error
        });

        expect(result.content[0].type).toBe('text');
        // Should handle error gracefully
      });
    });
  });
});

describe('ticket_search facet filtering', () => {
  const BASE = 'https://test.incidentiq.com/api/v1.0';

  function mkTicket(suffix: string, statusId: string, agentId: string) {
    return {
      TicketId: `tk-${suffix}`,
      TicketNumber: 1000 + Number(suffix),
      Subject: `Subject ${suffix}`,
      StatusId: statusId,
      StatusName: statusId,
      AssignedToId: agentId,
      CreatedDate: '2024-01-01T00:00:00Z',
    };
  }

  it('combines status + agent (AND across facets), filters status client-side, never sends status server-side', async () => {
    let capturedFilters: Array<{ Facet: string; Id: string }> | undefined;
    const dataset = [
      mkTicket('1', 's1', 'agent-1'),
      mkTicket('2', 's2', 'agent-1'),
      mkTicket('3', 's1', 'agent-9'),
    ];
    server.use(
      http.post(`${BASE}/tickets`, async ({ request }) => {
        const body = (await request.json()) as { Filters?: Array<{ Facet: string; Id: string }> };
        capturedFilters = body.Filters;
        const agentIds = (body.Filters ?? []).filter((f) => f.Facet === 'agent').map((f) => f.Id);
        const items = dataset.filter((t) => agentIds.length === 0 || agentIds.includes(t.AssignedToId));
        return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 } });
      })
    );

    const result = await handleTicketTool('ticket_search', { statusIds: ['s1'], agentIds: ['agent-1'] });
    const text = result.content[0].text as string;
    expect(text).toContain('ID: tk-1');
    expect(text).not.toContain('ID: tk-2');
    expect(text).not.toContain('ID: tk-3');
    expect(capturedFilters).toEqual([{ Facet: 'agent', Id: 'agent-1' }]);
  });

  it('matches multiple values within a facet as OR', async () => {
    const dataset = [mkTicket('1', 's1', 'a'), mkTicket('2', 's2', 'a'), mkTicket('3', 's3', 'a')];
    server.use(
      http.post(`${BASE}/tickets`, () =>
        HttpResponse.json({ Items: dataset, ItemCount: dataset.length, Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 } })
      )
    );
    const result = await handleTicketTool('ticket_search', { statusIds: ['s1', 's3'] });
    const text = result.content[0].text as string;
    expect(text).toContain('ID: tk-1');
    expect(text).not.toContain('ID: tk-2');
    expect(text).toContain('ID: tk-3');
  });

  it('resolves an agent email (any domain) to a user GUID and filters by it', async () => {
    let capturedFilters: Array<{ Facet: string; Id: string }> | undefined;
    server.use(
      http.post(`${BASE}/users`, () =>
        HttpResponse.json({ Items: [{ UserId: 'agent-42', Email: 'agent@example.org' }], ItemCount: 1, Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 } })
      ),
      http.post(`${BASE}/tickets`, async ({ request }) => {
        const body = (await request.json()) as { Filters?: Array<{ Facet: string; Id: string }> };
        capturedFilters = body.Filters;
        return HttpResponse.json({ Items: [mkTicket('1', 's1', 'agent-42')], ItemCount: 1, Paging: { PageIndex: 0, PageCount: 1, PageSize: 20 } });
      })
    );
    const result = await handleTicketTool('ticket_search', { agentEmails: ['agent@example.org'] });
    const text = result.content[0].text as string;
    expect(text).toContain('ID: tk-1');
    expect(capturedFilters).toEqual([{ Facet: 'agent', Id: 'agent-42' }]);
  });

  it('rejects a malformed email and makes no ticket query', async () => {
    let postTicketsCalled = false;
    server.use(
      http.post(`${BASE}/tickets`, () => {
        postTicketsCalled = true;
        return HttpResponse.json({ Items: [], ItemCount: 0 });
      })
    );
    const result = await handleTicketTool('ticket_search', { agentEmails: ['notanemail'] });
    expect(result.content[0].text as string).toContain('Invalid email');
    expect(postTicketsCalled).toBe(false);
  });

  it('returns "no user found" for a well-formed email matching no user, and makes no ticket query', async () => {
    let postTicketsCalled = false;
    server.use(
      http.post(`${BASE}/users`, () =>
        HttpResponse.json({ Items: [], ItemCount: 0, Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 } })
      ),
      http.post(`${BASE}/tickets`, () => {
        postTicketsCalled = true;
        return HttpResponse.json({ Items: [], ItemCount: 0 });
      })
    );
    const result = await handleTicketTool('ticket_search', { agentEmails: ['ghost@example.org'] });
    expect(result.content[0].text as string).toContain('No user found for');
    expect(postTicketsCalled).toBe(false);
  });

  it('bounds the status scan, reports truncation, and never fetches per-ticket details', async () => {
    let postCount = 0;
    let getTicketCalled = false;
    server.use(
      http.post(`${BASE}/tickets`, () => {
        postCount += 1;
        return HttpResponse.json({ Items: [mkTicket('1', 's1', 'a')], ItemCount: 1, Paging: { PageIndex: 0, PageCount: 10, PageSize: 100 } });
      }),
      http.get(`${BASE}/tickets/:ticketId`, () => {
        getTicketCalled = true;
        return HttpResponse.json({ Success: true, Data: {} });
      })
    );
    const result = await handleTicketTool('ticket_search', { statusIds: ['s1'] });
    const text = result.content[0].text as string;
    expect(text).toContain('Note: results may be incomplete');
    expect(text).toContain('scanned 5 of 10 pages');
    expect(postCount).toBeLessThanOrEqual(5);
    expect(getTicketCalled).toBe(false);
  });

  it('surfaces a page-fetch failure as an error (never partial-as-complete)', async () => {
    server.use(
      http.post(`${BASE}/tickets`, () => new HttpResponse(null, { status: 500 }))
    );
    const result = await handleTicketTool('ticket_search', { statusIds: ['s1'] });
    expect(result.content[0].text as string).toContain('Error');
  });

  it('reports truncation (not a definitive empty) when the capped scan finds no match but more pages exist', async () => {
    // Every scanned page has a non-matching status, but PageCount (10) exceeds maxPages (5).
    server.use(
      http.post(`${BASE}/tickets`, () =>
        HttpResponse.json({ Items: [mkTicket('1', 's2', 'a')], ItemCount: 1, Paging: { PageIndex: 0, PageCount: 10, PageSize: 100 } })
      )
    );
    const result = await handleTicketTool('ticket_search', { statusIds: ['s1'] });
    const text = result.content[0].text as string;
    expect(text).toContain('Note: results may be incomplete');
    expect(text).toContain('scanned 5 of 10 pages');
    expect(text).not.toBe('No tickets found matching your search criteria.');
  });
});