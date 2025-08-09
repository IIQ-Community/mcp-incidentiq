/**
 * TEAMS TOOLS
 * 
 * IT support team management for K-12 districts
 * Manage support teams, assignments, and member management
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

export class TeamTools {
  private client: IncidentIQClient;

  constructor(client: IncidentIQClient) {
    this.client = client;
  }

  getTools() {
    return [
      // List and Search Operations
      {
        name: 'team_get_all',
        description: 'Get all IT support teams in the district',
        inputSchema: {
          type: 'object',
          properties: {
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
        name: 'team_search',
        description: 'Search for teams by name or description',
        inputSchema: {
          type: 'object',
          properties: {
            searchText: {
              type: 'string',
              description: 'Text to search for in team names and descriptions',
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

      // Individual Team Operations
      {
        name: 'team_get',
        description: 'Get detailed information about a specific team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: 'The GUID of the team',
            },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'team_get_members',
        description: 'Get all members of a specific team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: 'The GUID of the team',
            },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'team_get_agents',
        description: 'Get all agents assigned to a specific team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: 'The GUID of the team',
            },
          },
          required: ['teamId'],
        },
      },

      // Team Assignments
      {
        name: 'team_get_tickets',
        description: 'Get all tickets assigned to a specific team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: 'The GUID of the team',
            },
            includeResolved: {
              type: 'boolean',
              description: 'Include resolved tickets (default: false)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'team_get_locations',
        description: 'Get all locations assigned to a specific team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: 'The GUID of the team',
            },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'team_get_categories',
        description: 'Get ticket categories handled by a specific team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: 'The GUID of the team',
            },
          },
          required: ['teamId'],
        },
      },

      // Team Statistics
      {
        name: 'team_get_stats',
        description: 'Get performance statistics for a team',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: 'The GUID of the team',
            },
            dateFrom: {
              type: 'string',
              description: 'Start date for statistics (ISO format)',
            },
            dateTo: {
              type: 'string',
              description: 'End date for statistics (ISO format)',
            },
          },
          required: ['teamId'],
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
      case 'team_get_all': {
        const params = {
          $p: args.pageIndex || 0,
          $s: args.pageSize || 100,
          $d: args.sortDirection || 'Descending',
        };
        return await makeRequest('GET', '/teams/all', { params });
      }

      case 'team_search': {
        const payload = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          SearchText: args.searchText,
          Paging: {
            PageIndex: args.pageIndex || 0,
            PageSize: args.pageSize || 20,
          },
        };
        return await makeRequest('POST', '/teams', { data: payload });
      }

      case 'team_get': {
        return await makeRequest('GET', `/teams/${args.teamId}`);
      }

      case 'team_get_members': {
        return await makeRequest('GET', `/teams/${args.teamId}/members`);
      }

      case 'team_get_agents': {
        return await makeRequest('GET', `/teams/${args.teamId}/agents`);
      }

      case 'team_get_tickets': {
        const params = {
          includeResolved: args.includeResolved || false,
          $p: 0,
          $s: args.pageSize || 20,
        };
        return await makeRequest('GET', `/teams/${args.teamId}/tickets`, { params });
      }

      case 'team_get_locations': {
        return await makeRequest('GET', `/teams/${args.teamId}/locations`);
      }

      case 'team_get_categories': {
        return await makeRequest('GET', `/teams/${args.teamId}/categories`);
      }

      case 'team_get_stats': {
        const params: any = {};
        if (args.dateFrom) params.dateFrom = args.dateFrom;
        if (args.dateTo) params.dateTo = args.dateTo;
        return await makeRequest('GET', `/teams/${args.teamId}/stats`, { params });
      }

      default:
        throw new Error(`Unknown team tool: ${toolName}`);
    }
  }
}

// Export for backward compatibility
export const teamTools = new TeamTools(getClient()).getTools();

export async function handleTeamTool(name: string, args: any) {
  const tools = new TeamTools(getClient());
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