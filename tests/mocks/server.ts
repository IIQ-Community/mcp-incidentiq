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

  // Ticket wizard endpoints
  http.get('https://test.incidentiq.com/api/v1.0/tickets/wizards', () => {
    const wizards = [
      { 
        TicketWizardCategoryId: 'wiz-1', 
        Name: 'General Support Request', 
        Description: 'General IT support',
        ProductName: 'General',
        Icon: '📋'
      },
      { 
        TicketWizardCategoryId: 'wiz-2', 
        Name: 'Device Issue', 
        Description: 'Report device problems',
        ProductName: 'Hardware',
        Icon: '💻'
      },
      { 
        TicketWizardCategoryId: 'wiz-3', 
        Name: 'Password Reset', 
        Description: 'Reset your password',
        ProductName: 'Account',
        Icon: '🔐'
      },
    ];
    return HttpResponse.json({
      ItemCount: wizards.length,
      Items: wizards,
      Paging: {
        PageIndex: 0,
        PageCount: 1,
        PageSize: 20
      }
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/tickets/wizards/site/:siteId', ({ params }) => {
    const wizards = [
      { 
        TicketWizardCategoryId: 'wiz-1', 
        Name: 'General Support Request', 
        Description: 'General IT support', 
        SiteId: params.siteId 
      },
      { 
        TicketWizardCategoryId: 'wiz-2', 
        Name: 'Device Issue', 
        Description: 'Report device problems', 
        SiteId: params.siteId 
      },
    ];
    return HttpResponse.json({
      ItemCount: wizards.length,
      Items: wizards,
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
    // Handle empty/null ticket ID
    if (!params.ticketId || params.ticketId === '') {
      return new HttpResponse(null, { status: 405 }); // Method not allowed for empty ID
    }
    
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

// Additional API endpoints for improved test coverage
const additionalHandlers = [
  // Asset tag search endpoints
  http.get('https://test.incidentiq.com/api/v1.0/assets/assettag/:assetTag', ({ params }) => {
    const asset = mockAssets.find(a => a.AssetTag === params.assetTag);
    if (asset) {
      return HttpResponse.json(asset);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/assets/assettag/search/:assetTag', ({ params }) => {
    const asset = mockAssets.find(a => a.AssetTag === params.assetTag);
    if (asset) {
      return HttpResponse.json({
        Items: [asset],
        ItemCount: 1,
        Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
      });
    }
    return HttpResponse.json({
      Items: [],
      ItemCount: 0,
      Paging: { PageIndex: 0, PageCount: 0, PageSize: 100 }
    });
  }),

  // Asset count endpoint
  http.post('https://test.incidentiq.com/api/v1.0/assets/count', () => {
    return HttpResponse.json({
      TotalCount: 2000,
      ByType: {
        Chromebook: 1500,
        iPad: 300,
        Desktop: 200,
        Laptop: 150
      }
    });
  }),
  // Teams
  http.get('https://test.incidentiq.com/api/v1.0/teams/all', () => {
    return HttpResponse.json([
      { TeamId: 'team-1', Name: 'IT Support', MemberCount: 5 },
      { TeamId: 'team-2', Name: 'Network Services', MemberCount: 3 }
    ]);
  }),

  // Parts - Order matters: specific routes BEFORE general routes
  // Fix parts suppliers endpoint to return paginated result (MUST come before /:partId)
  http.get('https://test.incidentiq.com/api/v1.0/parts/suppliers', () => {
    return HttpResponse.json({
      Items: [
        { SupplierId: 'sup-1', Name: 'TechParts Inc', Contact: 'John Doe' },
        { SupplierId: 'sup-2', Name: 'EduSupplies', Contact: 'Jane Smith' }
      ],
      ItemCount: 2,
      Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/parts', () => {
    return HttpResponse.json([
      { PartId: 'part-1', Name: 'Chromebook Screen', Quantity: 10, Cost: 45.99 },
      { PartId: 'part-2', Name: 'Power Adapter', Quantity: 25, Cost: 29.99 }
    ]);
  }),

  http.get('https://test.incidentiq.com/api/v1.0/parts/:partId', ({ params }) => {
    if (params.partId === 'part-123') {
      return HttpResponse.json({ 
        PartId: 'part-123', 
        Name: 'Keyboard', 
        Quantity: 5, 
        Cost: 19.99 
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Categories and Custom Fields
  http.post('https://test.incidentiq.com/api/v1.0/categories', async ({ request }) => {
    await request.json(); // Parse body but don't use it in this simple mock
    return HttpResponse.json({
      Items: [
        { CategoryId: 'cat-1', Name: 'Hardware' },
        { CategoryId: 'cat-2', Name: 'Software' }
      ],
      ItemCount: 2,
      Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
    });
  }),

  http.post('https://test.incidentiq.com/api/v1.0/custom-fields', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json([
      { FieldId: 'field-1', Name: 'Building', Type: 'Dropdown', EntityType: body.EntityType },
      { FieldId: 'field-2', Name: 'Room Number', Type: 'Text', EntityType: body.EntityType }
    ]);
  }),

  http.get('https://test.incidentiq.com/api/v1.0/custom-fields/types', () => {
    return HttpResponse.json([
      { TypeId: 'type-1', Name: 'Text', DataType: 'string' },
      { TypeId: 'type-2', Name: 'Number', DataType: 'number' },
      { TypeId: 'type-3', Name: 'Date', DataType: 'datetime' }
    ]);
  }),

  // Locations
  http.get('https://test.incidentiq.com/api/v1.0/locations/rooms', () => {
    return HttpResponse.json([
      { RoomId: 'room-1', Name: 'Room 101', Building: 'Main' },
      { RoomId: 'room-2', Name: 'Computer Lab', Building: 'Science' }
    ]);
  }),

  // Purchase Orders
  http.get('https://test.incidentiq.com/api/v1.0/purchaseorders', () => {
    return HttpResponse.json([
      { POId: 'po-1', PONumber: 'PO-2024-001', Total: 5000 },
      { POId: 'po-2', PONumber: 'PO-2024-002', Total: 3500 }
    ]);
  }),

  // Manufacturers and Issues
  http.get('https://test.incidentiq.com/api/v1.0/assets/manufacturers/global', () => {
    return HttpResponse.json([
      { ManufacturerId: 'man-1', Name: 'Dell' },
      { ManufacturerId: 'man-2', Name: 'HP' },
      { ManufacturerId: 'man-3', Name: 'Lenovo' }
    ]);
  }),

  http.get('https://test.incidentiq.com/api/v1.0/issues/types', () => {
    return HttpResponse.json([
      { IssueTypeId: 'issue-1', Name: 'Hardware Failure' },
      { IssueTypeId: 'issue-2', Name: 'Software Bug' },
      { IssueTypeId: 'issue-3', Name: 'Network Issue' }
    ]);
  }),

  // Analytics
  http.post('https://test.incidentiq.com/api/v1.0/analytics/reports/:reportType', async ({ params, request }) => {
    await request.json(); // Parse body but don't use it in this simple mock
    if (params.reportType === 'TicketSummary') {
      return HttpResponse.json({
        reportType: 'TicketSummary',
        Data: { totalTickets: 150, openTickets: 45 }
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // SLA Management
  http.get('https://test.incidentiq.com/api/v1.0/slas', () => {
    return HttpResponse.json([
      { SLAId: 'sla-1', Name: 'Critical - 1 Hour', ResponseTime: 60 },
      { SLAId: 'sla-2', Name: 'High - 4 Hours', ResponseTime: 240 }
    ]);
  }),

  // Fix endpoint paths to match API client
  http.get('https://test.incidentiq.com/api/v1.0/metrics', () => {
    return HttpResponse.json({
      Items: [
        { MetricId: 'metric-1', SLAId: 'sla-1', ComplianceRate: 95.5 },
        { MetricId: 'metric-2', SLAId: 'sla-2', ComplianceRate: 98.2 }
      ],
      ItemCount: 2,
      Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/metrics/types', () => {
    return HttpResponse.json({
      Items: [
        { TypeId: 'type-1', Name: 'Response Time' },
        { TypeId: 'type-2', Name: 'Resolution Time' }
      ],
      ItemCount: 2,
      Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/tickets/:ticketId/sla', ({ params }) => {
    if (params.ticketId === 'ticket-123') {
      return HttpResponse.json({
        TicketId: 'ticket-123',
        SLAId: 'sla-1',
        Status: 'Met',
        ResponseTime: 45
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // View Management - Fix endpoint paths to match API client
  http.get('https://test.incidentiq.com/api/v1.0/users/views', () => {
    return HttpResponse.json([
      { ViewId: 'view-1', Name: 'My Tickets', Type: 'User' },
      { ViewId: 'view-2', Name: 'Team Tickets', Type: 'Shared' }
    ]);
  }),

  http.get('https://test.incidentiq.com/api/v1.0/views', () => {
    return HttpResponse.json([
      { ViewId: 'view-1', Name: 'Open Tickets' },
      { ViewId: 'view-2', Name: 'Closed Tickets' }
    ]);
  }),

  // Fix endpoint paths to match API client expectations
  http.get('https://test.incidentiq.com/api/v1.0/views/tickets', () => {
    return HttpResponse.json({
      Items: [
        { ViewId: 'view-1', Name: 'High Priority' },
        { ViewId: 'view-2', Name: 'My Open Tickets' }
      ],
      ItemCount: 2,
      Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/views/assets', () => {
    return HttpResponse.json({
      Items: [
        { ViewId: 'view-1', Name: 'Chromebooks' },
        { ViewId: 'view-2', Name: 'iPads' }
      ],
      ItemCount: 2,
      Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
    });
  }),

  // Notifications - Fix endpoint paths to match API client
  http.get('https://test.incidentiq.com/api/v1.0/notifications/emails/for/ticket/:ticketId', ({ params }) => {
    return HttpResponse.json({
      Items: [
        { EmailId: 'email-1', Subject: 'Ticket Update', Date: '2024-01-20', TicketId: params.ticketId },
        { EmailId: 'email-2', Subject: 'Ticket Resolved', Date: '2024-01-21', TicketId: params.ticketId }
      ],
      ItemCount: 2,
      Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
    });
  }),

  http.post('https://test.incidentiq.com/api/v1.0/notifications', async ({ request }) => {
    await request.json(); // Parse body but don't use it in this simple mock
    return HttpResponse.json({
      Items: [
        { NotificationId: 'notif-1', Type: 'TicketAssigned', Read: false },
        { NotificationId: 'notif-2', Type: 'TicketResolved', Read: true }
      ],
      ItemCount: 2,
      Paging: { PageIndex: 0, PageCount: 1, PageSize: 100 }
    });
  }),

  http.get('https://test.incidentiq.com/api/v1.0/notifications/unarchived', () => {
    return HttpResponse.json([
      { NotificationId: 'notif-1', Archived: false },
      { NotificationId: 'notif-2', Archived: false }
    ]);
  }),

  http.post('https://test.incidentiq.com/api/v1.0/notifications/all-read', () => {
    return HttpResponse.json({ success: true });
  }),

  // Analytics - Add missing analytics endpoint
  http.get('https://test.incidentiq.com/api/v1.0/analytics/:reportType', ({ params }) => {
    if (params.reportType === 'TicketSummary') {
      return HttpResponse.json({
        Success: true,
        Data: {
          reportType: 'TicketSummary',
          totalTickets: 150,
          openTickets: 45,
          closedTickets: 105,
          avgResolutionTime: 2.5
        }
      });
    }
    return HttpResponse.json({
      Success: true,
      Data: {
        reportType: params.reportType,
        data: 'Generic analytics data'
      }
    });
  })
];

export const server = setupServer(...handlers, ...additionalHandlers);

// Helper to reset and add new handlers for specific tests
export function addTestHandler(handler: any) {
  server.use(handler);
}