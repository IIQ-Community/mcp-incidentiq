/**
 * ANALYTICS TOOLS - Based on Swagger Documentation
 * 
 * The Analytics API provides aggregated data for dashboards and reporting.
 * All endpoints return ListGetResponseOfAnalyticsDataPoint with structure:
 * { Items: AnalyticsDataPoint[], ItemCount: number, Paging: {...} }
 * 
 * AnalyticsDataPoint contains: Name, Value, Id, Date
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
  {
    name: 'analytics_asset_audit_by_policy',
    description: 'Get audit status breakdown for a specific audit policy',
    inputSchema: {
      type: 'object',
      properties: {
        policyId: {
          type: 'string',
          description: 'The Audit Policy ID (GUID)',
        },
      },
      required: ['policyId'],
    },
  },
  {
    name: 'analytics_asset_audit_by_schedule',
    description: 'Get audit status breakdown for a specific audit schedule',
    inputSchema: {
      type: 'object',
      properties: {
        scheduleId: {
          type: 'string',
          description: 'The Audit Policy Schedule ID (GUID)',
        },
      },
      required: ['scheduleId'],
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
  {
    name: 'analytics_get_report_elements',
    description: 'Get UI elements/widgets for a specific report',
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
  {
    name: 'analytics_get_report_queries',
    description: 'Get query definitions for a specific report',
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
  
  // Custom Analytics (for dashboard creation)
  {
    name: 'analytics_dashboard_summary',
    description: 'Get a summary of key metrics for dashboard display',
    inputSchema: {
      type: 'object',
      properties: {
        includeTickets: {
          type: 'boolean',
          description: 'Include ticket metrics (default: true)',
        },
        includeAssets: {
          type: 'boolean',
          description: 'Include asset metrics (default: true)',
        },
        includeUsers: {
          type: 'boolean',
          description: 'Include user metrics (default: false)',
        },
        dateRange: {
          type: 'string',
          enum: ['today', 'week', 'month', 'quarter', 'year'],
          description: 'Date range for metrics (default: month)',
        },
      },
      required: [],
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
      
      case 'analytics_asset_audit_by_policy': {
        const response = await client.request<PaginatedResponse<AnalyticsDataPoint>>({
          method: 'GET',
          url: `/analytics/assets/by-audit-policy-status/${args.policyId}`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No audit data found for policy ${args.policyId}.`,
            }],
          };
        }
        
        const dataPoints = response.Items.map((dp: AnalyticsDataPoint) =>
          `• ${dp.Name}: ${dp.Value} assets`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Audit Status for Policy ${args.policyId}:\n\n${dataPoints}\n\nTotal statuses: ${response.ItemCount}`,
          }],
        };
      }
      
      case 'analytics_asset_audit_by_schedule': {
        const response = await client.request<PaginatedResponse<AnalyticsDataPoint>>({
          method: 'GET',
          url: `/analytics/assets/by-audit-policy-schedule-status/${args.scheduleId}`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No audit data found for schedule ${args.scheduleId}.`,
            }],
          };
        }
        
        const dataPoints = response.Items.map((dp: AnalyticsDataPoint) =>
          `• ${dp.Name}: ${dp.Value} assets`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Audit Status for Schedule ${args.scheduleId}:\n\n${dataPoints}\n\nTotal statuses: ${response.ItemCount}`,
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
      
      case 'analytics_get_report_elements': {
        const response = await client.request<PaginatedResponse<ReportElement>>({
          method: 'GET',
          url: `/analytics/reports/elements/${args.reportId}`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No elements found for report ${args.reportId}.`,
            }],
          };
        }
        
        const elementList = response.Items.map((element: ReportElement) =>
          `• ${element.Name}${element.Subtitle ? ` - ${element.Subtitle}` : ''}
  Type: ${element.ReportElementTypeId}
  Size: ${element.DefaultSizeX}x${element.DefaultSizeY}
  Icon: ${element.Icon || 'None'}
  About: ${element.About || 'N/A'}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Report Elements for ${args.reportId} (${response.ItemCount}):\n\n${elementList}`,
          }],
        };
      }
      
      case 'analytics_get_report_queries': {
        const response = await client.request<PaginatedResponse<any>>({
          method: 'GET',
          url: `/analytics/reports/queries/${args.reportId}`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No queries found for report ${args.reportId}.`,
            }],
          };
        }
        
        const queryList = response.Items.map((query: any) =>
          `• ${query.Name}
  Query Key: ${query.QueryKey || 'N/A'}
  Type ID: ${query.ReportElementTypeId}
  Has Primary Definition: ${query.HasDefinitionPrimary ? 'Yes' : 'No'}
  Has Secondary Definition: ${query.HasDefinitionSecondary ? 'Yes' : 'No'}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Report Queries for ${args.reportId} (${response.ItemCount}):\n\n${queryList}`,
          }],
        };
      }
      
      // Custom Dashboard Summary (aggregates multiple analytics)
      case 'analytics_dashboard_summary': {
        const includeAssets = args.includeAssets !== false;
        
        let summary = '📊 Analytics Dashboard Summary\n' + '='.repeat(40) + '\n\n';
        
        // Try to get asset audit status if including assets
        if (includeAssets) {
          try {
            const assetAudit = await client.request<PaginatedResponse<AnalyticsDataPoint>>({
              method: 'GET',
              url: '/analytics/assets/by-audit-status',
            });
            
            if (assetAudit?.Items && assetAudit.Items.length > 0) {
              summary += '📦 Asset Audit Status:\n';
              const total = assetAudit.Items.reduce((sum, dp) => sum + dp.Value, 0);
              assetAudit.Items.forEach((dp: AnalyticsDataPoint) => {
                const percentage = ((dp.Value / total) * 100).toFixed(1);
                summary += `  • ${dp.Name}: ${dp.Value} (${percentage}%)\n`;
              });
              summary += `  Total Assets: ${total}\n\n`;
            }
          } catch (error) {
            summary += '📦 Asset Analytics: Not available\n\n';
          }
        }
        
        // Try to get available reports
        try {
          const reports = await client.request<PaginatedResponse<AnalyticsReport>>({
            method: 'GET',
            url: '/analytics/reports',
          });
          
          if (reports?.Items && reports.Items.length > 0) {
            summary += `📈 Available Reports: ${reports.ItemCount}\n`;
            reports.Items.slice(0, 5).forEach((report: AnalyticsReport) => {
              summary += `  • ${report.Name}\n`;
            });
            if (reports.ItemCount > 5) {
              summary += `  ...and ${reports.ItemCount - 5} more\n`;
            }
            summary += '\n';
          }
        } catch (error) {
          summary += '📈 Reports: Not available\n\n';
        }
        
        summary += '💡 Tips:\n';
        summary += '• Use view-based filtering for complex analytics queries\n';
        summary += '• Implement 15-minute update cycle for real-time dashboards\n';
        summary += '• Cache analytics data to reduce API load\n';
        summary += '• Combine with Google Sheets for custom visualizations';
        
        return {
          content: [{
            type: 'text',
            text: summary,
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