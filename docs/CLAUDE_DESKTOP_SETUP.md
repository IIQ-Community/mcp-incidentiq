# Claude Desktop Integration Guide for IncidentIQ MCP Server

This guide walks you through setting up the IncidentIQ MCP server with Claude Desktop, enabling AI-powered management of your K-12 district's IT tickets, assets, and support operations.

## Prerequisites

- **Claude Desktop** installed on your system
- **Node.js** version 18 or higher
- **IncidentIQ API credentials** from your district administrator
- Administrator access to modify Claude Desktop configuration

## Step 1: Install the MCP Server

### Option A: Install from GitHub (Recommended)

```bash
# Clone the repository
git clone https://github.com/IIQ-Community/mcp-incidentiq.git
cd mcp-incidentiq

# Install dependencies
npm install

# Build the project
npm run build
```

### Option B: Install from npm (When Published)

```bash
npm install -g mcp-incidentiq
```

## Step 2: Configure Your API Credentials

1. Create a `.env` file in the project directory:

```bash
cp .env.example .env
```

2. Edit the `.env` file with your district's credentials:

```env
# Your district's IncidentIQ URL
IIQ_API_BASE_URL=https://your-district.incidentiq.com/api/v1.0

# Your API key from IncidentIQ admin panel
IIQ_API_KEY=your-jwt-token-here

# Optional settings
IIQ_API_TIMEOUT=30000
IIQ_DEBUG_MODE=false
```

## Step 3: Configure Claude Desktop

### Windows Configuration

1. Open Claude Desktop settings
2. Navigate to the MCP servers configuration
3. Add the following configuration:

```json
{
  "mcpServers": {
    "incidentiq": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-incidentiq\\dist\\index.js"],
      "env": {
        "IIQ_API_BASE_URL": "https://your-district.incidentiq.com/api/v1.0",
        "IIQ_API_KEY": "your-jwt-token-here"
      }
    }
  }
}
```

### macOS Configuration

1. Open Claude Desktop preferences
2. Go to Developer > MCP Settings
3. Add the configuration:

```json
{
  "mcpServers": {
    "incidentiq": {
      "command": "node",
      "args": ["/Users/yourname/mcp-incidentiq/dist/index.js"],
      "env": {
        "IIQ_API_BASE_URL": "https://your-district.incidentiq.com/api/v1.0",
        "IIQ_API_KEY": "your-jwt-token-here"
      }
    }
  }
}
```

### Linux Configuration

```json
{
  "mcpServers": {
    "incidentiq": {
      "command": "node",
      "args": ["/home/yourname/mcp-incidentiq/dist/index.js"],
      "env": {
        "IIQ_API_BASE_URL": "https://your-district.incidentiq.com/api/v1.0",
        "IIQ_API_KEY": "your-jwt-token-here"
      }
    }
  }
}
```

## Step 4: Verify the Connection

1. Restart Claude Desktop after saving the configuration
2. Open a new conversation with Claude
3. Ask Claude to test the IncidentIQ connection:

```
Can you check if the IncidentIQ MCP server is connected?
```

Claude should respond with available tools and confirm the connection to your district's IncidentIQ instance.

## Step 5: Using the MCP Server

Once connected, you can ask Claude to perform various IncidentIQ operations:

### Example Commands

#### Ticket Management
```
"Show me all open IT tickets"
"Create a ticket for a broken Chromebook in room 204"
"Update ticket #12345 with a note about ordering replacement parts"
"Close ticket #12345 with resolution 'Replaced device'"
```

#### Asset Management
```
"Find all Chromebooks assigned to the high school"
"Look up asset with tag CHR-2024-001"
"Show me devices that need warranty renewal"
"How many iPads do we have in inventory?"
```

#### User Management
```
"Find all IT support agents"
"Look up user John Smith"
"Show me all users at Lincoln Elementary"
```

#### Location Management
```
"List all district buildings"
"Show me all rooms in the main campus"
"Find computer labs at the high school"
```

## Available MCP Tools

The following tools are available through Claude:

### Ticket Tools
- `ticket_search` - Search and filter tickets
- `ticket_create` - Create new support tickets
- `ticket_get` - Get ticket details
- `ticket_update` - Update ticket information
- `ticket_close` - Close resolved tickets
- `ticket_get_statuses` - List ticket statuses
- `ticket_get_categories` - List ticket categories
- `ticket_get_priorities` - List priority levels

### Asset Tools
- `asset_search` - Search IT assets
- `asset_get` - Get asset details
- `asset_get_by_tag` - Find asset by tag number
- `asset_get_counts` - Get inventory counts

### User Tools
- `user_search` - Search for users
- `user_get` - Get user details
- `user_get_agents` - List IT agents

### Location Tools
- `location_list_all` - List all locations
- `location_search` - Search locations
- `location_get` - Get location details

## Troubleshooting

### Connection Issues

If Claude cannot connect to IncidentIQ:

1. **Verify API credentials** in your `.env` file
2. **Check the API URL** format: `https://district.incidentiq.com/api/v1.0`
3. **Ensure API key** has proper permissions (read/write for desired operations)
4. **Test manually** using the validation script:

```bash
npm run validate
```

### Permission Errors

If you receive 401 or 403 errors:

1. Verify your API key is valid and not expired
2. Check with your IncidentIQ administrator for proper permissions
3. Ensure the API key has access to the modules you're trying to use

### Empty Results

If searches return no results:

1. Verify data exists in your IncidentIQ instance
2. Check if your API user has visibility to the data
3. Try broader search criteria
4. Ensure proper filtering permissions are set

## Security Best Practices

1. **Never share your API key** - Keep it secure and private
2. **Use read-only keys** for querying operations when possible
3. **Rotate keys regularly** according to your district's security policy
4. **Monitor API usage** through IncidentIQ's admin panel
5. **Restrict permissions** to only necessary operations
6. **Store credentials securely** - Never commit them to version control

## Getting Your API Key

To obtain an API key from IncidentIQ:

1. Log into your district's IncidentIQ instance as an administrator
2. Navigate to **Administration** > **Developer tools**
3. Click **Generate API Key** or **Create New Token**
4. Set appropriate permissions for the key:
   - IT Help Desk (for ticket operations)
   - Asset Management (for device tracking)
   - User Management (for user lookups)
   - Facilities (if using location features)
5. Copy the JWT token and store it securely
6. Note your district's base URL (format: `https://[district].incidentiq.com`)

## Support and Resources

- **GitHub Repository**: [IIQ-Community/mcp-incidentiq](https://github.com/IIQ-Community/mcp-incidentiq)
- **Issues and Bugs**: [GitHub Issues](https://github.com/IIQ-Community/mcp-incidentiq/issues)
- **IncidentIQ Documentation**: Available in your IncidentIQ admin panel
- **MCP Documentation**: [Model Context Protocol](https://github.com/modelcontextprotocol)

## Contributing

This is a community project for K-12 districts. Contributions are welcome! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

## License

MIT License - See [LICENSE](../LICENSE) for details.