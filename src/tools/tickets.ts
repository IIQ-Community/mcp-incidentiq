/**
 * TICKET TOOLS - UPDATED 2025-01-08
 * 
 * Major discovery: Many more ticket endpoints are working than previously thought!
 * The API key has sufficient permissions for most ticket operations.
 * 
 * Working endpoints validated on 2025-01-08:
 * - 21 out of 29 tested endpoints are functional
 * - Search, status updates, priority management all work
 * - Individual ticket details and linked assets accessible
 */

import { IncidentIQClient } from '../api/client.js';
import { iiqPagingParams, iiqTotalRows } from '../api/paging.js';
import {
  Ticket,
  TicketDetail,
  IIQItemResponse,
  TicketStatus,
  TicketPriority,
  PaginatedRequest,
  PaginatedResponse,
  TicketSearchArgs,
} from '../types/common.js';
import {
  buildTicketFilters,
  filterByStatusId,
  formatTicketStatus,
  isValidEmail,
  resolveMaxPages,
} from './ticket-search.js';

// Initialize client lazily to ensure environment variables are loaded
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

/** "Agent (Team)", whichever parts are set, or "Unassigned". */
function formatAssignee(ticket: TicketDetail): string {
  const agent = ticket.AssignedToUser?.Name;
  const team = ticket.AssignedToTeam?.TeamName;
  if (agent && team) return `${agent} (${team})`;
  return agent || team || 'Unassigned';
}

export const ticketTools = [
  // Search and List Operations
  {
    name: 'ticket_search',
    description: 'Search for tickets with optional facet filters (status/agent/team/location) and pagination. Within a facet multiple values are OR; across facets they are AND.',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Optional text to search for in tickets',
        },
        onlyShowDeleted: {
          type: 'boolean',
          description: 'Show only deleted tickets (default: false)',
        },
        statusIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by ticket status GUIDs (from ticket_get_statuses). Multiple values match ANY (OR).',
        },
        agentIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by assigned agent user GUIDs. Multiple values match ANY (OR).',
        },
        agentEmails: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by assigned agent email address (any domain); each is resolved to a user GUID.',
        },
        teamIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by team GUIDs. Multiple values match ANY (OR).',
        },
        locationIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by location GUIDs. Multiple values match ANY (OR).',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20, max: 100)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number to retrieve (0-based, default: 0)',
        },
      },
      required: [],
    },
  },
  {
    name: 'ticket_get',
    description: 'Get detailed information about a specific ticket by ID (GUID)',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'ticket_get_statuses',
    description: 'Get all available ticket statuses in the system',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'ticket_get_priorities',
    description: 'Get all available ticket priorities in the system',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // Ticket Details
  {
    name: 'ticket_get_assets',
    description: 'Get assets linked to a specific ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format)',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'ticket_get_sla',
    description: 'Get SLA information for a specific ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format)',
        },
      },
      required: ['ticketId'],
    },
  },
  
  // Status Updates
  {
    name: 'ticket_update_status',
    description: 'Update the status of a ticket (waiting on requestor or requestor responded)',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format)',
        },
        status: {
          type: 'string',
          enum: ['waiting-on-requestor', 'requestor-responded'],
          description: 'The status to set',
        },
      },
      required: ['ticketId', 'status'],
    },
  },
  
  // Priority and Sensitivity
  {
    name: 'ticket_set_urgency',
    description: 'Mark a ticket as urgent or not urgent',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format)',
        },
        isUrgent: {
          type: 'boolean',
          description: 'Whether to mark as urgent (true) or not urgent (false)',
        },
      },
      required: ['ticketId', 'isUrgent'],
    },
  },
  {
    name: 'ticket_set_sensitivity',
    description: 'Mark a ticket as sensitive or not sensitive',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format)',
        },
        isSensitive: {
          type: 'boolean',
          description: 'Whether to mark as sensitive (true) or not sensitive (false)',
        },
      },
      required: ['ticketId', 'isSensitive'],
    },
  },
  
  // Issue Management
  {
    name: 'ticket_confirm_issue',
    description: 'Confirm or unconfirm the issue in a ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format)',
        },
        isConfirmed: {
          type: 'boolean',
          description: 'Whether to confirm (true) or unconfirm (false) the issue',
        },
      },
      required: ['ticketId', 'isConfirmed'],
    },
  },
  
  // Ticket Actions
  {
    name: 'ticket_cancel',
    description: 'Cancel a ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format)',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'ticket_unassign',
    description: 'Unassign a ticket from a user or team',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID format)',
        },
        unassignFrom: {
          type: 'string',
          enum: ['user', 'team', 'sla'],
          description: 'What to unassign the ticket from',
        },
      },
      required: ['ticketId', 'unassignFrom'],
    },
  },
  {
    name: 'ticket_mark_duplicate',
    description: 'Mark a ticket as a duplicate of another ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID to mark as duplicate (GUID format)',
        },
        originalTicketId: {
          type: 'string',
          description: 'The original ticket ID this is a duplicate of (GUID format)',
        },
      },
      required: ['ticketId', 'originalTicketId'],
    },
  },
  
  // Wizard Operations (kept for compatibility)
  {
    name: 'ticket_get_wizards',
    description: 'Get available ticket creation wizards/forms for the district',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'ticket_get_wizards_by_site',
    description: 'Get ticket creation wizards for a specific site/location',
    inputSchema: {
      type: 'object',
      properties: {
        siteId: {
          type: 'string',
          description: 'The site/location ID (GUID) to get wizards for',
        },
      },
      required: ['siteId'],
    },
  },
];

export async function handleTicketTool(name: string, args: any) {
  const client = getClient();
  try {
    switch (name) {
      // Search and List Operations
      case 'ticket_search': {
        const searchArgs = args as TicketSearchArgs;

        // Resolve agent emails -> UserIds (any valid email/domain; never silently drop).
        const resolvedAgentIds: string[] = [...(searchArgs.agentIds ?? [])];
        if (searchArgs.agentEmails && searchArgs.agentEmails.length > 0) {
          const malformed = searchArgs.agentEmails.filter((email) => !isValidEmail(email));
          if (malformed.length > 0) {
            return {
              content: [{
                type: 'text',
                text: `Invalid email address(es): ${malformed.join(', ')}. Provide well-formed email addresses.`,
              }],
            };
          }
          const unresolved: string[] = [];
          for (const email of searchArgs.agentEmails) {
            // IIQ ignores SearchText on POST /users; the `email` facet is the lookup that narrows.
            const userResult = await client.searchUsers({ Filters: [{ Facet: 'email', Value: email }] });
            const match = userResult.Items.find(
              (user) => (user.Email ?? '').toLowerCase() === email.toLowerCase()
            );
            if (match?.UserId) {
              resolvedAgentIds.push(match.UserId);
            } else {
              unresolved.push(email);
            }
          }
          if (unresolved.length > 0) {
            return {
              content: [{
                type: 'text',
                text: `No user found for: ${unresolved.join(', ')}. Verify the email address(es).`,
              }],
            };
          }
        }

        const filters = buildTicketFilters({
          keyword: searchArgs.searchText,
          agentIds: resolvedAgentIds,
          teamIds: searchArgs.teamIds,
          locationIds: searchArgs.locationIds,
        });

        const basePayload: PaginatedRequest = {
          OnlyShowDeleted: searchArgs.onlyShowDeleted ?? false,
          FilterByViewPermission: false,
        };
        if (filters.length > 0) basePayload.Filters = filters;

        const pageSize = searchArgs.pageSize ?? 20;
        const pageIndex = searchArgs.pageIndex ?? 0;
        const statusFilter = searchArgs.statusIds ?? [];

        let pageItems: Ticket[];
        let totalCount: number;
        let totalPages: number;
        let truncationNote = '';

        if (statusFilter.length > 0) {
          // The server status facet returns nothing, so filter client-side by WorkflowStep.StatusId over a
          // bounded sequential page scan (no per-ticket detail fetch, no unbounded concurrency).
          const wantedStatusIds = new Set(statusFilter);
          const maxPages = resolveMaxPages(process.env.IIQ_TICKET_FILTER_MAX_PAGES);
          const scanPageSize = 100;

          const firstPage = await client.request<PaginatedResponse<Ticket>>({
            method: 'POST',
            url: '/tickets',
            params: iiqPagingParams(0, scanPageSize),
            data: basePayload,
          });
          const accumulated: Ticket[] = [...(firstPage?.Items ?? [])];
          const serverPageCount = firstPage?.Paging?.PageCount ?? 1;
          const pagesToScan = Math.min(serverPageCount, maxPages);
          for (let page = 1; page < pagesToScan; page++) {
            const next = await client.request<PaginatedResponse<Ticket>>({
              method: 'POST',
              url: '/tickets',
              params: iiqPagingParams(page, scanPageSize),
              data: basePayload,
            });
            accumulated.push(...(next?.Items ?? []));
          }

          const filtered = filterByStatusId(accumulated, wantedStatusIds);
          totalCount = filtered.length;
          totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
          const start = pageIndex * pageSize;
          pageItems = filtered.slice(start, start + pageSize);

          if (serverPageCount > maxPages) {
            truncationNote = `\n\nNote: results may be incomplete - scanned ${maxPages} of ${serverPageCount} pages; add filters to narrow.`;
          }
        } else {
          // No status filter: server-side facet filtering + pagination.
          const response = await client.request<PaginatedResponse<Ticket>>({
            method: 'POST',
            url: '/tickets',
            params: iiqPagingParams(pageIndex, pageSize),
            data: basePayload,
          });
          pageItems = response?.Items ?? [];
          totalCount = iiqTotalRows(response);
          totalPages = response?.Paging?.PageCount ?? 1;
        }

        if (pageItems.length === 0) {
          // When a status scan was truncated, an empty result is NOT definitive - say so.
          const emptyText = truncationNote
            ? `No tickets matched in the scanned pages.${truncationNote}`
            : 'No tickets found matching your search criteria.';
          return {
            content: [{ type: 'text', text: emptyText }],
          };
        }

        const ticketList = pageItems.map((ticket) =>
          `- #${ticket.TicketNumber}: ${ticket.Subject}\n  Status: ${formatTicketStatus(ticket)}\n  Created: ${ticket.CreatedDate}\n  ID: ${ticket.TicketId}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${totalCount} tickets (showing ${pageItems.length}):\n\n${ticketList}\n\nPage ${pageIndex + 1} of ${totalPages}${truncationNote}`,
          }],
        };
      }
      
      case 'ticket_get': {
        const response = await client.request<IIQItemResponse<TicketDetail>>({
          method: 'GET',
          url: `/tickets/${args.ticketId}`,
        });
        const ticket = response?.Item;

        if (!ticket) {
          return {
            content: [
              {
                type: 'text',
                text: 'Ticket not found.',
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Ticket #${ticket.TicketNumber}:
Subject: ${ticket.Subject || 'No subject'}
Status: ${ticket.WorkflowStep?.StepName || ticket.WorkflowStep?.StatusName || 'Unknown'}
Priority: ${ticket.PriorityLevel?.Name || 'Normal'}
Created: ${ticket.CreatedDate || 'Unknown'}
Description: ${ticket.IssueDescription || 'No description'}
Requestor: ${ticket.For?.Name || 'Unknown'}
Assigned To: ${formatAssignee(ticket)}
Location: ${ticket.Location?.Name || 'Not specified'}
Urgent: ${ticket.IsUrgent ? 'Yes' : 'No'}
Sensitive: ${ticket.HasSensitiveInformation ? 'Yes' : 'No'}
ID: ${ticket.TicketId}`,
            },
          ],
        };
      }
      
      case 'ticket_get_statuses': {
        const response = await client.request<PaginatedResponse<TicketStatus>>({
          method: 'GET',
          url: '/tickets/statuses',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No ticket statuses found.',
              },
            ],
          };
        }
        
        const statusList = response.Items.map((s: TicketStatus) =>
          `- ${s.StepName && s.StepName !== s.StatusName ? `${s.StepName} (${s.StatusName})` : s.StatusName}${s.IsClosed ? ' [closed]' : ''}\n  ID: ${s.TicketStatusTypeId}`
        ).join('\n\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `Available Ticket Statuses (${iiqTotalRows(response)}):\n\n${statusList}`,
            },
          ],
        };
      }
      
      case 'ticket_get_priorities': {
        const response = await client.request<PaginatedResponse<TicketPriority>>({
          method: 'GET',
          url: '/tickets/priorities',
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No ticket priorities found.',
              },
            ],
          };
        }
        
        const priorityList = response.Items.map((p: TicketPriority) => 
          `- ${p.Name} (Level: ${p.Level})\n  ID: ${p.TicketPriorityId}`
        ).join('\n\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `Available Ticket Priorities (${iiqTotalRows(response)}):\n\n${priorityList}`,
            },
          ],
        };
      }
      
      // Ticket Details
      case 'ticket_get_assets': {
        const response = await client.request<PaginatedResponse<any>>({
          method: 'GET',
          url: `/tickets/${args.ticketId}/assets`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No assets linked to this ticket.',
              },
            ],
          };
        }
        
        const assetList = response.Items.map((a: any) => 
          `- ${a.Name || a.AssetTag}\n  Type: ${a.AssetTypeName}\n  Serial: ${a.SerialNumber || 'N/A'}\n  ID: ${a.AssetId}`
        ).join('\n\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `Assets Linked to Ticket (${iiqTotalRows(response)}):\n\n${assetList}`,
            },
          ],
        };
      }
      
      case 'ticket_get_sla': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/tickets/${args.ticketId}/sla`,
        });
        
        if (!response) {
          return {
            content: [
              {
                type: 'text',
                text: 'No SLA information found for this ticket.',
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `SLA Information:
Name: ${response.Name || 'Not specified'}
Response Time: ${response.ResponseTime || 'N/A'}
Resolution Time: ${response.ResolutionTime || 'N/A'}
Status: ${response.Status || 'Active'}
Breached: ${response.IsBreached ? 'Yes' : 'No'}`,
            },
          ],
        };
      }
      
      // Status Updates
      case 'ticket_update_status': {
        const endpoint = `/tickets/${args.ticketId}/status/${args.status}`;
        await client.request<Ticket>({
          method: 'POST',
          url: endpoint,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated ticket status to "${args.status}".`,
            },
          ],
        };
      }
      
      // Priority and Sensitivity
      case 'ticket_set_urgency': {
        const endpoint = args.isUrgent 
          ? `/tickets/${args.ticketId}/mark-urgent`
          : `/tickets/${args.ticketId}/mark-not-urgent`;
        
        await client.request<Ticket>({
          method: 'POST',
          url: endpoint,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully marked ticket as ${args.isUrgent ? 'urgent' : 'not urgent'}.`,
            },
          ],
        };
      }
      
      case 'ticket_set_sensitivity': {
        const endpoint = args.isSensitive 
          ? `/tickets/${args.ticketId}/mark-sensitive`
          : `/tickets/${args.ticketId}/mark-not-sensitive`;
        
        await client.request<Ticket>({
          method: 'POST',
          url: endpoint,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully marked ticket as ${args.isSensitive ? 'sensitive' : 'not sensitive'}.`,
            },
          ],
        };
      }
      
      // Issue Management
      case 'ticket_confirm_issue': {
        const endpoint = args.isConfirmed 
          ? `/tickets/${args.ticketId}/confirm-issue`
          : `/tickets/${args.ticketId}/unconfirm-issue`;
        
        await client.request<Ticket>({
          method: 'POST',
          url: endpoint,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully ${args.isConfirmed ? 'confirmed' : 'unconfirmed'} the issue.`,
            },
          ],
        };
      }
      
      // Ticket Actions
      case 'ticket_cancel': {
        await client.request<Ticket>({
          method: 'POST',
          url: `/tickets/${args.ticketId}/cancel`,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: 'Successfully cancelled the ticket.',
            },
          ],
        };
      }
      
      case 'ticket_unassign': {
        const endpoint = args.unassignFrom === 'sla' 
          ? `/tickets/${args.ticketId}/unassign-sla`
          : `/tickets/${args.ticketId}/unassign/${args.unassignFrom}`;
        
        await client.request<Ticket>({
          method: 'POST',
          url: endpoint,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully unassigned ticket from ${args.unassignFrom}.`,
            },
          ],
        };
      }
      
      case 'ticket_mark_duplicate': {
        await client.request<Ticket>({
          method: 'POST',
          url: `/tickets/${args.ticketId}/mark-as-duplicate/${args.originalTicketId}`,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully marked ticket as duplicate of ${args.originalTicketId}.`,
            },
          ],
        };
      }
      
      // Wizard Operations (kept for compatibility)
      case 'ticket_get_wizards': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/tickets/wizards'
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No ticket wizards found.',
              },
            ],
          };
        }
        
        const wizardList = response.Items.map((w: any) => 
          `- ${w.Name}${w.Icon ? ` (${w.Icon})` : ''}\n  ID: ${w.TicketWizardCategoryId}\n  Product: ${w.ProductId}\n  ${w.Description || 'No description'}`
        ).join('\n\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `Available Ticket Wizards (${iiqTotalRows(response)}):\n\n${wizardList}`,
            },
          ],
        };
      }
      
      case 'ticket_get_wizards_by_site': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/tickets/wizards/site/${args.siteId}`
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No ticket wizards found for this site.',
              },
            ],
          };
        }
        
        const wizardList = response.Items.map((w: any) => 
          `- ${w.Name}${w.Icon ? ` (${w.Icon})` : ''}\n  ID: ${w.TicketWizardCategoryId}\n  ${w.Description || 'No description'}`
        ).join('\n\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `Ticket Wizards for Site ${args.siteId} (${iiqTotalRows(response)}):\n\n${wizardList}`,
            },
          ],
        };
      }
      
      default:
        return {
          content: [
            {
              type: 'text',
              text: `Error: Unknown ticket tool "${name}".`,
            },
          ],
        };
    }
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