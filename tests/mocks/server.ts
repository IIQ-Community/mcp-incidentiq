import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { mockTickets, mockUsers, mockAssets, mockLocations } from '../fixtures/api-responses';

export const handlers = [
  // Test connection endpoint
  http.get('https://test.incidentiq.com/api/v1.0/tickets/statuses', () => {
    return HttpResponse.json({
      Success: true,
      Data: [
        { StatusId: '1', StatusName: 'Open', IsDefault: true },
        { StatusId: '2', StatusName: 'In Progress' },
        { StatusId: '3', StatusName: 'Closed', IsClosed: true },
      ],
    });
  }),

  // Ticket endpoints
  http.post('https://test.incidentiq.com/api/v1.0/tickets', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      Success: true,
      Data: {
        Items: mockTickets.filter(t => 
          !body?.SearchText || t.Subject?.toLowerCase().includes(body.SearchText.toLowerCase())
        ),
        TotalCount: mockTickets.length,
        PageIndex: body?.PageIndex || 0,
        PageSize: body?.PageSize || 20,
      },
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/tickets/:ticketId', ({ params }) => {
    const ticket = mockTickets.find(t => t.TicketId === params.ticketId);
    return HttpResponse.json({
      Success: !!ticket,
      Data: ticket || null,
      ErrorMessage: ticket ? undefined : 'Ticket not found',
    });
  }),

  http.post('https://test.incidentiq.com/api/v1.0/tickets/new', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      Success: true,
      Data: {
        TicketId: 'new-ticket-id',
        TicketNumber: 12345,
        Subject: body?.Subject,
        Description: body?.Description,
        StatusName: 'Open',
        CreatedDate: new Date().toISOString(),
      },
    });
  }),

  http.put('https://test.incidentiq.com/api/v1.0/tickets/:ticketId', async ({ params, request }) => {
    const body = await request.json() as any;
    const ticket = mockTickets.find(t => t.TicketId === params.ticketId);
    if (!ticket) {
      return HttpResponse.json({
        Success: false,
        ErrorMessage: 'Ticket not found',
      }, { status: 404 });
    }
    return HttpResponse.json({
      Success: true,
      Data: { ...ticket, ...(body || {}) },
    });
  }),

  http.put('https://test.incidentiq.com/api/v1.0/tickets/:ticketId/close', ({ params }) => {
    return HttpResponse.json({
      Success: true,
      Message: `Ticket ${params.ticketId} closed successfully`,
    });
  }),

  // User endpoints
  http.post('https://test.incidentiq.com/api/v1.0/users', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      Success: true,
      Data: {
        Items: mockUsers.filter(u => 
          !body?.SearchText || u.FullName?.toLowerCase().includes(body.SearchText.toLowerCase())
        ),
        TotalCount: mockUsers.length,
        PageIndex: body?.PageIndex || 0,
        PageSize: body?.PageSize || 20,
      },
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/users/:userId', ({ params }) => {
    const user = mockUsers.find(u => u.UserId === params.userId);
    return HttpResponse.json({
      Success: !!user,
      Data: user || null,
      ErrorMessage: user ? undefined : 'User not found',
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/users/agents', () => {
    return HttpResponse.json({
      Success: true,
      Data: mockUsers.filter(u => u.Role === 'IT Agent'),
    });
  }),

  // Asset endpoints
  http.post('https://test.incidentiq.com/api/v1.0/assets', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      Success: true,
      Data: {
        Items: mockAssets.filter(a => 
          !body?.SearchText || a.AssetTag.toLowerCase().includes(body.SearchText.toLowerCase())
        ),
        TotalCount: mockAssets.length,
        PageIndex: body?.PageIndex || 0,
        PageSize: body?.PageSize || 20,
      },
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/assets/:assetId', ({ params }) => {
    const asset = mockAssets.find(a => a.AssetId === params.assetId);
    return HttpResponse.json({
      Success: !!asset,
      Data: asset || null,
      ErrorMessage: asset ? undefined : 'Asset not found',
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/assets/search/:assetTag', ({ params }) => {
    const asset = mockAssets.find(a => a.AssetTag === params.assetTag);
    return HttpResponse.json({
      Success: !!asset,
      Data: asset || null,
      ErrorMessage: asset ? undefined : 'Asset not found',
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/assets/counts', () => {
    return HttpResponse.json({
      Success: true,
      Data: {
        Chromebook: 1500,
        iPad: 300,
        Desktop: 200,
        Laptop: 150,
      },
    });
  }),

  // Location endpoints
  http.post('https://test.incidentiq.com/api/v1.0/locations', async ({ request }) => {
    const body = await request.json() as any;
    let filtered = mockLocations;
    
    if (body?.SearchText) {
      filtered = filtered.filter(l => 
        l.LocationName.toLowerCase().includes(body.SearchText.toLowerCase())
      );
    }
    
    if (body?.Filters?.length > 0) {
      body.Filters.forEach((filter: any) => {
        if (filter.Facet === 'locationType' && filter.Id) {
          filtered = filtered.filter(l => l.LocationTypeName === filter.Id);
        }
      });
    }
    
    return HttpResponse.json({
      Success: true,
      Data: {
        Items: filtered,
        TotalCount: filtered.length,
        PageIndex: body?.PageIndex || 0,
        PageSize: body?.PageSize || 20,
      },
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/locations/all', () => {
    return HttpResponse.json({
      Success: true,
      Data: mockLocations,
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/locations/:locationId', ({ params }) => {
    const location = mockLocations.find(l => l.LocationId === params.locationId);
    return HttpResponse.json({
      Success: !!location,
      Data: location || null,
      ErrorMessage: location ? undefined : 'Location not found',
    });
  }),

  // Categories and Priorities
  http.get('https://test.incidentiq.com/api/v1.0/tickets/categories', () => {
    return HttpResponse.json({
      Success: true,
      Data: [
        { CategoryId: '1', CategoryName: 'Hardware' },
        { CategoryId: '2', CategoryName: 'Software' },
        { CategoryId: '3', CategoryName: 'Network' },
      ],
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/tickets/priorities', () => {
    return HttpResponse.json({
      Success: true,
      Data: [
        { PriorityId: '1', PriorityName: 'Low' },
        { PriorityId: '2', PriorityName: 'Medium' },
        { PriorityId: '3', PriorityName: 'High' },
      ],
    });
  }),
];

export const server = setupServer(...handlers);

// Helper to reset and add new handlers for specific tests
export function addTestHandler(handler: any) {
  server.use(handler);
}