import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { enhancedLocationTools, handleEnhancedLocationTool } from '../../../src/tools/locations';

/**
 * #98 sweep, locations (L1-L5). Response shapes are the ones production IIQ returns (verified
 * 2026-11-07, read-only probes): GET /locations/all items carry LocationType{Name} and
 * LocationStatusType{Name} (no LocationTypeName, ParentLocationId or IsActive); rooms carry
 * LocationRoomTypeName (no floor or capacity).
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const run = async (name: string, args: object) => (await (handleEnhancedLocationTool as Handler)(name, args)).content[0].text;
const toolNames = () => enhancedLocationTools.map((t) => t.name);
const propsOf = (name: string) => enhancedLocationTools.find((t) => t.name === name)!.inputSchema.properties as Record<string, unknown>;

/** Live IIQ GET list: pages by $p/$s with a 20-row default, reports Paging.TotalRows. */
const paged = (rows: object[]) => ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const p = Number(url.searchParams.get('$p') ?? 0);
  const s = Number(url.searchParams.get('$s') ?? 20);
  const items = rows.slice(p * s, p * s + s);
  return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: rows.length } });
};

const site = (Name: string, Abbreviation: string, type: string, status = 'Active / In Use') => ({
  LocationId: `id-${Abbreviation}`, Name, Abbreviation, LocationType: { Name: type }, LocationStatusType: { Name: status }, IsDeleted: false,
});
const sites = [
  site('Central High', 'CHS', 'High School'),
  site('Old Annex', 'OA', 'High School', 'Decommissioned / Retired'),
  site('Pine Elementary', 'PES', 'Elementary School'),
  site('Future Site', 'FS', 'Other', 'Pending'),
  site('Admin Center', 'ADM', 'Administrative Bldg'),
];

describe('L1 location_get_room_details', () => {
  it('renders the room IIQ returns in Item', async () => {
    let path = '';
    server.use(http.get(`${BASE}/locations/rooms/:id`, ({ request }) => {
      path = new URL(request.url).pathname;
      return HttpResponse.json({ Item: {
        LocationRoomId: 'room-1', Name: '204', NameFormatted: 'Room 204', Description: 'Science lab',
        LocationRoomTypeName: 'Classroom', LocationId: 'id-CHS', LocationName: 'Central High', LocationAbbreviation: 'CHS',
        IsAvailable: false, IsDeleted: false,
      } });
    }));
    expect(await run('location_get_room_details', { roomId: 'room-1' })).toBe(`Room Details:
Name: 204
Building: Central High (CHS)
Type: Classroom
Description: Science lab
ID: room-1`);
    expect(path).toBe('/api/v1.0/locations/rooms/room-1');
  });

  it('reports a missing room', async () => {
    server.use(http.get(`${BASE}/locations/rooms/:id`, () => new HttpResponse(null, { status: 404 })));
    expect(await run('location_get_room_details', { roomId: 'nope' })).toBe('Location or resource not found.');
  });
});

describe('L2 location_get_building_rooms', () => {
  const room = (i: number, type: string) => ({ LocationRoomId: `r${i}`, Name: `Room ${i}`, LocationRoomTypeName: type, LocationName: 'Central High' });

  it('reads every room (not the 20-row default), grouped by room type, 25 per page', async () => {
    const rows = [...Array.from({ length: 190 }, (_, i) => room(i, 'Classroom')), room(190, 'Office'), room(191, 'Office'), room(192, 'Library')];
    server.use(http.get(`${BASE}/locations/:id/rooms`, paged(rows)));
    const text = await run('location_get_building_rooms', { buildingId: 'id-CHS' });
    expect(text.startsWith('Found 193 rooms (showing 25):\n\nClassroom (25):\n  • Room 0\n')).toBe(true);
    expect(text.endsWith('Page 1 of 8')).toBe(true);
    const last = await run('location_get_building_rooms', { buildingId: 'id-CHS', pageIndex: 7 });
    expect(last).toBe('Found 193 rooms (showing 18):\n\nClassroom (15):\n'
      + Array.from({ length: 15 }, (_, i) => `  • Room ${175 + i}`).join('\n')
      + '\n\nOffice (2):\n  • Room 190\n  • Room 191\n\nLibrary (1):\n  • Room 192\n\nPage 8 of 8');
  });

  it('filters by room type ignoring case', async () => {
    server.use(http.get(`${BASE}/locations/:id/rooms`, paged([room(1, 'Classroom'), room(2, 'Office')])));
    expect(await run('location_get_building_rooms', { buildingId: 'id-CHS', roomType: 'office' })).toBe(
      'Found 1 rooms (showing 1):\n\nOffice (1):\n  • Room 2\n\nPage 1 of 1'
    );
  });

  it('reports an empty building', async () => {
    server.use(http.get(`${BASE}/locations/:id/rooms`, paged([])));
    expect(await run('location_get_building_rooms', { buildingId: 'id-CHS' })).toBe('No rooms found in this building.');
  });

  it('offers paging and no floor', () => {
    const props = propsOf('location_get_building_rooms');
    expect(props).not.toHaveProperty('floor');
    expect(props).toHaveProperty('pageSize');
    expect(props).toHaveProperty('pageIndex');
  });
});

describe('L3 location_get_all', () => {
  it('hides decommissioned/retired locations by default and groups by LocationType.Name', async () => {
    server.use(http.get(`${BASE}/locations/all`, paged(sites)));
    expect(await run('location_get_all', {})).toBe(`District Locations (4 total):

High School (1):
  • Central High (CHS)

Elementary School (1):
  • Pine Elementary (PES)

Other (1):
  • Future Site (FS)

Administrative Bldg (1):
  • Admin Center (ADM)

1 decommissioned/retired/inactive location hidden (includeInactive: true shows it).`);
  });

  it('shows every location with includeInactive: true', async () => {
    server.use(http.get(`${BASE}/locations/all`, paged(sites)));
    const text = await run('location_get_all', { includeInactive: true });
    expect(text.startsWith('District Locations (5 total):\n\nHigh School (2):\n  • Central High (CHS)\n  • Old Annex (OA)\n')).toBe(true);
    expect(text).not.toContain('hidden');
  });

  it('lists every location in a type, not the first 5', async () => {
    server.use(http.get(`${BASE}/locations/all`, paged(Array.from({ length: 30 }, (_, i) => site(`School ${i}`, `S${i}`, 'Elementary School')))));
    const text = await run('location_get_all', {});
    expect(text).toContain('Elementary School (30):');
    expect(text).toContain('  • School 29 (S29)');
    expect(text).not.toContain('more');
  });
});

describe('L4 location_get_buildings', () => {
  it('uses /locations/all and LocationType.Name, without the 404 /locations/buildings call', async () => {
    let calledBuildings = false;
    server.use(
      http.get(`${BASE}/locations/buildings`, () => { calledBuildings = true; return new HttpResponse(null, { status: 404 }); }),
      http.get(`${BASE}/locations/all`, paged([site('Central High', 'CHS', 'High School'), site('District', 'DIST', 'District')])),
    );
    expect(await run('location_get_buildings', {})).toBe('District Buildings (1):\n\n• Central High (CHS) - High School');
    expect(calledBuildings).toBe(false);
  });

  it('hides decommissioned/retired sites by default and says how many', async () => {
    server.use(http.get(`${BASE}/locations/all`, paged([site('Central High', 'CHS', 'High School'), site('Old Annex', 'OA', 'High School', 'Decommissioned / Retired')])));
    expect(await run('location_get_buildings', {})).toBe(
      'District Buildings (1):\n\n• Central High (CHS) - High School\n\n1 decommissioned/retired/inactive location hidden (includeInactive: true shows it).'
    );
  });

  it('shows decommissioned/retired sites with includeInactive: true', async () => {
    server.use(http.get(`${BASE}/locations/all`, paged([site('Central High', 'CHS', 'High School'), site('Old Annex', 'OA', 'High School', 'Decommissioned / Retired')])));
    expect(await run('location_get_buildings', { includeInactive: true })).toBe(
      'District Buildings (2):\n\n• Central High (CHS) - High School\n• Old Annex (OA) - High School'
    );
  });

  it('no longer offers campusId and offers includeInactive', () => {
    expect(propsOf('location_get_buildings')).not.toHaveProperty('campusId');
    expect(propsOf('location_get_buildings')).toHaveProperty('includeInactive');
  });
});

describe('L5 removed location tools', () => {
  it.each([
    'location_get_campuses', 'location_get_hierarchy', 'location_get_available_rooms',
    'location_get_children', 'location_get_users', 'location_get_tickets',
  ])('%s is no longer advertised', (name) => {
    expect(toolNames()).not.toContain(name);
  });
});
