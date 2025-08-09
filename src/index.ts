#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import tool handlers
import { ticketTools, handleTicketTool } from './tools/tickets.js';
import { userTools, handleUserTool } from './tools/users.js';
import { assetTools, handleAssetTool } from './tools/assets.js';
import { locationTools, handleLocationTool } from './tools/locations.js';
import { teamTools, handleTeamTool } from './tools/teams.js';
import { PartsTools } from './tools/parts.js';
import { purchaseOrderTools, handlePurchaseOrderTool } from './tools/purchaseorders.js';
import { IssueTools } from './tools/issues.js';
import { CustomFieldTools } from './tools/customfields.js';
import { SLATools } from './tools/slas.js';
import { ViewTools } from './tools/views.js';
import { NotificationTools } from './tools/notifications.js';
import { IncidentIQClient } from './api/client.js';

// Create server instance for IncidentIQ K-12 service management platform
const server = new Server(
  {
    name: 'mcp-incidentiq',
    version: '0.1.0',
    description: 'MCP server for IncidentIQ - The #1 K-12 service management platform',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize tool handlers
const client = new IncidentIQClient();
const partsTools = new PartsTools(client);
const issueTools = new IssueTools(client);
const customFieldTools = new CustomFieldTools(client);
const slaTools = new SLATools(client);
const viewTools = new ViewTools(client);
const notificationTools = new NotificationTools(client);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'test_connection',
        description: 'Test connection to IncidentIQ API and verify authentication for your K-12 district',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      // IT Help Desk & Ticketing
      ...ticketTools,
      // User Management (Students, Staff, Parents)
      ...userTools,
      // IT Asset Management (Chromebooks, iPads, etc.)
      ...assetTools,
      // Location Management (Buildings, Rooms)
      ...locationTools,
      // Teams Management
      ...teamTools,
      // Parts & Inventory Management
      ...partsTools.getTools(),
      // Purchase Orders
      ...purchaseOrderTools,
      // Issues & Categories
      ...issueTools.getTools(),
      // Custom Fields
      ...customFieldTools.getTools(),
      // SLA Management
      ...slaTools.getTools(),
      // View Management
      ...viewTools.getTools(),
      // Notifications & Emails
      ...notificationTools.getTools(),
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Test connection tool
  if (name === 'test_connection') {
    try {
      const client = new IncidentIQClient();
      const result = await client.testConnection();
      return {
        content: [
          {
            type: 'text',
            text: result.connected 
              ? `✅ Connected to IncidentIQ\nDistrict: ${result.districtName || 'Unknown'}\nAPI Base URL: ${process.env.IIQ_API_BASE_URL}`
              : `❌ Connection failed: ${result.error}\nPlease check your API key and base URL configuration.`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Connection error: ${error.message}`,
          },
        ],
      };
    }
  }

  // Ticket tools
  if (name.startsWith('ticket_')) {
    return await handleTicketTool(name, args);
  }

  // User tools
  if (name.startsWith('user_')) {
    return await handleUserTool(name, args);
  }

  // Asset tools
  if (name.startsWith('asset_')) {
    return await handleAssetTool(name, args);
  }

  // Location tools
  if (name.startsWith('location_')) {
    return await handleLocationTool(name, args);
  }

  // Team tools
  if (name.startsWith('team_')) {
    return await handleTeamTool(name, args);
  }

  // Parts tools
  if (name.startsWith('part_')) {
    try {
      const result = await partsTools.handleToolCall(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  // Purchase Order tools
  if (name.startsWith('purchaseorder_')) {
    return await handlePurchaseOrderTool(name, args);
  }

  // Issue tools
  if (name.startsWith('issue_')) {
    try {
      const result = await issueTools.handleToolCall(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  // Custom Field tools
  if (name.startsWith('customfield_')) {
    try {
      const result = await customFieldTools.handleToolCall(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  // SLA tools
  if (name.startsWith('sla_')) {
    try {
      const result = await slaTools.handleToolCall(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  // View tools
  if (name.startsWith('view_')) {
    try {
      const result = await viewTools.handleToolCall(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  // Notification tools
  if (name.startsWith('notification_')) {
    try {
      const result = await notificationTools.handleToolCall(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('IncidentIQ MCP Server started - Ready to support K-12 IT operations');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});