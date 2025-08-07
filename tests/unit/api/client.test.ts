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
  });
});