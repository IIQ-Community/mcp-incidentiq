import { IncidentIQClient } from '../api/client.js';
import { IIQAsset } from '../types/common.js';

// Initialize client lazily to ensure environment variables are loaded
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const assetTools = [
  {
    name: 'asset_search',
    description: 'Search for IT assets (Chromebooks, iPads, computers, etc.) in the district inventory',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Text to search for (asset tag, serial number, model)',
        },
        assetType: {
          type: 'string',
          description: 'Filter by asset type (e.g., Chromebook, iPad, Desktop)',
        },
        locationId: {
          type: 'string',
          description: 'Filter by location/building ID',
        },
        assignedUserId: {
          type: 'string',
          description: 'Filter by assigned user (student/staff) ID',
        },
        status: {
          type: 'string',
          description: 'Filter by status (Active, Repair, Lost, etc.)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20, max: 100)',
          default: 20,
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
          default: 0,
        },
      },
      required: [],
    },
  },
  {
    name: 'asset_get_by_tag',
    description: 'Look up a specific asset by its asset tag number',
    inputSchema: {
      type: 'object',
      properties: {
        assetTag: {
          type: 'string',
          description: 'The asset tag number (e.g., "CHR-12345")',
        },
      },
      required: ['assetTag'],
    },
  },
  {
    name: 'asset_get',
    description: 'Get detailed information about a specific asset',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'string',
          description: 'The asset ID (GUID)',
        },
      },
      required: ['assetId'],
    },
  },
  {
    name: 'asset_get_counts',
    description: 'Get asset counts by category for district inventory overview',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

export async function handleAssetTool(name: string, args: any) {
  const client = getClient();
  try {
    switch (name) {
      case 'asset_search': {
        const params: any = {
          SearchText: args.searchText,
          PageIndex: args.pageIndex || 0,
          PageSize: Math.min(args.pageSize || 20, 100),
          Filters: [],
        };

        if (args.assetType) {
          params.Filters.push({
            Facet: 'assetType',
            Id: args.assetType,
          });
        }

        if (args.locationId) {
          params.Filters.push({
            Facet: 'location',
            Id: args.locationId,
          });
        }

        if (args.assignedUserId) {
          params.Filters.push({
            Facet: 'assignedUser',
            Id: args.assignedUserId,
          });
        }

        if (args.status) {
          params.Filters.push({
            Facet: 'status',
            Id: args.status,
          });
        }

        const result = await client.searchAssets(params);
        
        if (result.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No assets found matching your search criteria.',
              },
            ],
          };
        }

        const assetList = result.Items.map((a: IIQAsset) => 
          `- ${a.AssetTag}: ${a.AssetTypeName} - ${a.ModelName}\n  Status: ${a.StatusName} | Location: ${a.LocationName} | User: ${a.AssignedUserName || 'Unassigned'}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.TotalCount} assets (showing ${result.Items.length}):\n${assetList}`,
            },
          ],
        };
      }

      case 'asset_get_by_tag': {
        const asset = await client.searchAssetByTag(args.assetTag);
        if (!asset) {
          return {
            content: [
              {
                type: 'text',
                text: `No asset found with tag: ${args.assetTag}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Asset Details:
- Asset Tag: ${asset.AssetTag}
- Type: ${asset.AssetTypeName}
- Model: ${asset.ModelName}
- Manufacturer: ${asset.ManufacturerName}
- Serial Number: ${asset.SerialNumber}
- Status: ${asset.StatusName}
- Location: ${asset.LocationName}
- Assigned To: ${asset.AssignedUserName || 'Unassigned'}
- Purchase Date: ${asset.PurchaseDate || 'N/A'}
- Warranty Expires: ${asset.WarrantyExpirationDate || 'N/A'}
${asset.Notes ? `- Notes: ${asset.Notes}` : ''}`,
            },
          ],
        };
      }

      case 'asset_get': {
        const asset = await client.getAsset(args.assetId);
        if (!asset) {
          return {
            content: [
              {
                type: 'text',
                text: 'Asset not found.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Asset Details:
- Asset Tag: ${asset.AssetTag}
- Type: ${asset.AssetTypeName}
- Model: ${asset.ModelName}
- Manufacturer: ${asset.ManufacturerName}
- Serial Number: ${asset.SerialNumber}
- Status: ${asset.StatusName}
- Location: ${asset.LocationName}
- Assigned To: ${asset.AssignedUserName || 'Unassigned'}
- Purchase Date: ${asset.PurchaseDate || 'N/A'}
- Warranty Expires: ${asset.WarrantyExpirationDate || 'N/A'}
${asset.Notes ? `- Notes: ${asset.Notes}` : ''}`,
            },
          ],
        };
      }

      case 'asset_get_counts': {
        const counts = await client.getAssetCounts();
        const countList = Object.entries(counts)
          .map(([category, count]) => `- ${category}: ${count}`)
          .join('\n');

        const total = Object.values(counts).reduce((sum, count) => sum + (count as number), 0);

        return {
          content: [
            {
              type: 'text',
              text: `District Asset Inventory Summary:
${countList}
\nTotal Assets: ${total}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown asset tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
}