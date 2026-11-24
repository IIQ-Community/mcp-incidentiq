/**
 * ANALYTICS TOOLS (context/iiq-api/Analytics.json)
 *
 * Asset-verification breakdowns and the analytics report catalog. Live responses are
 * `{ ItemCount, Items }` with no Paging, and IIQ ignores `$p`/`$s` (probe 2026-11-24).
 * No documented endpoint returns report values, and audit-policy/schedule IDs have no
 * documented source, so those tools are not offered (#112).
 */

import { IncidentIQClient } from '../api/client.js';
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
    description: 'Get breakdown of asset counts by verification location',
    inputSchema: {
      type: 'object',
      properties: {},
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
      // Asset Auditing Analytics
      case 'analytics_asset_audit_coverage': {
        const response = await client.request<PaginatedResponse<AnalyticsDataPoint>>({
          method: 'GET',
          url: '/analytics/assets/by-audit-policy-coverage',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No audit policy coverage data available.',
            }],
          };
        }
        
        const dataPoints = response.Items.map((dp: AnalyticsDataPoint) =>
          `• ${dp.Name}: ${dp.Value} assets`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Asset Audit Policy Coverage:\n\n${dataPoints}\n\nTotal data points: ${response.ItemCount}`,
          }],
        };
      }
      
      case 'analytics_asset_audit_status': {
        const response = await client.request<PaginatedResponse<AnalyticsDataPoint>>({
          method: 'GET',
          url: '/analytics/assets/by-audit-status',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No audit status data available.',
            }],
          };
        }
        
        const total = response.Items.reduce((sum, dp) => sum + dp.Value, 0);
        const dataPoints = response.Items.map((dp: AnalyticsDataPoint) => {
          const percentage = ((dp.Value / total) * 100).toFixed(1);
          return `• ${dp.Name}: ${dp.Value} assets (${percentage}%)`;
        }).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Asset Audit Status Distribution:\n\n${dataPoints}\n\nTotal assets: ${total}`,
          }],
        };
      }
      
      case 'analytics_asset_verification_location': {
        const response = await client.request<PaginatedResponse<AnalyticsDataPoint>>({
          method: 'GET',
          url: '/analytics/assets/by-verification-location',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No verification location data available.',
            }],
          };
        }
        
        const sortedLocations = response.Items.sort((a, b) => b.Value - a.Value);
        const top10 = sortedLocations.slice(0, 10);
        
        const dataPoints = top10.map((dp: AnalyticsDataPoint) =>
          `• ${dp.Name}: ${dp.Value} assets`
        ).join('\n');
        
        const remainingCount = response.ItemCount - 10;
        const remainingText = remainingCount > 0 ? `\n\n...and ${remainingCount} more locations` : '';
        
        return {
          content: [{
            type: 'text',
            text: `Asset Verification by Location (Top 10):\n\n${dataPoints}${remainingText}\n\nTotal locations: ${response.ItemCount}`,
          }],
        };
      }
      
      case 'analytics_asset_verification_type': {
        const response = await client.request<PaginatedResponse<AnalyticsDataPoint>>({
          method: 'GET',
          url: '/analytics/assets/by-verification-type',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No verification type data available.',
            }],
          };
        }
        
        const dataPoints = response.Items.map((dp: AnalyticsDataPoint) =>
          `• ${dp.Name}: ${dp.Value} assets`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Asset Verification by Type:\n\n${dataPoints}\n\nTotal types: ${response.ItemCount}`,
          }],
        };
      }
      
      // Reports Management
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