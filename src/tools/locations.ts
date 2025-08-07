import { IncidentIQClient } from '../api/client.js';
import { IIQLocation } from '../types/common.js';

// Initialize client lazily to ensure environment variables are loaded
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const locationTools = [
  {
    name: 'location_list_all',
    description: 'Get all locations (buildings, rooms) in the district',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'location_search',
    description: 'Search for specific locations in the district',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Building name, room number, or location name to search',
        },
        locationType: {
          type: 'string',
          description: 'Filter by type: building, room, classroom, lab, etc.',
        },
        buildingId: {
          type: 'string',
          description: 'Filter by parent building ID',
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
    name: 'location_get',
    description: 'Get details of a specific location',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'The location ID (GUID)',
        },
      },
      required: ['locationId'],
    },
  },
];

export async function handleLocationTool(name: string, args: any) {
  const client = getClient();
  try {
    switch (name) {
      case 'location_list_all': {
        const locations = await client.getAllLocations();
        
        if (locations.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No locations found in the district.',
              },
            ],
          };
        }

        // Group locations by type
        const buildings = locations.filter((l: IIQLocation) => 
          l.LocationTypeName?.toLowerCase().includes('building') || !l.ParentLocationId
        );
        const rooms = locations.filter((l: IIQLocation) => 
          l.LocationTypeName?.toLowerCase().includes('room') || l.ParentLocationId
        );

        const buildingList = buildings.map((b: IIQLocation) => 
          `- ${b.LocationName}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `District Locations (${locations.length} total):
              
Buildings (${buildings.length}):
${buildingList}

Total Rooms/Spaces: ${rooms.length}`,
            },
          ],
        };
      }

      case 'location_search': {
        const params: any = {
          SearchText: args.searchText,
          PageIndex: args.pageIndex || 0,
          PageSize: Math.min(args.pageSize || 20, 100),
          Filters: [],
        };

        if (args.locationType) {
          params.Filters.push({
            Facet: 'locationType',
            Id: args.locationType,
          });
        }

        if (args.buildingId) {
          params.Filters.push({
            Facet: 'parentLocation',
            Id: args.buildingId,
          });
        }

        const result = await client.searchLocations(params);
        
        if (result.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No locations found matching your search criteria.',
              },
            ],
          };
        }

        const locationList = result.Items.map((l: IIQLocation) => 
          `- ${l.LocationName}${l.BuildingName ? ` (${l.BuildingName})` : ''}${l.RoomNumber ? ` - Room ${l.RoomNumber}` : ''}\n  Type: ${l.LocationTypeName || 'N/A'}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.TotalCount} locations (showing ${result.Items.length}):\n${locationList}`,
            },
          ],
        };
      }

      case 'location_get': {
        const location = await client.getLocation(args.locationId);
        if (!location) {
          return {
            content: [
              {
                type: 'text',
                text: 'Location not found.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Location Details:
- Name: ${location.LocationName}
- Type: ${location.LocationTypeName || 'N/A'}
${location.BuildingName ? `- Building: ${location.BuildingName}` : ''}
${location.RoomNumber ? `- Room Number: ${location.RoomNumber}` : ''}
- Location ID: ${location.LocationId}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown location tool: ${name}`);
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