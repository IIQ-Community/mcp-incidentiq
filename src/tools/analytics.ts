/**
 * ANALYTICS TOOLS (context/iiq-api/Analytics.json)
 *
 * Asset-verification breakdowns and the analytics report catalog. Live responses are
 * `{ ItemCount, Items }` with no Paging, and IIQ ignores `$p`/`$s` (probe 2026-11-24).
 * No documented endpoint returns report values, and audit-policy/schedule IDs have no
 * documented source, so those tools are not offered (#112).
 */

import { IncidentIQClient } from '../api/client.js';
import { formatListPage } from '../api/paging.js';
import { PaginatedResponse } from '../types/common.js';

// Analytics-specific types
export interface AnalyticsDataPoint {
  Name: string;
  Value: number;
  Id: string;
  Date?: string;
  Meta?: any;
}

export interface AnalyticsReport {
  ReportId: string;
  SiteId?: string;
  ProductId: string;
  Name: string;
  Subtitle?: string;
  ReportKey?: string;
  IsSidebarVisible: boolean;
  DisplayOrder: number;
  Meta?: any;
}

export interface ReportElement {
  ReportElementId: string;
  ReportId: string;
  ReportKey?: string;
  ReportElementTypeId: string;
  Name: string;
  Subtitle?: string;
  ElementKey?: string;
  HasDefinitionPrimary: boolean;
  HasDefinitionSecondary: boolean;
  DefaultSizeX: number;
  DefaultSizeY: number;
  Icon?: string;
  About?: string;
  Meta?: any;
}

type TextResult = { content: Array<{ type: 'text'; text: string }> };
const text = (body: string): TextResult => ({ content: [{ type: 'text', text: body }] });

const count = (n: number) => n.toLocaleString('en-US');
const assets = (n: number) => `${count(n)} asset${n === 1 ? '' : 's'}`;
/** A data point's count; a missing or non-numeric Value counts as 0 so totals never become NaN. */
const valueOf = (point: AnalyticsDataPoint) => (Number.isFinite(point.Value) ? point.Value : 0);
const sumOf = (points: AnalyticsDataPoint[]) => points.reduce((sum, point) => sum + valueOf(point), 0);
/** Largest count first, ties by name; sorts a copy so the response is not mutated. */
const byCountDesc = (points: AnalyticsDataPoint[]) =>
  [...points].sort((a, b) => valueOf(b) - valueOf(a) || String(a.Name).localeCompare(String(b.Name)));

/** `• <Name>: <count> assets (<share>%)`; the share is omitted when the total is 0. */
function breakdownRow(point: AnalyticsDataPoint, total: number): string {
  const share = total > 0 ? ` (${((valueOf(point) / total) * 100).toFixed(1)}%)` : '';
  return `• ${point.Name}: ${assets(valueOf(point))}${share}`;
}
const breakdownRows = (points: AnalyticsDataPoint[], total: number) =>
  byCountDesc(points).map((point) => breakdownRow(point, total));

async function readPoints(client: IncidentIQClient, url: string): Promise<AnalyticsDataPoint[]> {
  const response = await client.request<PaginatedResponse<AnalyticsDataPoint>>({ method: 'GET', url });
  return response?.Items ?? [];
}

const BREAKDOWNS: Record<string, { url: string; title: string; emptyText: string }> = {
  analytics_asset_audit_coverage: {
    url: '/analytics/assets/by-audit-policy-coverage',
    title: 'Asset Audit Policy Coverage',
    emptyText: 'No audit policy coverage data available.',
  },
  analytics_asset_audit_status: {
    url: '/analytics/assets/by-audit-status',
    title: 'Asset Audit Status',
    emptyText: 'No audit status data available.',
  },
  analytics_asset_verification_type: {
    url: '/analytics/assets/by-verification-type',
    title: 'Asset Verification by Type',
    emptyText: 'No verification type data available.',
  },
};

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const analyticsTools = [
  // Asset Auditing Analytics
  {
    name: 'analytics_asset_audit_coverage',
    description: 'Get breakdown of asset counts by audit policy coverage',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'analytics_asset_audit_status',
    description: 'Get breakdown of asset counts by audit status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'analytics_asset_verification_location',
    description: 'Get asset counts by verification location: every location, largest first, with its share of all verified assets. Paged client-side.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: { type: 'number', description: 'Results per page (default: 25)' },
        pageIndex: { type: 'number', description: 'Page number (0-based)' },
      },
      required: [],
    },
  },
  {
    name: 'analytics_asset_verification_type',
    description: 'Get breakdown of asset counts by verification type',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  // Reports Management
  {
    name: 'analytics_list_reports',
    description: 'Get all available analytics reports',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'analytics_get_report',
    description: 'Get details of a specific analytics report',
    inputSchema: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'The Report ID (GUID)',
        },
      },
      required: ['reportId'],
    },
  },
];

export async function handleAnalyticsTool(name: string, args: any) {
  const client = getClient();
  
  try {
    switch (name) {
      // Asset-verification breakdowns (N7): count, share and total, largest first.
      case 'analytics_asset_audit_coverage':
      case 'analytics_asset_audit_status':
      case 'analytics_asset_verification_type': {
        const breakdown = BREAKDOWNS[name];
        const points = await readPoints(client, breakdown.url);
        if (points.length === 0) return text(breakdown.emptyText);
        const total = sumOf(points);
        return text(`${breakdown.title} (${assets(total)}):\n\n${breakdownRows(points, total).join('\n')}`);
      }

      // N5: every location, largest first, paged client-side (IIQ ignores $p/$s here).
      case 'analytics_asset_verification_location': {
        const points = await readPoints(client, '/analytics/assets/by-verification-location');
        const total = sumOf(points);
        return formatListPage({
          rows: byCountDesc(points),
          pageIndex: args?.pageIndex,
          pageSize: args?.pageSize ?? 25,
          noun: 'locations',
          emptyText: 'No verification location data available.',
          render: (point) => breakdownRow(point, total),
          renderPage: (page) => `Total assets verified: ${count(total)}\n\n${page.map((point) => breakdownRow(point, total)).join('\n')}`,
        });
      }

      case 'analytics_list_reports': {
        const response = await client.request<PaginatedResponse<AnalyticsReport>>({
          method: 'GET',
          url: '/analytics/reports',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No analytics reports available.',
            }],
          };
        }
        
        const reportList = response.Items
          .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
          .map((report: AnalyticsReport) =>
            `• ${report.Name}${report.Subtitle ? ` - ${report.Subtitle}` : ''}\n  ID: ${report.ReportId}\n  Key: ${report.ReportKey || 'N/A'}`
          ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Available Analytics Reports (${response.ItemCount}):\n\n${reportList}`,
          }],
        };
      }
      
      case 'analytics_get_report': {
        const response = await client.request<{ Item: AnalyticsReport }>({
          method: 'GET',
          url: `/analytics/reports/${args.reportId}`,
        });
        
        if (!response?.Item) {
          return {
            content: [{
              type: 'text',
              text: `Report ${args.reportId} not found.`,
            }],
          };
        }
        
        const report = response.Item;
        
        return {
          content: [{
            type: 'text',
            text: `Report Details:
Name: ${report.Name}
Subtitle: ${report.Subtitle || 'N/A'}
Report Key: ${report.ReportKey || 'N/A'}
Product ID: ${report.ProductId}
Site ID: ${report.SiteId || 'N/A'}
Display Order: ${report.DisplayOrder}
Sidebar Visible: ${report.IsSidebarVisible ? 'Yes' : 'No'}
ID: ${report.ReportId}`,
          }],
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `Error: Unknown analytics tool "${name}".`,
          }],
        };
    }
  } catch (error: any) {
    // Check if it's a 404 (endpoint doesn't exist)
    if (error.response?.status === 404) {
      return {
        content: [{
          type: 'text',
          text: `Analytics endpoint not available. This may require specific permissions or module licensing.\n\nError: ${error.response?.data?.Message || 'Endpoint not found'}`,
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