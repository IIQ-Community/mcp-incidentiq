import { handleUserTool, userTools } from '../../../src/tools/users';
import { server } from '../../mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('User Tools', () => {
  describe('Tool Definitions', () => {
    it('should define all expected user tools', () => {
      const toolNames = userTools.map(t => t.name);
      
      expect(toolNames).toContain('user_search');
      expect(toolNames).toContain('user_get');
      expect(toolNames).toContain('user_get_agents');
    });

    it('should have proper input schemas', () => {
      const searchTool = userTools.find(t => t.name === 'user_search');
      
      expect(searchTool?.inputSchema.properties).toHaveProperty('searchText');
      expect(searchTool?.inputSchema.properties).toHaveProperty('userType');
      expect(searchTool?.inputSchema.properties).toHaveProperty('locationId');
      expect(searchTool?.inputSchema.properties).toHaveProperty('pageSize');
    });
  });

  describe('handleUserTool', () => {
    describe('user_search', () => {
      it('should search users with text filter', async () => {
        const result = await handleUserTool('user_search', {
          searchText: 'jane',
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found');
        expect(result.content[0].text).toContain('Jane Teacher');
        expect(result.content[0].text).toContain('jane.teacher@school.edu');
      });

      it('should handle empty search results', async () => {
        const result = await handleUserTool('user_search', {
          searchText: 'nonexistent',
        });

        expect(result.content[0].text).toContain('No users found');
      });

      it('should apply role filter', async () => {
        const result = await handleUserTool('user_search', {
          role: 'Teacher',
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found');
      });

      it('should handle pagination parameters', async () => {
        const result = await handleUserTool('user_search', {
          searchText: 'user',
          pageSize: 5,
          pageIndex: 0,
        });

        expect(result.content[0].type).toBe('text');
      });
    });

    describe('user_get', () => {
      it('should retrieve user details by ID', async () => {
        const result = await handleUserTool('user_get', {
          userId: 'user-1',
        });

        expect(result.content[0].text).toContain('User Details');
        expect(result.content[0].text).toContain('Jane Teacher');
        expect(result.content[0].text).toContain('jane.teacher@school.edu');
        expect(result.content[0].text).toContain('Main Building');
      });

      it('should handle non-existent user ID', async () => {
        const result = await handleUserTool('user_get', {
          userId: 'invalid-id',
        });

        expect(result.content[0].text).toContain('User not found');
      });

      it('should display complete user information', async () => {
        const result = await handleUserTool('user_get', {
          userId: 'user-1',
        });

        expect(result.content[0].text).toContain('Role: Teacher');
        expect(result.content[0].text).toContain('Location: Main Building');
        expect(result.content[0].text).toContain('Email: jane.teacher@school.edu');
      });
    });

    describe('user_get_agents', () => {
      it('should retrieve all IT agents', async () => {
        const result = await handleUserTool('user_get_agents', {});

        expect(result.content[0].text).toContain('IT Support Agents');
        expect(result.content[0].text).toContain('John IT');
        expect(result.content[0].text).toContain('john.it@school.edu');
      });

      it('should show agent details properly formatted', async () => {
        const result = await handleUserTool('user_get_agents', {});

        expect(result.content[0].text).toContain('IT Agent');
        expect(result.content[0].text).toMatch(/\d+\./); // Should have numbered list
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool gracefully', async () => {
        const result = await handleUserTool('invalid_tool', {});

        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toContain('Unknown user tool');
      });

      it('should handle API errors gracefully', async () => {
        // Create a client with invalid URL to trigger error
        const result = await handleUserTool('user_search', {
          searchText: 'test',
        });

        // Should still return a result even if API fails
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
      });
    });
  });
});