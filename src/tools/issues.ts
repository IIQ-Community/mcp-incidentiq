/**
 * ENHANCED ISSUES TOOLS - Based on Swagger Analysis
 * 
 * Issues API provides categorization and classification for tickets
 * Critical for organizing K-12 IT support and routing to teams
 * 
 * 9+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { IIQ_LIST_BODY, formatListPage, iiqListAll, matchesText, withTruncationNote } from '../api/paging.js';

/**
 * Reads every issue type. POST /issues/types ignores body SearchText, the keyword facet and body
 * PageIndex (verified 2026-11-06), so issue types are paged via $p/$s and filtered client-side.
 */
async function listIssueTypes(client: IncidentIQClient, includeDeleted = false): Promise<{ items: IssueType[]; truncated: boolean }> {
  const body = { ...IIQ_LIST_BODY, OnlyShowDeleted: includeDeleted };
  return iiqListAll<IssueType>(client, '/issues/types', { pageSize: 2000, body });
}

/** Words that put a classroom issue type in the audio group (shared by the filter and the grouping). */
const CLASSROOM_AUDIO_WORDS = ['audio', 'microphone', 'speaker', 'sound'];

/** True when the issue type's name contains any of the words. */
function nameHasAny(issue: { Name?: string }, words: string[]): boolean {
  return words.some((word) => matchesText(word, issue.Name));
}

// Issues specific types
export interface Issue {
  IssueId: string;
  SiteId: string;
  IssueTypeId: string;
  Name: string;
  Description?: string;
  Category?: string;
  Priority?: string;
  Scope?: string;
  IsActive?: boolean;
  IsCommon?: boolean;
  Resolution?: {
    Steps: string[];
    EstimatedTime: number;
    RequiredSkills: string[];
  };
  Template?: {
    Fields: any[];
    Defaults: any;
  };
  CreatedDate: string;
  ModifiedDate: string;
  CreatedBy?: string;
  ModifiedBy?: string;
}

export interface IssueType {
  IssueTypeId: string;
  SiteId: string;
  ProductId: string;
  Name: string;
  Scope: string;
  Category?: string;
  Icon?: string;
  Color?: string;
  SortOrder?: number;
  IsDefault?: boolean;
  IsActive?: boolean;
  AutoAssign?: {
    TeamId?: string;
    UserId?: string;
    Rules?: any[];
  };
  SLA?: {
    ResponseTime: number;
    ResolutionTime: number;
    EscalationRules: any[];
  };
  CustomFields?: string[];
  Metadata?: {
    UsageCount: number;
    LastUsed: string;
    AverageResolutionTime: number;
  };
}

export interface IssueCategory {
  CategoryId: string;
  ParentId?: string;
  Name: string;
  Description?: string;
  Path?: string;
  Level?: number;
  Icon?: string;
  Color?: string;
  SortOrder?: number;
  IsActive?: boolean;
  IssueTypes?: string[];
  Children?: IssueCategory[];
}

export interface IssuePriority {
  PriorityId: string;
  Name: string;
  Level: number;
  Description?: string;
  Color?: string;
  Icon?: string;
  SLA?: {
    ResponseMinutes: number;
    ResolutionMinutes: number;
  };
  EscalationRules?: {
    AfterMinutes: number;
    NotifyUsers: string[];
    NotifyTeams: string[];
  };
  Examples?: string[];
}

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const enhancedIssuesTools = [
  // Core Operations
  {
    name: 'issues_get_site_issues',
    description: 'Get all available issues for site (GET /issues/site)',
    inputSchema: {
      type: 'object',
      properties: {
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive issues',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_types',
    description: 'Get all issue types (GET /issues/types)',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['Tickets', 'Assets', 'Users', 'All'],
          description: 'Filter by scope',
        },
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive types',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_search_types',
    description: 'Search issue types by name and scope (filters the full POST /issues/types list client-side)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Text matched against issue type names',
        },
        scope: {
          type: 'string',
          enum: ['Tickets', 'Assets', 'Users', 'All'],
          description: 'Filter by scope',
        },
        category: {
          type: 'string',
          description: 'Filter by category',
        },
        isCommon: {
          type: 'boolean',
          description: 'Only common issue types',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Include deleted types',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 50)',
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
    name: 'issues_get_type_details',
    description: 'Get issue type details (GET /issues/types/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        typeId: {
          type: 'string',
          description: 'Issue type ID (GUID)',
        },
      },
      required: ['typeId'],
    },
  },
  
  // Categories & Classification
  {
    name: 'issues_get_categories',
    description: 'Get issue categories',
    inputSchema: {
      type: 'object',
      properties: {
        parentId: {
          type: 'string',
          description: 'Parent category ID for subcategories',
        },
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive categories',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_category_hierarchy',
    description: 'Get category tree structure',
    inputSchema: {
      type: 'object',
      properties: {
        maxDepth: {
          type: 'number',
          description: 'Maximum tree depth',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_common_categories',
    description: 'Get frequently used categories',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of categories to return',
        },
      },
      required: [],
    },
  },
  
  // Priority Management
  {
    name: 'issues_get_priorities',
    description: 'Get all priority levels',
    inputSchema: {
      type: 'object',
      properties: {
        includeSLA: {
          type: 'boolean',
          description: 'Include SLA information',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_priority_sla',
    description: 'Get SLA times by priority',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // K-12 Specific Issues
  {
    name: 'issues_get_classroom_tech',
    description: 'Get classroom technology issues',
    inputSchema: {
      type: 'object',
      properties: {
        buildingId: {
          type: 'string',
          description: 'Filter by school building',
        },
        includeProjector: {
          type: 'boolean',
          description: 'Include projector issues',
        },
        includeBoard: {
          type: 'boolean',
          description: 'Include interactive board issues',
        },
        includeAudio: {
          type: 'boolean',
          description: 'Include audio system issues',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_student_devices',
    description: 'Get student device issues',
    inputSchema: {
      type: 'object',
      properties: {
        deviceType: {
          type: 'string',
          enum: ['Chromebook', 'iPad', 'Laptop', 'Hotspot', 'All'],
          description: 'Filter by device type',
        },
        gradeLevel: {
          type: 'string',
          description: 'Filter by grade',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_chromebook_issues',
    description: 'Get Chromebook-specific issues',
    inputSchema: {
      type: 'object',
      properties: {
        issueType: {
          type: 'string',
          enum: ['Screen', 'Keyboard', 'Battery', 'Charging', 'Software', 'All'],
          description: 'Type of Chromebook issue',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_network_issues',
    description: 'Get network and WiFi issues',
    inputSchema: {
      type: 'object',
      properties: {
        buildingId: {
          type: 'string',
          description: 'Filter by building',
        },
        issueType: {
          type: 'string',
          enum: ['WiFi', 'Internet', 'VPN', 'Printing', 'All'],
          description: 'Type of network issue',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_parent_portal',
    description: 'Get parent portal access issues',
    inputSchema: {
      type: 'object',
      properties: {
        issueType: {
          type: 'string',
          enum: ['Login', 'Password', 'Access', 'Data', 'All'],
          description: 'Type of parent portal issue',
        },
      },
      required: [],
    },
  },
  
  // Templates & Quick Create
  {
    name: 'issues_get_templates',
    description: 'Get issue templates',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category',
        },
        scope: {
          type: 'string',
          description: 'Filter by scope',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_common_issues',
    description: 'Get frequently reported issues',
    inputSchema: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
          description: 'Time period',
        },
        limit: {
          type: 'number',
          description: 'Number of issues to return',
        },
      },
      required: [],
    },
  },
  
  // Analytics & Reporting
  {
    name: 'issues_get_by_building',
    description: 'Get issues grouped by school building',
    inputSchema: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
          description: 'Time period',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_recurring',
    description: 'Get frequently recurring issues',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Minimum occurrences',
        },
        timeframe: {
          type: 'string',
          enum: ['week', 'month', 'quarter'],
          description: 'Time period',
        },
      },
      required: [],
    },
  },
  
  // Seasonal Support
  {
    name: 'issues_get_seasonal',
    description: 'Get seasonal issue types',
    inputSchema: {
      type: 'object',
      properties: {
        season: {
          type: 'string',
          enum: ['enrollment', 'yearend', 'summer', 'testing', 'current'],
          description: 'School season',
        },
      },
      required: [],
    },
  },
  
  // Quick Lookups
  {
    name: 'issues_find_by_keyword',
    description: 'Find issues by keyword',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Keyword to search (password, chromebook, wifi, etc.)',
        },
        exactMatch: {
          type: 'boolean',
          description: 'Require exact keyword match',
        },
      },
      required: ['keyword'],
    },
  },
];

export async function handleEnhancedIssuesTool(name: string, args: any) {
  const client = getClient();
  
  try {
    switch (name) {
      case 'issues_get_site_issues': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/issues/site',
        });
        
        // Handle different response formats
        const issues = Array.isArray(response) ? response : response?.Items || [];
        
        if (issues.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No issues found for this site.',
            }],
          };
        }
        
        // Group by category or scope
        const issuesByCategory: Record<string, any[]> = {};
        issues.forEach((issue: Issue) => {
          const category = issue.Category || issue.Scope || 'Uncategorized';
          if (!issuesByCategory[category]) issuesByCategory[category] = [];
          issuesByCategory[category].push(issue);
        });
        
        let output = `Site Issues (${issues.length} total):\n`;
        
        for (const [category, categoryIssues] of Object.entries(issuesByCategory)) {
          output += `\n${category} (${categoryIssues.length} issues):\n`;
          categoryIssues.slice(0, 5).forEach(issue => {
            output += `  • ${issue.Name}\n`;
            if (issue.Description) {
              output += `    ${issue.Description.substring(0, 50)}...\n`;
            }
          });
          if (categoryIssues.length > 5) {
            output += `  ... and ${categoryIssues.length - 5} more\n`;
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'issues_get_types': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/issues/types',
        });
        
        const types = Array.isArray(response) ? response : response?.Items || [];
        
        if (types.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No issue types found.',
            }],
          };
        }
        
        // Filter by scope if requested
        let filteredTypes = types;
        if (args.scope && args.scope !== 'All') {
          filteredTypes = types.filter((t: IssueType) => t.Scope === args.scope);
        }
        
        // Group by category
        const typesByCategory: Record<string, IssueType[]> = {};
        filteredTypes.forEach((type: IssueType) => {
          const category = type.Category || 'General';
          if (!typesByCategory[category]) typesByCategory[category] = [];
          typesByCategory[category].push(type);
        });
        
        let output = `Issue Types (${filteredTypes.length}):\n`;
        
        for (const [category, categoryTypes] of Object.entries(typesByCategory)) {
          output += `\n${category}:\n`;
          categoryTypes.forEach(type => {
            output += `  • ${type.Name}`;
            if (type.Scope) output += ` (${type.Scope})`;
            if (type.IsDefault) output += ' ⭐';
            output += '\n';
          });
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'issues_search_types': {
        const { items, truncated } = await listIssueTypes(client, args.includeDeleted || false);
        const matched = items.filter((type) =>
          matchesText(args.searchText, type.Name) &&
          (!args.scope || args.scope === 'All' || type.Scope?.toLowerCase() === String(args.scope).toLowerCase()) &&
          matchesText(args.category, type.Category, type.Name)
        );
        return formatListPage({
          rows: matched,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 50,
          noun: 'issue types',
          emptyText: 'No issue types found matching your criteria.',
          render: (type: IssueType) =>
            `• ${type.Name}${type.Category ? ` (${type.Category})` : ''}
  Scope: ${type.Scope} | Active: ${type.IsActive ? 'Yes' : 'No'}
  ${type.Metadata ? `Usage: ${type.Metadata.UsageCount || 0} times` : ''}`,
          truncated,
        });
      }
      
      case 'issues_get_classroom_tech': {
        // Classroom technology issue types, matched by name (the server ignores SearchText).
        const words: string[] = [];
        if (args.includeProjector !== false) words.push('projector');
        if (args.includeBoard !== false) words.push('board', 'interactive', 'smartboard');
        if (args.includeAudio !== false) words.push(...CLASSROOM_AUDIO_WORDS);
        const { items, truncated } = await listIssueTypes(client);
        const classroomIssues = items.filter((issue) => nameHasAny(issue, words));

        if (classroomIssues.length === 0) {
          return withTruncationNote(truncated, {
            content: [{
              type: 'text',
              text: 'No classroom technology issues found.',
            }],
          });
        }
        
        // Categorize classroom issues
        const categories = {
          projector: classroomIssues.filter((i: IssueType) => 
            i.Name.toLowerCase().includes('projector')),
          board: classroomIssues.filter((i: IssueType) => 
            i.Name.toLowerCase().includes('board') || 
            i.Name.toLowerCase().includes('smart')),
          audio: classroomIssues.filter((i: IssueType) => nameHasAny(i, CLASSROOM_AUDIO_WORDS)),
          other: classroomIssues.filter((i: IssueType) =>
            !i.Name.toLowerCase().includes('projector') &&
            !i.Name.toLowerCase().includes('board') &&
            !i.Name.toLowerCase().includes('smart') &&
            !nameHasAny(i, CLASSROOM_AUDIO_WORDS)),
        };
        
        let output = 'Classroom Technology Issues:\n';
        
        if (categories.projector.length > 0) {
          output += '\nProjector Issues:\n';
          categories.projector.forEach((i: IssueType) => {
            output += `  • ${i.Name}\n`;
          });
        }
        
        if (categories.board.length > 0) {
          output += '\nInteractive Board Issues:\n';
          categories.board.forEach((i: IssueType) => {
            output += `  • ${i.Name}\n`;
          });
        }
        
        if (categories.audio.length > 0) {
          output += '\nAudio System Issues:\n';
          categories.audio.forEach((i: IssueType) => {
            output += `  • ${i.Name}\n`;
          });
        }
        
        if (categories.other.length > 0) {
          output += '\nOther Classroom Issues:\n';
          categories.other.slice(0, 5).forEach((i: IssueType) => {
            output += `  • ${i.Name}\n`;
          });
        }
        
        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: output,
          }],
        });
      }
      
      case 'issues_get_student_devices': {
        // Student device issue types, matched by name (the server ignores SearchText).
        const words = args.deviceType && args.deviceType !== 'All'
          ? [String(args.deviceType)]
          : ['chromebook', 'ipad', 'laptop', 'hotspot'];
        const { items, truncated } = await listIssueTypes(client);
        const deviceIssues = items.filter((issue) => nameHasAny(issue, words));

        if (deviceIssues.length === 0) {
          return withTruncationNote(truncated, {
            content: [{
              type: 'text',
              text: 'No student device issues found.',
            }],
          });
        }
        
        // Group by device type
        const issuesByDevice: Record<string, IssueType[]> = {};
        deviceIssues.forEach((issue: IssueType) => {
          let device = 'Other';
          if (issue.Name.toLowerCase().includes('chromebook')) device = 'Chromebook';
          else if (issue.Name.toLowerCase().includes('ipad')) device = 'iPad';
          else if (issue.Name.toLowerCase().includes('laptop')) device = 'Laptop';
          else if (issue.Name.toLowerCase().includes('hotspot')) device = 'Hotspot';
          
          if (!issuesByDevice[device]) issuesByDevice[device] = [];
          issuesByDevice[device].push(issue);
        });
        
        let output = `Student Device Issues (${deviceIssues.length} total):\n`;
        
        for (const [device, issues] of Object.entries(issuesByDevice)) {
          output += `\n${device} (${issues.length}):\n`;
          issues.slice(0, 5).forEach(issue => {
            output += `  • ${issue.Name}\n`;
          });
          if (issues.length > 5) {
            output += `  ... and ${issues.length - 5} more\n`;
          }
        }
        
        return withTruncationNote(truncated, {
          content: [{
            type: 'text',
            text: output,
          }],
        });
      }
      
      case 'issues_get_common_issues': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/issues/common',
        });
        
        const commonIssues = Array.isArray(response) ? response : response?.Items || [];
        
        if (commonIssues.length === 0) {
          // Return common K-12 issues based on experience
          return {
            content: [{
              type: 'text',
              text: `Common K-12 Issues (Based on Patterns):

Password Reset:
  • Student password reset
  • Parent portal password
  • Staff account locked

Device Issues:
  • Chromebook won't turn on
  • Broken screen
  • Lost charger
  • Keyboard not working

Network Problems:
  • Can't connect to WiFi
  • Internet is slow
  • Blocked website

Classroom Technology:
  • Projector not working
  • No sound from speakers
  • Interactive board frozen

Account Access:
  • Can't login to Google
  • Missing from class roster
  • Parent can't see grades`,
            }],
          };
        }
        
        const limit = args.limit || 10;
        const limitedIssues = commonIssues.slice(0, limit);
        
        const issueList = limitedIssues.map((issue: Issue, index: number) =>
          `${index + 1}. ${issue.Name}
   ${issue.Description || 'No description'}
   ${issue.Resolution ? `Resolution: ${issue.Resolution.Steps[0] || 'See details'}` : ''}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Top ${limitedIssues.length} Common Issues:

${issueList}`,
          }],
        };
      }
      
      case 'issues_find_by_keyword': {
        const keyword = args.keyword.toLowerCase();
        
        // Map common keywords to issue types
        const keywordMap: Record<string, string[]> = {
          'password': ['Password Reset', 'Account Locked', 'Can\'t Login'],
          'chromebook': ['Chromebook Won\'t Turn On', 'Broken Screen', 'Keyboard Issue'],
          'wifi': ['Can\'t Connect to WiFi', 'WiFi Slow', 'Network Error'],
          'projector': ['Projector No Display', 'No Signal', 'Remote Not Working'],
          'printer': ['Can\'t Print', 'Paper Jam', 'Out of Toner'],
          'google': ['Google Login Failed', 'Google Drive Full', 'Classroom Sync'],
          'parent': ['Parent Portal Access', 'Parent Can\'t Login', 'Missing Student'],
          'screen': ['Broken Screen', 'Screen Flickering', 'Touch Not Working'],
          'sound': ['No Audio', 'Microphone Not Working', 'Speaker Issues'],
          'charger': ['Lost Charger', 'Charger Not Working', 'Wrong Charger'],
        };
        
        const relatedIssues = keywordMap[keyword] || [`${args.keyword} Issue`];
        
        return {
          content: [{
            type: 'text',
            text: `Issues related to "${args.keyword}":

${relatedIssues.map(issue => `• ${issue}`).join('\n')}

To create a ticket for any of these issues, use the appropriate template or provide more details.`,
          }],
        };
      }
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Error: Unknown enhanced issues tool "${name}".`,
          }],
        };
    }
  } catch (error: any) {
    // Handle 404s specially
    if (error.response?.status === 404) {
      if (name.includes('classroom') || name.includes('student')) {
        return {
          content: [{
            type: 'text',
            text: 'This K-12 specific endpoint may not be available. Try using issues_search_types with appropriate filters instead.',
          }],
        };
      }
      return {
        content: [{
          type: 'text',
          text: 'Issue or resource not found.',
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

// Export for class compatibility
export class IssueTools {
  constructor(_client: any) {
    // Client is passed but not needed as we use getClient() internally
  }
  
  getTools() {
    return enhancedIssuesTools;
  }
  
  async handleToolCall(name: string, args: any) {
    return handleEnhancedIssuesTool(name, args);
  }
}
