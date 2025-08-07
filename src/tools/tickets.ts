import { IncidentIQClient } from '../api/client.js';
import { IIQTicket, IIQTicketCreate, IIQTicketUpdate } from '../types/common.js';

// Initialize client lazily to ensure environment variables are loaded
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const ticketTools = [
  {
    name: 'ticket_create',
    description: 'Create a new IT support ticket for K-12 district staff or students',
    inputSchema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Brief description of the issue (e.g., "Chromebook won\'t turn on")',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the problem',
        },
        categoryId: {
          type: 'string',
          description: 'Category ID for the ticket (optional)',
        },
        priorityId: {
          type: 'string',
          description: 'Priority ID: typically High, Medium, or Low (optional)',
        },
        locationId: {
          type: 'string',
          description: 'Location ID where the issue occurred (building/room)',
        },
        requestorId: {
          type: 'string',
          description: 'User ID of the person requesting help',
        },
        assetId: {
          type: 'string',
          description: 'Asset ID if related to a specific device',
        },
      },
      required: ['subject', 'description'],
    },
  },
  {
    name: 'ticket_search',
    description: 'Search for IT support tickets in the district system',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Text to search for in tickets',
        },
        statusFilter: {
          type: 'string',
          description: 'Filter by status: open, closed, in-progress',
        },
        locationId: {
          type: 'string',
          description: 'Filter by location/building ID',
        },
        assignedToId: {
          type: 'string',
          description: 'Filter by assigned technician ID',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20, max: 100)',
          default: 20,
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
          default: 0,
        },
      },
      required: [],
    },
  },
  {
    name: 'ticket_get',
    description: 'Get details of a specific support ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID (GUID)',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'ticket_update',
    description: 'Update an existing support ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID to update',
        },
        subject: {
          type: 'string',
          description: 'Updated subject',
        },
        description: {
          type: 'string',
          description: 'Updated description',
        },
        statusId: {
          type: 'string',
          description: 'New status ID',
        },
        priorityId: {
          type: 'string',
          description: 'New priority ID',
        },
        assignedToId: {
          type: 'string',
          description: 'Reassign to different technician',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'ticket_close',
    description: 'Close a resolved support ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'The ticket ID to close',
        },
        resolution: {
          type: 'string',
          description: 'Resolution notes explaining how the issue was resolved',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'ticket_get_statuses',
    description: 'Get available ticket statuses for the district',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'ticket_get_categories',
    description: 'Get available ticket categories (e.g., Hardware, Software, Network)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'ticket_get_priorities',
    description: 'Get available ticket priority levels',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

export async function handleTicketTool(name: string, args: any) {
  const client = getClient();
  try {
    switch (name) {
      case 'ticket_create': {
        const data: IIQTicketCreate = {
          Subject: args.subject,
          Description: args.description,
          CategoryId: args.categoryId,
          PriorityId: args.priorityId,
          LocationId: args.locationId,
          RequestorId: args.requestorId,
          AssetId: args.assetId,
        };
        const ticket = await client.createTicket(data);
        return {
          content: [
            {
              type: 'text',
              text: ticket 
                ? `Ticket created successfully:\n- Ticket ID: ${ticket.TicketId}\n- Ticket #: ${ticket.TicketNumber}\n- Subject: ${ticket.Subject}\n- Status: ${ticket.StatusName}`
                : 'Failed to create ticket. Please check your API configuration.',
            },
          ],
        };
      }

      case 'ticket_search': {
        const params: any = {
          SearchText: args.searchText,
          PageIndex: args.pageIndex || 0,
          PageSize: Math.min(args.pageSize || 20, 100),
          Filters: [],
        };

        if (args.locationId) {
          params.Filters.push({
            Facet: 'location',
            Id: args.locationId,
          });
        }

        if (args.assignedToId) {
          params.Filters.push({
            Facet: 'assignedTo',
            Id: args.assignedToId,
          });
        }

        const result = await client.searchTickets(params);
        
        if (result.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No tickets found matching your search criteria.',
              },
            ],
          };
        }

        const ticketList = result.Items.map((t: IIQTicket) => 
          `- [${t.TicketNumber}] ${t.Subject}\n  Status: ${t.StatusName} | Priority: ${t.PriorityName} | Location: ${t.LocationName}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.TotalCount} tickets (showing ${result.Items.length}):\n${ticketList}`,
            },
          ],
        };
      }

      case 'ticket_get': {
        const ticket = await client.getTicket(args.ticketId);
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
              text: `Ticket Details:
- Ticket #: ${ticket.TicketNumber}
- Subject: ${ticket.Subject}
- Description: ${ticket.Description}
- Status: ${ticket.StatusName}
- Priority: ${ticket.PriorityName}
- Category: ${ticket.CategoryName}
- Location: ${ticket.LocationName}
- Requestor: ${ticket.RequestorName}
- Assigned To: ${ticket.AssignedToName || 'Unassigned'}
- Created: ${ticket.CreatedDate}
- Modified: ${ticket.ModifiedDate}
${ticket.AssetTag ? `- Asset: ${ticket.AssetTag}` : ''}`,
            },
          ],
        };
      }

      case 'ticket_update': {
        const updateData: IIQTicketUpdate = {};
        if (args.subject) updateData.Subject = args.subject;
        if (args.description) updateData.Description = args.description;
        if (args.statusId) updateData.StatusId = args.statusId;
        if (args.priorityId) updateData.PriorityId = args.priorityId;
        if (args.assignedToId) updateData.AssignedToId = args.assignedToId;

        const ticket = await client.updateTicket(args.ticketId, updateData);
        return {
          content: [
            {
              type: 'text',
              text: ticket 
                ? `Ticket updated successfully: ${ticket.Subject}`
                : 'Failed to update ticket.',
            },
          ],
        };
      }

      case 'ticket_close': {
        const success = await client.closeTicket(args.ticketId, args.resolution);
        return {
          content: [
            {
              type: 'text',
              text: success 
                ? 'Ticket closed successfully.'
                : 'Failed to close ticket.',
            },
          ],
        };
      }

      case 'ticket_get_statuses': {
        const statuses = await client.getTicketStatuses();
        const statusList = statuses.map(s => 
          `- ${s.StatusName}${s.IsDefault ? ' (Default)' : ''}${s.IsClosed ? ' (Closed)' : ''}`
        ).join('\n');
        return {
          content: [
            {
              type: 'text',
              text: `Available Ticket Statuses:\n${statusList}`,
            },
          ],
        };
      }

      case 'ticket_get_categories': {
        const categories = await client.getTicketCategories();
        const categoryList = categories.map(c => `- ${c.CategoryName}`).join('\n');
        return {
          content: [
            {
              type: 'text',
              text: `Available Ticket Categories:\n${categoryList}`,
            },
          ],
        };
      }

      case 'ticket_get_priorities': {
        const priorities = await client.getTicketPriorities();
        const priorityList = priorities.map(p => `- ${p.PriorityName}`).join('\n');
        return {
          content: [
            {
              type: 'text',
              text: `Available Ticket Priorities:\n${priorityList}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown ticket tool: ${name}`);
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