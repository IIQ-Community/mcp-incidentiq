import { IncidentIQClient } from './api/client.js';
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

/** MCP tool-call result shape returned to the client. */
export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
}

/** Tool definition as advertised by ListTools (the modules declare `inputSchema.type` as a plain string). */
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

type ToolHandler = (name: string, args: any) => Promise<unknown>;

interface Route {
  prefix: string;
  tools: ToolDefinition[];
  handle: ToolHandler;
}

const testConnectionTool: ToolDefinition = {
  name: 'test_connection',
  description: 'Test connection to IncidentIQ API and verify authentication for your K-12 district',
  inputSchema: { type: 'object', properties: {}, required: [] },
};

/** True when a handler already produced an MCP `{ content: [...] }` result. */
function isToolResult(value: unknown): value is ToolResult {
  return typeof value === 'object' && value !== null && Array.isArray((value as ToolResult).content);
}

function text(value: string): ToolResult {
  return { content: [{ type: 'text', text: value }] };
}

/** Wraps a handler so raw data is JSON-encoded, an MCP result passes through unchanged, and errors become text. */
function wrapped(handle: ToolHandler): ToolHandler {
  return async (name, args) => {
    try {
      const result = await handle(name, args);
      return isToolResult(result) ? result : text(JSON.stringify(result, null, 2));
    } catch (error: any) {
      return text(`Error: ${error.message}`);
    }
  };
}

/** Builds the tool list and the name -> handler dispatch for the MCP server. */
export function createToolRouter(client: IncidentIQClient = new IncidentIQClient()) {
  const partsTools = new PartsTools(client);
  const issueTools = new IssueTools(client);
  const customFieldTools = new CustomFieldTools(client);
  const slaTools = new SLATools(client);
  const viewTools = new ViewTools(client);
  const notificationTools = new NotificationTools(client);

  // Each prefix must match the tool names its module advertises (e.g. `parts_*`, `issues_*`).
  const routes: Route[] = [
    { prefix: 'ticket_', tools: ticketTools, handle: handleTicketTool },
    { prefix: 'user_', tools: userTools, handle: handleUserTool },
    { prefix: 'asset_', tools: assetTools, handle: handleAssetTool },
    { prefix: 'location_', tools: locationTools, handle: handleLocationTool },
    { prefix: 'team_', tools: teamTools, handle: handleTeamTool },
    { prefix: 'parts_', tools: partsTools.getTools(), handle: wrapped((n, a) => partsTools.handleToolCall(n, a)) },
    { prefix: 'purchaseorder_', tools: purchaseOrderTools, handle: handlePurchaseOrderTool },
    { prefix: 'issues_', tools: issueTools.getTools(), handle: wrapped((n, a) => issueTools.handleToolCall(n, a)) },
    {
      prefix: 'customfield_',
      tools: customFieldTools.getTools(),
      handle: wrapped((n, a) => customFieldTools.handleToolCall(n, a)),
    },
    { prefix: 'sla_', tools: slaTools.getTools(), handle: wrapped((n, a) => slaTools.handleToolCall(n, a)) },
    { prefix: 'view_', tools: viewTools.getTools(), handle: wrapped((n, a) => viewTools.handleToolCall(n, a)) },
    {
      prefix: 'notification_',
      tools: notificationTools.getTools(),
      handle: wrapped((n, a) => notificationTools.handleToolCall(n, a)),
    },
  ];

  async function testConnection(): Promise<ToolResult> {
    try {
      const result = await client.testConnection();
      return text(
        result.connected
          ? `✅ Connected to IncidentIQ\nDistrict: ${result.districtName || 'Unknown'}\nAPI Base URL: ${process.env.IIQ_API_BASE_URL}`
          : `❌ Connection failed: ${result.error}\nPlease check your API key and base URL configuration.`
      );
    } catch (error: any) {
      return text(`Connection error: ${error.message}`);
    }
  }

  return {
    listTools(): ToolDefinition[] {
      return [testConnectionTool, ...routes.flatMap((route) => route.tools)];
    },

    /** Returns the route prefix that would handle `name`, or undefined when no route claims it. */
    routeFor(name: string): string | undefined {
      if (name === testConnectionTool.name) return testConnectionTool.name;
      return routes.find((route) => name.startsWith(route.prefix))?.prefix;
    },

    async callTool(name: string, args: any): Promise<ToolResult> {
      if (name === testConnectionTool.name) return testConnection();
      const route = routes.find((r) => name.startsWith(r.prefix));
      if (!route) throw new Error(`Unknown tool: ${name}`);
      return (await route.handle(name, args)) as ToolResult;
    },
  };
}
