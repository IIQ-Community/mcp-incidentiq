/**
 * ENHANCED LOCATIONS TOOLS - Based on Swagger Analysis
 * 
 * Locations API provides K-12 building and room management
 * Critical for multi-campus districts and facility tracking
 * 
 * 11+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { formatListPage, iiqListAll, iiqServerTotal, matchesText, withTruncationNote } from '../api/paging.js';
import { IIQAsset, IIQFilter, IIQLocation, PaginatedResponse } from '../types/common.js';
import { renderAssetRow } from './assets.js';

/** Location as returned by GET /locations/all (live shape) plus the legacy flat fields. */
type ListedLocation = IIQLocation & { Description?: string; LocationType?: { Name?: string }; IsDeleted?: boolean };

/** Room as returned by GET /locations/rooms and GET /locations/{id}/rooms (live shape, verified 2026-11-06). */
interface ListedRoom {
  LocationRoomId: string;
  Name?: string;
  Description?: string;
  LocationRoomTypeName?: string;
  LocationId?: string;
  LocationName?: string;
}

const locationName = (loc: ListedLocation): string => loc.Name || loc.LocationName || 'Unnamed';
const locationTypeName = (loc: ListedLocation): string | undefined => loc.LocationType?.Name || loc.LocationTypeName;

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
    description: 'Search district locations by name/code/description and type (filters GET /locations/all; IIQ has no location search endpoint)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Text matched against location name, abbreviation/code and description',
        },
        locationType: {
          type: 'string',
          description: 'Location type name, e.g. "Elementary School" (see location_get_types)',
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
          description: 'Filter by room type, e.g. Classroom, Office, Library (case-insensitive exact match)',
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
    description: 'Get all assets at a specific location (POST /assets with a location filter)',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location ID',
        },
        assetType: {
          type: 'string',
          description: 'Filter by asset type ID (GUID)',
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
        // IIQ has no location search (POST /locations returns 400), so filter the full list.
        const { items, truncated } = await iiqListAll<ListedLocation>(client, '/locations/all');
        const matched = items.filter((loc) =>
          (args.includeDeleted || !loc.IsDeleted) &&
          matchesText(args.searchText, locationName(loc), loc.Abbreviation, loc.Description) &&
          (!args.locationType || locationTypeName(loc)?.toLowerCase() === String(args.locationType).trim().toLowerCase())
        );

        return formatListPage({
          rows: matched,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 100,
          noun: 'locations',
          emptyText: 'No locations found matching your criteria.',
          render: (loc: ListedLocation) =>
            `• ${locationName(loc)}${loc.Abbreviation ? ` (${loc.Abbreviation})` : ''}
  Type: ${locationTypeName(loc) || 'Unknown'} | ID: ${loc.LocationId}`,
          truncated,
        });
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
        // GET /locations/rooms defaults to a 20-row page (4,927 rooms live), so read the whole list.
        const { items, truncated } = await iiqListAll<ListedRoom>(client, '/locations/rooms', { pageSize: 5000 });
        const roomType = typeof args.roomType === 'string' ? args.roomType.trim().toLowerCase() : '';
        const rooms = roomType
          ? items.filter((room) => room.LocationRoomTypeName?.toLowerCase() === roomType)
          : items;
        return formatListPage({
          rows: rooms,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'rooms',
          emptyText: 'No rooms found.',
          render: (room) => `• ${room.Name || 'Unnamed room'} - ${room.LocationName || 'Unknown Building'}
  Type: ${room.LocationRoomTypeName || 'N/A'}`,
          truncated,
        });
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
        // IIQ has no room search (POST /locations returns 400): list rooms and match by name.
        const roomsUrl = args.buildingId
          ? `/locations/${encodeURIComponent(args.buildingId)}/rooms`
          : '/locations/rooms';
        const { items, truncated } = await iiqListAll<ListedRoom>(client, roomsUrl, { pageSize: 5000 });
        const specialRooms = items.filter((room) =>
          matchesText(args.roomType, room.Name, room.Description, room.LocationRoomTypeName)
        );
        
        if (specialRooms.length === 0) {
          return withTruncationNote(truncated, {
            content: [{
              type: 'text',
              text: `No ${args.roomType} rooms found.`,
            }],
          });
        }
        
        const roomList = specialRooms.map((room) =>
          `• ${room.Name || 'Unnamed room'} - ${room.LocationName || 'Unknown Building'}`
        ).join('\n');
        
        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: `${args.roomType} Rooms (${specialRooms.length}):

${roomList}`,
          }],
        });
      }
      
      case 'location_get_assets': {
        // GET /locations/{id}/assets does not exist (404 live); the asset search takes a location filter.
        const filters: IIQFilter[] = [{ Facet: 'location', Id: args.locationId }];
        if (args.assetType) filters.push({ Facet: 'AssetType', Id: args.assetType });
        const paging = { PageIndex: args.pageIndex || 0, PageSize: args.pageSize || 25 };
        const readPage = (pageIndex: number) => client.request<PaginatedResponse<IIQAsset>>({
          method: 'POST',
          url: '/assets',
          data: {
            OnlyShowDeleted: false, FilterByViewPermission: false, Filters: filters,
            Paging: { ...paging, PageIndex: pageIndex },
          },
        });
        const response = await readPage(paging.PageIndex);
        return formatListPage({
          rows: response?.Items ?? [],
          total: await iiqServerTotal(response, paging.PageIndex, readPage),
          pageIndex: paging.PageIndex,
          pageSize: paging.PageSize,
          noun: 'assets',
          emptyText: 'No assets found at this location.',
          render: renderAssetRow,
        });
      }
      
      case 'location_find_by_code': {
        // GET /locations/code/{code} returns 404 even for real codes (verified 2026-11-06), so
        // match the abbreviation against the location list.
        const code = String(args.code ?? '').trim();
        const { items, truncated } = await iiqListAll<ListedLocation>(client, '/locations/all');
        const location = items.find((loc) => loc.Abbreviation?.toLowerCase() === code.toLowerCase());

        if (!location) {
          return withTruncationNote(truncated, {
            content: [{
              type: 'text',
              text: `No location found with code: ${code}`,
            }],
          });
        }

        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: `Location Found:
Name: ${locationName(location)}
Code: ${location.Abbreviation}
Type: ${locationTypeName(location) || 'Unknown'}
ID: ${location.LocationId}`,
          }],
        });
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
