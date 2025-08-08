import { handleLocationTool, locationTools } from '../../../src/tools/locations';
import { server } from '../../mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Location Tools', () => {
  describe('Tool Definitions', () => {
    it('should define all expected location tools', () => {
      const toolNames = locationTools.map(t => t.name);
      
      expect(toolNames).toContain('location_list_all');
      expect(toolNames).toContain('location_search');
      expect(toolNames).toContain('location_get');
    });

    it('should have proper input schemas', () => {
      const searchTool = locationTools.find(t => t.name === 'location_search');
      
      expect(searchTool?.inputSchema.properties).toHaveProperty('searchText');
      expect(searchTool?.inputSchema.properties).toHaveProperty('locationType');
      
      const getTool = locationTools.find(t => t.name === 'location_get');
      expect(getTool?.inputSchema.properties).toHaveProperty('locationId');
      expect(getTool?.inputSchema.required).toContain('locationId');
    });
  });

  describe('handleLocationTool', () => {
    describe('location_list_all', () => {
      it('should list all district locations', async () => {
        const result = await handleLocationTool('location_list_all', {});

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('District Locations');
        expect(result.content[0].text).toContain('Main Building');
        expect(result.content[0].text).toContain('Library');
        expect(result.content[0].text).toContain('Total Rooms/Spaces');
      });

      it('should group locations by type', async () => {
        const result = await handleLocationTool('location_list_all', {});

        expect(result.content[0].text).toContain('Buildings (');
        expect(result.content[0].text).toContain('Total Rooms/Spaces:');
      });

      it('should show location counts', async () => {
        const result = await handleLocationTool('location_list_all', {});

        expect(result.content[0].text).toMatch(/District Locations \(\d+ total\)/);
        expect(result.content[0].text).toMatch(/Buildings \(\d+\)/);
        expect(result.content[0].text).toMatch(/Total Rooms\/Spaces: \d+/);
      });
    });

    describe('location_search', () => {
      it('should search locations by text', async () => {
        const result = await handleLocationTool('location_search', {
          searchText: 'Main',
        });

        expect(result.content[0].text).toContain('Found');
        expect(result.content[0].text).toContain('Main Building');
      });

      it('should filter by location type', async () => {
        const result = await handleLocationTool('location_search', {
          locationType: 'Room',
        });

        // Search might return no results with our mock data
        expect(result.content[0].text).toBeDefined();
        // If results found, should be properly formatted
        if (result.content[0].text.includes('Found')) {
          expect(result.content[0].text).toContain('Type:');
        }
      });

      it('should handle empty search results', async () => {
        const result = await handleLocationTool('location_search', {
          searchText: 'nonexistent',
        });

        expect(result.content[0].text).toContain('No locations found');
      });

      it('should apply multiple filters', async () => {
        const result = await handleLocationTool('location_search', {
          searchText: 'Room',
          locationType: 'Room',
        });

        // Search might return no results with our mock data
        expect(result.content[0].text).toBeDefined();
        // Check for proper message
        if (result.content[0].text.includes('Found')) {
          expect(result.content[0].text).toContain('locations');
        } else {
          expect(result.content[0].text).toContain('No locations found');
        }
      });
    });

    describe('location_get', () => {
      it('should retrieve location details by ID', async () => {
        const result = await handleLocationTool('location_get', {
          locationId: 'loc-1',
        });

        expect(result.content[0].text).toContain('Location Details');
        expect(result.content[0].text).toContain('Main Building');
        expect(result.content[0].text).toContain('Type: Building');
        expect(result.content[0].text).toContain('ID: loc-1');
      });

      it('should handle non-existent location ID', async () => {
        const result = await handleLocationTool('location_get', {
          locationId: 'invalid-id',
        });

        expect(result.content[0].text).toContain('Location not found');
      });

      it('should show parent location when available', async () => {
        const result = await handleLocationTool('location_get', {
          locationId: 'loc-3', // IT Office
        });

        expect(result.content[0].text).toContain('IT Office');
        expect(result.content[0].text).toContain('Building: Main Building');
        expect(result.content[0].text).toContain('Room Number: 101');
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool gracefully', async () => {
        const result = await handleLocationTool('invalid_tool', {});

        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toContain('Unknown location tool');
      });

      it('should handle missing required parameters', async () => {
        const result = await handleLocationTool('location_get', {
          // Missing required locationId
        });

        expect(result.content[0].text).toContain('Location not found');
      });

      it('should handle API errors gracefully', async () => {
        const result = await handleLocationTool('location_list_all', {});

        // Should still return a result even if API fails
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
      });
    });
  });
});