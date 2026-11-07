/**
 * ENHANCED ISSUES TOOLS - Based on Swagger Analysis
 * 
 * Issues API provides categorization and classification for tickets
 * Critical for organizing K-12 IT support and routing to teams
 * 
 * 9+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { pathSegment } from '../api/path.js';
import {
  IIQ_LIST_BODY, formatListPage, iiqListAll, mapLimit, matchesText, normalizePageIndex, normalizePageSize, withTruncationNote,
} from '../api/paging.js';

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

/**
 * One page of issue types, grouped on the page: rows are ordered by `groups` (stable within a
 * group) so a group's rows stay together across pages, then each group gets a `Heading:` line.
 */
function groupedIssuePage(
  rows: IssueType[], groupOf: (issue: IssueType) => string, groups: string[],
  args: { pageIndex?: number; pageSize?: number }, noun: string, emptyText: string, truncated: boolean
) {
  const order = (issue: IssueType) => groups.indexOf(groupOf(issue));
  const sorted = rows.map((issue, i) => ({ issue, i })).sort((a, b) => order(a.issue) - order(b.issue) || a.i - b.i).map((x) => x.issue);
  return formatListPage({
    rows: sorted, pageIndex: args.pageIndex, pageSize: args.pageSize || 25, noun, emptyText, truncated,
    render: (issue) => `  • ${issue.Name}`,
    renderPage: (page) => groups
      .map((group) => ({ group, items: page.filter((issue) => groupOf(issue) === group) }))
      .filter(({ items }) => items.length > 0)
      .map(({ group, items }) => `${group}:\n${items.map((issue) => `  • ${issue.Name}`).join('\n')}`)
      .join('\n\n'),
  });
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

/** A GET /issues/site row: only the issue id (EnabledRoles/DisabledRoles are empty live). */
interface SiteIssue {
  IssueId: string;
}

/** GET /issues/{IssueId} fields used for a site issue line. */
interface IssueDetail {
  IssueId?: string;
  Name?: string;
  IssueCategoryName?: string;
}

/** Most GET /issues/{IssueId} lookups in flight for one page of site issues. */
const SITE_ISSUE_LOOKUPS_IN_FLIGHT = 4;

/** `• Name (Category)` for one site issue; falls back to the IssueId when the lookup fails or has no Name. */
async function siteIssueLine(client: IncidentIQClient, issueId: string): Promise<{ line: string; named: boolean }> {
  try {
    const response = await client.request<{ Item?: IssueDetail } & IssueDetail>({ method: 'GET', url: `/issues/${pathSegment(issueId)}` });
    const issue = response?.Item ?? response;
    if (issue?.Name) return { line: `• ${issue.Name}${issue.IssueCategoryName ? ` (${issue.IssueCategoryName})` : ''}`, named: true };
  } catch {
    // One failed lookup must not fail the page; the IssueId still identifies the row, and the
    // page footer counts the misses so a systemic failure (e.g. 401) is not silent.
  }
  return { line: `• ${issueId}`, named: false };
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
    description: 'List the issues enabled for this site, 25 per page by default: reads GET /issues/site (issue IDs only) and, for the rows on the requested page, GET /issues/{IssueId} for each name and category',
    inputSchema: {
      type: 'object',
      properties: {
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
    name: 'issues_get_types',
    description: 'List every issue type with its scope (reads all of POST /issues/types, 25 per page by default)',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['Global', 'Site', 'All'],
          description: 'Filter by the issue type Scope IIQ sends (default: All)',
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
          enum: ['Global', 'Site', 'All'],
          description: 'Filter by the issue type Scope IIQ sends (default: All)',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Show only deleted types (sent as OnlyShowDeleted; default: false)',
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
  
  // K-12 Specific Issues
  {
    name: 'issues_get_classroom_tech',
    description: 'Get classroom technology issue types (projector, board, audio), matched by name in the full POST /issues/types list; paged (default: 25), grouped by kind',
    inputSchema: {
      type: 'object',
      properties: {
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
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number, 0-based (default: 0)',
        },
      },
      required: [],
    },
  },
  {
    name: 'issues_get_student_devices',
    description: 'Get student device issue types, matched by device name in the full POST /issues/types list; paged (default: 25), grouped by device',
    inputSchema: {
      type: 'object',
      properties: {
        deviceType: {
          type: 'string',
          enum: ['Chromebook', 'iPad', 'Laptop', 'Hotspot', 'All'],
          description: 'Device name matched against issue type names (default: All)',
        },
        pageSize: {
          type: 'number',
          description: 'Results per page (default: 25)',
        },
        pageIndex: {
          type: 'number',
          description: 'Page number, 0-based (default: 0)',
        },
      },
      required: [],
    },
  },
];

export async function handleEnhancedIssuesTool(name: string, args: any) {
  const client = getClient();
  
  try {
    switch (name) {
      case 'issues_get_site_issues': {
        // GET /issues/site lists only IssueIds (no names, no Paging), so page client-side and look
        // up just the requested page's issues, a few at a time.
        const response = await client.request<SiteIssue[] | { Items?: SiteIssue[] }>({ method: 'GET', url: '/issues/site' });
        const siteIssues = (Array.isArray(response) ? response : response?.Items) ?? [];
        const pageSize = normalizePageSize(args.pageSize || 25);
        const pageIndex = normalizePageIndex(args.pageIndex);
        const page = siteIssues.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
        const lines = await mapLimit(page, SITE_ISSUE_LOOKUPS_IN_FLIGHT, (row) => siteIssueLine(client, row.IssueId));
        const unnamed = lines.filter((l) => !l.named).length;
        const result = formatListPage({
          rows: lines.map((l) => l.line),
          total: siteIssues.length,
          pageIndex,
          pageSize,
          noun: 'site issues',
          emptyText: 'No issues found for this site.',
          render: (line) => line,
        });
        if (unnamed > 0 && result.content[0]) {
          result.content[0].text += `\n\nNote: ${unnamed} of ${lines.length} issue names could not be read; those rows show the IssueId.`;
        }
        return result;
      }
      
      case 'issues_get_types': {
        // GET /issues/types returns only the first 50 types, so read the whole paged POST list.
        const { items, truncated } = await listIssueTypes(client);
        const scope = typeof args.scope === 'string' && args.scope !== 'All' ? args.scope.toLowerCase() : '';
        const filtered = scope ? items.filter((type) => type.Scope?.toLowerCase() === scope) : items;
        return formatListPage({
          rows: filtered,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'issue types',
          emptyText: 'No issue types found.',
          render: (type: IssueType) => `• ${type.Name}\n  Scope: ${type.Scope || 'N/A'} | ID: ${type.IssueTypeId}`,
          truncated,
        });
      }

      case 'issues_get_type_details': {
        const response = await client.request<{ Item?: IssueType } & IssueType>({
          method: 'GET',
          url: `/issues/types/${pathSegment(args.typeId)}`,
        });
        const type = (response?.Item ?? response) as IssueType;
        return {
          content: [{
            type: 'text',
            text: `Issue Type Details:
Name: ${type.Name}
Scope: ${type.Scope || 'N/A'}
Product ID: ${type.ProductId || 'N/A'}
ID: ${type.IssueTypeId}`,
          }],
        };
      }

      case 'issues_search_types': {
        const { items, truncated } = await listIssueTypes(client, args.includeDeleted || false);
        const matched = items.filter((type) =>
          matchesText(args.searchText, type.Name) &&
          (!args.scope || args.scope === 'All' || type.Scope?.toLowerCase() === String(args.scope).toLowerCase())
        );
        return formatListPage({
          rows: matched,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 50,
          noun: 'issue types',
          emptyText: 'No issue types found matching your criteria.',
          render: (type: IssueType) =>
            `• ${type.Name}\n  Scope: ${type.Scope || 'N/A'} | ID: ${type.IssueTypeId}`,
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
        
        const classroomGroup = (i: IssueType) =>
          i.Name.toLowerCase().includes('projector') ? 'Projector Issues'
            : /board|smart/i.test(i.Name) ? 'Interactive Board Issues'
              : nameHasAny(i, CLASSROOM_AUDIO_WORDS) ? 'Audio System Issues'
                : 'Other Classroom Issues';
        return groupedIssuePage(
          classroomIssues, classroomGroup,
          ['Projector Issues', 'Interactive Board Issues', 'Audio System Issues', 'Other Classroom Issues'],
          args, 'classroom technology issue types', 'No classroom technology issues found.', truncated
        );
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
        
        const deviceGroup = (i: IssueType) =>
          ['Chromebook', 'iPad', 'Laptop', 'Hotspot'].find((d) => i.Name.toLowerCase().includes(d.toLowerCase())) ?? 'Other';
        return groupedIssuePage(
          deviceIssues, deviceGroup, ['Chromebook', 'iPad', 'Laptop', 'Hotspot', 'Other'],
          args, 'student device issue types', 'No student device issues found.', truncated
        );
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
