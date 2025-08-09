/**
 * SLA Management Tools for IncidentIQ
 * Service Level Agreement tracking and compliance
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from '../api/client.js';

/**
 * SLA management tools for tracking service level compliance
 */
export class SLATools {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Get all MCP tool definitions for SLAs
   */
  getTools(): Tool[] {
    return [
      {
        name: 'sla_list',
        description: 'Get list of all configured SLAs in the system',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'sla_get_metrics',
        description: 'Get all SLA metrics for performance tracking',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'sla_get_metric_types',
        description: 'Get available SLA metric types (Response Time, Resolution Time, Custom Time)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'sla_get_ticket_status',
        description: 'Get SLA compliance status for a specific ticket',
        inputSchema: {
          type: 'object',
          required: ['ticket_id'],
          properties: {
            ticket_id: {
              type: 'string',
              description: 'The GUID of the ticket to check SLA status'
            }
          }
        }
      }
    ];
  }

  /**
   * Handle tool execution
   */
  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'sla_list':
        return this.listSLAs();
      case 'sla_get_metrics':
        return this.getMetrics();
      case 'sla_get_metric_types':
        return this.getMetricTypes();
      case 'sla_get_ticket_status':
        return this.getTicketSLA(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async listSLAs(): Promise<any> {
    const slas = await this.client.getSLAs();
    
    if (!slas || slas.length === 0) {
      return {
        message: 'No SLAs configured in the system',
        count: 0,
        slas: []
      };
    }

    return {
      count: slas.length,
      slas: slas,
      message: 'Retrieved configured SLAs'
    };
  }

  private async getMetrics(): Promise<any> {
    const metrics = await this.client.getSLAMetrics();
    
    return {
      count: metrics.length,
      metrics: metrics,
      message: metrics.length > 0 ? 'Retrieved SLA metrics' : 'No SLA metrics found'
    };
  }

  private async getMetricTypes(): Promise<any> {
    const types = await this.client.getSLAMetricTypes();
    
    return {
      count: types.length,
      types: types,
      available_types: types.map((t: any) => t.Name || t.MetricTypeName),
      message: 'Retrieved SLA metric types'
    };
  }

  private async getTicketSLA(args: any): Promise<any> {
    if (!args.ticket_id) {
      throw new Error('ticket_id is required');
    }

    const slaStatus = await this.client.getTicketSLA(args.ticket_id);
    
    if (!slaStatus) {
      return {
        ticket_id: args.ticket_id,
        has_sla: false,
        message: 'No SLA assigned to this ticket'
      };
    }

    return {
      ticket_id: args.ticket_id,
      has_sla: true,
      sla_status: slaStatus,
      message: 'Retrieved ticket SLA status'
    };
  }
}