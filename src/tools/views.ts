/**
 * View Management Tools for IncidentIQ
 * Customizable data views and dashboards
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from '../api/client.js';

/**
 * View management tools for customizable data displays
 */
export class ViewTools {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Get all MCP tool definitions for views
   */
  getTools(): Tool[] {
    return [
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
  }

  /**
   * Handle tool execution
   */
  async handleToolCall(name: string, _args: any): Promise<any> {
    switch (name) {
      case 'view_list_all':
        return this.listAllViews();
      case 'view_list_user':
        return this.listUserViews();
      case 'view_list_tickets':
        return this.listTicketViews();
      case 'view_list_assets':
        return this.listAssetViews();
      case 'view_list_users':
        return this.listUserDirectoryViews();
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async listAllViews(): Promise<any> {
    const views = await this.client.getViews();
    
    return {
      count: views.length,
      views: views.map(this.formatView),
      message: views.length > 0 ? 'Retrieved all views' : 'No views configured'
    };
  }

  private async listUserViews(): Promise<any> {
    const views = await this.client.getUserViews();
    
    return {
      count: views.length,
      views: views.map(this.formatView),
      message: views.length > 0 ? 'Retrieved user views' : 'No user views available'
    };
  }

  private async listTicketViews(): Promise<any> {
    const views = await this.client.getTicketViews();
    
    return {
      count: views.length,
      views: views.map(this.formatView),
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

  private async listAssetViews(): Promise<any> {
    const views = await this.client.getAssetViews();
    
    return {
      count: views.length,
      views: views.map(this.formatView),
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

  private async listUserDirectoryViews(): Promise<any> {
    const views = await this.client.getUserSpecificViews();
    
    return {
      count: views.length,
      views: views.map(this.formatView),
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

  private formatView(view: any): any {
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
}