/**
 * ENHANCED LOCATIONS TOOLS - Based on Swagger Analysis
 * 
 * Locations API provides K-12 building and room management
 * Critical for multi-campus districts and facility tracking
 * 
 * 11+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { pathSegment } from '../api/path.js';
import { ASSET_TYPES, resolveIds } from '../api/lookups.js';
import { formatListPage, iiqListAll, iiqServerTotal, matchesText, withTruncationNote } from '../api/paging.js';
import { IIQAsset, IIQFilter, IIQLocation, PaginatedResponse } from '../types/common.js';
import { renderAssetRow } from './assets.js';

/** Location as returned by GET /locations/all (live shape) plus the legacy flat fields. */
type ListedLocation = IIQLocation & {
  Description?: string;
  LocationType?: { Name?: string };
  LocationStatusType?: { Name?: string };
  IsDeleted?: boolean;
};

/** Room as returned by GET /locations/rooms and GET /locations/{id}/rooms (live shape, verified 2026-11-06). */
interface ListedRoom {
  LocationRoomId: string;
  Name?: string;
  Description?: string;
  LocationRoomTypeName?: string;
  LocationId?: string;
  LocationName?: string;
  LocationAbbreviation?: string;
}

/**
 * Whether a location's status marks it out of use. IIQ has no IsActive on locations; its status
 * names live were 'Active / In Use', 'Decommissioned / Retired', 'Pending' and 'Other'.
 * SHORTCUT: matches the status NAME by words (decommission/retired/inactive), so a district that
 * renames its statuses (e.g. "Closed") is not filtered; switch to status ids if that happens.
 */
const isOutOfUse = (loc: ListedLocation): boolean =>
  /decommission|retired|inactive/i.test(loc.LocationStatusType?.Name ?? '');

const locationName = (loc: ListedLocation): string => loc.Name || loc.LocationName || 'Unnamed';
const locationTypeName = (loc: ListedLocation): string | undefined => loc.LocationType?.Name || loc.LocationTypeName;

// Location-specific types
export interface LocationType {
  LocationTypeId: string;
  Name: string;
  Description?: string;
  IsBuilding?: boolean;
  IsRoom?: boolean;
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
    description: 'Get all locations in the district, grouped by location type (GET /locations/all); decommissioned/retired locations are hidden unless includeInactive',
    inputSchema: {
      type: 'object',
      properties: {
        includeInactive: {
          type: 'boolean',
          description: 'Include locations whose status is decommissioned/retired/inactive (default: false)',
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
    description: 'Get all rooms in a specific building, grouped by room type (GET /locations/{id}/rooms)',
    inputSchema: {
      type: 'object',
      properties: {
        buildingId: {
          type: 'string',
          description: 'Building/location ID (GUID)',
        },
        roomType: {
          type: 'string',
          description: 'Filter by room type, e.g. Classroom, Office (case-insensitive exact match)',
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
      required: ['buildingId'],
    },
  },
  
  // Buildings
  {
    name: 'location_get_buildings',
    description: 'Get all district buildings with their location type (from GET /locations/all; excludes District-type locations; decommissioned/retired sites are hidden unless includeInactive)',
    inputSchema: {
      type: 'object',
      properties: {
        includeInactive: {
          type: 'boolean',
          description: 'Include sites whose status is decommissioned/retired/inactive (default: false)',
        },
      },
      required: [],
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
          description: 'Filter by asset type name or ID, e.g. Devices, Networking (GET /assets/types)',
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
        const { items, truncated } = await iiqListAll<ListedLocation>(client, '/locations/all');
        const locations = args.includeInactive ? items : items.filter((loc) => !isOutOfUse(loc));
        const hidden = items.length - locations.length;

        if (locations.length === 0) {
          return withTruncationNote(truncated, {
            content: [{ type: 'text', text: 'No locations found in the district.' }],
          });
        }

        const byType = new Map<string, ListedLocation[]>();
        for (const loc of locations) {
          const type = locationTypeName(loc) || 'Unknown';
          byType.set(type, [...(byType.get(type) ?? []), loc]);
        }
        const groups = [...byType].map(([type, locs]) =>
          `${type} (${locs.length}):\n${locs.map((loc) => `  • ${locationName(loc)}${loc.Abbreviation ? ` (${loc.Abbreviation})` : ''}`).join('\n')}`
        );
        const hiddenNote = hidden > 0
          ? `\n\n${hidden} decommissioned/retired/inactive location${hidden === 1 ? '' : 's'} hidden (includeInactive: true shows ${hidden === 1 ? 'it' : 'them'}).`
          : '';

        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: `District Locations (${locations.length} total):\n\n${groups.join('\n\n')}${hiddenNote}`,
          }],
        });
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
          url: `/locations/${pathSegment(args.locationId)}`,
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
      
      case 'location_get_room_details': {
        const response = await client.request<{ Item?: ListedRoom }>({
          method: 'GET',
          url: `/locations/rooms/${pathSegment(args.roomId)}`,
        });
        const room = response?.Item;
        if (!room) {
          return { content: [{ type: 'text', text: 'Room not found.' }] };
        }
        const building = room.LocationName
          ? `${room.LocationName}${room.LocationAbbreviation ? ` (${room.LocationAbbreviation})` : ''}`
          : 'N/A';
        return {
          content: [{
            type: 'text',
            text: `Room Details:
Name: ${room.Name || 'Unnamed room'}
Building: ${building}
Type: ${room.LocationRoomTypeName || 'N/A'}
${room.Description ? `Description: ${room.Description}\n` : ''}ID: ${room.LocationRoomId}`,
          }],
        };
      }

      case 'location_get_building_rooms': {
        // GET /locations/{id}/rooms defaults to a 20-row page (193 rooms at one site live), so read them all.
        const { items, truncated } = await iiqListAll<ListedRoom>(
          client, `/locations/${pathSegment(args.buildingId)}/rooms`
        );
        const roomType = typeof args.roomType === 'string' ? args.roomType.trim().toLowerCase() : '';
        const rooms = roomType
          ? items.filter((room) => room.LocationRoomTypeName?.toLowerCase() === roomType)
          : items;
        const roomRow = (room: ListedRoom) => `  • ${room.Name || 'Unnamed room'}`;
        return formatListPage({
          rows: rooms,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'rooms',
          emptyText: 'No rooms found in this building.',
          render: roomRow,
          // Every room on the page, grouped by room type.
          renderPage: (page) => {
            const byType = new Map<string, ListedRoom[]>();
            for (const room of page) {
              const type = room.LocationRoomTypeName || 'Unspecified';
              byType.set(type, [...(byType.get(type) ?? []), room]);
            }
            return [...byType]
              .map(([type, group]) => `${type} (${group.length}):\n${group.map(roomRow).join('\n')}`)
              .join('\n\n');
          },
          truncated,
        });
      }
      
      case 'location_get_buildings': {
        // GET /locations/buildings returns 404 live. Every /locations/all item is a site (rooms are
        // a separate list, and there is no ParentLocationId), so a building is any non-District site.
        const { items, truncated } = await iiqListAll<ListedLocation>(client, '/locations/all');
        const sites = items.filter((loc) => locationTypeName(loc)?.toLowerCase() !== 'district');
        const buildings = args.includeInactive ? sites : sites.filter((loc) => !isOutOfUse(loc));
        const hidden = sites.length - buildings.length;
        const hiddenNote = hidden > 0
          ? `\n\n${hidden} decommissioned/retired/inactive location${hidden === 1 ? '' : 's'} hidden (includeInactive: true shows ${hidden === 1 ? 'it' : 'them'}).`
          : '';

        if (buildings.length === 0) {
          return withTruncationNote(truncated, { content: [{ type: 'text', text: 'No buildings found.' }] });
        }

        const buildingList = buildings.map((b) =>
          `• ${locationName(b)}${b.Abbreviation ? ` (${b.Abbreviation})` : ''} - ${locationTypeName(b) || 'Unknown'}`
        ).join('\n');

        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: `District Buildings (${buildings.length}):\n\n${buildingList}${hiddenNote}`,
          }],
        });
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
          ? `/locations/${pathSegment(args.buildingId)}/rooms`
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
        if (args.assetType) {
          const [assetTypeId] = await resolveIds(client, ASSET_TYPES, [args.assetType]);
          filters.push({ Facet: 'AssetType', Id: assetTypeId });
        }
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
