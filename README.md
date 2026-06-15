# IncidentIQ MCP Server

> Model Context Protocol server for IncidentIQ - The #1 K-12 service management platform

[![CI](https://github.com/IIQ-Community/mcp-incidentiq/actions/workflows/ci.yml/badge.svg)](https://github.com/IIQ-Community/mcp-incidentiq/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/package-json/v/IIQ-Community/mcp-incidentiq)](https://github.com/IIQ-Community/mcp-incidentiq/releases)
[![Release](https://img.shields.io/github/v/release/IIQ-Community/mcp-incidentiq?sort=semver)](https://github.com/IIQ-Community/mcp-incidentiq/releases/latest)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![MCP SDK](https://img.shields.io/badge/MCP-v0.5.0-blue)](https://github.com/modelcontextprotocol)

## Overview

The IncidentIQ MCP Server enables AI assistants like Claude to interact with K-12 school district IncidentIQ instances, streamlining IT operations, asset management, and support workflows for educational institutions.

IncidentIQ is the #1 K-12 service management platform, used by over 2000 school districts across the United States. This MCP server provides seamless integration with IncidentIQ's comprehensive API, allowing AI assistants to:

- 🎫 **Manage IT help desk tickets** - Search, view, update status, set urgency/sensitivity, manage assignments
- 💻 **Track technology assets** - Search and manage Chromebooks, iPads, and other devices
- 👥 **Look up users** - Find students, staff, and parents in the district system
- 🏫 **Navigate locations** - Access building and room information
- 👪 **Coordinate teams** - View IT support teams, members, and workloads
- 🔧 **Manage repairs** - Track parts inventory, purchase orders, and device repair workflows

## Features

### 📊 Comprehensive API Coverage

**158 MCP tools across 12 registered domain modules**, all wired into the server and validated against a production K-12 district instance.

| Module | Status | Tools |
|--------|--------|-------|
| Tickets | ✅ Registered | 15 |
| Assets | ✅ Registered | 15 |
| Users | ✅ Registered | 15 |
| Locations | ✅ Registered | 17 |
| Teams | ✅ Registered | 9 |
| Parts | ✅ Registered | 20 |
| Purchase Orders | ✅ Registered | 14 |
| Issues | ✅ Registered | 20 |
| Custom Fields | ✅ Registered | 18 |
| SLAs | ✅ Registered | 4 |
| Views | ✅ Registered | 5 |
| Notifications | ✅ Registered | 6 |
| Analytics | 🚧 Implemented, not yet registered | 11 |

### Available MCP Tools

#### 🎫 Ticket Management (15 tools)

**Search & List Operations**
- `ticket_search` - Search tickets with text, pagination, and facet filters: `statusIds`, `agentIds`, `agentEmails` (any domain), `teamIds`, `locationIds`. Multiple values within a facet match ANY (OR); different facets are combined with AND. Status filtering scans a bounded number of pages (set `IIQ_TICKET_FILTER_MAX_PAGES`, default 5, range 1-50; results past the cap are flagged as truncated).
- `ticket_get` - Get detailed ticket information by ID
- `ticket_get_statuses` - Get all available ticket statuses
- `ticket_get_priorities` - Get all available ticket priorities

**Ticket Details**
- `ticket_get_assets` - Get assets linked to a ticket
- `ticket_get_sla` - Get SLA information for a ticket

**Status Management**
- `ticket_update_status` - Update ticket status (waiting/responded)
- `ticket_set_urgency` - Mark ticket as urgent/not urgent
- `ticket_set_sensitivity` - Mark ticket as sensitive/not sensitive
- `ticket_confirm_issue` - Confirm or unconfirm the issue

**Ticket Actions**
- `ticket_cancel` - Cancel a ticket
- `ticket_unassign` - Unassign from user/team/SLA
- `ticket_mark_duplicate` - Mark as duplicate of another ticket

**Wizard Operations**
- `ticket_get_wizards` - Get available ticket creation wizards
- `ticket_get_wizards_by_site` - Get wizards for a specific site

#### 💻 Asset Management (15 tools)
- `asset_search_advanced` - Search IT assets with filters and pagination
- `asset_find_by_tag` / `asset_search_by_tag` - Look up asset(s) by tag number
- `asset_find_by_serial` / `asset_search_by_serial` - Look up asset(s) by serial number
- `asset_get_history` - Get an asset's activity history
- `asset_get_user_devices` - List devices assigned to a user
- `asset_get_inventory_counts` - Get inventory summary counts
- `asset_get_status_types` / `asset_get_funding_types` - Reference data
- ...and more (spares, favorites, by-room, by-storage)

#### 👥 User Management (15 tools)
- `user_search_advanced` / `user_quick_search` - Search for users (students/staff/parents)
- `user_get_details` - Get user details by ID
- `user_get_students` / `user_get_staff` / `user_get_parents` - Filtered directory lookups
- `user_get_all_agents` / `user_search_agents` - List IT support agents
- `user_get_by_location` - Users at a location
- `user_statistics_grades` / `user_statistics_locations` - Population statistics
- ...and more (groups, permissions, current user)

#### 🏫 Location Management (17 tools)
- `location_get_all` - List all district locations
- `location_search_advanced` - Search for specific locations
- `location_get_details` - Get location details by ID
- `location_get_buildings` / `location_get_campuses` - Building hierarchy
- `location_get_building_rooms` / `location_find_special_rooms` - Room lookups
- `location_get_assets` / `location_get_users` / `location_get_tickets` - Cross-references
- ...and more (hierarchy, children, available rooms)

#### 👪 Team Management (9 tools)
- `team_get_all` / `team_search` - List or search IT support teams
- `team_get` / `team_get_members` / `team_get_agents` - Team detail and roster
- `team_get_tickets` / `team_get_locations` / `team_get_categories` / `team_get_stats` - Team context

#### 🔧 Parts & Repair (20 tools)
- `parts_get_all` / `parts_search` / `parts_find_by_number` - Inventory lookup
- `parts_check_stock` / `parts_get_low_stock` / `parts_get_by_location` - Stock tracking
- `parts_get_chromebook_parts` / `parts_get_ipad_parts` / `parts_get_compatible` - Device parts
- `parts_get_suppliers` / `parts_get_supplier_details` - Suppliers
- `parts_record_usage` / `parts_transfer` / `parts_get_repair_costs` - Repair workflows
- ...and more (orders, common repairs, ticket parts)

#### 🧾 Purchase Orders (14 tools)
- `purchaseorder_get_all` / `purchaseorder_search` / `purchaseorder_get` - PO lookup
- `purchaseorder_get_pending` / `purchaseorder_get_approved` / `purchaseorder_get_completed` - By status
- `purchaseorder_get_items` / `purchaseorder_get_parts` / `purchaseorder_get_attachments` - PO contents
- `purchaseorder_get_history` / `purchaseorder_get_summary` / `purchaseorder_get_supplier` - PO context

#### 🐞 Issue Types (20 tools)
- `issues_get_types` / `issues_search_types` / `issues_get_type_details` - Issue type catalog
- `issues_get_categories` / `issues_get_category_hierarchy` - Category structure
- `issues_get_chromebook_issues` / `issues_get_network_issues` / `issues_get_classroom_tech` - Common K-12 issues
- `issues_get_priorities` / `issues_get_priority_sla` - Priority and SLA mapping
- ...and more (templates, recurring, seasonal, parent portal)

#### 🏷️ Custom Fields (18 tools)
- `customfield_get_all` / `customfield_search` / `customfield_find_by_name` - Field catalog
- `customfield_get_by_entity` / `customfield_get_types` / `customfield_get_type_details` - Field definitions
- `customfield_get_asset_values` / `customfield_get_ticket_values` / `customfield_get_user_values` / `customfield_get_location_values` - Field values
- `customfield_validate_value` / `customfield_get_required` / `customfield_get_options` - Validation

#### 📈 SLA Management (4 tools)
- `sla_list` - Get all configured SLAs
- `sla_get_metrics` - Get SLA performance metrics
- `sla_get_metric_types` - Get metric types (Response/Resolution/Custom)
- `sla_get_ticket_status` - Check SLA compliance for a ticket

#### 👁️ View Management (5 tools)
- `view_list_all` - Get all available views
- `view_list_user` - Get user-specific views
- `view_list_tickets` - Get ticket views
- `view_list_assets` - Get asset views
- `view_list_users` - Get user directory views

#### 🔔 Notifications & Emails (6 tools)
- `notification_get_ticket_emails` - Get emails for a ticket
- `notification_query` - Search notifications with filters
- `notification_get_unread` - Get unread notifications
- `notification_get_unarchived` - Get unarchived notifications
- `notification_mark_all_read` - Mark all as read
- `notification_mark_read` - Mark specific notification as read

## Installation

### Prerequisites
- [Node.js](https://nodejs.org) >= 22 (LTS)
- IncidentIQ API credentials from your district

> **Note:** This server runs on Node.js and is launched by MCP clients via `node` (or `npx`),
> matching the standard MCP-server convention. The development toolchain uses npm + Vitest.

### Install (published package)

Released versions are published to **GitHub Packages** as `@iiq-community/mcp-incidentiq` and the package tarball is attached to each **GitHub Release**. Two install paths:

**A — GitHub Packages registry (requires a token).** GitHub Packages requires authentication even for *public* packages, so create an `.npmrc` with a GitHub token that has the `read:packages` scope:

```ini
# .npmrc
@iiq-community:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @iiq-community/mcp-incidentiq
```

**B — GitHub Release tarball (token-free).** Download `iiq-community-mcp-incidentiq-<version>.tgz` from the [latest release](https://github.com/IIQ-Community/mcp-incidentiq/releases/latest), then install it directly — no registry auth needed:

```bash
npm install ./iiq-community-mcp-incidentiq-<version>.tgz
```

Both expose the `mcp-incidentiq` binary; point your MCP client at it (e.g. `npx @iiq-community/mcp-incidentiq` once the `.npmrc` is set, or `node .../dist/index.js`). See the integration examples below. To work on the server itself, use the from-source setup:

### Quick Start (from source)

1. Clone the repository:
```bash
git clone https://github.com/IIQ-Community/mcp-incidentiq.git
cd mcp-incidentiq
```

2. Install dependencies:
```bash
npm install
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

### Integration with AI Assistants

#### Claude Code Integration

First build the server (`npm run build`), then register it with the Claude Code CLI:

```bash
claude mcp add incidentiq \
  -e IIQ_API_BASE_URL=https://your-district.incidentiq.com/api/v1.0 \
  -e IIQ_API_KEY=your-api-key-here \
  -- node /path/to/mcp-incidentiq/dist/index.js
```

Replace `/path/to/mcp-incidentiq` with the actual path to this project. Verify it was added with `claude mcp list`.

#### Claude Desktop Integration

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
npm run dev
```

This starts the server with hot-reload enabled for development.

### Production Mode

```bash
npm run build
npm run start
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
# Search and view tickets
Claude: "Search for all urgent tickets"
Claude: "Show me details for ticket 00000000-0000-0000-0000-000000000000"
Claude: "Get all ticket priorities and statuses"

# Update ticket status
Claude: "Mark ticket [id] as waiting on requestor"
Claude: "Set ticket [id] as urgent and sensitive"
Claude: "Confirm the issue in ticket [id]"

# Manage ticket assignments
Claude: "Cancel ticket [id]"
Claude: "Unassign ticket [id] from the current team"
Claude: "Mark ticket [id] as duplicate of [other-id]"

# Look up assets
Claude: "Find Chromebook with tag CHR-12345"
Claude: "Show assets linked to ticket [id]"

# Get user information
Claude: "Look up user Jane User"

# Check SLA status
Claude: "Show SLA information for ticket [id]"
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
│   ├── index.ts             # Main MCP server entry point (registers all tool modules)
│   ├── api/
│   │   └── client.ts        # IncidentIQ API client
│   ├── tools/               # MCP tool implementations (one module per domain)
│   │   ├── tickets.ts       # Ticket management tools
│   │   ├── assets.ts        # Asset management tools
│   │   ├── users.ts         # User management tools
│   │   ├── locations.ts     # Location management tools
│   │   ├── teams.ts         # Team management tools
│   │   ├── parts.ts         # Parts & repair tools
│   │   ├── purchaseorders.ts# Purchase order tools
│   │   ├── issues.ts        # Issue type tools
│   │   ├── customfields.ts  # Custom field tools
│   │   ├── slas.ts          # SLA tools
│   │   ├── views.ts         # View tools
│   │   ├── notifications.ts # Notification & email tools
│   │   └── analytics.ts     # Analytics tools (defined, not yet registered)
│   └── types/               # TypeScript type definitions
│       └── common.ts        # Shared type definitions
└── dist/                    # Compiled JavaScript output
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Run production server
- `npm run type-check` - Type check without building
- `npm run clean` - Clean build directory
- `npm run test` / `npm run test:unit` - Run the unit test suite
- `npm run test:coverage` - Run unit tests with a coverage report

## API Integration

### Supported IncidentIQ Modules

This MCP server integrates with IncidentIQ's core modules:

- ✅ **IT Help Desk** - Full ticket lifecycle management
- ✅ **Asset Management** - Device tracking and inventory
- ✅ **User Directory** - Student, staff, and parent lookup
- ✅ **Locations** - Building and room management
- ✅ **Teams** - IT support team rosters and workloads
- ✅ **Parts Inventory** - Repair parts tracking and supplier management
- ✅ **Purchase Orders** - PO tracking by status, items, and history
- ✅ **Issue Types** - Issue/category catalog and K-12 issue templates
- ✅ **Custom Fields** - District-specific data across all entities
- ✅ **SLAs / Views / Notifications** - Compliance metrics, saved views, and email/notification access
- 🚧 **Analytics** - Reporting tools implemented but not yet registered in the server

### API Rate Limiting

The server implements responsible API usage:
- Respects IncidentIQ rate limits
- Implements request timeout handling
- Provides detailed error messages
- Logs all API interactions for debugging

## Contributing

We welcome contributions from the K-12 IT community! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

**Governance:** `main` is protected — contributions land via pull requests with 1 approval + Code Owner review, all CI checks passing, conversation resolution, and merge-commit-only. See [Repository Governance](CONTRIBUTING.md#repository-governance) for the full workflow and security settings.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `git commit -m 'feat: add amazing feature'`. A commitlint `commit-msg` hook (enforced via the pre-commit framework) rejects non-conforming messages locally; see [CONTRIBUTING.md](CONTRIBUTING.md#enforcement).
4. Push to the branch (`git push origin feat/amazing-feature`)
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
- Run `npm run build` to compile the TypeScript code
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

## Versioning & Releases

This project follows [Semantic Versioning](https://semver.org/) and uses
[semantic-release](https://semantic-release.gitbook.io/) for fully automated releases. Every push to
`main` analyzes the [Conventional Commit](https://www.conventionalcommits.org/) history, computes the
next version, publishes a GitHub Release with generated notes, and updates `CHANGELOG.md` /
`CITATION.cff` / `package.json` — no manual version bumps. The project is in the **0.x** line, so a
breaking change yields a minor bump (not `1.0.0`). See [CONTRIBUTING.md](CONTRIBUTING.md#automated-releases)
for details and [CHANGELOG.md](CHANGELOG.md) for version history.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This is a community project and is not officially affiliated with or endorsed by IncidentIQ. IncidentIQ is a registered trademark of IncidentIQ, Inc.

## Acknowledgments

- The IIQ Community for collaboration and support
- K-12 IT professionals who contribute to this project
- IncidentIQ for providing comprehensive API documentation
- Anthropic for the Model Context Protocol SDK