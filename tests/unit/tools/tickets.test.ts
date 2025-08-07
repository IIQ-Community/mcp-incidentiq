import { handleTicketTool, ticketTools } from '../../../src/tools/tickets';
import { server } from '../../mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Ticket Tools', () => {
  describe('Tool Definitions', () => {
    it('should define all expected ticket tools', () => {
      const toolNames = ticketTools.map(t => t.name);
      
      expect(toolNames).toContain('ticket_create');
      expect(toolNames).toContain('ticket_search');
      expect(toolNames).toContain('ticket_get');
      expect(toolNames).toContain('ticket_update');
      expect(toolNames).toContain('ticket_close');
      expect(toolNames).toContain('ticket_get_statuses');
      expect(toolNames).toContain('ticket_get_categories');
      expect(toolNames).toContain('ticket_get_priorities');
    });

    it('should have proper input schemas', () => {
      const createTool = ticketTools.find(t => t.name === 'ticket_create');
      
      expect(createTool?.inputSchema.properties).toHaveProperty('subject');
      expect(createTool?.inputSchema.properties).toHaveProperty('description');
      expect(createTool?.inputSchema.required).toContain('subject');
      expect(createTool?.inputSchema.required).toContain('description');
    });
  });

  describe('handleTicketTool', () => {
    describe('ticket_create', () => {
      it('should create a new ticket', async () => {
        const result = await handleTicketTool('ticket_create', {
          subject: 'Test Ticket',
          description: 'Test Description',
          locationId: 'loc-1',
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Ticket created successfully');
        expect(result.content[0].text).toContain('Test Ticket');
      });

      it('should handle missing required fields gracefully', async () => {
        const result = await handleTicketTool('ticket_create', {
          subject: 'Test',
          // Missing description
        });

        // Should still attempt to create with undefined description
        expect(result.content[0].type).toBe('text');
      });
    });

    describe('ticket_search', () => {
      it('should search tickets with text filter', async () => {
        const result = await handleTicketTool('ticket_search', {
          searchText: 'chromebook',
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found');
        expect(result.content[0].text).toContain('Chromebook');
      });

      it('should handle empty search results', async () => {
        const result = await handleTicketTool('ticket_search', {
          searchText: 'nonexistent',
        });

        expect(result.content[0].text).toContain('No tickets found');
      });

      it('should apply pagination parameters', async () => {
        const result = await handleTicketTool('ticket_search', {
          pageSize: 5,
          pageIndex: 1,
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found');
      });
    });

    describe('ticket_get', () => {
      it('should retrieve ticket details', async () => {
        const result = await handleTicketTool('ticket_get', {
          ticketId: 'ticket-1',
        });

        expect(result.content[0].text).toContain('Ticket Details');
        expect(result.content[0].text).toContain('10001');
        expect(result.content[0].text).toContain('Chromebook won\'t turn on');
        expect(result.content[0].text).toContain('Jane Teacher');
      });

      it('should handle non-existent ticket', async () => {
        const result = await handleTicketTool('ticket_get', {
          ticketId: 'invalid-id',
        });

        expect(result.content[0].text).toContain('Ticket not found');
      });
    });

    describe('ticket_update', () => {
      it('should update ticket fields', async () => {
        const result = await handleTicketTool('ticket_update', {
          ticketId: 'ticket-1',
          subject: 'Updated Subject',
          priorityId: '3',
        });

        expect(result.content[0].text).toContain('Ticket updated successfully');
      });

      it('should handle partial updates', async () => {
        const result = await handleTicketTool('ticket_update', {
          ticketId: 'ticket-1',
          statusId: '2',
        });

        expect(result.content[0].text).toContain('Ticket updated successfully');
      });
    });

    describe('ticket_close', () => {
      it('should close a ticket with resolution', async () => {
        const result = await handleTicketTool('ticket_close', {
          ticketId: 'ticket-1',
          resolution: 'Issue resolved',
        });

        expect(result.content[0].text).toContain('Ticket closed successfully');
      });

      it('should close a ticket without resolution', async () => {
        const result = await handleTicketTool('ticket_close', {
          ticketId: 'ticket-1',
        });

        expect(result.content[0].text).toContain('Ticket closed successfully');
      });
    });

    describe('ticket_get_statuses', () => {
      it('should retrieve available statuses', async () => {
        const result = await handleTicketTool('ticket_get_statuses', {});

        expect(result.content[0].text).toContain('Available Ticket Statuses');
        expect(result.content[0].text).toContain('Open');
        expect(result.content[0].text).toContain('(Default)');
        expect(result.content[0].text).toContain('Closed');
      });
    });

    describe('ticket_get_categories', () => {
      it('should retrieve available categories', async () => {
        const result = await handleTicketTool('ticket_get_categories', {});

        expect(result.content[0].text).toContain('Available Ticket Categories');
        expect(result.content[0].text).toContain('Hardware');
        expect(result.content[0].text).toContain('Software');
        expect(result.content[0].text).toContain('Network');
      });
    });

    describe('ticket_get_priorities', () => {
      it('should retrieve available priorities', async () => {
        const result = await handleTicketTool('ticket_get_priorities', {});

        expect(result.content[0].text).toContain('Available Ticket Priorities');
        expect(result.content[0].text).toContain('Low');
        expect(result.content[0].text).toContain('Medium');
        expect(result.content[0].text).toContain('High');
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool gracefully', async () => {
        const result = await handleTicketTool('invalid_tool', {});

        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toContain('Unknown ticket tool');
      });

      it('should handle API errors gracefully', async () => {
        // Temporarily override the handler to return an error
        server.use(
          require('msw').http.get('https://test.incidentiq.com/api/v1.0/tickets/error-ticket', () => {
            throw new Error('API Error');
          })
        );

        const result = await handleTicketTool('ticket_get', {
          ticketId: 'error-ticket',
        });

        expect(result.content[0].text).toContain('Error');
      });
    });
  });
});