import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { mockTickets, mockUsers, mockAssets, mockLocations } from '../fixtures/api-responses';

export const handlers = [
  // Test connection endpoint - returns paginated object like production
  http.get('https://test.incidentiq.com/api/v1.0/tickets/statuses', () => {
    const statuses = [
      { StatusId: '1', StatusName: 'Open', IsDefault: true },
      { StatusId: '2', StatusName: 'In Progress' },
      { StatusId: '3', StatusName: 'Closed', IsClosed: true },
    ];
    return HttpResponse.json({
      ItemCount: statuses.length,
      Items: statuses,
      Paging: {
        PageIndex: 0,
        PageCount: 1,
        PageSize: 20
      }
    });
  }),

  // Ticket endpoints - PowerShell module shows direct response with Items and Paging
  http.post('https://test.incidentiq.com/api/v1.0/tickets', async ({ request }) => {
    const body = await request.json() as any;
    const filteredTickets = mockTickets.filter(t => 
      !body?.SearchText || t.Subject?.toLowerCase().includes(body.SearchText.toLowerCase())
    );
    return HttpResponse.json({
      Items: filteredTickets,
      ItemCount: filteredTickets.length,
      TotalCount: mockTickets.length, // Add TotalCount for tests
      PageIndex: body?.PageIndex || 0,
      PageSize: body?.PageSize || 20,
      Paging: {
        PageIndex: body?.PageIndex || 0,
        PageCount: Math.ceil(filteredTickets.length / (body?.PageSize || 20)),
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

  // User endpoints - PowerShell module shows direct response with Items and Paging
  http.post('https://test.incidentiq.com/api/v1.0/users', async ({ request }) => {
    const body = await request.json() as any;
    const filteredUsers = mockUsers.filter(u => 
      !body?.SearchText || u.FullName?.toLowerCase().includes(body.SearchText.toLowerCase())
    );
    return HttpResponse.json({
      Items: filteredUsers,
      ItemCount: filteredUsers.length,
      TotalCount: mockUsers.length, // Add TotalCount for tests
      PageIndex: body?.PageIndex || 0,
      PageSize: body?.PageSize || 20,
      Paging: {
        PageIndex: body?.PageIndex || 0,
        PageCount: Math.ceil(filteredUsers.length / (body?.PageSize || 20)),
        PageSize: body?.PageSize || 20,
      },
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/users/agents', () => {
    // GET endpoints return paginated object with Items array
    const agents = mockUsers.filter(u => u.Role === 'IT Agent');
    return HttpResponse.json({
      ItemCount: agents.length,
      Items: agents,
      Paging: {
        PageIndex: 0,
        PageCount: 1,
        PageSize: 20
      }
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

  // Asset endpoints - PowerShell module shows direct response with Items and Paging
  http.post('https://test.incidentiq.com/api/v1.0/assets', async ({ request }) => {
    const body = await request.json() as any;
    const filteredAssets = mockAssets.filter(a => 
      !body?.SearchText || a.AssetTag.toLowerCase().includes(body.SearchText.toLowerCase())
    );
    return HttpResponse.json({
      Items: filteredAssets,
      ItemCount: filteredAssets.length,
      TotalCount: mockAssets.length, // Add TotalCount for tests
      PageIndex: body?.PageIndex || 0,
      PageSize: body?.PageSize || 20,
      Paging: {
        PageIndex: body?.PageIndex || 0,
        PageCount: Math.ceil(filteredAssets.length / (body?.PageSize || 20)),
        PageSize: body?.PageSize || 20,
      },
    });
  }),

  // Specific routes must come before wildcard routes
  http.get('https://test.incidentiq.com/api/v1.0/assets/counts', () => {
    // This endpoint doesn't exist in production (returns 404)
    // But for testing purposes, return a mock response
    return HttpResponse.json({
      Chromebook: 1500,
      iPad: 300,
      Desktop: 200,
      Laptop: 150,
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

  http.get('https://test.incidentiq.com/api/v1.0/assets/:assetId', ({ params }) => {
    const asset = mockAssets.find(a => a.AssetId === params.assetId);
    return HttpResponse.json({
      Success: !!asset,
      Data: asset || null,
      ErrorMessage: asset ? undefined : 'Asset not found',
    });
  }),

  // Location endpoints - PowerShell module shows direct response with Items and Paging
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
      Items: filtered,
      ItemCount: filtered.length,
      Paging: {
        PageIndex: body?.PageIndex || 0,
        PageCount: Math.ceil(filtered.length / (body?.PageSize || 20)),
        PageSize: body?.PageSize || 20,
      },
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/locations/all', () => {
    // GET endpoints return paginated object with Items array
    return HttpResponse.json({
      ItemCount: mockLocations.length,
      Items: mockLocations,
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

  // Categories and Priorities - Return paginated objects like production
  http.get('https://test.incidentiq.com/api/v1.0/tickets/categories', () => {
    const categories = [
      { CategoryId: '1', CategoryName: 'Hardware' },
      { CategoryId: '2', CategoryName: 'Software' },
      { CategoryId: '3', CategoryName: 'Network' },
    ];
    return HttpResponse.json({
      ItemCount: categories.length,
      Items: categories,
      Paging: {
        PageIndex: 0,
        PageCount: 1,
        PageSize: 20
      }
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/tickets/priorities', () => {
    const priorities = [
      { PriorityId: '1', PriorityName: 'Low', PriorityLevel: 3 },
      { PriorityId: '2', PriorityName: 'Medium', PriorityLevel: 2 },
      { PriorityId: '3', PriorityName: 'High', PriorityLevel: 1 },
    ];
    return HttpResponse.json({
      ItemCount: priorities.length,
      Items: priorities,
      Paging: {
        PageIndex: 0,
        PageCount: 1,
        PageSize: 20
      }
    });
  }),
];

export const server = setupServer(...handlers);

// Helper to reset and add new handlers for specific tests
export function addTestHandler(handler: any) {
  server.use(handler);
}