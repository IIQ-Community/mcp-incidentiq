/**
 * PURCHASE ORDERS TOOLS
 * 
 * Purchase order management for K-12 districts
 * Manage POs, approvals, line items, and supplier tracking
 */

import { IncidentIQClient } from '../api/client.js';

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export class PurchaseOrderTools {
  private client: IncidentIQClient;

  constructor(client: IncidentIQClient) {
    this.client = client;
  }

  getTools() {
    return [
      // List and Search Operations
      {
        name: 'purchaseorder_get_all',
        description: 'Get all purchase orders with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'completed', 'cancelled'],
              description: 'Filter by purchase order status',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100)',
            },
            pageIndex: {
              type: 'number',
              description: 'Page index for pagination (0-based)',
            },
            sortDirection: {
              type: 'string',
              enum: ['Ascending', 'Descending'],
              description: 'Sort direction (default: Descending)',
            },
          },
        },
      },
      {
        name: 'purchaseorder_search',
        description: 'Search for purchase orders by various criteria',
        inputSchema: {
          type: 'object',
          properties: {
            searchText: {
              type: 'string',
              description: 'Text to search for in PO numbers, descriptions, or supplier names',
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'completed', 'cancelled'],
              description: 'Filter by status',
            },
            dateFrom: {
              type: 'string',
              description: 'Start date for PO creation (ISO format)',
            },
            dateTo: {
              type: 'string',
              description: 'End date for PO creation (ISO format)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
            pageIndex: {
              type: 'number',
              description: 'Page index for pagination (0-based)',
            },
          },
        },
      },

      // Status-specific Lists
      {
        name: 'purchaseorder_get_pending',
        description: 'Get all pending purchase orders awaiting approval',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'purchaseorder_get_approved',
        description: 'Get all approved purchase orders',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'purchaseorder_get_completed',
        description: 'Get all completed purchase orders',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
            },
          },
        },
      },

      // Individual PO Operations
      {
        name: 'purchaseorder_get',
        description: 'Get detailed information about a specific purchase order',
        inputSchema: {
          type: 'object',
          properties: {
            purchaseOrderId: {
              type: 'string',
              description: 'The GUID of the purchase order',
            },
          },
          required: ['purchaseOrderId'],
        },
      },
      {
        name: 'purchaseorder_get_items',
        description: 'Get all line items in a purchase order',
        inputSchema: {
          type: 'object',
          properties: {
            purchaseOrderId: {
              type: 'string',
              description: 'The GUID of the purchase order',
            },
          },
          required: ['purchaseOrderId'],
        },
      },
      {
        name: 'purchaseorder_get_parts',
        description: 'Get all parts included in a purchase order',
        inputSchema: {
          type: 'object',
          properties: {
            purchaseOrderId: {
              type: 'string',
              description: 'The GUID of the purchase order',
            },
          },
          required: ['purchaseOrderId'],
        },
      },
      {
        name: 'purchaseorder_get_supplier',
        description: 'Get supplier information for a purchase order',
        inputSchema: {
          type: 'object',
          properties: {
            purchaseOrderId: {
              type: 'string',
              description: 'The GUID of the purchase order',
            },
          },
          required: ['purchaseOrderId'],
        },
      },
      {
        name: 'purchaseorder_get_attachments',
        description: 'Get all attachments for a purchase order (invoices, quotes, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            purchaseOrderId: {
              type: 'string',
              description: 'The GUID of the purchase order',
            },
          },
          required: ['purchaseOrderId'],
        },
      },
      {
        name: 'purchaseorder_get_history',
        description: 'Get the approval and modification history of a purchase order',
        inputSchema: {
          type: 'object',
          properties: {
            purchaseOrderId: {
              type: 'string',
              description: 'The GUID of the purchase order',
            },
          },
          required: ['purchaseOrderId'],
        },
      },

      // Configuration
      {
        name: 'purchaseorder_get_statuses',
        description: 'Get all available purchase order status options',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'purchaseorder_get_types',
        description: 'Get all purchase order types configured for the district',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Analytics
      {
        name: 'purchaseorder_get_summary',
        description: 'Get purchase order summary statistics',
        inputSchema: {
          type: 'object',
          properties: {
            dateFrom: {
              type: 'string',
              description: 'Start date for statistics (ISO format)',
            },
            dateTo: {
              type: 'string',
              description: 'End date for statistics (ISO format)',
            },
          },
        },
      },
    ];
  }

  async handleToolCall(toolName: string, args: any): Promise<any> {
    const client = this.client;
    
    // Helper function to make requests
    const makeRequest = async (method: string, url: string, options: any = {}) => {
      const config: any = {
        method,
        url,
        ...options,
      };
      return await client.request(config);
    };

    switch (toolName) {
      case 'purchaseorder_get_all': {
        const params = {
          $p: args.pageIndex || 0,
          $s: args.pageSize || 100,
          $d: args.sortDirection || 'Descending',
        };
        if (args.status) {
          return await makeRequest('GET', `/purchaseorders/${args.status}`, { params });
        }
        return await makeRequest('GET', '/purchaseorders', { params });
      }

      case 'purchaseorder_search': {
        const payload: any = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          Paging: {
            PageIndex: args.pageIndex || 0,
            PageSize: args.pageSize || 20,
          },
        };
        if (args.searchText) payload.SearchText = args.searchText;
        if (args.status) payload.Status = args.status;
        if (args.dateFrom) payload.DateFrom = args.dateFrom;
        if (args.dateTo) payload.DateTo = args.dateTo;
        
        return await makeRequest('POST', '/purchaseorders', { data: payload });
      }

      case 'purchaseorder_get_pending': {
        const params = {
          $p: 0,
          $s: args.pageSize || 50,
          $d: 'Descending',
        };
        return await makeRequest('GET', '/purchaseorders/pending', { params });
      }

      case 'purchaseorder_get_approved': {
        const params = {
          $p: 0,
          $s: args.pageSize || 50,
          $d: 'Descending',
        };
        return await makeRequest('GET', '/purchaseorders/approved', { params });
      }

      case 'purchaseorder_get_completed': {
        const params = {
          $p: 0,
          $s: args.pageSize || 50,
          $d: 'Descending',
        };
        return await makeRequest('GET', '/purchaseorders/completed', { params });
      }

      case 'purchaseorder_get': {
        return await makeRequest('GET', `/purchaseorders/${args.purchaseOrderId}`);
      }

      case 'purchaseorder_get_items': {
        return await makeRequest('GET', `/purchaseorders/${args.purchaseOrderId}/items`);
      }

      case 'purchaseorder_get_parts': {
        return await makeRequest('GET', `/purchaseorders/${args.purchaseOrderId}/parts`);
      }

      case 'purchaseorder_get_supplier': {
        return await makeRequest('GET', `/purchaseorders/${args.purchaseOrderId}/supplier`);
      }

      case 'purchaseorder_get_attachments': {
        return await makeRequest('GET', `/purchaseorders/${args.purchaseOrderId}/attachments`);
      }

      case 'purchaseorder_get_history': {
        return await makeRequest('GET', `/purchaseorders/${args.purchaseOrderId}/history`);
      }

      case 'purchaseorder_get_statuses': {
        return await makeRequest('GET', '/purchaseorders/statuses');
      }

      case 'purchaseorder_get_types': {
        return await makeRequest('GET', '/purchaseorders/types');
      }

      case 'purchaseorder_get_summary': {
        const params: any = {};
        if (args.dateFrom) params.dateFrom = args.dateFrom;
        if (args.dateTo) params.dateTo = args.dateTo;
        return await makeRequest('GET', '/purchaseorders/summary', { params });
      }

      default:
        throw new Error(`Unknown purchase order tool: ${toolName}`);
    }
  }
}

// Export for backward compatibility
export const purchaseOrderTools = new PurchaseOrderTools(getClient()).getTools();

export async function handlePurchaseOrderTool(name: string, args: any) {
  const tools = new PurchaseOrderTools(getClient());
  try {
    const result = await tools.handleToolCall(name, args);
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