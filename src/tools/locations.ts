/**
 * ENHANCED LOCATIONS TOOLS - Based on Swagger Analysis
 * 
 * Locations API provides K-12 building and room management
 * Critical for multi-campus districts and facility tracking
 * 
 * 11+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { 
  IIQLocation,
  PaginatedRequest,
  PaginatedResponse 
} from '../types/common.js';

// Location-specific types
export interface LocationRoom {
  LocationRoomId: string;
  LocationId: string;
  RoomNumber: string;
  RoomName?: string;
  RoomType?: string;
  Capacity?: number;
  Floor?: number;
  Wing?: string;
  IsActive?: boolean;
}

export interface LocationType {
  LocationTypeId: string;
  Name: string;
  Description?: string;
  IsBuilding?: boolean;
  IsRoom?: boolean;
}

export interface LocationHierarchy {
  LocationId: string;
  Name: string;
  Type: string;
  Children?: LocationHierarchy[];
}

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const enhancedLocationTools = [
  // Core Operations
  {
    name: 'location_get_all',
    description: 'Get all locations in the district (GET /locations/all)',
    inputSchema: {
      type: 'object',
      properties: {
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive locations',
        },
      },
      required: [],
    },
  },
  {
    name: 'location_search_advanced',
    description: 'Advanced location search with filters (POST /locations)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Search in name, code, room number',
        },
        locationType: {
          type: 'string',
          enum: ['Building', 'Room', 'Campus', 'Classroom', 'Lab', 'Office', 'Common'],
          description: 'Filter by location type',
        },
        buildingId: {
          type: 'string',
          description: 'Filter by parent building ID',
        },
        floor: {
          type: 'number',
          description: 'Filter by floor number',
        },
        hasAssets: {
          type: 'boolean',
          description: 'Only locations with assets',
        },
        isAvailable: {
          type: 'boolean',
          description: 'Only available locations',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Include deleted locations',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 100)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: [],
    },
  },
  {
    name: 'location_get_details',
    description: 'Get comprehensive location details (GET /locations/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location ID (GUID)',
        },
      },
      required: ['locationId'],
    },
  },
  
  // Room Management
  {
    name: 'location_get_all_rooms',
    description: 'Get all rooms across all buildings (GET /locations/rooms)',
    inputSchema: {
      type: 'object',
      properties: {
        roomType: {
          type: 'string',
          description: 'Filter by room type',
        },
        minCapacity: {
          type: 'number',
          description: 'Minimum room capacity',
        },
      },
      required: [],
    },
  },
  {
    name: 'location_get_room_details',
    description: 'Get specific room information (GET /locations/rooms/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID (GUID)',
        },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'location_get_building_rooms',
    description: 'Get all rooms in a specific building (GET /locations/{id}/rooms)',
    inputSchema: {
      type: 'object',
      properties: {
        buildingId: {
          type: 'string',
          description: 'Building/location ID',
        },
        floor: {
          type: 'number',
          description: 'Filter by floor',
        },
        roomType: {
          type: 'string',
          description: 'Filter by room type',
        },
      },
      required: ['buildingId'],
    },
  },
  
  // Building Hierarchy
  {
    name: 'location_get_buildings',
    description: 'Get all school buildings in the district',
    inputSchema: {
      type: 'object',
      properties: {
        campusId: {
          type: 'string',
          description: 'Filter by campus',
        },
      },
      required: [],
    },
  },
  {
    name: 'location_get_campuses',
    description: 'Get all district campuses',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'location_get_hierarchy',
    description: 'Get hierarchical location structure',
    inputSchema: {
      type: 'object',
      properties: {
        rootLocationId: {
          type: 'string',
          description: 'Start from specific location (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'location_get_children',
    description: 'Get sub-locations (rooms, areas) of a location',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Parent location ID',
        },
      },
      required: ['locationId'],
    },
  },
  
  // Location Types
  {
    name: 'location_get_types',
    description: 'Get all location types (Building, Room, etc.)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // Special Purpose
  {
    name: 'location_find_special_rooms',
    description: 'Find special purpose rooms (nurse, counselor, admin)',
    inputSchema: {
      type: 'object',
      properties: {
        roomType: {
          type: 'string',
          enum: ['Nurse', 'Counselor', 'Principal', 'Admin', 'Library', 'Cafeteria', 'Gym'],
          description: 'Type of special room',
        },
        buildingId: {
          type: 'string',
          description: 'Limit to specific building',
        },
      },
      required: ['roomType'],
    },
  },
  {
    name: 'location_get_available_rooms',
    description: 'Get currently available rooms',
    inputSchema: {
      type: 'object',
      properties: {
        minCapacity: {
          type: 'number',
          description: 'Minimum capacity needed',
        },
        roomType: {
          type: 'string',
          description: 'Preferred room type',
        },
        buildingId: {
          type: 'string',
          description: 'Specific building',
        },
      },
      required: [],
    },
  },
  
  // Integration
  {
    name: 'location_get_assets',
    description: 'Get all assets at a specific location',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location ID',
        },
        assetType: {
          type: 'string',
          description: 'Filter by asset type',
        },
      },
      required: ['locationId'],
    },
  },
  {
    name: 'location_get_users',
    description: 'Get all users assigned to a location',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location ID',
        },
        userType: {
          type: 'string',
          description: 'Filter by user type (Student, Staff)',
        },
      },
      required: ['locationId'],
    },
  },
  {
    name: 'location_get_tickets',
    description: 'Get all tickets for a location',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location ID',
        },
        status: {
          type: 'string',
          description: 'Filter by ticket status',
        },
      },
      required: ['locationId'],
    },
  },
  
  // Quick Lookup
  {
    name: 'location_find_by_code',
    description: 'Find location by building code or abbreviation',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Building code (e.g., "MAIN", "GYM")',
        },
      },
      required: ['code'],
    },
  },
];

export async function handleEnhancedLocationTool(name: string, args: any) {
  const client = getClient();
  
  try {
    switch (name) {
      case 'location_get_all': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/locations/all',
        });
        
        // Handle different response formats
        const locations = Array.isArray(response) ? response : response?.Items || [];
        
        if (locations.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No locations found in the district.',
            }],
          };
        }
        
        // Group by type
        const locationsByType: Record<string, any[]> = {};
        locations.forEach((loc: IIQLocation) => {
          const type = loc.LocationTypeName || 'Unknown';
          if (!locationsByType[type]) locationsByType[type] = [];
          locationsByType[type].push(loc);
        });
        
        let output = `District Locations (${locations.length} total):\n`;
        
        for (const [type, locs] of Object.entries(locationsByType)) {
          output += `\n${type} (${locs.length}):\n`;
          locs.slice(0, 5).forEach(loc => {
            output += `  • ${loc.LocationName || loc.Name}`;
            if (loc.Abbreviation) output += ` (${loc.Abbreviation})`;
            output += '\n';
          });
          if (locs.length > 5) {
            output += `  ... and ${locs.length - 5} more\n`;
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'location_search_advanced': {
        const payload: PaginatedRequest = {
          OnlyShowDeleted: args.includeDeleted || false,
          FilterByViewPermission: false,
          SearchText: args.searchText,
          Filters: [],
          Paging: {
            PageIndex: args.pageIndex || 0,
            PageSize: args.pageSize || 100,
          },
        };
        
        if (args.locationType) {
          payload.Filters!.push({
            Facet: 'LocationType',
            Id: args.locationType,
          });
        }
        
        if (args.buildingId) {
          payload.Filters!.push({
            Facet: 'ParentLocation',
            Id: args.buildingId,
          });
        }
        
        const response = await client.request<PaginatedResponse<IIQLocation>>({
          method: 'POST',
          url: '/locations',
          data: payload,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No locations found matching your criteria.',
            }],
          };
        }
        
        const locationList = response.Items.slice(0, 10).map((loc: IIQLocation) =>
          `• ${loc.LocationName || loc.Name}${loc.Abbreviation ? ` (${loc.Abbreviation})` : ''}
  Type: ${loc.LocationTypeName || 'Unknown'}${loc.BuildingName ? ` | Building: ${loc.BuildingName}` : ''}
  ${loc.RoomNumber ? `Room: ${loc.RoomNumber}` : ''}${loc.Floor ? ` | Floor: ${loc.Floor}` : ''}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Found ${response.ItemCount} locations (showing ${Math.min(10, response.Items.length)}):

${locationList}

${response.Items.length > 10 ? `\n...and ${response.Items.length - 10} more locations` : ''}`,
          }],
        };
      }
      
      case 'location_get_details': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/locations/${args.locationId}`,
        });
        
        const location = response?.Item || response;
        
        if (!location) {
          return {
            content: [{
              type: 'text',
              text: 'Location not found.',
            }],
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Location Details:
Name: ${location.LocationName || location.Name}
Type: ${location.LocationTypeName || 'Unknown'}
${location.Abbreviation ? `Code: ${location.Abbreviation}\n` : ''}${location.BuildingName ? `Building: ${location.BuildingName}\n` : ''}${location.RoomNumber ? `Room: ${location.RoomNumber}\n` : ''}${location.Floor ? `Floor: ${location.Floor}\n` : ''}${location.Wing ? `Wing: ${location.Wing}\n` : ''}${location.Capacity ? `Capacity: ${location.Capacity}\n` : ''}Status: ${location.IsActive ? 'Active' : 'Inactive'}
ID: ${location.LocationId}`,
          }],
        };
      }
      
      case 'location_get_all_rooms': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/locations/rooms',
        });
        
        const rooms = response?.Items || response || [];
        
        if (rooms.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No rooms found.',
            }],
          };
        }
        
        // Apply filters if provided
        let filteredRooms = rooms;
        if (args.roomType) {
          filteredRooms = filteredRooms.filter((r: LocationRoom) => 
            r.RoomType === args.roomType
          );
        }
        if (args.minCapacity) {
          filteredRooms = filteredRooms.filter((r: LocationRoom) => 
            r.Capacity && r.Capacity >= args.minCapacity
          );
        }
        
        const roomList = filteredRooms.slice(0, 20).map((room: LocationRoom) =>
          `• Room ${room.RoomNumber}${room.RoomName ? ` - ${room.RoomName}` : ''}
  Type: ${room.RoomType || 'N/A'} | Capacity: ${room.Capacity || 'N/A'}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Rooms (${filteredRooms.length} matching):

${roomList}

${filteredRooms.length > 20 ? `\n...and ${filteredRooms.length - 20} more rooms` : ''}`,
          }],
        };
      }
      
      case 'location_get_building_rooms': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/locations/${args.buildingId}/rooms`,
        });
        
        const rooms = response?.Items || response || [];
        
        if (rooms.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No rooms found in this building.',
            }],
          };
        }
        
        // Group by floor if available
        const roomsByFloor: Record<string, LocationRoom[]> = {};
        rooms.forEach((room: LocationRoom) => {
          const floor = room.Floor ? `Floor ${room.Floor}` : 'Unspecified';
          if (!roomsByFloor[floor]) roomsByFloor[floor] = [];
          roomsByFloor[floor].push(room);
        });
        
        let output = `Building Rooms (${rooms.length} total):\n`;
        
        for (const [floor, floorRooms] of Object.entries(roomsByFloor)) {
          output += `\n${floor} (${floorRooms.length} rooms):\n`;
          floorRooms.forEach(room => {
            output += `  • Room ${room.RoomNumber}`;
            if (room.RoomName) output += ` - ${room.RoomName}`;
            if (room.Capacity) output += ` (Cap: ${room.Capacity})`;
            output += '\n';
          });
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'location_get_buildings': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/locations/buildings',
        });
        
        const buildings = response?.Items || response || [];
        
        if (buildings.length === 0) {
          // Fallback to filtering from all locations
          const allResponse = await client.request<any>({
            method: 'GET',
            url: '/locations/all',
          });
          
          const allLocations = Array.isArray(allResponse) ? allResponse : allResponse?.Items || [];
          const buildingLocations = allLocations.filter((loc: IIQLocation) =>
            loc.LocationTypeName?.toLowerCase().includes('building') ||
            (!loc.ParentLocationId && loc.LocationTypeName !== 'District')
          );
          
          if (buildingLocations.length === 0) {
            return {
              content: [{
                type: 'text',
                text: 'No buildings found.',
              }],
            };
          }
          
          const buildingList = buildingLocations.map((b: IIQLocation) =>
            `• ${b.LocationName || b.Name}${b.Abbreviation ? ` (${b.Abbreviation})` : ''}`
          ).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `District Buildings (${buildingLocations.length}):

${buildingList}`,
            }],
          };
        }
        
        const buildingList = buildings.map((b: IIQLocation) =>
          `• ${b.LocationName || b.Name}${b.Abbreviation ? ` (${b.Abbreviation})` : ''}`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `District Buildings (${buildings.length}):

${buildingList}`,
          }],
        };
      }
      
      case 'location_get_types': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/locations/types',
        });
        
        const types = response?.Items || response || [];
        
        if (types.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No location types found.',
            }],
          };
        }
        
        const typeList = types.map((type: LocationType) =>
          `• ${type.Name}${type.Description ? ` - ${type.Description}` : ''}`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Location Types (${types.length}):

${typeList}`,
          }],
        };
      }
      
      case 'location_find_special_rooms': {
        // Search for special purpose rooms
        const payload: PaginatedRequest = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          SearchText: args.roomType,
          Filters: [{
            Facet: 'LocationType',
            Id: 'Room',
          }],
          Paging: {
            PageIndex: 0,
            PageSize: 100,
          },
        };
        
        if (args.buildingId) {
          payload.Filters!.push({
            Facet: 'ParentLocation',
            Id: args.buildingId,
          });
        }
        
        const response = await client.request<PaginatedResponse<IIQLocation>>({
          method: 'POST',
          url: '/locations',
          data: payload,
        });
        
        const specialRooms = response?.Items || [];
        
        if (specialRooms.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No ${args.roomType} rooms found.`,
            }],
          };
        }
        
        const roomList = specialRooms.map((room: IIQLocation) =>
          `• ${room.LocationName || room.Name} - ${room.BuildingName || 'Unknown Building'}`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `${args.roomType} Rooms (${specialRooms.length}):

${roomList}`,
          }],
        };
      }
      
      case 'location_get_assets': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/locations/${args.locationId}/assets`,
        });
        
        const assets = response?.Items || response || [];
        
        if (assets.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No assets found at this location.',
            }],
          };
        }
        
        const assetList = assets.slice(0, 10).map((asset: any) =>
          `• ${asset.AssetTag} - ${asset.AssetTypeName || 'Unknown Type'}`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Assets at Location (${assets.length}):

${assetList}

${assets.length > 10 ? `\n...and ${assets.length - 10} more assets` : ''}`,
          }],
        };
      }
      
      case 'location_find_by_code': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/locations/code/${args.code}`,
        });
        
        const location = response?.Item || response;
        
        if (!location) {
          // Fallback to search
          const searchResponse = await client.request<PaginatedResponse<IIQLocation>>({
            method: 'POST',
            url: '/locations',
            data: {
              SearchText: args.code,
              OnlyShowDeleted: false,
              FilterByViewPermission: false,
              Paging: { PageIndex: 0, PageSize: 10 },
            },
          });
          
          const matches = searchResponse?.Items?.filter((loc: IIQLocation) =>
            loc.Abbreviation === args.code
          ) || [];
          
          if (matches.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No location found with code: ${args.code}`,
              }],
            };
          }
          
          const location = matches[0];
          return {
            content: [{
              type: 'text',
              text: `Location Found:
Name: ${location.LocationName || location.Name}
Code: ${location.Abbreviation}
Type: ${location.LocationTypeName || 'Unknown'}
ID: ${location.LocationId}`,
            }],
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Location Found:
Name: ${location.LocationName || location.Name}
Code: ${args.code}
Type: ${location.LocationTypeName || 'Unknown'}
ID: ${location.LocationId}`,
          }],
        };
      }
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Error: Unknown enhanced location tool "${name}".`,
          }],
        };
    }
  } catch (error: any) {
    // Handle 404s specially
    if (error.response?.status === 404) {
      if (name.includes('buildings') || name.includes('campuses')) {
        // These endpoints might not exist, use fallback
        return {
          content: [{
            type: 'text',
            text: 'This endpoint may not be available. Try using location_get_all or location_search_advanced instead.',
          }],
        };
      }
      return {
        content: [{
          type: 'text',
          text: 'Location or resource not found.',
        }],
      };
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
export const locationTools = enhancedLocationTools;
export const handleLocationTool = handleEnhancedLocationTool;
