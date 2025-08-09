/**
 * ENHANCED CUSTOM FIELDS TOOLS - Based on Swagger Analysis
 * 
 * Custom Fields API enables district-specific data tracking
 * Critical for FERPA compliance and K-12 customization
 * 
 * 14+ endpoints discovered from Swagger documentation
 */

import { IncidentIQClient } from '../api/client.js';
import { 
  PaginatedRequest,
  PaginatedResponse 
} from '../types/common.js';

// Custom Field specific types
export interface CustomField {
  CustomFieldId: string;
  CustomFieldTypeId: string;
  EntityTypeId: string;
  Name: string;
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
    description: 'Search custom fields with filters (POST /custom-fields)',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Search in field names and descriptions',
        },
        entityType: {
          type: 'string',
          enum: ['Ticket', 'Asset', 'User', 'Location'],
          description: 'Filter by entity type',
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
          description: 'Filter by field type (Text, Number, Date, etc.)',
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
          enum: ['Ticket', 'Asset', 'User', 'Location'],
          description: 'Entity type to check',
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
        const payload: PaginatedRequest = {
          OnlyShowDeleted: args.includeDeleted || false,
          FilterByViewPermission: false,
          SearchText: args.searchText,
          Filters: [],
          Paging: {
            PageIndex: args.pageIndex || 0,
            PageSize: args.pageSize || 50,
          },
        };
        
        if (args.entityType) {
          payload.Filters!.push({
            Facet: 'EntityType',
            Id: args.entityType,
          });
        }
        
        if (args.fieldType) {
          payload.Filters!.push({
            Facet: 'FieldType',
            Id: args.fieldType,
          });
        }
        
        const response = await client.request<PaginatedResponse<CustomField>>({
          method: 'POST',
          url: '/custom-fields',
          data: payload,
        });
        
        if (!response?.Items || response.Items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No custom fields found matching your criteria.',
            }],
          };
        }
        
        const fieldList = response.Items.slice(0, 10).map((field: CustomField) =>
          `• ${field.Name}${field.IsRequired ? ' (Required)' : ''}
  Type: ${field.CustomFieldTypeId} | Entity: ${field.EntityTypeId}
  ${field.Description || 'No description'}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `Found ${response.ItemCount} custom fields (showing ${Math.min(10, response.Items.length)}):

${fieldList}

${response.Items.length > 10 ? `\n...and ${response.Items.length - 10} more fields` : ''}`,
          }],
        };
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
          const entity = field.EntityTypeId || 'Unknown';
          if (!fieldsByEntity[entity]) fieldsByEntity[entity] = [];
          fieldsByEntity[entity].push(field);
        });
        
        let output = `Custom Fields (${fields.length} total):\n`;
        
        for (const [entity, entityFields] of Object.entries(fieldsByEntity)) {
          output += `\n${entity} (${entityFields.length} fields):\n`;
          entityFields.slice(0, 5).forEach(field => {
            output += `  • ${field.Name}${field.IsRequired ? ' *' : ''}\n`;
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
        // Search for student-related fields
        const payload: PaginatedRequest = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          SearchText: 'student grade graduation enrollment IEP 504',
          Filters: [{
            Facet: 'EntityType',
            Id: 'User',
          }],
          Paging: {
            PageIndex: 0,
            PageSize: 100,
          },
        };
        
        const response = await client.request<PaginatedResponse<CustomField>>({
          method: 'POST',
          url: '/custom-fields',
          data: payload,
        });
        
        const studentFields = response?.Items || [];
        
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
            f.Name.toLowerCase().includes('id') || 
            f.Name.toLowerCase().includes('number')),
          academic: studentFields.filter((f: CustomField) => 
            f.Name.toLowerCase().includes('grade') || 
            f.Name.toLowerCase().includes('graduation')),
          special: studentFields.filter((f: CustomField) => 
            f.Name.toLowerCase().includes('iep') || 
            f.Name.toLowerCase().includes('504')),
          guardian: studentFields.filter((f: CustomField) => 
            f.Name.toLowerCase().includes('parent') || 
            f.Name.toLowerCase().includes('guardian')),
        };
        
        let output = 'Student Custom Fields:\n';
        
        if (categories.identification.length > 0) {
          output += '\nIdentification:\n';
          categories.identification.forEach((f: CustomField) => {
            output += `  • ${f.Name}${f.IsRequired ? ' *' : ''}\n`;
          });
        }
        
        if (categories.academic.length > 0) {
          output += '\nAcademic:\n';
          categories.academic.forEach((f: CustomField) => {
            output += `  • ${f.Name}${f.IsRequired ? ' *' : ''}\n`;
          });
        }
        
        if (categories.special.length > 0) {
          output += '\nSpecial Education:\n';
          categories.special.forEach((f: CustomField) => {
            output += `  • ${f.Name}${f.IsRequired ? ' *' : ''}\n`;
          });
        }
        
        if (categories.guardian.length > 0) {
          output += '\nParent/Guardian:\n';
          categories.guardian.forEach((f: CustomField) => {
            output += `  • ${f.Name}${f.IsRequired ? ' *' : ''}\n`;
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
        const payload: PaginatedRequest = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          Filters: [{
            Facet: 'EntityType',
            Id: args.entityType,
          }, {
            Facet: 'IsRequired',
            Id: 'true',
          }],
          Paging: {
            PageIndex: 0,
            PageSize: 100,
          },
        };
        
        const response = await client.request<PaginatedResponse<CustomField>>({
          method: 'POST',
          url: '/custom-fields',
          data: payload,
        });
        
        const requiredFields = response?.Items || [];
        
        if (requiredFields.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No required fields for ${args.entityType}.`,
            }],
          };
        }
        
        const fieldList = requiredFields.map((field: CustomField) =>
          `• ${field.Name}
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
        const payload: PaginatedRequest = {
          OnlyShowDeleted: false,
          FilterByViewPermission: false,
          SearchText: args.fieldName,
          Paging: {
            PageIndex: 0,
            PageSize: 10,
          },
        };
        
        const response = await client.request<PaginatedResponse<CustomField>>({
          method: 'POST',
          url: '/custom-fields',
          data: payload,
        });
        
        const fields = response?.Items || [];
        
        // Filter for exact match if requested
        let matches = fields;
        if (args.exactMatch) {
          matches = fields.filter((f: CustomField) => 
            f.Name.toLowerCase() === args.fieldName.toLowerCase()
          );
        }
        
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
Name: ${field.Name}
ID: ${field.CustomFieldId}
Entity Type: ${field.EntityTypeId}
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
