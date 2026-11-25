/**
 * SLA Management Tools for IncidentIQ
 * Service Level Agreement tracking and compliance
 */

import type { IncidentIQClient } from '../api/client.js';
import { jsonResult, textResult, type ToolDefinition, type ToolResult } from './result.js';

/** MCP tool definitions for SLA tracking. */
export const slaTools: ToolDefinition[] = [
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

async function listSLAs(client: IncidentIQClient): Promise<unknown> {
  const slas = await client.getSLAs();

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

async function getMetrics(client: IncidentIQClient): Promise<unknown> {
  const metrics = await client.getSLAMetrics();

  return {
    count: metrics.length,
    metrics: metrics,
    message: metrics.length > 0 ? 'Retrieved SLA metrics' : 'No SLA metrics found'
  };
}

async function getMetricTypes(client: IncidentIQClient): Promise<unknown> {
  const types = await client.getSLAMetricTypes();

  return {
    count: types.length,
    types: types,
    available_types: types.map((t: any) => t.Name || t.MetricTypeName),
    message: 'Retrieved SLA metric types'
  };
}

async function getTicketSLA(args: any, client: IncidentIQClient): Promise<unknown> {
  if (!args.ticket_id) {
    throw new Error('ticket_id is required');
  }

  const slaStatus = await client.getTicketSLA(args.ticket_id);

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

/** Raw IIQ data for an SLA tool; `handleSlaTool` encodes it as the MCP result. */
async function slaData(name: string, args: any, client: IncidentIQClient): Promise<unknown> {
  switch (name) {
    case 'sla_list':
      return listSLAs(client);
    case 'sla_get_metrics':
      return getMetrics(client);
    case 'sla_get_metric_types':
      return getMetricTypes(client);
    case 'sla_get_ticket_status':
      return getTicketSLA(args, client);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function handleSlaTool(name: string, args: any, client: IncidentIQClient): Promise<ToolResult> {
  try {
    return jsonResult(await slaData(name, args, client));
  } catch (error: any) {
    return textResult(`Error: ${error.message}`);
  }
}
