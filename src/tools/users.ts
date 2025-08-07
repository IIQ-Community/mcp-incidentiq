import { IncidentIQClient } from '../api/client.js';
import { IIQUser } from '../types/common.js';

// Initialize client lazily to ensure environment variables are loaded
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const userTools = [
  {
    name: 'user_search',
    description: 'Search for users (students, staff, or parents) in the district',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Name, email, or username to search for',
        },
        userType: {
          type: 'string',
          description: 'Filter by user type: student, staff, parent',
        },
        locationId: {
          type: 'string',
          description: 'Filter by location/building ID',
        },
        grade: {
          type: 'string',
          description: 'Filter by grade level (for students)',
        },
        isActive: {
          type: 'boolean',
          description: 'Filter by active status',
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
    name: 'user_get',
    description: 'Get detailed information about a specific user',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The user ID (GUID)',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'user_get_agents',
    description: 'Get list of IT support agents/technicians in the district',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

export async function handleUserTool(name: string, args: any) {
  const client = getClient();
  try {
    switch (name) {
      case 'user_search': {
        const params: any = {
          SearchText: args.searchText,
          PageIndex: args.pageIndex || 0,
          PageSize: Math.min(args.pageSize || 20, 100),
          Filters: [],
        };

        if (args.userType) {
          params.Filters.push({
            Facet: 'userType',
            Id: args.userType,
          });
        }

        if (args.locationId) {
          params.Filters.push({
            Facet: 'location',
            Id: args.locationId,
          });
        }

        if (args.grade) {
          params.Filters.push({
            Facet: 'grade',
            Id: args.grade,
          });
        }

        const result = await client.searchUsers(params);
        
        if (result.Items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No users found matching your search criteria.',
              },
            ],
          };
        }

        const userList = result.Items.map((u: IIQUser) => 
          `- ${u.FullName || `${u.FirstName} ${u.LastName}`}\n  Type: ${u.UserTypeName} | Email: ${u.Email} | Location: ${u.LocationName}${u.Grade ? ` | Grade: ${u.Grade}` : ''}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.TotalCount} users (showing ${result.Items.length}):\n${userList}`,
            },
          ],
        };
      }

      case 'user_get': {
        const user = await client.getUser(args.userId);
        if (!user) {
          return {
            content: [
              {
                type: 'text',
                text: 'User not found.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `User Details:
- Name: ${user.FullName || `${user.FirstName} ${user.LastName}`}
- Username: ${user.Username}
- Email: ${user.Email}
- Type: ${user.UserTypeName}
- Role: ${user.Role || 'N/A'}
- Location: ${user.LocationName}
${user.Grade ? `- Grade: ${user.Grade}` : ''}
- Phone: ${user.PhoneNumber || 'N/A'}
- Mobile: ${user.MobileNumber || 'N/A'}
- Status: ${user.IsActive ? 'Active' : 'Inactive'}`,
            },
          ],
        };
      }

      case 'user_get_agents': {
        const agents = await client.getAgents();
        
        if (agents.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No IT support agents found.',
              },
            ],
          };
        }

        const agentList = agents.map((a: IIQUser) => 
          `- ${a.FullName || `${a.FirstName} ${a.LastName}`}\n  Email: ${a.Email} | Location: ${a.LocationName}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `IT Support Agents (${agents.length}):\n${agentList}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown user tool: ${name}`);
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