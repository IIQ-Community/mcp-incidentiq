/**
 * ENHANCED PARTS TOOLS - Based on Swagger Analysis
 * 
 * Parts API enables K-12 device repair inventory management
 * Critical for Chromebook repairs and 1:1 device maintenance
 * 
 * 12+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { pathSegment } from '../api/path.js';
import { formatListPage, iiqListAll, matchesText, withTruncationNote } from '../api/paging.js';
import { day } from './purchaseorders.js';

/** IIQ has no parts search (POST /parts returns 405, verified 2026-11-06): read GET /parts and filter. */
async function listParts(client: IncidentIQClient): Promise<{ items: Part[]; truncated: boolean }> {
  return iiqListAll<Part>(client, '/parts');
}

/** A part counts as low stock below this many on hand (IIQ parts carry no reorder point). */
const LOW_STOCK_BELOW = 5;

function isLowStock(part: Part): boolean {
  return typeof part.QuantityOnHand === 'number' && part.QuantityOnHand < LOW_STOCK_BELOW;
}

/** One part as a list row: name, stock, cost, supplier, ID (the fields GET /parts sends). */
function renderPart(part: Part): string {
  return `• ${part.Name || part.PartNumber}
  Stock: ${part.QuantityOnHand || 0} | Cost: $${part.StandardCostEach ?? 'N/A'} | Supplier: ${part.StandardSupplier?.Name || 'N/A'}
  ID: ${part.PartId}`;
}

/** GET detail endpoints return `{ Item }`; tolerate a bare object. */
async function getItem<T>(client: IncidentIQClient, url: string): Promise<T> {
  const response = await client.request<{ Item?: T } & T>({ method: 'GET', url });
  return (response?.Item ?? response) as T;
}

/**
 * Validates an optional YYYY-MM-DD bound and returns its calendar day, or an error message.
 * Rejects other formats and impossible dates (e.g. 2026-02-30).
 */
function dayBound(name: string, value: unknown): { day?: string; error?: string } {
  if (value === undefined || value === null || value === '') return {};
  const text = String(value);
  // getTime() is NaN for an out-of-range month/day, where toISOString() would throw.
  const parsed = new Date(`${text}T00:00:00Z`);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(text);
  return valid ? { day: day(text) } : { error: `Error: ${name} must be a date in YYYY-MM-DD form (got "${text}").` };
}

/** Parts for one device family, matched by name (live parts carry no DeviceType/Category). */
async function deviceParts(client: IncidentIQClient, device: 'chromebook' | 'ipad', label: string, args: any) {
  const { items, truncated } = await listParts(client);
  const deviceMatches = items.filter((part) =>
    matchesText(device, part.DeviceType, part.Name) &&
    matchesText(args.model, part.Name, part.Description) &&
    matchesText(args.category, part.Category, part.Name)
  );

  if (deviceMatches.length === 0) {
    return withTruncationNote(truncated, {
      content: [{
        type: 'text',
        text: `No ${label} parts found.`,
      }],
    });
  }

  // No category heading: live parts carry no Category, so every part would land under "Other".
  const rows = deviceMatches.map((part) =>
    `• ${part.Name || part.PartNumber} - Stock: ${part.QuantityOnHand || 0} - $${part.StandardCostEach ?? 'N/A'}`
  );
  const output = `${label} Parts (${deviceMatches.length}):\n\n${rows.join('\n')}`;

  return withTruncationNote(truncated, {
    content: [{
      type: 'text',
      text: output,
    }],
  });
}

// Parts specific types (GET /parts item; PartNumber/Description/Category/DeviceType are matched when a district sends them)
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
  QuantityOnHand?: number;
  QuantityAvailable?: number;
  CreatedDate: string;
  ModifiedDate: string;
}

export interface PartSupplier {
  PartSupplierId: string;
  Name: string;
  CreatedDate?: string;
  ModifiedDate?: string;
}

/** Purchase order as returned by GET /purchaseorders (live shape, verified 2026-11-07). */
export interface PurchaseOrder {
  PurchaseOrderId: string;
  PoNumber?: string;
  CreatedDate?: string;
  IsApproved?: boolean;
  IsClosed?: boolean;
  PurchaseTotalCosts?: number;
  Purchases?: unknown[];
}

/** IIQ has no order status field; it is derived from the IsClosed / IsApproved flags. */
function orderStatus(order: PurchaseOrder): 'Closed' | 'Approved' | 'Open' {
  if (order.IsClosed) return 'Closed';
  return order.IsApproved ? 'Approved' : 'Open';
}

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

const PAGE_PROPS = {
  pageSize: {
    type: 'number',
    description: 'Results per page (default: 25)',
  },
  pageIndex: {
    type: 'number',
    description: 'Page number (0-based)',
  },
};

export const enhancedPartsTools = [
  // Core Operations
  {
    name: 'parts_get_all',
    description: 'List every part in inventory with stock, cost and supplier (reads all of GET /parts, 25 per page by default)',
    inputSchema: {
      type: 'object',
      properties: { ...PAGE_PROPS },
      required: [],
    },
  },
  {
    name: 'parts_search',
    description: 'Search parts (IIQ has no parts search, so the full GET /parts list is filtered client-side)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Text matched against part names',
        },
        category: {
          type: 'string',
          description: 'Text matched against part names (Screen, Keyboard, Battery, etc.)',
        },
        deviceType: {
          type: 'string',
          enum: ['Chromebook', 'iPad', 'Laptop', 'Desktop', 'Projector'],
          description: 'Device type matched against part names',
        },
        supplierId: {
          type: 'string',
          description: 'Filter by standard supplier ID (GUID)',
        },
        lowStock: {
          type: 'boolean',
          description: `Only parts with fewer than ${LOW_STOCK_BELOW} on hand (same rule as parts_get_low_stock)`,
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
    description: 'Check quantity on hand: one part (GET /parts/{id}) or every part (all of GET /parts, 25 per page by default)',
    inputSchema: {
      type: 'object',
      properties: {
        partId: {
          type: 'string',
          description: 'Part ID (GUID); omit to list the stock of every part',
        },
        ...PAGE_PROPS,
      },
      required: [],
    },
  },
  {
    name: 'parts_get_low_stock',
    description: `Get parts with fewer than ${LOW_STOCK_BELOW} on hand (IIQ parts have no reorder point)`,
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Text matched against part names',
        },
        critical: {
          type: 'boolean',
          description: 'Only parts with none on hand',
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
      properties: {},
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
    description: 'Get purchase orders (reads all of GET /purchaseorders, 25 per page by default)',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Open', 'Approved', 'Closed'],
          description: 'Filter by order status (derived from IIQ approval/closed flags)',
        },
        dateFrom: {
          type: 'string',
          description: 'Orders created on or after this day (YYYY-MM-DD, inclusive)',
        },
        dateTo: {
          type: 'string',
          description: 'Orders created on or before this day (YYYY-MM-DD, inclusive)',
        },
        ...PAGE_PROPS,
      },
      required: [],
    },
  },

  // Device-Specific Parts
  {
    name: 'parts_get_chromebook_parts',
    description: 'Get Chromebook parts (part names containing "chromebook", from GET /parts)',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Chromebook model, matched against part names',
        },
        category: {
          type: 'string',
          enum: ['Screen', 'Keyboard', 'Battery', 'Charger', 'Trackpad', 'Hinge'],
          description: 'Part category, matched against part names',
        },
      },
      required: [],
    },
  },
  {
    name: 'parts_get_ipad_parts',
    description: 'Get iPad parts (part names containing "ipad", from GET /parts)',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'iPad model, matched against part names',
        },
        category: {
          type: 'string',
          enum: ['Screen', 'Digitizer', 'Battery', 'Charging Port', 'Home Button'],
          description: 'Part category, matched against part names',
        },
      },
      required: [],
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
        const { items, truncated } = await listParts(client);
        return formatListPage({
          rows: items,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'parts',
          emptyText: 'No parts found in inventory.',
          render: renderPart,
          truncated,
        });
      }

      case 'parts_search': {
        // Live parts carry only Name/cost/stock/supplier; Category/DeviceType/Description are matched when present.
        const { items, truncated } = await listParts(client);
        const matched = items.filter((part) =>
          matchesText(args.searchText, part.Name, part.PartNumber, part.Description) &&
          matchesText(args.category, part.Category, part.Name) &&
          matchesText(args.deviceType, part.DeviceType, part.Name) &&
          (!args.supplierId || part.StandardSupplierId === args.supplierId) &&
          (!args.lowStock || isLowStock(part))
        );
        return formatListPage({
          rows: matched,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 50,
          noun: 'parts',
          emptyText: 'No parts found matching your criteria.',
          render: renderPart,
          truncated,
        });
      }

      case 'parts_get_details': {
        const part = await getItem<Part>(client, `/parts/${pathSegment(args.partId)}`);
        return {
          content: [{
            type: 'text',
            text: `Part Details:
Name: ${part.Name}
Stock: ${part.QuantityOnHand ?? 0}
Cost: $${part.StandardCostEach ?? 'N/A'}
Supplier: ${part.StandardSupplier?.Name || 'N/A'}
Created: ${part.CreatedDate || 'N/A'}
Modified: ${part.ModifiedDate || 'N/A'}
ID: ${part.PartId}`,
          }],
        };
      }

      case 'parts_get_supplier_details': {
        const supplier = await getItem<PartSupplier>(client, `/parts/suppliers/${pathSegment(args.supplierId)}`);
        return {
          content: [{
            type: 'text',
            text: `Supplier Details:
Name: ${supplier.Name}
Created: ${supplier.CreatedDate || 'N/A'}
Modified: ${supplier.ModifiedDate || 'N/A'}
ID: ${supplier.PartSupplierId}`,
          }],
        };
      }

      case 'parts_check_stock': {
        if (args.partId) {
          const part = await getItem<Part>(client, `/parts/${pathSegment(args.partId)}`);
          return {
            content: [{
              type: 'text',
              text: `Stock for ${part.Name}: ${part.QuantityOnHand ?? 0} on hand (ID: ${part.PartId})`,
            }],
          };
        }
        const { items, truncated } = await listParts(client);
        return formatListPage({
          rows: items,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'parts',
          emptyText: 'No parts found in inventory.',
          render: (part: Part) => `• ${part.Name}: ${part.QuantityOnHand ?? 0} on hand`,
          truncated,
        });
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
        
        // Live suppliers carry only Name, PartSupplierId and dates (verified 2026-11-07): no contact fields.
        const supplierList = suppliers.map((supplier: PartSupplier) =>
          `• ${supplier.Name}\n  ID: ${supplier.PartSupplierId}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Suppliers (${suppliers.length}):\n\n${supplierList}`,
          }],
        };
      }
      
      case 'parts_get_orders': {
        const from = dayBound('dateFrom', args.dateFrom);
        const to = dayBound('dateTo', args.dateTo);
        const invalid = from.error ?? to.error;
        if (invalid) return { content: [{ type: 'text', text: invalid }] };
        const { items, truncated } = await iiqListAll<PurchaseOrder>(client, '/purchaseorders');
        const status = typeof args.status === 'string' ? args.status.trim().toLowerCase() : '';
        const orders = items.filter((order) => {
          const created = day(order.CreatedDate);
          return (!status || orderStatus(order).toLowerCase() === status) &&
            (from.day === undefined || (created !== undefined && created >= from.day)) &&
            (to.day === undefined || (created !== undefined && created <= to.day));
        });
        return formatListPage({
          rows: orders,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'purchase orders',
          emptyText: 'No purchase orders found.',
          render: (order) => `• PO ${order.PoNumber || order.PurchaseOrderId.substring(0, 8)}
  Status: ${orderStatus(order)} | Created: ${order.CreatedDate || 'N/A'}
  Total: $${order.PurchaseTotalCosts ?? 0} | Items: ${order.Purchases?.length ?? 0}`,
          truncated,
        });
      }

      case 'parts_get_chromebook_parts':
        return deviceParts(client, 'chromebook', 'Chromebook', args);

      case 'parts_get_ipad_parts':
        return deviceParts(client, 'ipad', 'iPad', args);

      case 'parts_get_low_stock': {
        const { items, truncated } = await listParts(client);
        const lowStockParts = items.filter((part) =>
          isLowStock(part) &&
          matchesText(args.category, part.Name) &&
          (!args.critical || part.QuantityOnHand === 0)
        );

        if (lowStockParts.length === 0) {
          return withTruncationNote(truncated, {
            content: [{
              type: 'text',
              text: 'No parts are currently low on stock.',
            }],
          });
        }

        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: `Low Stock Parts (${lowStockParts.length}):\n\n${lowStockParts.map(renderPart).join('\n\n')}`,
          }],
        });
      }

      case 'parts_find_by_number': {
        // Live parts have no PartNumber field; the part's Name is its identifier there.
        const wanted = String(args.partNumber ?? '').trim().toLowerCase();
        const { items, truncated } = await listParts(client);
        const parts = items.filter((p: Part) =>
          p.PartNumber?.toLowerCase() === wanted || p.Name?.toLowerCase() === wanted
        );

        if (parts.length === 0) {
          return withTruncationNote(truncated, {
            content: [{
              type: 'text',
              text: `No part found with number: ${args.partNumber}`,
            }],
          });
        }
        
        const part = parts[0];
        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: `Part Found:
Name: ${part.Name}${part.PartNumber ? `\nPart Number: ${part.PartNumber}` : ''}
Stock: ${part.QuantityOnHand || 0}
Cost: $${part.StandardCostEach}
Supplier: ${part.StandardSupplier?.Name || 'N/A'}
ID: ${part.PartId}`,
          }],
        });
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
