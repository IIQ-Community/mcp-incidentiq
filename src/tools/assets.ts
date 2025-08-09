/**
 * ENHANCED ASSETS TOOLS - Based on Swagger Analysis
 * 
 * Assets API provides comprehensive device management for K-12 districts
 * Critical for managing Chromebooks, iPads, and other 1:1 devices
 * 
 * 31 endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { 
  IIQAsset,
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

export interface AssetActivity {
  ActivityId: string;
  AssetId: string;
  ActivityDate: string;
  ActivityType: string;
  Description: string;
  UserId?: string;
  UserName?: string;
  OldValue?: string;
  NewValue?: string;
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
          description: 'Filter by type (Chromebook, iPad, Desktop, etc.)',
        },
        status: {
          type: 'string',
          description: 'Filter by status (Active, Repair, Lost, etc.)',
        },
        locationId: {
          type: 'string',
          description: 'Filter by building/location ID',
        },
        roomId: {
          type: 'string',
          description: 'Filter by specific room ID',
        },
        assignedUserId: {
          type: 'string',
          description: 'Filter by assigned user (student/staff)',
        },
        fundingType: {
          type: 'string',
          description: 'Filter by funding source (grants, budget, etc.)',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Include deleted assets (default: false)',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 100, max: 1000)',
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
    description: 'Search assets by tag with wildcards (GET /assets/assettag/search/{tag})',
    inputSchema: {
      type: 'object',
      properties: {
        tagPattern: {
          type: 'string',
          description: 'Tag pattern (supports wildcards, e.g., CHR-*)',
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
    description: 'Search assets by serial with wildcards (GET /assets/serial/search/{serial})',
    inputSchema: {
      type: 'object',
      properties: {
        serialPattern: {
          type: 'string',
          description: 'Serial pattern (supports wildcards)',
        },
      },
      required: ['serialPattern'],
    },
  },
  
  // User Assets
  {
    name: 'asset_get_user_devices',
    description: 'Get all devices assigned to a student/staff member (GET /assets/for/{userId})',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID (student or staff GUID)',
        },
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive/retired devices',
        },
      },
      required: ['userId'],
    },
  },
  
  // Favorites Management
  {
    name: 'asset_get_favorites',
    description: 'Get user\'s favorite assets for quick access (GET /assets/favorites/{userId})',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID',
        },
        includeAll: {
          type: 'boolean',
          description: 'Include inactive favorites',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'asset_toggle_favorite',
    description: 'Add/remove asset from favorites (POST /assets/favorites/...)',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'string',
          description: 'Asset ID to favorite/unfavorite',
        },
        userId: {
          type: 'string',
          description: 'User ID',
        },
        action: {
          type: 'string',
          enum: ['add', 'remove'],
          description: 'Add to or remove from favorites',
        },
      },
      required: ['assetId', 'userId', 'action'],
    },
  },
  
  // Location-based Queries
  {
    name: 'asset_get_by_room',
    description: 'Get all assets in a specific classroom/room (GET /assets/rooms/{roomId})',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'string',
          description: 'Room/classroom ID',
        },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'asset_get_by_storage',
    description: 'Get assets in storage unit (GET /assets/storageunit/{locationId}/{unitNumber})',
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
      },
      required: ['assetId'],
    },
  },
  
  // Inventory & Counts
  {
    name: 'asset_get_inventory_counts',
    description: 'Get asset counts by various categories (POST /assets/count)',
    inputSchema: {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          enum: ['type', 'status', 'location', 'funding', 'manufacturer'],
          description: 'Category to group counts by',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Include deleted assets in counts',
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
          SearchText: args.searchText,
          Filters: [],
          Paging: {
            PageIndex: args.pageIndex || 0,
            PageSize: args.pageSize || 100, // Optimized default
          },
        };
        
        // Add view filter if provided (Professional tier feature)
        if (args.viewId) {
          payload.Filters!.push({
            Facet: 'View',
            Id: args.viewId,
          });
        }
        
        // Add other filters
        if (args.assetType) {
          payload.Filters!.push({
            Facet: 'AssetType',
            Id: args.assetType,
          });
        }
        
        if (args.status) {
          payload.Filters!.push({
            Facet: 'Status',
            Id: args.status,
          });
        }
        
        if (args.locationId) {
          payload.Filters!.push({
            Facet: 'Location',
            Id: args.locationId,
          });
        }
        
        const response = await client.request<PaginatedResponse<IIQAsset>>({
          method: 'POST',
          url: '/assets',
          data: payload,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No assets found matching your criteria.',
            }],
          };
        }
        
        const assetList = response.Items.slice(0, 10).map((asset: IIQAsset) =>
          `• ${asset.AssetTag} - ${asset.AssetTypeName || 'Unknown Type'}
  Model: ${asset.ModelName || 'N/A'} | Serial: ${asset.SerialNumber || 'N/A'}
  Status: ${asset.StatusName || 'Unknown'} | Location: ${asset.LocationName || 'N/A'}
  User: ${asset.AssignedUserName || 'Unassigned'}`
        ).join('\n\n');
        
        const summary = response.Items.length > 10 
          ? `\n\n...and ${response.Items.length - 10} more assets`
          : '';
        
        return {
          content: [{
            type: 'text',
            text: `Found ${response.ItemCount} assets (showing ${Math.min(10, response.Items.length)}):

${assetList}${summary}

Page ${(args.pageIndex || 0) + 1} of ${Math.ceil(response.ItemCount / (args.pageSize || 100))}`,
          }],
        };
      }
      
      case 'asset_find_by_tag': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/assets/assettag/${encodeURIComponent(args.assetTag)}`,
        });
        
        if (!response) {
          return {
            content: [{
              type: 'text',
              text: `No asset found with tag: ${args.assetTag}`,
            }],
          };
        }
        
        const asset = response.Item || response;
        
        return {
          content: [{
            type: 'text',
              text: `Asset Found: ${asset.AssetTag}
Type: ${asset.AssetTypeName || 'Unknown'}
Model: ${asset.ModelName || 'N/A'}
Manufacturer: ${asset.ManufacturerName || 'N/A'}
Serial: ${asset.SerialNumber || 'N/A'}
Status: ${asset.StatusName || 'Unknown'}
Location: ${asset.LocationName || 'N/A'}
Room: ${asset.RoomNumber || 'N/A'}
Assigned To: ${asset.AssignedUserName || 'Unassigned'}
Purchase Date: ${asset.PurchaseDate || 'N/A'}
Warranty: ${asset.WarrantyExpirationDate || 'N/A'}
Funding: ${asset.FundingTypeName || 'N/A'}
Notes: ${asset.Notes || 'None'}`,
            }],
          };
      }
      
      case 'asset_search_by_tag': {
        const response = await client.request<PaginatedResponse<IIQAsset>>({
          method: 'GET',
          url: `/assets/assettag/search/${encodeURIComponent(args.tagPattern)}`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No assets found matching tag pattern: ${args.tagPattern}`,
            }],
          };
        }
        
        const assetList = response.Items.map((asset: IIQAsset) =>
          `• ${asset.AssetTag} - ${asset.AssetTypeName} (${asset.StatusName})`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Found ${response.ItemCount} assets matching "${args.tagPattern}":
            
${assetList}`,
          }],
        };
      }
      
      case 'asset_find_by_serial': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/assets/serial/${encodeURIComponent(args.serialNumber)}`,
        });
        
        if (!response) {
          return {
            content: [{
              type: 'text',
              text: `No asset found with serial: ${args.serialNumber}`,
            }],
          };
        }
        
        const asset = response.Item || response;
        
        return {
          content: [{
            type: 'text',
            text: `Asset Found by Serial: ${asset.SerialNumber}
Tag: ${asset.AssetTag}
Type: ${asset.AssetTypeName}
Model: ${asset.ModelName}
Status: ${asset.StatusName}
Location: ${asset.LocationName}
User: ${asset.AssignedUserName || 'Unassigned'}`,
          }],
        };
      }
      
      case 'asset_get_user_devices': {
        const url = args.includeInactive 
          ? `/assets/for/${args.userId}/true`
          : `/assets/for/${args.userId}`;
          
        const response = await client.request<PaginatedResponse<IIQAsset>>({
          method: 'GET',
          url,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No devices assigned to this user.',
            }],
          };
        }
        
        const deviceList = response.Items.map((asset: IIQAsset) =>
          `• ${asset.AssetTag} - ${asset.AssetTypeName}
  Status: ${asset.StatusName} | Serial: ${asset.SerialNumber || 'N/A'}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `User has ${response.ItemCount} assigned device(s):

${deviceList}`,
          }],
        };
      }
      
      case 'asset_get_by_room': {
        const response = await client.request<PaginatedResponse<IIQAsset>>({
          method: 'GET',
          url: `/assets/rooms/${args.roomId}`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No assets found in this room.',
            }],
          };
        }
        
        // Group by asset type for better organization
        const assetsByType: Record<string, IIQAsset[]> = {};
        response.Items.forEach((asset: IIQAsset) => {
          const type = asset.AssetTypeName || 'Unknown';
          if (!assetsByType[type]) assetsByType[type] = [];
          assetsByType[type].push(asset);
        });
        
        let output = `Room Inventory (${response.ItemCount} assets):\n`;
        
        for (const [type, assets] of Object.entries(assetsByType)) {
          output += `\n${type} (${assets.length}):\n`;
          assets.forEach(asset => {
            output += `  • ${asset.AssetTag} - ${asset.StatusName}\n`;
          });
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
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
            text: `Available Asset Status Types (${response.ItemCount}):

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
            text: `Available Funding Types (${response.ItemCount}):

${fundingList}

💡 Use funding types to track grant compliance and budget sources`,
          }],
        };
      }
      
      case 'asset_get_history': {
        const response = await client.request<PaginatedResponse<AssetActivity>>({
          method: 'GET',
          url: `/assets/${args.assetId}/activities`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No history available for this asset.',
            }],
          };
        }
        
        const historyList = response.Items.slice(0, 10).map((activity: AssetActivity) =>
          `• ${activity.ActivityDate} - ${activity.ActivityType}
  ${activity.Description}
  By: ${activity.UserName || 'System'}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Asset History (showing recent ${Math.min(10, response.Items.length)} of ${response.ItemCount}):

${historyList}`,
          }],
        };
      }
      
      case 'asset_get_inventory_counts': {
        const payload = {
          OnlyShowDeleted: args.includeDeleted || false,
          FilterByViewPermission: false,
        };
        
        const response = await client.request<any>({
          method: 'POST',
          url: '/assets/count',
          data: payload,
        });
        
        // Response format varies, handle different structures
        let output = 'Asset Inventory Counts:\n\n';
        
        if (Array.isArray(response)) {
          response.forEach((item: any) => {
            output += `• ${item.Name || item.Category}: ${item.Count || item.Value}\n`;
          });
        } else if (response?.Items) {
          response.Items.forEach((item: any) => {
            output += `• ${item.Name}: ${item.Value}\n`;
          });
        } else if (typeof response === 'object') {
          Object.entries(response).forEach(([key, value]) => {
            output += `• ${key}: ${value}\n`;
          });
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'asset_get_spares': {
        const response = await client.request<PaginatedResponse<IIQAsset>>({
          method: 'GET',
          url: `/assets/spares/assettag/${encodeURIComponent(args.assetTag)}`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No spare parts found for asset: ${args.assetTag}`,
            }],
          };
        }
        
        const sparesList = response.Items.map((spare: IIQAsset) =>
          `• ${spare.AssetTag} - ${spare.AssetTypeName} (${spare.StatusName})`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Spare Parts for ${args.assetTag} (${response.ItemCount}):

${sparesList}`,
          }],
        };
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
