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