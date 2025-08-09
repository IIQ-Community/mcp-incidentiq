/**
 * ENHANCED PARTS TOOLS - Based on Swagger Analysis
 * 
 * Parts API enables K-12 device repair inventory management
 * Critical for Chromebook repairs and 1:1 device maintenance
 * 
 * 12+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { 
  PaginatedRequest,
  PaginatedResponse 
} from '../types/common.js';

// Parts specific types
export interface Part {
  PartId: string;
  SiteId: string;
  ProductId: string;
  Name: string;
  PartNumber?: string;
  Description?: string;
  StandardCostEach: number;
  StandardSupplierId: string;
  StandardSupplier?: PartSupplier;
  Category?: string;
  DeviceType?: string;
  Manufacturer?: string;
  QuantityOnHand?: number;
  QuantityAllocated?: number;
  QuantityAvailable?: number;
  ReorderPoint?: number;
  ReorderQuantity?: number;
  LocationId?: string;
  WarrantyEligible?: boolean;
  IsActive?: boolean;
  CreatedDate: string;
  ModifiedDate: string;
  Notes?: string;
}

export interface PartSupplier {
  PartSupplierId: string;
  Name: string;
  ContactName?: string;
  Phone?: string;
  Email?: string;
  Website?: string;
  AccountNumber?: string;
  Address?: {
    Street: string;
    City: string;
    State: string;
    Zip: string;
  };
  IsPreferred?: boolean;
  PaymentTerms?: string;
  ShippingTerms?: string;
  MinimumOrder?: number;
  LeadTimeDays?: number;
  Notes?: string;
}

export interface PurchaseOrder {
  PurchaseOrderId: string;
  OrderNumber?: string;
  SupplierId: string;
  OrderDate: string;
  ExpectedDate?: string;
  Status: string;
  TotalAmount: number;
  Items: PurchaseOrderItem[];
  ShippingCost?: number;
  TaxAmount?: number;
  TrackingNumber?: string;
  ReceivedDate?: string;
  ReceivedBy?: string;
  InvoiceNumber?: string;
  Notes?: string;
}

export interface PurchaseOrderItem {
  PartId: string;
  Quantity: number;
  UnitCost: number;
  TotalCost: number;
}

export interface PartUsage {
  TicketId: string;
  PartId: string;
  Quantity: number;
  UsedDate: string;
  UsedBy: string;
  AssetId?: string;
  Cost?: number;
  WarrantyClaim?: boolean;
  StudentDamage?: boolean;
  Notes?: string;
}

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const enhancedPartsTools = [
  // Core Operations
  {
    name: 'parts_get_all',
    description: 'Get all parts in inventory (GET /parts)',
    inputSchema: {
      type: 'object',
      properties: {
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive parts',
        },
      },
      required: [],
    },
  },
  {
    name: 'parts_search',
    description: 'Search parts with filters (POST /parts)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Search in part names, numbers, descriptions',
        },
        category: {
          type: 'string',
          description: 'Filter by category (Screen, Keyboard, Battery, etc.)',
        },
        deviceType: {
          type: 'string',
          enum: ['Chromebook', 'iPad', 'Laptop', 'Desktop', 'Projector'],
          description: 'Filter by device type',
        },
        supplierId: {
          type: 'string',
          description: 'Filter by supplier',
        },
        locationId: {
          type: 'string',
          description: 'Filter by storage location',
        },
        lowStock: {
          type: 'boolean',
          description: 'Only show low stock items',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Include deleted parts',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 50)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: [],
    },
  },
  {
    name: 'parts_get_details',
    description: 'Get part details (GET /parts/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        partId: {
          type: 'string',
          description: 'Part ID (GUID)',
        },
      },
      required: ['partId'],
    },
  },
  
  // Inventory Management
  {
    name: 'parts_check_stock',
    description: 'Check current stock levels',
    inputSchema: {
      type: 'object',
      properties: {
        partId: {
          type: 'string',
          description: 'Part ID to check',
        },
        locationId: {
          type: 'string',
          description: 'Check at specific location',
        },
      },
      required: [],
    },
  },
  {
    name: 'parts_get_low_stock',
    description: 'Get parts below reorder point',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category',
        },
        critical: {
          type: 'boolean',
          description: 'Only critical parts',
        },
      },
      required: [],
    },
  },
  
  // Supplier Management
  {
    name: 'parts_get_suppliers',
    description: 'Get all part suppliers (GET /parts/suppliers)',
    inputSchema: {
      type: 'object',
      properties: {
        preferred: {
          type: 'boolean',
          description: 'Only preferred suppliers',
        },
      },
      required: [],
    },
  },
  {
    name: 'parts_get_supplier_details',
    description: 'Get supplier details (GET /parts/suppliers/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        supplierId: {
          type: 'string',
          description: 'Supplier ID (GUID)',
        },
      },
      required: ['supplierId'],
    },
  },
  
  // Purchase Orders
  {
    name: 'parts_get_orders',
    description: 'Get purchase orders (GET /purchaseorders)',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Pending', 'Ordered', 'Shipped', 'Received', 'Cancelled'],
          description: 'Filter by order status',
        },
        supplierId: {
          type: 'string',
          description: 'Filter by supplier',
        },
        dateFrom: {
          type: 'string',
          description: 'Orders after date (YYYY-MM-DD)',
        },
        dateTo: {
          type: 'string',
          description: 'Orders before date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
  },
  {
    name: 'parts_get_order_details',
    description: 'Get purchase order details (GET /purchaseorders/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'Purchase order ID (GUID)',
        },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'parts_get_pending_orders',
    description: 'Get pending purchase orders',
    inputSchema: {
      type: 'object',
      properties: {
        overdue: {
          type: 'boolean',
          description: 'Only overdue orders',
        },
      },
      required: [],
    },
  },
  
  // Device-Specific Parts
  {
    name: 'parts_get_chromebook_parts',
    description: 'Get Chromebook-specific parts',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Chromebook model',
        },
        category: {
          type: 'string',
          enum: ['Screen', 'Keyboard', 'Battery', 'Charger', 'Trackpad', 'Hinge'],
          description: 'Part category',
        },
      },
      required: [],
    },
  },
  {
    name: 'parts_get_ipad_parts',
    description: 'Get iPad-specific parts',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'iPad model',
        },
        category: {
          type: 'string',
          enum: ['Screen', 'Digitizer', 'Battery', 'Charging Port', 'Home Button'],
          description: 'Part category',
        },
      },
      required: [],
    },
  },
  {
    name: 'parts_get_compatible',
    description: 'Get parts compatible with specific asset',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'string',
          description: 'Asset ID (GUID)',
        },
        category: {
          type: 'string',
          description: 'Part category filter',
        },
      },
      required: ['assetId'],
    },
  },
  
  // Repair Operations
  {
    name: 'parts_record_usage',
    description: 'Record part used in repair',
    inputSchema: {
      type: 'object',
      properties: {
        partId: {
          type: 'string',
          description: 'Part ID used',
        },
        ticketId: {
          type: 'string',
          description: 'Repair ticket ID',
        },
        quantity: {
          type: 'number',
          description: 'Quantity used',
        },
        assetId: {
          type: 'string',
          description: 'Asset being repaired',
        },
        warrantyRepair: {
          type: 'boolean',
          description: 'Is warranty repair',
        },
        studentDamage: {
          type: 'boolean',
          description: 'Student caused damage',
        },
        notes: {
          type: 'string',
          description: 'Usage notes',
        },
      },
      required: ['partId', 'ticketId', 'quantity'],
    },
  },
  {
    name: 'parts_get_ticket_parts',
    description: 'Get parts used in specific ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'Ticket ID (GUID)',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'parts_get_common_repairs',
    description: 'Get frequently used repair parts',
    inputSchema: {
      type: 'object',
      properties: {
        deviceType: {
          type: 'string',
          description: 'Device type filter',
        },
        timeframe: {
          type: 'string',
          enum: ['week', 'month', 'quarter', 'year'],
          description: 'Time period',
        },
      },
      required: [],
    },
  },
  
  // Cost Analysis
  {
    name: 'parts_get_repair_costs',
    description: 'Get repair cost analysis',
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom: {
          type: 'string',
          description: 'Start date (YYYY-MM-DD)',
        },
        dateTo: {
          type: 'string',
          description: 'End date (YYYY-MM-DD)',
        },
        groupBy: {
          type: 'string',
          enum: ['device', 'building', 'category', 'student'],
          description: 'Group costs by',
        },
      },
      required: [],
    },
  },
  
  // Multi-Building
  {
    name: 'parts_get_by_location',
    description: 'Get parts at specific location',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location/building ID',
        },
        lowStockOnly: {
          type: 'boolean',
          description: 'Only low stock items',
        },
      },
      required: ['locationId'],
    },
  },
  {
    name: 'parts_transfer',
    description: 'Transfer parts between locations',
    inputSchema: {
      type: 'object',
      properties: {
        partId: {
          type: 'string',
          description: 'Part to transfer',
        },
        fromLocationId: {
          type: 'string',
          description: 'Source location',
        },
        toLocationId: {
          type: 'string',
          description: 'Destination location',
        },
        quantity: {
          type: 'number',
          description: 'Quantity to transfer',
        },
        reason: {
          type: 'string',
          description: 'Transfer reason',
        },
      },
      required: ['partId', 'fromLocationId', 'toLocationId', 'quantity'],
    },
  },
  
  // Quick Lookups
  {
    name: 'parts_find_by_number',
    description: 'Find part by part number',
    inputSchema: {
      type: 'object',
      properties: {
        partNumber: {
          type: 'string',
          description: 'Manufacturer part number',
        },
      },
      required: ['partNumber'],
    },
  },
];

export async function handleEnhancedPartsTool(name: string, args: any) {
  const client = getClient();
  
  try {
    switch (name) {
      case 'parts_get_all': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/parts',
        });
        
        // Handle different response formats
        const parts = Array.isArray(response) ? response : response?.Items || [];
        
        if (parts.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No parts found in inventory.',
            }],
          };
        }
        
        // Group by category or device type
        const partsByCategory: Record<string, any[]> = {};
        parts.forEach((part: Part) => {
          const category = part.Category || part.DeviceType || 'Uncategorized';
          if (!partsByCategory[category]) partsByCategory[category] = [];
          partsByCategory[category].push(part);
        });
        
        let output = `Parts Inventory (${parts.length} total):\n`;
        
        for (const [category, categoryParts] of Object.entries(partsByCategory)) {
          output += `\n${category} (${categoryParts.length} parts):\n`;
          categoryParts.slice(0, 5).forEach(part => {
            output += `  • ${part.Name || part.PartNumber}`;
            if (part.QuantityOnHand !== undefined) {
              output += ` - Stock: ${part.QuantityOnHand}`;
            }
            if (part.StandardCostEach) {
              output += ` - $${part.StandardCostEach}`;
            }
            output += '\n';
          });
          if (categoryParts.length > 5) {
            output += `  ... and ${categoryParts.length - 5} more\n`;
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'parts_search': {
        const payload: PaginatedRequest = {
          OnlyShowDeleted: args.includeDeleted || false,
          FilterByViewPermission: false,
          SearchText: args.searchText,
          Filters: [],
          Paging: {
            PageIndex: args.pageIndex || 0,
            PageSize: args.pageSize || 50,
          },
        };
        
        if (args.category) {
          payload.Filters!.push({
            Facet: 'Category',
            Id: args.category,
          });
        }
        
        if (args.deviceType) {
          payload.Filters!.push({
            Facet: 'DeviceType',
            Id: args.deviceType,
          });
        }
        
        if (args.supplierId) {
          payload.Filters!.push({
            Facet: 'Supplier',
            Id: args.supplierId,
          });
        }
        
        const response = await client.request<PaginatedResponse<Part>>({
          method: 'POST',
          url: '/parts',
          data: payload,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No parts found matching your criteria.',
            }],
          };
        }
        
        const partsList = response.Items.slice(0, 10).map((part: Part) =>
          `• ${part.Name || part.PartNumber}${part.Category ? ` (${part.Category})` : ''}
  Stock: ${part.QuantityOnHand || 0} | Available: ${part.QuantityAvailable || 0} | Cost: $${part.StandardCostEach || 'N/A'}
  ${part.Description || 'No description'}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Found ${response.ItemCount} parts (showing ${Math.min(10, response.Items.length)}):

${partsList}

${response.Items.length > 10 ? `\n...and ${response.Items.length - 10} more parts` : ''}`,
          }],
        };
      }
      
      case 'parts_get_suppliers': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/parts/suppliers',
        });
        
        const suppliers = Array.isArray(response) ? response : response?.Items || [];
        
        if (suppliers.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No suppliers found.',
            }],
          };
        }
        
        // Filter for preferred if requested
        let filteredSuppliers = suppliers;
        if (args.preferred) {
          filteredSuppliers = suppliers.filter((s: PartSupplier) => s.IsPreferred);
        }
        
        const supplierList = filteredSuppliers.map((supplier: PartSupplier) =>
          `• ${supplier.Name}${supplier.IsPreferred ? ' ⭐ (Preferred)' : ''}
  Contact: ${supplier.ContactName || 'N/A'} | ${supplier.Phone || 'No phone'}
  ${supplier.Email || 'No email'}
  ${supplier.LeadTimeDays ? `Lead Time: ${supplier.LeadTimeDays} days` : ''}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Suppliers (${filteredSuppliers.length}):\n\n${supplierList}`,
          }],
        };
      }
      
      case 'parts_get_orders': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/purchaseorders',
        });
        
        const orders = Array.isArray(response) ? response : response?.Items || [];
        
        if (orders.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No purchase orders found.',
            }],
          };
        }
        
        // Filter by status if provided
        let filteredOrders = orders;
        if (args.status) {
          filteredOrders = orders.filter((o: PurchaseOrder) => o.Status === args.status);
        }
        
        const orderList = filteredOrders.slice(0, 10).map((order: PurchaseOrder) =>
          `• Order ${order.OrderNumber || order.PurchaseOrderId.substring(0, 8)}
  Status: ${order.Status} | Date: ${order.OrderDate}
  Total: $${order.TotalAmount} | Items: ${order.Items?.length || 0}
  ${order.ExpectedDate ? `Expected: ${order.ExpectedDate}` : ''}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Purchase Orders (${filteredOrders.length}):\n\n${orderList}`,
          }],
        };
      }
      
      case 'parts_get_chromebook_parts': {
        // Search for Chromebook parts
        const payload: PaginatedRequest = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          SearchText: `chromebook ${args.model || ''} ${args.category || ''}`.trim(),
          Filters: [{
            Facet: 'DeviceType',
            Id: 'Chromebook',
          }],
          Paging: {
            PageIndex: 0,
            PageSize: 100,
          },
        };
        
        if (args.category) {
          payload.Filters!.push({
            Facet: 'Category',
            Id: args.category,
          });
        }
        
        const response = await client.request<PaginatedResponse<Part>>({
          method: 'POST',
          url: '/parts',
          data: payload,
        });
        
        const chromebookParts = response?.Items || [];
        
        if (chromebookParts.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No Chromebook parts found.',
            }],
          };
        }
        
        // Group by category
        const categories: Record<string, Part[]> = {};
        chromebookParts.forEach((part: Part) => {
          const cat = part.Category || 'Other';
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(part);
        });
        
        let output = 'Chromebook Parts:\n';
        
        for (const [category, parts] of Object.entries(categories)) {
          output += `\n${category}:\n`;
          parts.forEach(part => {
            output += `  • ${part.Name || part.PartNumber}`;
            output += ` - Stock: ${part.QuantityOnHand || 0}`;
            output += ` - $${part.StandardCostEach || 'N/A'}\n`;
          });
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'parts_get_low_stock': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/parts',
        });
        
        const allParts = Array.isArray(response) ? response : response?.Items || [];
        
        // Filter for low stock
        const lowStockParts = allParts.filter((part: Part) => {
          if (part.ReorderPoint && part.QuantityOnHand !== undefined) {
            return part.QuantityOnHand <= part.ReorderPoint;
          }
          // Default: consider low if less than 5
          return part.QuantityOnHand !== undefined && part.QuantityOnHand < 5;
        });
        
        if (lowStockParts.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No parts are currently low on stock.',
            }],
          };
        }
        
        const partsList = lowStockParts.map((part: Part) =>
          `• ${part.Name || part.PartNumber}
  Current: ${part.QuantityOnHand} | Reorder Point: ${part.ReorderPoint || 5}
  Suggested Order: ${part.ReorderQuantity || 10} units`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Low Stock Parts (${lowStockParts.length}):\n\n${partsList}`,
          }],
        };
      }
      
      case 'parts_find_by_number': {
        const payload: PaginatedRequest = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          SearchText: args.partNumber,
          Paging: {
            PageIndex: 0,
            PageSize: 10,
          },
        };
        
        const response = await client.request<PaginatedResponse<Part>>({
          method: 'POST',
          url: '/parts',
          data: payload,
        });
        
        const parts = response?.Items?.filter((p: Part) => 
          p.PartNumber === args.partNumber
        ) || [];
        
        if (parts.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No part found with number: ${args.partNumber}`,
            }],
          };
        }
        
        const part = parts[0];
        return {
          content: [{
            type: 'text',
            text: `Part Found:
Name: ${part.Name}
Part Number: ${part.PartNumber}
Category: ${part.Category || 'N/A'}
Stock: ${part.QuantityOnHand || 0}
Available: ${part.QuantityAvailable || 0}
Cost: $${part.StandardCostEach}
Supplier: ${part.StandardSupplier?.Name || 'N/A'}
ID: ${part.PartId}`,
          }],
        };
      }
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Error: Unknown enhanced parts tool "${name}".`,
          }],
        };
    }
  } catch (error: any) {
    // Handle 404s specially
    if (error.response?.status === 404) {
      if (name.includes('chromebook') || name.includes('ipad')) {
        return {
          content: [{
            type: 'text',
            text: 'Device-specific endpoint may not be available. Try using parts_search with deviceType filter instead.',
          }],
        };
      }
      return {
        content: [{
          type: 'text',
          text: 'Part or resource not found.',
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`,
      }],
    };
  }
}

// Export for class compatibility
export class PartsTools {
  constructor(_client: any) {
    // Client is passed but not needed as we use getClient() internally
  }
  
  getTools() {
    return enhancedPartsTools;
  }
  
  async handleToolCall(name: string, args: any) {
    return handleEnhancedPartsTool(name, args);
  }
}
