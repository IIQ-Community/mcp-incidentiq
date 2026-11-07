/**
 * ENHANCED USERS TOOLS - Based on Swagger Analysis
 * 
 * Users API provides K-12 identity management for students, staff, and parents
 * Critical for FERPA compliance and role-based access control
 * 
 * 12+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { ROLES, resolveIds } from '../api/lookups.js';
import { formatListPage, iiqListAll, iiqPagingParams, iiqServerTotal, iiqTotalRows } from '../api/paging.js';
import {
  IIQUser,
  PaginatedRequest,
  PaginatedResponse
} from '../types/common.js';

/** Display name: IIQ sends `Name` (there is no `FullName`); first + last is the fallback. */
function userName(user: IIQUser): string {
  return user.Name || `${user.FirstName} ${user.LastName}`;
}

// User-specific types
export interface UserStatistics {
  Category: string;
  Count: number;
  Percentage?: number;
}

export interface UserPermission {
  PermissionId: string;
  PermissionName: string;
  Scope: string;
  LocationId?: string;
}

export interface UserGroup {
  GroupId: string;
  GroupName: string;
  Description?: string;
  MemberCount?: number;
}

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const enhancedUserTools = [
  // Core Search & List
  {
    name: 'user_search_advanced',
    description: 'Advanced user search with K-12 specific filters (POST /users)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Text search by last name, email or username (uses GET /users/search; not combined with the other filters)',
        },
        userType: {
          type: 'string',
          enum: ['Student', 'Staff', 'Parent', 'Agent'],
          description: 'Filter by user type for FERPA compliance',
        },
        grade: {
          type: 'string',
          description: 'Grade level (K-12, or specific like "8")',
        },
        locationId: {
          type: 'string',
          description: 'Building/school ID',
        },
        homeroom: {
          type: 'string',
          description: 'Homeroom/classroom assignment',
        },
        isActive: {
          type: 'boolean',
          description: 'Active status filter',
        },
        viewId: {
          type: 'string',
          description: 'Use a saved view for filtering',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Include deleted users (default: false)',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25, max: 1000)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number (0-based)',
        },
      },
      required: [],
    },
  },
  
  // User Types
  {
    name: 'user_get_students',
    description: 'Get all student users with grade/homeroom info',
    inputSchema: {
      type: 'object',
      properties: {
        grade: {
          type: 'string',
          description: 'Filter by grade level',
        },
        locationId: {
          type: 'string',
          description: 'Filter by school building',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
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
    name: 'user_get_staff',
    description: 'Get all staff users (teachers, administrators, support)',
    inputSchema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          description: 'Filter by role (Teacher, Administrator, etc.)',
        },
        locationId: {
          type: 'string',
          description: 'Filter by building',
        },
        department: {
          type: 'string',
          description: 'Filter by department',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
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
    name: 'user_get_parents',
    description: 'Get parent users with student associations',
    inputSchema: {
      type: 'object',
      properties: {
        studentId: {
          type: 'string',
          description: 'Get parents of specific student',
        },
        grade: {
          type: 'string',
          description: 'Get parents of students in grade',
        },
      },
      required: [],
    },
  },
  
  // IT Support
  {
    name: 'user_get_all_agents',
    description: 'Get all IT support agents with permissions (GET /users/agents)',
    inputSchema: {
      type: 'object',
      properties: {
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive agents',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
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
    name: 'user_search_agents',
    description: 'Search IT agents with filters (POST /users/agents)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Search in agent names',
        },
        locationId: {
          type: 'string',
          description: 'Filter by assigned location',
        },
        teamId: {
          type: 'string',
          description: 'Filter by support team',
        },
      },
      required: [],
    },
  },
  
  // Individual User
  {
    name: 'user_get_details',
    description: 'Get comprehensive user details by ID (GET /users/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID (GUID)',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'user_get_current',
    description: 'Get current authenticated user details (GET /users/me)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // Statistics
  {
    name: 'user_statistics_grades',
    description: 'Get user distribution by grade level (GET /users/statistics/grades)',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Filter by building (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'user_statistics_locations',
    description: 'Get user distribution by building/location (GET /users/statistics/locations)',
    inputSchema: {
      type: 'object',
      properties: {
        userType: {
          type: 'string',
          description: 'Filter by user type (optional)',
        },
      },
      required: [],
    },
  },
  
  // Permissions & Groups
  {
    name: 'user_get_permissions',
    description: 'Get user permissions and access rights',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID to check permissions for',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'user_get_groups',
    description: 'Get all user groups in the district',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'user_get_user_groups',
    description: 'Get groups a specific user belongs to',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID',
        },
      },
      required: ['userId'],
    },
  },
  
  // Location-based
  {
    name: 'user_get_by_location',
    description: 'Get users with permissions for a location (GET /users/location/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location/building ID',
        },
        includeStudents: {
          type: 'boolean',
          description: 'Include student users',
        },
      },
      required: ['locationId'],
    },
  },
  
  // Quick Search
  {
    name: 'user_quick_search',
    description: 'Quick user search by name or email',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (min 3 characters)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 10)',
        },
      },
      required: ['query'],
    },
  },
];

export async function handleEnhancedUserTool(name: string, args: any) {
  const client = getClient();
  
  try {
    switch (name) {
      case 'user_search_advanced': {
        const payload: PaginatedRequest = {
          OnlyShowDeleted: args.includeDeleted || false,
          FilterByViewPermission: false,
          Filters: [],
        };
        
        // Add view filter if provided
        if (args.viewId) {
          payload.Filters!.push({
            Facet: 'View',
            Id: args.viewId,
          });
        }
        
        const searchText = typeof args.searchText === 'string' ? args.searchText.trim() : '';

        // IIQ ignores a UserType facet; a user type is the `role` facet with a RoleId.
        // Text search ignores filters, so the role is only looked up for the filtered list.
        if (args.userType && !searchText) {
          const [roleId] = await resolveIds(client, ROLES, [args.userType]);
          payload.Filters!.push({ Facet: 'role', Id: roleId });
        }

        if (args.grade) {
          payload.Filters!.push({
            Facet: 'Grade',
            Id: args.grade,
          });
        }

        if (args.locationId) {
          payload.Filters!.push({
            Facet: 'Location',
            Id: args.locationId,
          });
        }

        const pageSize = args.pageSize || 25;
        // IIQ ignores a body SearchText on POST /users; GET /users/search/{term} is its text search.
        // That endpoint takes no facet filters, so text search and the facet filters are exclusive.
        const readPage = (pageIndex: number) => searchText
          ? client.request<PaginatedResponse<IIQUser>>({
            method: 'GET',
            url: `/users/search/${encodeURIComponent(searchText)}`,
            params: iiqPagingParams(pageIndex, pageSize),
          })
          : client.request<PaginatedResponse<IIQUser>>({
            method: 'POST',
            url: '/users',
            params: iiqPagingParams(pageIndex, pageSize),
            data: payload,
          });
        const response = await readPage(args.pageIndex || 0);
        const ignoredFilters = searchText
          ? ['viewId', 'userType', 'grade', 'locationId', 'includeDeleted'].filter((key) => args[key])
          : [];
        const filterNote = ignoredFilters.length > 0
          ? `\n\nNote: ${ignoredFilters.join(', ')} not applied - IIQ text search does not combine with filters.`
          : '';
        
        // IIQ returns exactly the requested page, so every row is rendered (#96).
        const result = formatListPage({
          rows: response?.Items ?? [],
          total: await iiqServerTotal(response, args.pageIndex || 0, readPage),
          pageIndex: args.pageIndex || 0,
          pageSize,
          noun: 'users',
          emptyText: 'No users found matching your criteria.',
          render: (user: IIQUser) =>
            `• ${userName(user)}
  Type: ${user.Role?.Name || 'Unknown'} | Email: ${user.Email || 'N/A'}
  Location: ${user.LocationName || 'N/A'}${user.Grade ? ` | Grade: ${user.Grade}` : ''}
  Username: ${user.Username || 'N/A'} | Status: ${user.IsActive ? 'Active' : 'Inactive'}`,
        });
        result.content[0].text += filterNote;
        return result;
      }
      
      case 'user_get_students': {
        const [studentRoleId] = await resolveIds(client, ROLES, ['Student']);
        const payload: PaginatedRequest = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          Filters: [{ Facet: 'role', Id: studentRoleId }],
        };
        
        if (args.grade) {
          payload.Filters!.push({
            Facet: 'Grade',
            Id: args.grade,
          });
        }
        
        if (args.locationId) {
          payload.Filters!.push({
            Facet: 'Location',
            Id: args.locationId,
          });
        }
        
        const pageIndex = args.pageIndex || 0;
        const pageSize = args.pageSize || 25;
        const readPage = (index: number) => client.request<PaginatedResponse<IIQUser>>({
          method: 'POST',
          url: '/users',
          params: iiqPagingParams(index, pageSize),
          data: payload,
        });
        const response = await readPage(pageIndex);

        const studentRow = (student: IIQUser) => `  • ${userName(student)}${student.Homeroom ? ` - Room ${student.Homeroom}` : ''}`;
        return formatListPage({
          rows: response?.Items ?? [],
          total: await iiqServerTotal(response, pageIndex, readPage),
          pageIndex,
          pageSize,
          noun: 'students',
          emptyText: 'No students found.',
          render: studentRow,
          // Every student on the page, grouped by grade.
          renderPage: (students) => {
            const byGrade = new Map<string, IIQUser[]>();
            for (const student of students) {
              const grade = student.Grade || 'Unassigned';
              byGrade.set(grade, [...(byGrade.get(grade) ?? []), student]);
            }
            return [...byGrade]
              .map(([grade, group]) => `Grade ${grade} (${group.length}):\n${group.map(studentRow).join('\n')}`)
              .join('\n\n');
          },
        });
      }
      
      case 'user_get_staff': {
        // Staff OR Faculty: repeated `role` filters combine as OR in IIQ (3,497 + 72 = 3,569 live).
        const staffRoleIds = await resolveIds(client, ROLES, ['Staff', 'Faculty'], { skipMissing: true });
        const payload: PaginatedRequest = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          Filters: staffRoleIds.map((id) => ({ Facet: 'role', Id: id })),
        };
        
        if (args.locationId) {
          payload.Filters!.push({
            Facet: 'Location',
            Id: args.locationId,
          });
        }
        
        const pageIndex = args.pageIndex || 0;
        const pageSize = args.pageSize || 25;
        const readPage = (index: number) => client.request<PaginatedResponse<IIQUser>>({
          method: 'POST',
          url: '/users',
          params: iiqPagingParams(index, pageSize),
          data: payload,
        });
        const response = await readPage(pageIndex);

        return formatListPage({
          rows: response?.Items ?? [],
          total: await iiqServerTotal(response, pageIndex, readPage),
          pageIndex,
          pageSize,
          noun: 'staff members',
          emptyText: 'No staff members found.',
          render: (staff: IIQUser) => `• ${userName(staff)}
  Role: ${staff.Role?.Name || 'N/A'} | Email: ${staff.Email || 'N/A'}
  Location: ${staff.LocationName || 'N/A'}`,
        });
      }

      case 'user_get_all_agents': {
        // GET /users/agents defaults to a 200-row page (300 agents live), so read the whole list.
        const { items, truncated } = await iiqListAll<IIQUser>(client, '/users/agents');
        const result = formatListPage({
          rows: items,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'IT support agents',
          emptyText: 'No IT support agents found.',
          render: (agent) => `• ${userName(agent)}
  Email: ${agent.Email || 'N/A'} | Phone: ${agent.Phone || 'N/A'}
  Location: ${agent.LocationName || 'N/A'}`,
          truncated,
        });
        if (items.length > 0) result.content[0].text += '\n\n💡 These agents can be assigned to tickets and have elevated permissions';
        return result;
      }
      
      case 'user_get_details': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/users/${args.userId}`,
        });
        
        const user = response?.Item || response;
        
        if (!user) {
          return {
            content: [{
              type: 'text',
              text: 'User not found.',
            }],
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `User Details:
Name: ${userName(user)}
Username: ${user.Username || 'N/A'}
Email: ${user.Email || 'N/A'}
Type: ${user.Role?.Name || 'Unknown'}
Role: ${user.Role?.Name || 'N/A'}
Location: ${user.LocationName || 'N/A'}
${user.Grade ? `Grade: ${user.Grade}\n` : ''}${user.Homeroom ? `Homeroom: ${user.Homeroom}\n` : ''}Phone: ${user.PhoneNumber || 'N/A'}
Mobile: ${user.MobileNumber || 'N/A'}
Status: ${user.IsActive ? 'Active' : 'Inactive'}
Created: ${user.CreatedDate || 'N/A'}
Last Login: ${user.LastLoginDate || 'Never'}`,
          }],
        };
      }
      
      case 'user_get_current': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/users/me',
        });
        
        const user = response?.Item || response;
        
        if (!user) {
          return {
            content: [{
              type: 'text',
              text: 'Unable to retrieve current user information.',
            }],
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Current User:
Name: ${user.FullName || `${user.FirstName} ${user.LastName}`}
Username: ${user.Username}
Email: ${user.Email}
Role: ${user.Role || 'N/A'}
Permissions: ${user.Permissions?.length || 0} permissions`,
          }],
        };
      }
      
      case 'user_statistics_grades': {
        const url = args.locationId 
          ? `/users/statistics/grades?locationId=${args.locationId}`
          : '/users/statistics/grades';
          
        const response = await client.request<any>({
          method: 'GET',
          url,
        });
        
        const stats = response?.Items || response || [];
        
        if (stats.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No grade statistics available.',
            }],
          };
        }
        
        let totalStudents = 0;
        const gradeList = stats.map((stat: any) => {
          totalStudents += stat.Count || stat.Value || 0;
          return `  Grade ${stat.Name || stat.Grade}: ${stat.Count || stat.Value || 0} students`;
        }).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Student Distribution by Grade:

${gradeList}

Total Students: ${totalStudents}`,
          }],
        };
      }
      
      case 'user_statistics_locations': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/users/statistics/locations',
        });
        
        const stats = response?.Items || response || [];
        
        if (stats.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No location statistics available.',
            }],
          };
        }
        
        let totalUsers = 0;
        const locationList = stats.map((stat: any) => {
          totalUsers += stat.Count || stat.Value || 0;
          return `  ${stat.Name || stat.LocationName}: ${stat.Count || stat.Value || 0} users`;
        }).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `User Distribution by Location:

${locationList}

Total Users: ${totalUsers}`,
          }],
        };
      }
      
      case 'user_get_by_location': {
        const response = await client.request<PaginatedResponse<IIQUser>>({
          method: 'GET',
          url: `/users/location/${args.locationId}`,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No users found for this location.',
            }],
          };
        }
        
        const usersByType: Record<string, IIQUser[]> = {};
        response.Items.forEach((user: IIQUser) => {
          const type = user.Role?.Name || 'Unknown';
          if (!usersByType[type]) usersByType[type] = [];
          usersByType[type].push(user);
        });
        
        let output = `Users at Location (${iiqTotalRows(response)} total):\n`;
        
        for (const [type, users] of Object.entries(usersByType)) {
          output += `\n${type} (${users.length}):\n`;
          users.slice(0, 5).forEach(user => {
            output += `  • ${userName(user)}\n`;
          });
          if (users.length > 5) {
            output += `  ... and ${users.length - 5} more\n`;
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'user_quick_search': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/users/quick?q=${encodeURIComponent(args.query)}&limit=${args.limit || 10}`,
        });
        
        const users = response?.Items || response || [];
        
        if (users.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No users found matching "${args.query}".`,
            }],
          };
        }
        
        const userList = users.map((user: IIQUser) =>
          `• ${userName(user)} (${user.Role?.Name || 'Unknown'})`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Quick Search Results for "${args.query}":

${userList}`,
          }],
        };
      }
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Error: Unknown enhanced user tool "${name}".`,
          }],
        };
    }
  } catch (error: any) {
    // Handle 404s specially for user lookups
    if (error.response?.status === 404) {
      if (name === 'user_get_current') {
        return {
          content: [{
            type: 'text',
            text: 'Current user endpoint not available. The API key may not have user context.',
          }],
        };
      }
      if (name.includes('get_details') || name.includes('by_location')) {
        return {
          content: [{
            type: 'text',
            text: 'User or resource not found.',
          }],
        };
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`,
      }],
    };
  }
}

// Export for backward compatibility
export const userTools = enhancedUserTools;
export const handleUserTool = handleEnhancedUserTool;
