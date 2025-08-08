# IncidentIQ API Permissions Guide

## Current Status (2025-01-08)

The MCP server has been tested against a production IncidentIQ instance. Due to API permission limitations, only certain endpoints are currently functional.

## Working Endpoints

### ✅ Fully Functional
- **Ticket Wizards**
  - GET `/api/v1.0/tickets/wizards` - Returns ticket creation form configurations
  - GET `/api/v1.0/tickets/wizards/site/{siteId}` - Returns wizards for specific site

### ⚠️ Requires Additional Permissions
The following endpoints return **401 Unauthorized** and require additional API permissions:

#### Ticket Operations
- POST `/api/v1.0/tickets` - Search tickets
- GET `/api/v1.0/tickets/{id}` - Get ticket details
- POST `/api/v1.0/tickets/new` - Create ticket
- PUT `/api/v1.0/tickets/{id}` - Update ticket
- PUT `/api/v1.0/tickets/{id}/close` - Close ticket
- GET `/api/v1.0/tickets/statuses` - Get statuses
- GET `/api/v1.0/tickets/priorities` - Get priorities

#### Other Operations
- Most user, asset, and location endpoints may also require additional permissions

### ❌ Non-Existent Endpoints
These endpoints return **404 Not Found** (not implemented in API):
- GET `/api/v1.0/tickets/categories`
- GET `/api/v1.0/tickets/{id}/attachments`
- GET `/api/v1.0/tickets/{id}/comments`
- GET `/api/v1.0/tickets/{id}/history`

## Requesting Additional Permissions

To enable full functionality, contact your IncidentIQ administrator and request:

1. **API Read Permissions** for:
   - Tickets
   - Users
   - Assets
   - Locations

2. **API Write Permissions** for:
   - Ticket creation
   - Ticket updates
   - Status changes

3. **Specific Scopes**:
   - `tickets.read`
   - `tickets.write`
   - `users.read`
   - `assets.read`
   - `locations.read`

## Testing Your Permissions

Use the test script to verify which endpoints work with your API key:

```bash
npx tsx scripts/test-specific-ticket.ts
```

Note: Use the ticket ID `9771c9fb-ed68-f011-8dca-000d3a0dbd19` for testing.

## Rate Limiting

⚠️ **Important**: The API enforces rate limiting. Use 10-second delays between requests to avoid being blocked.

## API Key Format

The API key should be a JWT token obtained from:
1. IncidentIQ Admin Portal
2. Navigate to Administration > Developer Tools
3. Generate or copy API key

The key will look like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting

### 401 Unauthorized
- Check API key is valid and not expired
- Verify permissions with your administrator
- Ensure proper Bearer token format in requests

### 404 Not Found
- Endpoint may not exist in your IncidentIQ version
- Check API documentation for your specific instance

### Rate Limiting
- Implement 10-second delays between requests
- Reduce request frequency
- Contact support if consistently blocked