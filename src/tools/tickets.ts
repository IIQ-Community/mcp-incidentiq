/**
 * WORKING TICKET TOOLS
 * 
 * As of 2025-01-08, only these ticket endpoints are functional.
 * All other ticket operations return 401 Unauthorized due to
 * insufficient API key permissions.
 */

import { IncidentIQClient } from '../api/client.js';

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
              text: `Available Ticket Wizards (${response.ItemCount}):\n\n${wizardList}`,
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
              text: `Ticket Wizards for Site ${args.siteId} (${response.ItemCount}):\n\n${wizardList}`,
            },
          ],
        };
      }
      
      default:
        // If someone tries to use a disabled tool, provide helpful error
        return {
          content: [
            {
              type: 'text',
              text: `Error: The ticket tool "${name}" is currently not available.

Due to API permission limitations, only these ticket tools are functional:
- ticket_get_wizards: Get available ticket creation wizards
- ticket_get_wizards_by_site: Get wizards for a specific site

Other ticket operations (create, search, update, etc.) require additional 
permissions from your IncidentIQ administrator.`,
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