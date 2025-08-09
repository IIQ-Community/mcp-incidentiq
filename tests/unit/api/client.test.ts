import { IncidentIQClient } from '../../../src/api/client';
import { server } from '../../mocks/server';

// Enable API mocking before tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('IncidentIQClient', () => {
  let client: IncidentIQClient;

  beforeEach(() => {
    client = new IncidentIQClient('https://test.incidentiq.com/api/v1.0', 'test-api-key');
  });

  describe('Connection', () => {
    it('should successfully test connection with valid credentials', async () => {
      const result = await client.testConnection();
      
      expect(result.connected).toBe(true);
      expect(result.districtName).toBe('test');
      expect(result.error).toBeUndefined();
    });

    it('should handle connection failure gracefully', async () => {
      // Create a client with invalid URL to trigger error
      const badClient = new IncidentIQClient('https://invalid.url/api', 'test-key');
      const result = await badClient.testConnection();
      
      expect(result.connected).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Ticket Operations', () => {
    describe('searchTickets', () => {
      it('should search tickets with filters', async () => {
        const result = await client.searchTickets({
          SearchText: 'chromebook',
          PageIndex: 0,
          PageSize: 10,
        });

        expect(result.Items).toHaveLength(1);
        expect(result.Items[0].Subject).toContain('Chromebook');
        expect(result.TotalCount).toBeGreaterThan(0);
      });

      it('should handle empty search results', async () => {
        const result = await client.searchTickets({
          SearchText: 'nonexistent-ticket',
        });

        expect(result.Items).toHaveLength(0);
        expect(result.TotalCount).toBe(2); // Total in mock data
      });
    });

    describe('getTicket', () => {
      it('should retrieve a specific ticket', async () => {
        const ticket = await client.getTicket('ticket-1');

        expect(ticket).toBeDefined();
        expect(ticket?.TicketId).toBe('ticket-1');
        expect(ticket?.Subject).toBe('Chromebook won\'t turn on');
      });

      it('should return null for non-existent ticket', async () => {
        const ticket = await client.getTicket('invalid-id');

        expect(ticket).toBeNull();
      });
    });

    describe('createTicket', () => {
      it('should create a new ticket', async () => {
        const newTicket = await client.createTicket({
          Subject: 'Test Ticket',
          Description: 'Test Description',
        });

        expect(newTicket).toBeDefined();
        expect(newTicket?.Subject).toBe('Test Ticket');
        expect(newTicket?.StatusName).toBe('Open');
      });
    });

    describe('updateTicket', () => {
      it('should update an existing ticket', async () => {
        const updated = await client.updateTicket('ticket-1', {
          Subject: 'Updated Subject',
          PriorityId: '3',
        });

        expect(updated).toBeDefined();
        expect(updated?.TicketId).toBe('ticket-1');
      });
    });

    describe('closeTicket', () => {
      it('should close a ticket', async () => {
        const success = await client.closeTicket('ticket-1', 'Resolved the issue');

        expect(success).toBe(true);
      });
    });

    describe('getTicketStatuses', () => {
      it('should retrieve ticket statuses', async () => {
        const statuses = await client.getTicketStatuses();

        expect(statuses).toHaveLength(3);
        expect(statuses[0].StatusName).toBe('Open');
        expect(statuses[0].IsDefault).toBe(true);
      });
    });

    // Note: getTicketCategories and getTicketPriorities endpoints
    // return 404 in production API - these may not be valid endpoints
  });

  describe('User Operations', () => {
    describe('searchUsers', () => {
      it('should search users with filters', async () => {
        const result = await client.searchUsers({
          SearchText: 'jane',
          PageIndex: 0,
          PageSize: 10,
        });

        expect(result.Items).toHaveLength(1);
        expect(result.Items[0].FullName).toBe('Jane Teacher');
      });
    });

    describe('getUser', () => {
      it('should retrieve a specific user', async () => {
        const user = await client.getUser('user-1');

        expect(user).toBeDefined();
        expect(user?.UserId).toBe('user-1');
        expect(user?.Email).toBe('jane.teacher@school.edu');
      });

      it('should return null for non-existent user', async () => {
        const user = await client.getUser('invalid-id');

        expect(user).toBeNull();
      });
    });

    describe('getAgents', () => {
      it('should retrieve IT agents', async () => {
        const agents = await client.getAgents();

        expect(agents).toHaveLength(1);
        expect(agents[0].Role).toBe('IT Agent');
        expect(agents[0].FullName).toBe('John IT');
      });
    });
  });

  describe('Asset Operations', () => {
    describe('searchAssets', () => {
      it('should search assets with filters', async () => {
        const result = await client.searchAssets({
          SearchText: 'CHR',
          PageIndex: 0,
          PageSize: 10,
        });

        expect(result.Items).toHaveLength(2);
        expect(result.Items[0].AssetTypeName).toBe('Chromebook');
      });
    });

    describe('getAsset', () => {
      it('should retrieve a specific asset', async () => {
        const asset = await client.getAsset('asset-1');

        expect(asset).toBeDefined();
        expect(asset?.AssetId).toBe('asset-1');
        expect(asset?.AssetTag).toBe('CHR-12345');
      });
    });

    describe('searchAssetByTag', () => {
      it('should find asset by tag number', async () => {
        const asset = await client.searchAssetByTag('CHR-12345');

        expect(asset).toBeDefined();
        expect(asset?.AssetId).toBe('asset-1');
        expect(asset?.ModelName).toBe('HP Chromebook 11 G9');
      });

      it('should return null for non-existent asset tag', async () => {
        const asset = await client.searchAssetByTag('INVALID-TAG');

        expect(asset).toBeNull();
      });
    });

    describe('getAssetCounts', () => {
      it('should retrieve asset inventory counts', async () => {
        const counts = await client.getAssetCounts();

        expect(counts).toBeDefined();
        expect(counts.Chromebook).toBe(1500);
        expect(counts.iPad).toBe(300);
        expect(counts.Desktop).toBe(200);
      });
    });
  });

  describe('Location Operations', () => {
    describe('getAllLocations', () => {
      it('should retrieve all locations', async () => {
        const locations = await client.getAllLocations();

        expect(locations).toHaveLength(5);
        expect(locations.map(l => l.LocationName)).toContain('Main Building');
        expect(locations.map(l => l.LocationName)).toContain('Library');
      });
    });

    describe('getLocation', () => {
      it('should retrieve a specific location', async () => {
        const location = await client.getLocation('loc-1');

        expect(location).toBeDefined();
        expect(location?.LocationId).toBe('loc-1');
        expect(location?.LocationName).toBe('Main Building');
        expect(location?.LocationTypeName).toBe('Building');
      });

      it('should return null for non-existent location', async () => {
        const location = await client.getLocation('invalid-id');

        expect(location).toBeNull();
      });
    });

    describe('searchLocations', () => {
      it('should search locations with filters', async () => {
        const result = await client.searchLocations({
          SearchText: 'building',
          PageSize: 5
        });

        expect(result).toBeDefined();
        expect(result.Items).toBeDefined();
        expect(Array.isArray(result.Items)).toBe(true);
      });
    });
  });

  describe('Additional API Methods', () => {
    describe('Teams', () => {
      it('should get all teams', async () => {
        const teams = await client.getAllTeams();
        expect(Array.isArray(teams)).toBe(true);
      });
    });

    describe('Parts Management', () => {
      it('should get all parts', async () => {
        const parts = await client.getParts();
        expect(Array.isArray(parts)).toBe(true);
      });

      it('should get individual part', async () => {
        const part = await client.getPart('part-123');
        expect(part).toBeDefined();
      });

      it('should get parts suppliers', async () => {
        const suppliers = await client.getPartsSuppliers();
        expect(Array.isArray(suppliers)).toBe(true);
      });
    });

    describe('Categories and Custom Fields', () => {
      it('should search categories', async () => {
        const result = await client.searchCategories({ SearchText: 'hardware' });
        expect(result).toBeDefined();
        expect(result.Items).toBeDefined();
      });

      it('should search custom fields for tickets', async () => {
        const fields = await client.searchCustomFields('Ticket');
        expect(Array.isArray(fields)).toBe(true);
      });

      it('should get custom field types', async () => {
        const types = await client.getCustomFieldTypes();
        expect(Array.isArray(types)).toBe(true);
      });
    });

    describe('Location Extensions', () => {
      it('should get location rooms', async () => {
        const rooms = await client.getLocationRooms();
        expect(Array.isArray(rooms)).toBe(true);
      });
    });

    describe('Purchase Orders', () => {
      it('should get purchase orders', async () => {
        const pos = await client.getPurchaseOrders();
        expect(Array.isArray(pos)).toBe(true);
      });
    });

    describe('Manufacturers and Issues', () => {
      it('should get global manufacturers', async () => {
        const manufacturers = await client.getGlobalManufacturers();
        expect(Array.isArray(manufacturers)).toBe(true);
      });

      it('should get issue types', async () => {
        const types = await client.getIssueTypes();
        expect(Array.isArray(types)).toBe(true);
      });
    });

    describe('Analytics', () => {
      it('should get analytics report', async () => {
        const report = await client.getAnalyticsReport('TicketSummary');
        expect(report).toBeDefined();
      });
    });

    describe('SLA Management', () => {
      it('should get SLAs', async () => {
        const slas = await client.getSLAs();
        expect(Array.isArray(slas)).toBe(true);
      });

      it('should get SLA metrics', async () => {
        const metrics = await client.getSLAMetrics();
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should get SLA metric types', async () => {
        const types = await client.getSLAMetricTypes();
        expect(Array.isArray(types)).toBe(true);
      });

      it('should get ticket SLA', async () => {
        const sla = await client.getTicketSLA('ticket-123');
        expect(sla).toBeDefined();
      });
    });

    describe('View Management', () => {
      it('should get user views', async () => {
        const views = await client.getUserViews();
        expect(Array.isArray(views)).toBe(true);
      });

      it('should get views', async () => {
        const views = await client.getViews();
        expect(Array.isArray(views)).toBe(true);
      });

      it('should get ticket views', async () => {
        const views = await client.getTicketViews();
        expect(Array.isArray(views)).toBe(true);
      });

      it('should get asset views', async () => {
        const views = await client.getAssetViews();
        expect(Array.isArray(views)).toBe(true);
      });
    });

    describe('Notifications', () => {
      it('should get ticket emails', async () => {
        const emails = await client.getTicketEmails('ticket-123');
        expect(Array.isArray(emails)).toBe(true);
      });

      it('should query notifications', async () => {
        const notifications = await client.queryNotifications();
        expect(Array.isArray(notifications)).toBe(true);
      });

      it('should get unarchived notifications', async () => {
        const notifications = await client.getUnarchivedNotifications();
        expect(Array.isArray(notifications)).toBe(true);
      });

      it('should mark all notifications read', async () => {
        const result = await client.markAllNotificationsRead();
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    describe('Input Validation', () => {
      it('should handle empty parameters', async () => {
        const result = await client.searchTickets({});
        expect(result).toBeDefined();
      });

      it('should handle null IDs', async () => {
        // Empty ID should result in an API error (405 Method Not Allowed)
        await expect(client.getTicket('')).rejects.toThrow();
      });
    });

    describe('Network Errors', () => {
      it('should handle API errors gracefully', async () => {
        const result = await client.getTicket('error-trigger');
        expect(result).toBeNull();
      });
    });

    describe('Configuration', () => {
      it('should handle missing parameters in constructor', () => {
        const client1 = new IncidentIQClient();
        expect(client1).toBeDefined();

        const client2 = new IncidentIQClient('https://test.com');
        expect(client2).toBeDefined();
      });

      it('should handle configuration options', () => {
        const client = new IncidentIQClient('https://test.com', 'key');
        expect(client).toBeDefined();
      });
    });
  });
});