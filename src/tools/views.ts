/**
 * View Management Tools for IncidentIQ
 * Customizable data views and dashboards
 */

import type { IncidentIQClient } from '../api/client.js';
import { jsonResult, textResult, type ToolDefinition, type ToolResult } from './result.js';

/** MCP tool definitions for customizable data views. */
export const viewTools: ToolDefinition[] = [
  {
    name: 'view_list_all',
    description: 'Get list of all available views in the system',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'view_list_user',
    description: 'Get views available to the current user',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'view_list_tickets',
    description: 'Get all ticket-specific views',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'view_list_assets',
    description: 'Get all asset-specific views',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'view_list_users',
    description: 'Get all user directory views',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

function formatView(view: any): any {
  return {
    id: view.ViewId || view.Id,
    name: view.Name || view.ViewName || view.Title,
    description: view.Description,
    type: view.ViewType || view.Type,
    entity: view.EntityType,
    is_public: view.IsPublic,
    is_default: view.IsDefault,
    created_date: view.CreatedDate,
    modified_date: view.ModifiedDate
  };
}

async function listAllViews(client: IncidentIQClient): Promise<unknown> {
  const views = await client.getViews();

  return {
    count: views.length,
    views: views.map(formatView),
    message: views.length > 0 ? 'Retrieved all views' : 'No views configured'
  };
}

async function listUserViews(client: IncidentIQClient): Promise<unknown> {
  const views = await client.getUserViews();

  return {
    count: views.length,
    views: views.map(formatView),
    message: views.length > 0 ? 'Retrieved user views' : 'No user views available'
  };
}

async function listTicketViews(client: IncidentIQClient): Promise<unknown> {
  const views = await client.getTicketViews();

  return {
    count: views.length,
    views: views.map(formatView),
    common_views: [
      'My Open Tickets',
      'Unassigned Tickets',
      'Urgent Tickets',
      'Overdue Tickets',
      'Building Tickets'
    ],
    message: views.length > 0 ? 'Retrieved ticket views' : 'No ticket views configured'
  };
}

async function listAssetViews(client: IncidentIQClient): Promise<unknown> {
  const views = await client.getAssetViews();

  return {
    count: views.length,
    views: views.map(formatView),
    common_views: [
      'Chromebook Inventory',
      'iPad Inventory',
      'Warranty Expiring',
      'Devices for Repair',
      'Available Loaners'
    ],
    message: views.length > 0 ? 'Retrieved asset views' : 'No asset views configured'
  };
}

async function listUserDirectoryViews(client: IncidentIQClient): Promise<unknown> {
  const views = await client.getUserSpecificViews();

  return {
    count: views.length,
    views: views.map(formatView),
    common_views: [
      'Student Directory',
      'Staff Directory',
      'IT Agents',
      'New Users',
      'Inactive Users'
    ],
    message: views.length > 0 ? 'Retrieved user directory views' : 'No user directory views configured'
  };
}

/** Raw IIQ data for a view tool; `handleViewTool` encodes it as the MCP result. */
async function viewData(name: string, client: IncidentIQClient): Promise<unknown> {
  switch (name) {
    case 'view_list_all':
      return listAllViews(client);
    case 'view_list_user':
      return listUserViews(client);
    case 'view_list_tickets':
      return listTicketViews(client);
    case 'view_list_assets':
      return listAssetViews(client);
    case 'view_list_users':
      return listUserDirectoryViews(client);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function handleViewTool(name: string, _args: any, client: IncidentIQClient): Promise<ToolResult> {
  try {
    return jsonResult(await viewData(name, client));
  } catch (error: any) {
    return textResult(`Error: ${error.message}`);
  }
}
