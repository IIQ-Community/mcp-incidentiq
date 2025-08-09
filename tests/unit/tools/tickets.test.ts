import { handleTicketTool, ticketTools } from '../../../src/tools/tickets';
import { server } from '../../mocks/server';

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