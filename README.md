# IncidentIQ MCP Server

> Model Context Protocol server for IncidentIQ - The #1 K-12 service management platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MCP SDK](https://img.shields.io/badge/MCP-v0.5.0-blue)](https://github.com/modelcontextprotocol)

## Overview

The IncidentIQ MCP Server enables AI assistants like Claude to interact with K-12 school district IncidentIQ instances, streamlining IT operations, asset management, and support workflows for educational institutions.

IncidentIQ is the #1 K-12 service management platform, used by over 2000 school districts across the United States. This MCP server provides seamless integration with IncidentIQ's comprehensive API, allowing AI assistants to:

- 🎫 **Manage IT help desk tickets** - Create, update, search, and close support tickets
- 💻 **Track technology assets** - Search and manage Chromebooks, iPads, and other devices
- 👥 **Look up users** - Find students, staff, and parents in the district system
- 🏫 **Navigate locations** - Access building and room information
- 📊 **Generate reports** - Access analytics and operational metrics
- 🔧 **Manage repairs** - Track parts inventory and device repair workflows

## Features

### Available MCP Tools

#### 🎫 Ticket Management
- `ticket_get_wizards` - Get available ticket creation wizards/forms
- `ticket_get_wizards_by_site` - Get wizards for a specific site

> ⚠️ **Note**: Other ticket operations (create, search, update, close) require additional API permissions. Contact your IncidentIQ administrator if you need these functions.

#### 💻 Asset Management
- `asset_search` - Search IT assets with filters
- `asset_get_by_tag` - Look up asset by tag number
- `asset_get` - Get detailed asset information
- `asset_get_counts` - Get inventory summary

#### 👥 User Management
- `user_search` - Search for users (students/staff/parents)
- `user_get` - Get user details
- `user_get_agents` - List IT support agents

#### 🏫 Location Management
- `location_list_all` - List all district locations
- `location_search` - Search for specific locations
- `location_get` - Get location details

## Installation

### Prerequisites
- Node.js >= 18.0.0
- Yarn package manager
- IncidentIQ API credentials from your district

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/IIQ-Community/mcp-incidentiq.git
cd mcp-incidentiq
```

2. Install dependencies:
```bash
yarn install
```

3. Configure your environment:
```bash
cp .env.example .env
```

Edit `.env` with your district's IncidentIQ credentials:
```env
# Your district's IncidentIQ URL (e.g., https://mydistrict.incidentiq.com/api/v1.0)
IIQ_API_BASE_URL=https://your-district.incidentiq.com/api/v1.0

# API key from IncidentIQ Administration > Developer Tools
IIQ_API_KEY=your-api-key-here

# Optional: Request timeout in milliseconds (default: 30000)
IIQ_API_TIMEOUT=30000
```

## Configuration

### Obtaining API Credentials

1. Log into your district's IncidentIQ instance as an administrator
2. Navigate to **Administration** > **Developer tools**
3. Generate or copy your API key (JWT token)
4. Note your district's base URL (format: `https://[district].incidentiq.com`)

### Claude Desktop Integration

To use this MCP server with Claude Desktop, see our comprehensive [Claude Desktop Setup Guide](docs/CLAUDE_DESKTOP_SETUP.md).

Quick configuration example:

1. Open Claude Desktop settings
2. Navigate to Developer > MCP Settings
3. Add the following configuration:

```json
{
  "mcpServers": {
    "incidentiq": {
      "command": "node",
      "args": ["/path/to/mcp-incidentiq/dist/index.js"],
      "env": {
        "IIQ_API_BASE_URL": "https://your-district.incidentiq.com/api/v1.0",
        "IIQ_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `/path/to/mcp-incidentiq` with the actual path to this project.

## Usage

### Development Mode

```bash
yarn dev
```

This starts the server with hot-reload enabled for development.

### Production Mode

```bash
yarn build
yarn start
```

### Testing Connection

Once connected to Claude, you can test your connection:

```
Claude: "Test the IncidentIQ connection"
```

This will verify:
- API key validity
- Network connectivity to your district's instance
- Proper configuration

### Example Interactions

```
# Search for tickets
Claude: "Search for open tickets in the main building"

# Look up an asset
Claude: "Find Chromebook with tag CHR-12345"

# Create a support ticket
Claude: "Create a ticket: Student's Chromebook won't turn on in room 203"

# Get user information
Claude: "Look up user John Smith"

# Check inventory
Claude: "Show me the asset inventory summary"
```

## K-12 Education Focus

This MCP server is specifically designed for K-12 educational environments:

### Key Use Cases

- **1:1 Device Programs**: Manage student Chromebooks and iPads efficiently
- **Classroom Support**: Quick ticket creation for classroom technology issues
- **Asset Tracking**: Track device assignments to students and staff
- **Building Management**: Organize support by schools and classrooms
- **Summer Refresh**: Support device collection and deployment workflows
- **Parent Communication**: Access parent-visible ticket information

### FERPA & Privacy Compliance

This tool is designed with student privacy in mind:
- No student data is stored by the MCP server
- All API calls go directly to your district's IncidentIQ instance
- Follow your district's data governance policies
- API access is controlled by your IncidentIQ permissions

## Development

### Project Structure

```
mcp-incidentiq/
├── src/
│   ├── index.ts          # Main MCP server entry point
│   ├── api/
│   │   └── client.ts     # IncidentIQ API client
│   ├── tools/            # MCP tool implementations
│   │   ├── tickets.ts    # Ticket management tools
│   │   ├── assets.ts     # Asset management tools
│   │   ├── users.ts      # User management tools
│   │   └── locations.ts  # Location management tools
│   └── types/            # TypeScript type definitions
│       └── common.ts     # Shared type definitions
└── dist/                 # Compiled JavaScript output
```

### Available Scripts

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build TypeScript to JavaScript
- `yarn start` - Run production server
- `yarn type-check` - Type check without building
- `yarn clean` - Clean build directory

## API Integration

### Supported IncidentIQ Modules

This MCP server integrates with IncidentIQ's core modules:

- ✅ **IT Help Desk** - Full ticket lifecycle management
- ✅ **Asset Management** - Device tracking and inventory
- ✅ **User Directory** - Student, staff, and parent lookup
- ✅ **Locations** - Building and room management
- 🚧 **Analytics** - Basic reporting (coming soon)
- 🚧 **Parts Inventory** - Repair parts tracking (coming soon)
- 🚧 **Custom Fields** - District-specific data (coming soon)

### API Rate Limiting

The server implements responsible API usage:
- Respects IncidentIQ rate limits
- Implements request timeout handling
- Provides detailed error messages
- Logs all API interactions for debugging

## Contributing

We welcome contributions from the K-12 IT community! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Ideas

- Additional tool implementations
- Integration with more IncidentIQ modules
- Improved error handling
- Documentation improvements
- Bug fixes and optimizations

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify your API key is correct
- Check the base URL format (should end with `/api/v1.0`)
- Ensure your IncidentIQ instance is accessible
- Verify API access is enabled for your account

**Tool Not Found**
- Run `yarn build` to compile the TypeScript code
- Restart Claude Desktop after configuration changes
- Check the MCP server logs for errors

**Permission Errors**
- Ensure your API key has appropriate permissions
- Some operations may require admin privileges
- Check with your IncidentIQ administrator

## Support

- **Issues**: [GitHub Issues](https://github.com/IIQ-Community/mcp-incidentiq/issues)
- **Discussions**: [GitHub Discussions](https://github.com/IIQ-Community/mcp-incidentiq/discussions)
- **Security**: See [SECURITY.md](SECURITY.md) for reporting vulnerabilities
- **IncidentIQ Support**: Contact your district's IncidentIQ administrator

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This is a community project and is not officially affiliated with or endorsed by IncidentIQ. IncidentIQ is a registered trademark of IncidentIQ, Inc.

## Acknowledgments

- The IIQ Community for collaboration and support
- K-12 IT professionals who contribute to this project
- IncidentIQ for providing comprehensive API documentation
- Anthropic for the Model Context Protocol SDK