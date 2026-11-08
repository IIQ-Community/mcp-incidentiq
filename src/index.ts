#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Load environment variables. quiet:true keeps dotenv's startup log off stdout: this
// process speaks MCP JSON-RPC over stdout (StdioServerTransport below), so any stray stdout
// write would corrupt the protocol stream. dotenv v17 changed the default to quiet:false, so
// set it explicitly (the option is a no-op on the currently pinned 16.x, protective on 17.x).
dotenv.config({ quiet: true });

import { createToolRouter } from './router.js';

// Create server instance for IncidentIQ K-12 service management platform
const server = new Server(
  {
    name: 'mcp-incidentiq',
    version: '0.5.4',
    description: 'MCP server for IncidentIQ - The #1 K-12 service management platform',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool list + name -> handler dispatch (see router.ts)
const router = createToolRouter();

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: router.listTools() }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return router.callTool(name, args);
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