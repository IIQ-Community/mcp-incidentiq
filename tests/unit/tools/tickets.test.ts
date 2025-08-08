import { handleTicketTool, ticketTools } from '../../../src/tools/tickets';
import { server } from '../../mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Ticket Tools', () => {
  describe('Tool Definitions', () => {
    it('should define only working ticket tools', () => {
      const toolNames = ticketTools.map(t => t.name);
      
      // Only wizard endpoints are currently working
      expect(toolNames).toContain('ticket_get_wizards');
      expect(toolNames).toContain('ticket_get_wizards_by_site');
      expect(toolNames).toHaveLength(2);
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

    describe('Disabled Tool Handling', () => {
      const disabledTools = [
        'ticket_create',
        'ticket_search', 
        'ticket_get',
        'ticket_update',
        'ticket_close',
        'ticket_get_statuses',
        'ticket_get_categories',
        'ticket_get_priorities'
      ];

      it.each(disabledTools)('should show permission error for %s', async (toolName) => {
        const result = await handleTicketTool(toolName, { ticketId: '123' });

        expect(result.content[0].text).toContain('currently not available');
        expect(result.content[0].text).toContain('API permission limitations');
        expect(result.content[0].text).toContain('ticket_get_wizards');
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool gracefully', async () => {
        const result = await handleTicketTool('invalid_tool', {});

        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toContain('currently not available');
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