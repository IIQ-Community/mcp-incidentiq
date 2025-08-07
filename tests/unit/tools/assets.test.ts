import { handleAssetTool, assetTools } from '../../../src/tools/assets';
import { server } from '../../mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Asset Tools', () => {
  describe('Tool Definitions', () => {
    it('should define all expected asset tools', () => {
      const toolNames = assetTools.map(t => t.name);
      
      expect(toolNames).toContain('asset_search');
      expect(toolNames).toContain('asset_get_by_tag');
      expect(toolNames).toContain('asset_get');
      expect(toolNames).toContain('asset_get_counts');
    });

    it('should have proper input schemas', () => {
      const searchTool = assetTools.find(t => t.name === 'asset_search');
      
      expect(searchTool?.inputSchema.properties).toHaveProperty('searchText');
      expect(searchTool?.inputSchema.properties).toHaveProperty('assetType');
      expect(searchTool?.inputSchema.properties).toHaveProperty('locationId');
      expect(searchTool?.inputSchema.properties).toHaveProperty('status');
    });
  });

  describe('handleAssetTool', () => {
    describe('asset_search', () => {
      it('should search assets with text filter', async () => {
        const result = await handleAssetTool('asset_search', {
          searchText: 'CHR',
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found');
        expect(result.content[0].text).toContain('CHR-12345');
        expect(result.content[0].text).toContain('Chromebook');
      });

      it('should handle empty search results', async () => {
        const result = await handleAssetTool('asset_search', {
          searchText: 'nonexistent',
        });

        expect(result.content[0].text).toContain('No assets found');
      });

      it('should apply multiple filters', async () => {
        const result = await handleAssetTool('asset_search', {
          searchText: 'CHR',
          assetType: 'Chromebook',
          locationId: 'loc-1',
          status: 'Active',
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found');
      });
    });

    describe('asset_get_by_tag', () => {
      it('should find asset by tag number', async () => {
        const result = await handleAssetTool('asset_get_by_tag', {
          assetTag: 'CHR-12345',
        });

        expect(result.content[0].text).toContain('Asset Details');
        expect(result.content[0].text).toContain('CHR-12345');
        expect(result.content[0].text).toContain('HP Chromebook 11 G9');
        expect(result.content[0].text).toContain('John Smith');
      });

      it('should handle non-existent asset tag', async () => {
        const result = await handleAssetTool('asset_get_by_tag', {
          assetTag: 'INVALID-TAG',
        });

        expect(result.content[0].text).toContain('No asset found with tag: INVALID-TAG');
      });
    });

    describe('asset_get', () => {
      it('should retrieve asset details by ID', async () => {
        const result = await handleAssetTool('asset_get', {
          assetId: 'asset-1',
        });

        expect(result.content[0].text).toContain('Asset Details');
        expect(result.content[0].text).toContain('CHR-12345');
        expect(result.content[0].text).toContain('Serial Number: SN123456789');
        expect(result.content[0].text).toContain('Status: Active');
      });

      it('should handle non-existent asset ID', async () => {
        const result = await handleAssetTool('asset_get', {
          assetId: 'invalid-id',
        });

        expect(result.content[0].text).toContain('Asset not found');
      });

      it('should display warranty information when available', async () => {
        const result = await handleAssetTool('asset_get', {
          assetId: 'asset-1',
        });

        expect(result.content[0].text).toContain('Purchase Date');
        expect(result.content[0].text).toContain('Warranty Expires');
      });
    });

    describe('asset_get_counts', () => {
      it('should retrieve asset inventory counts', async () => {
        const result = await handleAssetTool('asset_get_counts', {});

        expect(result.content[0].text).toContain('District Asset Inventory Summary');
        expect(result.content[0].text).toContain('Chromebook: 1500');
        expect(result.content[0].text).toContain('iPad: 300');
        expect(result.content[0].text).toContain('Desktop: 200');
        expect(result.content[0].text).toContain('Total Assets');
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool gracefully', async () => {
        const result = await handleAssetTool('invalid_tool', {});

        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toContain('Unknown asset tool');
      });
    });
  });
});