/**
 * ENHANCED ASSETS TOOLS - Based on Swagger Analysis
 * 
 * Assets API provides comprehensive device management for K-12 districts
 * Critical for managing Chromebooks, iPads, and other 1:1 devices
 * 
 * 31 endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { pathSegment } from '../api/path.js';
import { ASSET_STATUSES, ASSET_TYPES, resolveIds } from '../api/lookups.js';
import {
  formatListPage, iiqListAll, iiqPagingParams, iiqServerTotal, iiqTotalRows, mapLimit, normalizePageIndex,
  normalizePageSize, withTruncationNote,
} from '../api/paging.js';
import {
  IIQAsset,
  IIQFilter,
  IIQLocation,
  PaginatedRequest,
  PaginatedResponse
} from '../types/common.js';

// Asset-specific types
export interface AssetStatusType {
  AssetStatusTypeId: string;
  SiteId?: string;
  Name: string;
  IsRetired: boolean;
  Scope?: string;
}

export interface AssetFundingType {
  AssetFundingTypeId: string;
  SiteId?: string;
  Name: string;
  Scope?: string;
}

/** Activity as returned by GET /assets/{id}/activities (live shape, verified 2026-11-07). */
export interface AssetActivity {
  ActivityId?: string;
  ActivityDate: string;
  /** Numeric activity code (e.g. 1, 3, 5); IIQ sends no name for it. */
  ActivityType: string | number;
  Details?: string;
  UserId?: string;
}

/** One asset as a list row, from the nested objects POST /assets returns. */
export function renderAssetRow(asset: IIQAsset): string {
  return `• ${asset.AssetTag} - ${asset.AssetTypeName || 'Unknown Type'}
  Model: ${asset.Model?.Name || 'N/A'} | Serial: ${asset.SerialNumber || 'N/A'}
  Status: ${asset.Status?.Name || 'Unknown'} | Location: ${asset.Location?.Name || 'N/A'}
  User: ${asset.Owner?.Name || 'Unassigned'}`;
}

/** Every field of one asset, from the nested objects IIQ sends (no flat ModelName/StatusName etc.). */
function renderAssetDetails(asset: IIQAsset): string {
  return `Type: ${asset.AssetTypeName || 'Unknown'}
Model: ${asset.Model?.Name || 'N/A'}
Manufacturer: ${asset.Model?.Manufacturer?.Name || 'N/A'}
Serial: ${asset.SerialNumber || 'N/A'}
Status: ${asset.Status?.Name || 'Unknown'}
Location: ${asset.Location?.Name || 'N/A'}
Room: ${asset.LocationRoom?.Name || 'N/A'}
Assigned To: ${asset.Owner?.Name || 'Unassigned'}
Purchase Date: ${asset.PurchasedDate || 'N/A'}
Warranty: ${asset.WarrantyExpirationDate || 'N/A'}
Funding: ${asset.FundingSource?.Name || 'N/A'}
Notes: ${asset.Notes || 'None'}`;
}

/** The asset an exact lookup returns: IIQ sends `{ Items: [asset] }` (verified 2026-11-07); `{ Item }` is tolerated. */
function singleAsset(response: { Items?: IIQAsset[]; Item?: IIQAsset } | null | undefined): IIQAsset | undefined {
  return response?.Items?.[0] ?? response?.Item;
}

/** Text result for an unpaged asset list endpoint: heading with the total, then one row per asset. */
function assetListText(response: PaginatedResponse<IIQAsset> | null | undefined, heading: (total: number) => string, emptyText: string) {
  const rows = response?.Items ?? [];
  if (rows.length === 0) return { content: [{ type: 'text', text: emptyText }] };
  const total = iiqTotalRows(response);
  return {
    content: [{ type: 'text', text: `${heading(total)}:\n\n${rows.map(renderAssetRow).join('\n\n')}` }],
  };
}

/** Most inventory count requests in flight at once (one request per type, status or location). */
const COUNT_CONCURRENCY = 4;

/** What each inventory `groupBy` counts: the list of groups and the POST /assets facet that filters on one. */
const COUNT_GROUPS: Record<string, { label: string; url: string; idKey: string; facet: string }> = {
  type: { label: 'Type', url: '/assets/types', idKey: 'AssetTypeId', facet: 'AssetType' },
  status: { label: 'Status', url: '/assets/status/types', idKey: 'AssetStatusTypeId', facet: 'assetstatus' },
  location: { label: 'Location', url: '/locations/all', idKey: 'LocationId', facet: 'location' },
};

/**
 * Text result for a GET asset list paged on the IIQ server by $p/$s (verified 2026-11-07: tag/serial
 * searches, and /assets/rooms, which otherwise sends 100 rows of a room that may hold thousands).
 */
async function pagedAssetList(
  client: IncidentIQClient,
  url: string,
  args: any,
  { noun = 'assets', emptyText, renderPage }: { noun?: string; emptyText: string; renderPage?: (page: IIQAsset[]) => string }
) {
  const pageIndex = args.pageIndex || 0;
  const pageSize = args.pageSize || 25;
  const readPage = (index: number) => client.request<PaginatedResponse<IIQAsset>>({
    method: 'GET',
    url,
    params: iiqPagingParams(index, pageSize),
  });
  const response = await readPage(pageIndex);
  return formatListPage({
    rows: response?.Items ?? [],
    total: await iiqServerTotal(response, pageIndex, readPage),
    pageIndex,
    pageSize,
    noun,
    emptyText,
    render: renderAssetRow,
    renderPage,
  });
}

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const enhancedAssetTools = [
  // Core Search & List
  {
    name: 'asset_search_advanced',
    description: 'Advanced asset search with pagination and filters (POST /assets)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Search in asset tags, serials, models, etc.',
        },
        viewId: {
          type: 'string',
          description: 'Use a saved view for filtering (Professional tier)',
        },
        assetType: {
          type: 'string',
          description: 'Filter by asset type name or ID, e.g. Devices, Networking, Furniture (GET /assets/types)',
        },
        status: {
          type: 'string',
          description: 'Filter by status name or ID, e.g. In Service, Broken, In Storage (GET /assets/status/types)',
        },
        locationId: {
          type: 'string',
          description: 'Filter by building/location ID',
        },
        roomId: {
          type: 'string',
          description: 'Filter by room ID (LocationRoomId), sent as the `room` facet',
        },
        assignedUserId: {
          type: 'string',
          description: 'Filter by the assigned user\'s ID (OwnerId, student or staff), sent as the `user` facet',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Show only deleted assets (sent as OnlyShowDeleted; default: false)',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25, max: 1000)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: [],
    },
  },
  
  // Tag-based Lookups
  {
    name: 'asset_find_by_tag',
    description: 'Find asset by exact tag match (GET /assets/assettag/{tag})',
    inputSchema: {
      type: 'object',
      properties: {
        assetTag: {
          type: 'string',
          description: 'Exact asset tag (e.g., CHR-12345)',
        },
      },
      required: ['assetTag'],
    },
  },
  {
    name: 'asset_search_by_tag',
    description: 'Search assets by partial asset tag, paged on the server (GET /assets/assettag/search/{tag})',
    inputSchema: {
      type: 'object',
      properties: {
        tagPattern: {
          type: 'string',
          description: 'Part of an asset tag to search for (e.g., CHR-12)',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: ['tagPattern'],
    },
  },
  
  // Serial Number Lookups
  {
    name: 'asset_find_by_serial',
    description: 'Find asset by exact serial number (GET /assets/serial/{serial})',
    inputSchema: {
      type: 'object',
      properties: {
        serialNumber: {
          type: 'string',
          description: 'Exact serial number',
        },
      },
      required: ['serialNumber'],
    },
  },
  {
    name: 'asset_search_by_serial',
    description: 'Search assets by partial serial number, paged on the server (GET /assets/serial/search/{serial})',
    inputSchema: {
      type: 'object',
      properties: {
        serialPattern: {
          type: 'string',
          description: 'Part of a serial number to search for',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: ['serialPattern'],
    },
  },
  
  // User Assets
  {
    name: 'asset_get_user_devices',
    description: 'Get the devices assigned to a student/staff member, paged on the server (GET /assets/for/{userId})',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID (student or staff GUID)',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: ['userId'],
    },
  },
  
  // Favorites Management
  {
    name: 'asset_get_favorites',
    description: 'Get the assets a user has favorited, paged on the server (GET /assets/favorites/{userId})',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID',
        },
        includeAll: {
          type: 'boolean',
          description: 'Also include assets in the user\'s assigned rooms (GET /assets/favorites/{userId}/true; default: false)',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: ['userId'],
    },
  },
  
  // Location-based Queries
  {
    name: 'asset_get_by_room',
    description: 'Get the assets in a specific classroom/room, paged on the server and grouped by type (GET /assets/rooms/{roomId})',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'string',
          description: 'Room/classroom ID',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'asset_get_by_storage',
    description: 'Get assets in a storage unit, paged on the server (GET /assets/storageunit/{locationId}/{unitNumber})',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location/building ID',
        },
        unitNumber: {
          type: 'string',
          description: 'Storage unit number',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: ['locationId', 'unitNumber'],
    },
  },
  
  // Status & Type Management
  {
    name: 'asset_get_status_types',
    description: 'Get all asset status types (Active, Repair, Lost, etc.)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'asset_get_funding_types',
    description: 'Get all funding types (grants, budget categories, etc.)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // Asset History
  {
    name: 'asset_get_history',
    description: 'Get asset change history/activities (GET /assets/{assetId}/activities)',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'string',
          description: 'Asset ID to get history for',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: ['assetId'],
    },
  },
  
  // Inventory & Counts
  {
    name: 'asset_get_inventory_counts',
    description: 'Get the total asset count (POST /assets/count), optionally broken down by type, status or location (one filtered POST /assets count per group)',
    inputSchema: {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          enum: ['type', 'status', 'location'],
          description: 'Break the count down by asset type (GET /assets/types), status (GET /assets/status/types) or location (GET /locations/all); omit for the total only',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Count only deleted assets (sent as OnlyShowDeleted; default: false)',
        },
      },
      required: [],
    },
  },
  
  // Spare Parts
  {
    name: 'asset_get_spares',
    description: 'Get spare parts/devices by asset tag (GET /assets/spares/assettag/{tag})',
    inputSchema: {
      type: 'object',
      properties: {
        assetTag: {
          type: 'string',
          description: 'Asset tag to find spares for',
        },
      },
      required: ['assetTag'],
    },
  },
];

export async function handleEnhancedAssetTool(name: string, args: any) {
  const client = getClient();
  
  try {
    switch (name) {
      case 'asset_search_advanced': {
        const payload: PaginatedRequest = {
          OnlyShowDeleted: args.includeDeleted || false,
          FilterByViewPermission: false,
          Filters: [],
          Paging: {
            PageIndex: normalizePageIndex(args.pageIndex),
            PageSize: normalizePageSize(args.pageSize || 25),
          },
        };
        
        // IIQ ignores a body SearchText on POST /assets; free text goes in the `keyword` facet.
        const searchText = typeof args.searchText === 'string' ? args.searchText.trim() : '';
        if (searchText) {
          payload.Filters!.push({ Facet: 'keyword', Value: searchText });
        }

        // Add view filter if provided (Professional tier feature)
        if (args.viewId) {
          payload.Filters!.push({
            Facet: 'View',
            Id: args.viewId,
          });
        }
        
        // IIQ filters asset type and status by id only (a name, or a `Status` facet, is ignored).
        if (args.assetType) {
          const [assetTypeId] = await resolveIds(client, ASSET_TYPES, [args.assetType]);
          payload.Filters!.push({ Facet: 'AssetType', Id: assetTypeId });
        }

        if (args.status) {
          const [statusId] = await resolveIds(client, ASSET_STATUSES, [args.status]);
          payload.Filters!.push({ Facet: 'assetstatus', Id: statusId });
        }
        
        if (args.locationId) {
          payload.Filters!.push({
            Facet: 'Location',
            Id: args.locationId,
          });
        }

        // IIQ applies these facets (verified 2026-11-07); it has no working funding facet.
        if (args.roomId) {
          payload.Filters!.push({ Facet: 'room', Id: args.roomId });
        }

        if (args.assignedUserId) {
          payload.Filters!.push({ Facet: 'user', Id: args.assignedUserId });
        }
        
        const readPage = (pageIndex: number) => client.request<PaginatedResponse<IIQAsset>>({
          method: 'POST',
          url: '/assets',
          data: { ...payload, Paging: { ...payload.Paging!, PageIndex: pageIndex } },
        });
        const response = await readPage(payload.Paging!.PageIndex);

        // IIQ returns exactly the requested page, so every row is rendered (#96).
        return formatListPage({
          rows: response?.Items ?? [],
          total: await iiqServerTotal(response, payload.Paging!.PageIndex, readPage),
          pageIndex: payload.Paging!.PageIndex,
          pageSize: payload.Paging!.PageSize,
          noun: 'assets',
          emptyText: 'No assets found matching your criteria.',
          render: renderAssetRow,
        });
      }
      
      case 'asset_find_by_tag': {
        const asset = singleAsset(await client.request<PaginatedResponse<IIQAsset> & { Item?: IIQAsset }>({
          method: 'GET',
          url: `/assets/assettag/${pathSegment(args.assetTag)}`,
        }));
        const text = asset
          ? `Asset Found: ${asset.AssetTag}\n${renderAssetDetails(asset)}`
          : `No asset found with tag: ${args.assetTag}`;
        return { content: [{ type: 'text', text }] };
      }

      case 'asset_search_by_tag':
        return await pagedAssetList(
          client,
          `/assets/assettag/search/${pathSegment(args.tagPattern)}`,
          args,
          { emptyText: `No assets found matching tag pattern: ${args.tagPattern}` }
        );

      case 'asset_find_by_serial': {
        const asset = singleAsset(await client.request<PaginatedResponse<IIQAsset> & { Item?: IIQAsset }>({
          method: 'GET',
          url: `/assets/serial/${pathSegment(args.serialNumber)}`,
        }));
        const text = asset
          ? `Asset Found by Serial: ${asset.SerialNumber}\nTag: ${asset.AssetTag}\n${renderAssetDetails(asset)}`
          : `No asset found with serial: ${args.serialNumber}`;
        return { content: [{ type: 'text', text }] };
      }

      case 'asset_search_by_serial':
        return await pagedAssetList(
          client,
          `/assets/serial/search/${pathSegment(args.serialPattern)}`,
          args,
          { emptyText: `No assets found matching serial pattern: ${args.serialPattern}` }
        );

      case 'asset_get_user_devices':
        // The /true ("All") variant returned the same rows for 12 of 12 owners and is undocumented.
        return await pagedAssetList(client, `/assets/for/${pathSegment(args.userId)}`, args, {
          noun: 'assigned devices',
          emptyText: 'No devices assigned to this user.',
        });

      case 'asset_get_favorites':
        return await pagedAssetList(
          client,
          args.includeAll ? `/assets/favorites/${pathSegment(args.userId)}/true` : `/assets/favorites/${pathSegment(args.userId)}`,
          args,
          { noun: 'favorite assets', emptyText: 'No favorite assets found for this user.' }
        );

      case 'asset_get_by_room':
        return await pagedAssetList(client, `/assets/rooms/${pathSegment(args.roomId)}`, args, {
          noun: 'assets in this room',
          emptyText: 'No assets found in this room.',
          renderPage: (page) => {
            // Group the page's rows by asset type.
            const assetsByType: Record<string, IIQAsset[]> = {};
            for (const asset of page) {
              const type = asset.AssetTypeName || 'Unknown';
              (assetsByType[type] ??= []).push(asset);
            }
            return Object.entries(assetsByType)
              .map(([type, assets]) => `${type} (${assets.length}):\n\n${assets.map(renderAssetRow).join('\n\n')}`)
              .join('\n\n');
          },
        });

      case 'asset_get_by_storage':
        return await pagedAssetList(
          client,
          `/assets/storageunit/${pathSegment(args.locationId)}/${pathSegment(args.unitNumber)}`,
          args,
          { noun: `assets in storage unit ${args.unitNumber}`, emptyText: `No assets found in storage unit ${args.unitNumber}.` }
        );

      case 'asset_get_status_types': {
        const response = await client.request<PaginatedResponse<AssetStatusType>>({
          method: 'GET',
          url: '/assets/status/types',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No status types available.',
            }],
          };
        }
        
        const statusList = response.Items.map((status: AssetStatusType) =>
          `• ${status.Name}${status.IsRetired ? ' (Retired)' : ''}`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Available Asset Status Types (${iiqTotalRows(response)}):

${statusList}`,
          }],
        };
      }
      
      case 'asset_get_funding_types': {
        const response = await client.request<PaginatedResponse<AssetFundingType>>({
          method: 'GET',
          url: '/assets/funding/types',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No funding types available.',
            }],
          };
        }
        
        const fundingList = response.Items.map((funding: AssetFundingType) =>
          `• ${funding.Name}`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Available Funding Types (${iiqTotalRows(response)}):

${fundingList}

💡 Use funding types to track grant compliance and budget sources`,
          }],
        };
      }
      
      case 'asset_get_history': {
        // IIQ returns every activity at once (no paging, no TotalRows), so page locally.
        const response = await client.request<PaginatedResponse<AssetActivity>>({
          method: 'GET',
          url: `/assets/${pathSegment(args.assetId)}/activities`,
        });
        return formatListPage({
          rows: response?.Items ?? [],
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'activities',
          emptyText: 'No history available for this asset.',
          render: (activity) => `• ${activity.ActivityDate} - ${activity.ActivityType}
  ${activity.Details || 'N/A'}
  By: ${activity.UserId || 'System'}`,
        });
      }
      
      case 'asset_get_inventory_counts': {
        const scope = { OnlyShowDeleted: args.includeDeleted || false, FilterByViewPermission: false };
        // POST /assets/count reports only the total (Paging.TotalRows), with no breakdown (verified 2026-11-07).
        const total = iiqTotalRows(await client.request<PaginatedResponse<unknown>>({
          method: 'POST',
          url: '/assets/count',
          data: scope,
        }));

        const group = args.groupBy ? COUNT_GROUPS[args.groupBy] : undefined;
        if (!group) {
          return { content: [{ type: 'text', text: `Asset Inventory Counts:\n\nTotal Assets: ${total}` }] };
        }

        // Each group is counted with a filtered 1-row POST /assets read for its Paging.TotalRows.
        const { items, truncated } = await iiqListAll<Record<string, string>>(client, group.url);
        const counts = await mapLimit(items, COUNT_CONCURRENCY, async (item) => {
          const filter: IIQFilter = { Facet: group.facet, Id: item[group.idKey] };
          return iiqTotalRows(await client.request<PaginatedResponse<IIQAsset>>({
            method: 'POST',
            url: '/assets',
            data: { ...scope, Filters: [filter], Paging: { PageIndex: 0, PageSize: 1 } },
          }));
        });

        const lines = items.flatMap((item, i) =>
          counts[i] > 0 ? [`  ${item.Name || (item as Partial<IIQLocation>).LocationName || item[group.idKey]}: ${counts[i]}`] : []
        );
        const other = total - counts.reduce((sum, count) => sum + count, 0);
        if (other > 0) lines.push(`  Other/none: ${other}`);
        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: `Asset Inventory Counts by ${group.label}:\n\n${lines.join('\n')}\n\nTotal Assets: ${total}`,
          }],
        });
      }

      case 'asset_get_spares': {
        let response: PaginatedResponse<IIQAsset> | undefined;
        try {
          response = await client.request<PaginatedResponse<IIQAsset>>({
            method: 'GET',
            url: `/assets/spares/assettag/${pathSegment(args.assetTag)}`,
          });
        } catch (error: any) {
          // IIQ answers 404 when the asset has no spares (verified 2026-11-07).
          if (error?.response?.status !== 404) throw error;
        }
        return assetListText(
          response,
          (total) => `Spare Parts for ${args.assetTag} (${total})`,
          `No spare parts found for asset: ${args.assetTag}`
        );
      }
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Error: Unknown enhanced asset tool "${name}".`,
          }],
        };
    }
  } catch (error: any) {
    // Handle 404s specially for lookup endpoints
    if (error.response?.status === 404) {
      if (name.includes('find_by') || name.includes('search_by')) {
        return {
          content: [{
            type: 'text',
            text: `No asset found with the specified identifier.`,
          }],
        };
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`,
      }],
    };
  }
}

// Export for backward compatibility
export const assetTools = enhancedAssetTools;
export const handleAssetTool = handleEnhancedAssetTool;
