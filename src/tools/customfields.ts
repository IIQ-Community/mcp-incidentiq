/**
 * ENHANCED CUSTOM FIELDS TOOLS - Based on Swagger Analysis
 * 
 * Custom Fields API enables district-specific data tracking
 * Critical for FERPA compliance and K-12 customization
 * 
 * 14+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { IIQ_LIST_BODY, formatListPage, matchesText } from '../api/paging.js';

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
  IsActive: boolean;
  DefaultValue?: any;
  ValidationRules?: {
    MinLength?: number;
    MaxLength?: number;
    Pattern?: string;
    Min?: number;
    Max?: number;
  };
  Options?: CustomFieldOption[];
  Permissions?: {
    View: string[];
    Edit: string[];
    Delete: string[];
  };
  Metadata?: {
    CreatedDate: string;
    ModifiedDate: string;
    CreatedBy: string;
    ModifiedBy: string;
  };
}

export interface CustomFieldType {
  CustomFieldTypeId: string;
  Name: string;
  Description?: string;
  EditorType: string;
  DataType: string;
  SupportedEntities: string[];
  ValidationSupport: {
    Required: boolean;
    Pattern: boolean;
    MinMax: boolean;
    Options: boolean;
  };
}

export interface CustomFieldValue {
  EntityId: string;
  EntityType: string;
  CustomFieldId: string;
  Value: any;
  DisplayValue?: string;
  LastModified?: string;
  ModifiedBy?: string;
}

export interface CustomFieldOption {
  Value: string;
  Label: string;
  IsDefault?: boolean;
  SortOrder?: number;
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
        isActive: {
          type: 'boolean',
          description: 'Filter by active status',
        },
        fieldType: {
          type: 'string',
          description: 'Filter by CustomFieldTypeId (the GUID shown as "Type ID" in results)',
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Include deleted fields',
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
    description: 'Get all custom field definitions (GET /custom-fields)',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          description: 'Filter by entity type',
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
    description: 'Get all available field types (GET /custom-fields/types)',
    inputSchema: {
      type: 'object',
      properties: {
        supportedEntity: {
          type: 'string',
          description: 'Filter by supported entity',
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
    description: 'Get custom field values for a ticket',
    inputSchema: {
      type: 'object',
      properties: {
        ticketId: {
          type: 'string',
          description: 'Ticket ID (GUID)',
        },
        includeEmpty: {
          type: 'boolean',
          description: 'Include fields with no values',
        },
      },
      required: ['ticketId'],
    },
  },
  {
    name: 'customfield_get_asset_values',
    description: 'Get custom field values for an asset',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'string',
          description: 'Asset ID (GUID)',
        },
        includeEmpty: {
          type: 'boolean',
          description: 'Include fields with no values',
        },
      },
      required: ['assetId'],
    },
  },
  {
    name: 'customfield_get_user_values',
    description: 'Get custom field values for a user',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID (GUID)',
        },
        includeEmpty: {
          type: 'boolean',
          description: 'Include fields with no values',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'customfield_get_location_values',
    description: 'Get custom field values for a location',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'string',
          description: 'Location ID (GUID)',
        },
        includeEmpty: {
          type: 'boolean',
          description: 'Include fields with no values',
        },
      },
      required: ['locationId'],
    },
  },
  
  // K-12 Specific
  {
    name: 'customfield_get_student_fields',
    description: 'Get student-specific custom fields',
    inputSchema: {
      type: 'object',
      properties: {
        includeGrade: {
          type: 'boolean',
          description: 'Include grade level fields',
        },
        includeGuardian: {
          type: 'boolean',
          description: 'Include parent/guardian fields',
        },
        includeIEP: {
          type: 'boolean',
          description: 'Include IEP/504 fields',
        },
      },
      required: [],
    },
  },
  {
    name: 'customfield_get_device_fields',
    description: 'Get device tracking custom fields',
    inputSchema: {
      type: 'object',
      properties: {
        includeHomeUse: {
          type: 'boolean',
          description: 'Include home use agreement fields',
        },
        includeInsurance: {
          type: 'boolean',
          description: 'Include insurance fields',
        },
      },
      required: [],
    },
  },
  {
    name: 'customfield_get_compliance_fields',
    description: 'Get FERPA/compliance custom fields',
    inputSchema: {
      type: 'object',
      properties: {
        complianceType: {
          type: 'string',
          enum: ['FERPA', 'Photo', 'Internet', 'Medical'],
          description: 'Type of compliance fields',
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
    description: 'Get dropdown/select field options',
    inputSchema: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'Custom field ID',
        },
      },
      required: ['fieldId'],
    },
  },
  {
    name: 'customfield_validate_value',
    description: 'Validate a custom field value',
    inputSchema: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'Custom field ID',
        },
        value: {
          type: 'string',
          description: 'Value to validate',
        },
      },
      required: ['fieldId', 'value'],
    },
  },
  
  // Bulk Operations
  {
    name: 'customfield_get_by_entity',
    description: 'Get all fields for a specific entity type',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          enum: ['Ticket', 'Asset', 'User', 'Location'],
          description: 'Entity type',
        },
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive fields',
        },
      },
      required: ['entityType'],
    },
  },
  {
    name: 'customfield_search_values',
    description: 'Search for entities by custom field value',
    inputSchema: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'Custom field ID',
        },
        searchValue: {
          type: 'string',
          description: 'Value to search for',
        },
        entityType: {
          type: 'string',
          description: 'Entity type to search',
        },
      },
      required: ['fieldId', 'searchValue'],
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
        
        const fields = Array.isArray(response) ? response : response?.Items || [];
        
        if (fields.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No custom fields defined.',
            }],
          };
        }
        
        // Group by entity type
        const fieldsByEntity: Record<string, any[]> = {};
        fields.forEach((field: CustomField) => {
          const entity = entityTypeName(field.EntityTypeId);
          if (!fieldsByEntity[entity]) fieldsByEntity[entity] = [];
          fieldsByEntity[entity].push(field);
        });
        
        let output = `Custom Fields (${fields.length} total):\n`;
        
        for (const [entity, entityFields] of Object.entries(fieldsByEntity)) {
          output += `\n${entity} (${entityFields.length} fields):\n`;
          entityFields.slice(0, 5).forEach(field => {
            output += `  • ${fieldName(field)}${field.IsRequired ? ' *' : ''}\n`;
          });
          if (entityFields.length > 5) {
            output += `  ... and ${entityFields.length - 5} more\n`;
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: output,
          }],
        };
      }
      
      case 'customfield_get_types': {
        const response = await client.request<any>({
          method: 'GET',
          url: '/custom-fields/types',
        });
        
        const types = Array.isArray(response) ? response : response?.Items || [];
        
        if (types.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No custom field types found.',
            }],
          };
        }
        
        const typeList = types.map((type: CustomFieldType) =>
          `• ${type.Name} (${type.EditorType})
  Data Type: ${type.DataType}
  Supports: ${type.SupportedEntities?.join(', ') || 'All entities'}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Available Field Types (${types.length}):\n\n${typeList}`,
          }],
        };
      }
      
      case 'customfield_get_ticket_values': {
        const response = await client.request<any>({
          method: 'GET',
          url: `/custom-fields/values/for/ticket/${args.ticketId}`,
        });
        
        const values = Array.isArray(response) ? response : response?.Items || [];
        
        if (values.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No custom field values for this ticket.',
            }],
          };
        }
        
        const valueList = values.map((value: CustomFieldValue) =>
          `• ${value.CustomFieldId}: ${value.DisplayValue || value.Value}`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Ticket Custom Field Values:\n\n${valueList}`,
          }],
        };
      }
      
      case 'customfield_get_student_fields': {
        // Student-related fields on the User entity, matched by name.
        const words = ['student', 'grade', 'graduation', 'enrollment', 'iep', '504', 'parent', 'guardian', 'id', 'number'];
        const studentFields = (await listCustomFields(client)).filter((field) =>
          fieldMatches(field, { entityType: 'User' }) && words.some((word) => matchesText(word, fieldName(field)))
        );

        if (studentFields.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No student-specific custom fields found.',
            }],
          };
        }
        
        // Categorize student fields
        const categories = {
          identification: studentFields.filter((f: CustomField) => 
            fieldName(f).toLowerCase().includes('id') || 
            fieldName(f).toLowerCase().includes('number')),
          academic: studentFields.filter((f: CustomField) => 
            fieldName(f).toLowerCase().includes('grade') || 
            fieldName(f).toLowerCase().includes('graduation')),
          special: studentFields.filter((f: CustomField) => 
            fieldName(f).toLowerCase().includes('iep') || 
            fieldName(f).toLowerCase().includes('504')),
          guardian: studentFields.filter((f: CustomField) => 
            fieldName(f).toLowerCase().includes('parent') || 
            fieldName(f).toLowerCase().includes('guardian')),
        };
        
        let output = 'Student Custom Fields:\n';
        
        if (categories.identification.length > 0) {
          output += '\nIdentification:\n';
          categories.identification.forEach((f: CustomField) => {
            output += `  • ${fieldName(f)}${f.IsRequired ? ' *' : ''}\n`;
          });
        }
        
        if (categories.academic.length > 0) {
          output += '\nAcademic:\n';
          categories.academic.forEach((f: CustomField) => {
            output += `  • ${fieldName(f)}${f.IsRequired ? ' *' : ''}\n`;
          });
        }
        
        if (categories.special.length > 0) {
          output += '\nSpecial Education:\n';
          categories.special.forEach((f: CustomField) => {
            output += `  • ${fieldName(f)}${f.IsRequired ? ' *' : ''}\n`;
          });
        }
        
        if (categories.guardian.length > 0) {
          output += '\nParent/Guardian:\n';
          categories.guardian.forEach((f: CustomField) => {
            output += `  • ${fieldName(f)}${f.IsRequired ? ' *' : ''}\n`;
          });
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
Required: ${field.IsRequired ? 'Yes' : 'No'}
Active: ${field.IsActive ? 'Yes' : 'No'}
${field.Description ? `Description: ${field.Description}` : ''}`,
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
      if (name.includes('student') || name.includes('device')) {
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
