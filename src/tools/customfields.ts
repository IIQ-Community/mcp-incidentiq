/**
 * ENHANCED CUSTOM FIELDS TOOLS - Based on Swagger Analysis
 * 
 * Custom Fields API enables district-specific data tracking
 * Critical for FERPA compliance and K-12 customization
 * 
 * 14+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { pathSegment } from '../api/path.js';
import { IIQ_LIST_BODY, formatListPage, iiqListAll, matchesText } from '../api/paging.js';

/**
 * IIQ entity-type GUIDs are global constants. Ticket is confirmed by the IIQ API docs; User by live
 * custom-field values (2026-11-06); Asset by the live district's asset fields. Other entity
 * types can be passed as their EntityTypeId GUID.
 */
const ENTITY_TYPE_IDS: Record<string, string> = {
  ticket: '888891ac-91aa-e711-80c2-100dffa00001',
  asset: '888891ac-91aa-e711-80c2-100dffa00003',
  user: '888891ac-91aa-e711-80c2-100dffa00004',
};

/** Resolves an entity type name (Ticket/Asset/User) or a raw EntityTypeId GUID to a lower-case GUID. */
function entityTypeId(entityType: string): string {
  const key = entityType.trim().toLowerCase();
  return ENTITY_TYPE_IDS[key] ?? key;
}

/** Display name for an EntityTypeId GUID. */
function entityTypeName(id: string | undefined): string {
  const match = Object.entries(ENTITY_TYPE_IDS).find(([, guid]) => guid === id?.toLowerCase());
  return match ? match[0][0].toUpperCase() + match[0].slice(1) : (id || 'Unknown');
}

/** A field's display name; live items carry it on CustomFieldType, not a top-level Name. */
function fieldName(field: CustomField): string {
  return field.Name ?? field.CustomFieldType?.Name ?? 'Unnamed field';
}

/**
 * Reads every custom field definition. POST /custom-fields ignores SearchText and the IsRequired
 * facet, and returns nothing for an EntityType facet (verified 2026-11-06), so callers filter
 * the full list client-side with `fieldMatches`.
 */
async function listCustomFields(client: IncidentIQClient, includeDeleted = false): Promise<CustomField[]> {
  const response = await client.request<{ Items?: CustomField[] }>({
    method: 'POST',
    url: '/custom-fields',
    data: { ...IIQ_LIST_BODY, OnlyShowDeleted: includeDeleted },
  });
  return response?.Items ?? [];
}

/** True when the field belongs to the entity type (when given) and its name contains the text (when given). */
function fieldMatches(field: CustomField, { text, entityType }: { text?: string; entityType?: string }): boolean {
  return matchesText(text, fieldName(field)) &&
    (!entityType || field.EntityTypeId?.toLowerCase() === entityTypeId(entityType));
}

/** Every custom field type; GET /custom-fields/types returns only 100 of 128 per page (verified 2026-11-07). */
async function listFieldTypes(client: IncidentIQClient): Promise<{ items: CustomFieldType[]; truncated: boolean }> {
  return iiqListAll<CustomFieldType>(client, '/custom-fields/types');
}

/** GET detail endpoints return `{ Item }`; tolerate a bare object. */
async function getItem<T>(client: IncidentIQClient, url: string): Promise<T> {
  const response = await client.request<{ Item?: T } & T>({ method: 'GET', url });
  return (response?.Item ?? response) as T;
}

const yesNo = (value: unknown) => (value ? 'Yes' : 'No');
const isEmptyValue = (value: unknown) => value === null || value === undefined || value === '';

/**
 * Custom field values for one ticket, asset or user (GET /custom-fields/values/for/{entity}/{id}),
 * labelled with the field type name. Empty values are hidden unless `includeEmpty`.
 */
async function entityValues(client: IncidentIQClient, entity: 'ticket' | 'asset' | 'user', id: string, includeEmpty: boolean) {
  const label = entity[0].toUpperCase() + entity.slice(1);
  const response = await client.request<{ Items?: CustomFieldValue[] } | CustomFieldValue[]>({
    method: 'GET',
    url: `/custom-fields/values/for/${entity}/${pathSegment(id)}`,
  });
  const values = (Array.isArray(response) ? response : response?.Items ?? [])
    .filter((value) => includeEmpty || !isEmptyValue(value.Value));
  if (values.length === 0) {
    return { content: [{ type: 'text', text: `No custom field values for this ${entity}.` }] };
  }
  const { items: types } = await listFieldTypes(client);
  const typeNames = new Map(types.map((type) => [type.CustomFieldTypeId?.toLowerCase(), type.Name]));
  const valueList = values.map((value) =>
    `• ${typeNames.get(value.CustomFieldTypeId?.toLowerCase()) ?? value.CustomFieldTypeId}: ${isEmptyValue(value.Value) ? '(empty)' : value.Value}`
  ).join('\n');
  return { content: [{ type: 'text', text: `${label} Custom Field Values:\n\n${valueList}` }] };
}

/**
 * Options of a custom field type. IIQ sends Options as a string whose format is unverified: a JSON
 * array (of strings, or objects with Name/Label/Value) is listed item by item; any other string is
 * read as one option per line.
 */
function parseOptions(options: string): string[] {
  try {
    const parsed: unknown = JSON.parse(options);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (item && typeof item === 'object'
          ? (item as Record<string, unknown>).Name ?? (item as Record<string, unknown>).Label ?? (item as Record<string, unknown>).Value
          : item))
        .filter((item) => !isEmptyValue(item))
        .map(String);
    }
  } catch {
    // Not JSON: fall through to one option per line.
  }
  return options.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

// Custom Field specific types
export interface CustomField {
  CustomFieldId: string;
  CustomFieldTypeId: string;
  EntityTypeId: string;
  /** Not present on live items; the name lives on CustomFieldType.Name (see fieldName()). */
  Name?: string;
  CustomFieldType?: { Name?: string };
  Description?: string;
  IsRequired: boolean;
  IsHidden?: boolean;
  IsReadOnly?: boolean;
  IsSystemField?: boolean;
  ValidationRules?: {
    MinLength?: number;
    MaxLength?: number;
    Pattern?: string;
    Min?: number;
    Max?: number;
  };
}

/** GET /custom-fields/types item (live shape, verified 2026-11-07). */
export interface CustomFieldType {
  CustomFieldTypeId: string;
  Name: string;
  Description?: string;
  /** A number on live types. */
  EditorType?: number | string;
  Scope?: string;
  IsRequired?: boolean;
  /** A string; set on 41 of 128 live types (see parseOptions()). */
  Options?: string | null;
}

/** GET /custom-fields/values/for/{entity}/{id} item (live shape, verified 2026-11-07). */
export interface CustomFieldValue {
  CustomFieldTypeId: string;
  Value: unknown;
  IsHidden?: boolean;
}

// Initialize client lazily
let client: IncidentIQClient | null = null;

function getClient(): IncidentIQClient {
  if (!client) {
    client = new IncidentIQClient();
  }
  return client;
}

export const enhancedCustomFieldTools = [
  // Core Operations
  {
    name: 'customfield_search',
    description: 'Search custom field definitions by name, entity type and required flag (filters the full list client-side)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Text matched against field names',
        },
        entityType: {
          type: 'string',
          description: 'Entity type: Ticket, Asset, User, or an EntityTypeId GUID',
        },
        isRequired: {
          type: 'boolean',
          description: 'Filter by required fields only',
        },
        fieldType: {
          type: 'string',
          description: 'Filter by CustomFieldTypeId (the GUID shown as "Type ID" in results)',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Show only deleted fields (sent as OnlyShowDeleted; default: false)',
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
    name: 'customfield_get_all',
    description: 'List custom field definitions (GET /custom-fields), 25 per page by default, grouped by entity type within the page',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          description: 'Entity type: Ticket, Asset, User, or an EntityTypeId GUID (filtered client-side; IIQ ignores it)',
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
    name: 'customfield_get_details',
    description: 'Get custom field details (GET /custom-fields/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'Custom field ID (GUID)',
        },
      },
      required: ['fieldId'],
    },
  },
  
  // Field Types
  {
    name: 'customfield_get_types',
    description: 'List every custom field type (reads all of GET /custom-fields/types, 25 per page by default)',
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
    name: 'customfield_get_type_details',
    description: 'Get field type details (GET /custom-fields/types/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        typeId: {
          type: 'string',
          description: 'Field type ID (GUID)',
        },
      },
      required: ['typeId'],
    },
  },
  
  // Entity Values
  {
    name: 'customfield_get_ticket_values',
    description: 'Get custom field values for a ticket, labelled by field type name (GET /custom-fields/values/for/ticket/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'Ticket ID (GUID)',
        },
        includeEmpty: {
          type: 'boolean',
          description: 'Include fields whose value is empty (default: false)',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'customfield_get_asset_values',
    description: 'Get custom field values for an asset, labelled by field type name (GET /custom-fields/values/for/asset/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'string',
          description: 'Asset ID (GUID)',
        },
        includeEmpty: {
          type: 'boolean',
          description: 'Include fields whose value is empty (default: false)',
        },
      },
      required: ['assetId'],
    },
  },
  {
    name: 'customfield_get_user_values',
    description: 'Get custom field values for a user, labelled by field type name (GET /custom-fields/values/for/user/{id})',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID (GUID)',
        },
        includeEmpty: {
          type: 'boolean',
          description: 'Include fields whose value is empty (default: false)',
        },
      },
      required: ['userId'],
    },
  },
  
  // K-12 Specific
  {
    name: 'customfield_get_student_fields',
    description: 'Get student-related User custom fields, matched by name (student, ID/number, grade, guardian, IEP/504)',
    inputSchema: {
      type: 'object',
      properties: {
        includeGrade: {
          type: 'boolean',
          description: 'Include grade level / graduation fields (default: true)',
        },
        includeGuardian: {
          type: 'boolean',
          description: 'Include parent/guardian fields (default: true)',
        },
        includeIEP: {
          type: 'boolean',
          description: 'Include IEP/504 fields (default: true)',
        },
      },
      required: [],
    },
  },
  
  // Field Configuration
  {
    name: 'customfield_get_required',
    description: 'Get all required fields by entity type',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          description: 'Entity type to check: Ticket, Asset, User, or an EntityTypeId GUID',
        },
      },
      required: ['entityType'],
    },
  },
  {
    name: 'customfield_get_options',
    description: "Get a field's dropdown options (the Options of its type, via GET /custom-fields/{id} and GET /custom-fields/types/{typeId})",
    inputSchema: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'Custom field ID (GUID)',
        },
      },
      required: ['fieldId'],
    },
  },
  
  // Quick Lookups
  {
    name: 'customfield_find_by_name',
    description: 'Find custom field by name',
    inputSchema: {
      type: 'object',
      properties: {
        fieldName: {
          type: 'string',
          description: 'Field name to search',
        },
        exactMatch: {
          type: 'boolean',
          description: 'Require exact name match',
        },
      },
      required: ['fieldName'],
    },
  },
];

export async function handleEnhancedCustomFieldTool(name: string, args: any) {
  const client = getClient();
  
  try {
    switch (name) {
      case 'customfield_search': {
        const matched = (await listCustomFields(client, args.includeDeleted || false)).filter((field) =>
          fieldMatches(field, { text: args.searchText, entityType: args.entityType }) &&
          (args.isRequired === undefined || !!field.IsRequired === !!args.isRequired) &&
          (!args.fieldType || field.CustomFieldTypeId?.toLowerCase() === String(args.fieldType).trim().toLowerCase())
        );
        return formatListPage({
          rows: matched,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 50,
          noun: 'custom fields',
          emptyText: 'No custom fields found matching your criteria.',
          render: (field: CustomField) =>
            `• ${fieldName(field)}${field.IsRequired ? ' (Required)' : ''}
  Entity: ${entityTypeName(field.EntityTypeId)} | Type ID: ${field.CustomFieldTypeId} | ID: ${field.CustomFieldId}`,
        });
      }

      case 'customfield_get_all': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/custom-fields',
        });

        const allFields: CustomField[] = Array.isArray(response) ? response : response?.Items || [];
        // IIQ ignores an EntityType filter (every entity returns every field), so filter here.
        const fields = allFields.filter((field) => fieldMatches(field, { entityType: args.entityType }));

        if (fields.length === 0) {
          return {
            content: [{
              type: 'text',
              text: args.entityType ? `No custom fields defined for entity type: ${args.entityType}.` : 'No custom fields defined.',
            }],
          };
        }

        const fieldLine = (field: CustomField) => `  • ${fieldName(field)}${field.IsRequired ? ' *' : ''}`;
        return formatListPage({
          rows: fields,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'custom fields',
          emptyText: 'No custom fields defined.',
          render: fieldLine,
          renderPage: (page: CustomField[]) => {
            const byEntity = new Map<string, CustomField[]>();
            for (const field of page) {
              const entity = entityTypeName(field.EntityTypeId);
              byEntity.set(entity, [...(byEntity.get(entity) ?? []), field]);
            }
            return [...byEntity].map(([entity, entityFields]) =>
              `${entity} (${entityFields.length} on this page):\n` +
              entityFields.map(fieldLine).join('\n')
            ).join('\n\n');
          },
        });
      }

      case 'customfield_get_details': {
        const field = await getItem<CustomField>(client, `/custom-fields/${pathSegment(args.fieldId)}`);
        return {
          content: [{
            type: 'text',
            text: `Custom Field Details:
Name: ${fieldName(field)}
Entity Type: ${entityTypeName(field.EntityTypeId)}
Required: ${yesNo(field.IsRequired)}
Hidden: ${yesNo(field.IsHidden)}
Read-only: ${yesNo(field.IsReadOnly)}
System field: ${yesNo(field.IsSystemField)}
Type ID: ${field.CustomFieldTypeId}
ID: ${field.CustomFieldId}`,
          }],
        };
      }

      case 'customfield_get_types': {
        const { items, truncated } = await listFieldTypes(client);
        return formatListPage({
          rows: items,
          pageIndex: args.pageIndex,
          pageSize: args.pageSize || 25,
          noun: 'custom field types',
          emptyText: 'No custom field types found.',
          render: (type: CustomFieldType) =>
            `• ${type.Name}\n  Editor type: ${type.EditorType ?? 'N/A'} | Scope: ${type.Scope || 'N/A'} | ID: ${type.CustomFieldTypeId}`,
          truncated,
        });
      }

      case 'customfield_get_type_details': {
        const type = await getItem<CustomFieldType>(client, `/custom-fields/types/${pathSegment(args.typeId)}`);
        return {
          content: [{
            type: 'text',
            text: `Custom Field Type Details:
Name: ${type.Name}
Description: ${type.Description || 'N/A'}
Editor type: ${type.EditorType ?? 'N/A'}
Scope: ${type.Scope || 'N/A'}
Required: ${yesNo(type.IsRequired)}
Has options: ${yesNo(type.Options)}
ID: ${type.CustomFieldTypeId}`,
          }],
        };
      }

      case 'customfield_get_ticket_values':
        return entityValues(client, 'ticket', args.ticketId, args.includeEmpty === true);

      case 'customfield_get_asset_values':
        return entityValues(client, 'asset', args.assetId, args.includeEmpty === true);

      case 'customfield_get_user_values':
        return entityValues(client, 'user', args.userId, args.includeEmpty === true);

      case 'customfield_get_options': {
        const field = await getItem<CustomField>(client, `/custom-fields/${pathSegment(args.fieldId)}`);
        const type = await getItem<CustomFieldType>(client, `/custom-fields/types/${pathSegment(field.CustomFieldTypeId)}`);
        const options = typeof type.Options === 'string' ? parseOptions(type.Options) : [];
        if (options.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `Custom field ${fieldName(field)} has no options (its type ${type.Name} defines none).`,
            }],
          };
        }
        return {
          content: [{
            type: 'text',
            text: `Options for ${fieldName(field)} (${options.length}):\n\n${options.map((option) => `• ${option}`).join('\n')}`,
          }],
        };
      }

      case 'customfield_get_student_fields': {
        // Student-related fields on the User entity, matched by name. Each include* flag (default
        // true) toggles its section: a disabled section's fields are excluded even when they also
        // match id/number/student. Each field is listed once, in the first section it matches.
        const sections = [
          { heading: 'Special Education', words: ['iep', '504'], enabled: args.includeIEP !== false },
          { heading: 'Parent/Guardian', words: ['parent', 'guardian'], enabled: args.includeGuardian !== false },
          { heading: 'Academic', words: ['grade', 'graduation'], enabled: args.includeGrade !== false },
          { heading: 'Identification', words: ['id', 'number'], enabled: true },
        ];
        // Word-start match: 'grade' finds "Grade Level"/"Grades" but not "Upgraded"; 'id' not "Residence".
        const has = (field: CustomField, words: string[]) =>
          words.some((word) => new RegExp(`\\b${word}`, 'i').test(fieldName(field)));
        const disabledWords = sections.filter((s) => !s.enabled).flatMap((s) => s.words);
        const selectWords = ['student', 'enrollment', ...sections.filter((s) => s.enabled).flatMap((s) => s.words)];
        const studentFields = (await listCustomFields(client)).filter((field) =>
          fieldMatches(field, { entityType: 'User' }) && has(field, selectWords) && !has(field, disabledWords)
        );

        if (studentFields.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No student-specific custom fields found.',
            }],
          };
        }

        const bySection = new Map<string, CustomField[]>();
        for (const field of studentFields) {
          const heading = sections.find((s) => s.enabled && has(field, s.words))?.heading ?? 'General';
          bySection.set(heading, [...(bySection.get(heading) ?? []), field]);
        }

        let output = 'Student Custom Fields:\n';
        for (const heading of ['Identification', 'Academic', 'Special Education', 'Parent/Guardian', 'General']) {
          const fields = bySection.get(heading);
          if (!fields) continue;
          output += `\n${heading}:\n`;
          fields.forEach((f) => { output += `  • ${fieldName(f)}${f.IsRequired ? ' *' : ''}\n`; });
        }

        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }

      case 'customfield_get_required': {
        const requiredFields = (await listCustomFields(client)).filter((field) =>
          field.IsRequired && fieldMatches(field, { entityType: args.entityType })
        );

        if (requiredFields.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No required fields for ${args.entityType}.`,
            }],
          };
        }
        
        const fieldList = requiredFields.map((field: CustomField) =>
          `• ${fieldName(field)}
  Type: ${field.CustomFieldTypeId}
  ${field.ValidationRules ? 'Has validation rules' : ''}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Required Fields for ${args.entityType} (${requiredFields.length}):\n\n${fieldList}`,
          }],
        };
      }
      
      case 'customfield_find_by_name': {
        const wanted = String(args.fieldName ?? '').trim().toLowerCase();
        const fields = (await listCustomFields(client)).filter((field) => fieldMatches(field, { text: wanted }));
        const matches = args.exactMatch
          ? fields.filter((field) => fieldName(field).toLowerCase() === wanted)
          : fields;

        if (matches.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No custom field found with name: ${args.fieldName}`,
            }],
          };
        }
        
        const field = matches[0];
        return {
          content: [{
            type: 'text',
            text: `Custom Field Found:
Name: ${fieldName(field)}
ID: ${field.CustomFieldId}
Entity Type: ${entityTypeName(field.EntityTypeId)}
Required: ${field.IsRequired ? 'Yes' : 'No'}${field.Description ? `\nDescription: ${field.Description}` : ''}`,
          }],
        };
      }
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Error: Unknown enhanced custom field tool "${name}".`,
          }],
        };
    }
  } catch (error: any) {
    // Handle 404s specially
    if (error.response?.status === 404) {
      if (name.includes('student')) {
        return {
          content: [{
            type: 'text',
            text: 'This K-12 specific endpoint may not be available. Try using customfield_search with appropriate filters instead.',
          }],
        };
      }
      return {
        content: [{
          type: 'text',
          text: 'Custom field or resource not found.',
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
export class CustomFieldTools {
  constructor(_client: any) {
    // Client is passed but not needed as we use getClient() internally
  }
  
  getTools() {
    return enhancedCustomFieldTools;
  }
  
  async handleToolCall(name: string, args: any) {
    return handleEnhancedCustomFieldTool(name, args);
  }
}
