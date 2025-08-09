/**
 * Notification & Email Management Tools for IncidentIQ
 * Communication and alert management for K-12 districts
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from '../api/client.js';

/**
 * Notification and email management tools
 */
export class NotificationTools {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Get all MCP tool definitions for notifications
   */
  getTools(): Tool[] {
    return [
      {
        name: 'notification_get_ticket_emails',
        description: 'Get all email communications for a specific ticket',
        inputSchema: {
          type: 'object',
          required: ['ticket_id'],
          properties: {
            ticket_id: {
              type: 'string',
              description: 'The GUID of the ticket'
            }
          }
        }
      },
      {
        name: 'notification_query',
        description: 'Query and search notifications with filters',
        inputSchema: {
          type: 'object',
          properties: {
            include_read: {
              type: 'boolean',
              description: 'Include read notifications',
              default: true
            },
            include_archived: {
              type: 'boolean',
              description: 'Include archived notifications',
              default: false
            },
            include_unarchived: {
              type: 'boolean',
              description: 'Include unarchived notifications',
              default: true
            }
          }
        }
      },
      {
        name: 'notification_get_unread',
        description: 'Get all unread notifications for the current user',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'notification_get_unarchived',
        description: 'Get all unarchived notifications',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'notification_mark_all_read',
        description: 'Mark all notifications as read',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'notification_mark_read',
        description: 'Mark a specific notification as read',
        inputSchema: {
          type: 'object',
          required: ['notification_id'],
          properties: {
            notification_id: {
              type: 'string',
              description: 'The GUID of the notification to mark as read'
            }
          }
        }
      }
    ];
  }

  /**
   * Handle tool execution
   */
  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'notification_get_ticket_emails':
        return this.getTicketEmails(args);
      case 'notification_query':
        return this.queryNotifications(args);
      case 'notification_get_unread':
        return this.getUnreadNotifications();
      case 'notification_get_unarchived':
        return this.getUnarchivedNotifications();
      case 'notification_mark_all_read':
        return this.markAllRead();
      case 'notification_mark_read':
        return this.markRead(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getTicketEmails(args: any): Promise<any> {
    if (!args.ticket_id) {
      throw new Error('ticket_id is required');
    }

    const emails = await this.client.getTicketEmails(args.ticket_id);
    
    return {
      ticket_id: args.ticket_id,
      count: emails.length,
      emails: emails.map(this.formatEmail),
      message: emails.length > 0 ? 'Retrieved ticket emails' : 'No emails found for this ticket'
    };
  }

  private async queryNotifications(args: any): Promise<any> {
    const params = {
      IncludeRead: args.include_read !== false,
      IncludeArchived: args.include_archived === true,
      IncludeUnarchived: args.include_unarchived !== false
    };

    const notifications = await this.client.queryNotifications(params);
    
    return {
      count: notifications.length,
      notifications: notifications.map(this.formatNotification),
      filters: params,
      message: `Found ${notifications.length} notifications`
    };
  }

  private async getUnreadNotifications(): Promise<any> {
    const notifications = await this.client.getUnreadNotifications();
    
    return {
      count: notifications.length,
      notifications: notifications.map(this.formatNotification),
      message: notifications.length > 0 ? 
        `You have ${notifications.length} unread notifications` : 
        'No unread notifications'
    };
  }

  private async getUnarchivedNotifications(): Promise<any> {
    const notifications = await this.client.getUnarchivedNotifications();
    
    return {
      count: notifications.length,
      notifications: notifications.map(this.formatNotification),
      message: `Found ${notifications.length} unarchived notifications`
    };
  }

  private async markAllRead(): Promise<any> {
    const success = await this.client.markAllNotificationsRead();
    
    return {
      success: success,
      message: success ? 'All notifications marked as read' : 'Failed to mark notifications as read'
    };
  }

  private async markRead(args: any): Promise<any> {
    if (!args.notification_id) {
      throw new Error('notification_id is required');
    }

    const success = await this.client.markNotificationRead(args.notification_id);
    
    return {
      notification_id: args.notification_id,
      success: success,
      message: success ? 'Notification marked as read' : 'Failed to mark notification as read'
    };
  }

  private formatEmail(email: any): any {
    return {
      id: email.EmailId,
      subject: email.Subject,
      body: email.Body,
      from: email.From || email.FromAddress,
      to: email.To || email.ToAddress,
      created_date: email.CreatedDate,
      sent_date: email.SentDate,
      is_sent: email.IsSent
    };
  }

  private formatNotification(notification: any): any {
    return {
      id: notification.NotificationId,
      type: notification.NotificationType,
      subject: notification.Subject || notification.Title,
      body: notification.Body || notification.Message,
      created_date: notification.CreatedDate,
      is_read: notification.IsRead || notification.Read,
      is_archived: notification.IsArchived || notification.Archived,
      entity_type: notification.EntityType,
      entity_id: notification.EntityId,
      severity: notification.Severity,
      category: notification.Category
    };
  }
}