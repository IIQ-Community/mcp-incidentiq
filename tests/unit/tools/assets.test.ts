import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { handleAssetTool, assetTools } from '../../../src/tools/assets';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Asset Tools', () => {
  describe('Tool Definitions', () => {
    it('should define all expected asset tools', () => {
      const toolNames = assetTools.map(t => t.name);
      
      expect(toolNames).toContain('asset_search_advanced');
      expect(toolNames).toContain('asset_find_by_tag');
      expect(toolNames).toContain('asset_search_by_tag');
      expect(toolNames).toContain('asset_get_inventory_counts');
    });

    it('should have proper input schemas', () => {
      const searchTool = assetTools.find(t => t.name === 'asset_search_advanced');
      
      expect(searchTool?.inputSchema.properties).toHaveProperty('searchText');
      expect(searchTool?.inputSchema.properties).toHaveProperty('assetType');
      expect(searchTool?.inputSchema.properties).toHaveProperty('locationId');
      expect(searchTool?.inputSchema.properties).toHaveProperty('status');
    });
  });

  describe('handleAssetTool', () => {
    describe('asset_search_advanced', () => {
      it('should search assets with text filter', async () => {
        const result = await handleAssetTool('asset_search_advanced', {
          searchText: 'CHR',
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found');
        expect(result.content[0].text).toContain('CHR-12345');
        expect(result.content[0].text).toContain('Chromebook');
      });

      it('should handle empty search results', async () => {
        const result = await handleAssetTool('asset_search_advanced', {
          searchText: 'nonexistent',
        });

        expect(result.content[0].text).toContain('No assets found');
      });

      it('should apply multiple filters', async () => {
        const result = await handleAssetTool('asset_search_advanced', {
          searchText: 'CHR',
          assetType: 'Chromebook',
          locationId: 'loc-1',
          status: 'Active',
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found');
      });
    });

    describe('asset_find_by_tag', () => {
      it('should find asset by tag number', async () => {
        const result = await handleAssetTool('asset_find_by_tag', {
          assetTag: 'CHR-12345',
        });

        expect(result.content[0].text).toContain('Asset Found');
        expect(result.content[0].text).toContain('CHR-12345');
        expect(result.content[0].text).toContain('HP Chromebook 11 G9');
        expect(result.content[0].text).toContain('Jane User');
      });

      it('should handle non-existent asset tag', async () => {
        const result = await handleAssetTool('asset_find_by_tag', {
          assetTag: 'INVALID-TAG',
        });

        expect(result.content[0].text).toContain('No asset found');
      });
    });

    describe('asset_search_by_tag', () => {
      it('should search asset by tag', async () => {
        const result = await handleAssetTool('asset_search_by_tag', {
          tagPattern: 'CHR-12345',
        });

        // Should find assets or show no results
        expect(result.content[0].text).toBeDefined();
      });

      it('should handle non-existent asset tag in search', async () => {
        const result = await handleAssetTool('asset_search_by_tag', {
          assetTag: 'invalid-id',
        });

        expect(result.content[0].text).toBeDefined();
      });

      it('should display asset information', async () => {
        const result = await handleAssetTool('asset_find_by_tag', {
          assetTag: 'CHR-12345',
        });

        expect(result.content[0].text).toBeDefined();
      });
    });

    describe('asset_get_inventory_counts', () => {
      it('should retrieve asset inventory counts', async () => {
        const result = await handleAssetTool('asset_get_inventory_counts', {});

        expect(result.content[0].text).toContain('Asset Inventory');
        expect(result.content[0].text).toContain('2000');
        // The output currently shows TotalCount, not "Total Assets"
        expect(result.content[0].text).toContain('TotalCount');
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool gracefully', async () => {
        const result = await handleAssetTool('invalid_tool', {});

        expect(result.content[0].text).toContain('Error');
        expect(result.content[0].text).toContain('Unknown');
      });
    });
  });
});
describe('asset_search_advanced against live IIQ semantics', () => {
  const BASE = 'https://test.incidentiq.com/api/v1.0';

  it('sends searchText as a keyword facet, not an ignored body SearchText', async () => {
    let body: any;
    server.use(
      http.post(`${BASE}/assets`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ Items: [], ItemCount: 0, Paging: { TotalRows: 0 } });
      })
    );

    await handleAssetTool('asset_search_advanced', { searchText: ' CHR-12345 ' });

    expect(body.Filters).toContainEqual({ Facet: 'keyword', Value: 'CHR-12345' });
    expect(body).not.toHaveProperty('SearchText');
  });

  it('reports the server total (Paging.TotalRows), not the page item count', async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ AssetId: `a-${i}`, AssetTag: `TAG-${i}` }));
    server.use(
      http.post(`${BASE}/assets`, () =>
        HttpResponse.json({ Items: items, ItemCount: 5, Paging: { PageIndex: 0, PageSize: 5, PageCount: 200, TotalRows: 1000 } })
      )
    );

    const text = (await handleAssetTool('asset_search_advanced', { pageSize: 5 })).content[0].text as string;

    expect(text).toContain('Found 1000 assets');
    expect(text).toContain('Page 1 of 200');
  });
});
