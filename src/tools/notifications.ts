/**
 * Notification & Email Management Tools for IncidentIQ
 * Communication and alert management for K-12 districts
 */

import type { IncidentIQClient } from '../api/client.js';
import { jsonResult, textResult, type ToolDefinition, type ToolResult } from './result.js';

/** MCP tool definitions for notifications and ticket emails. */
export const notificationTools: ToolDefinition[] = [
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

function formatEmail(email: any): any {
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

function formatNotification(notification: any): any {
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

async function getTicketEmails(args: any, client: IncidentIQClient): Promise<unknown> {
  if (!args.ticket_id) {
    throw new Error('ticket_id is required');
  }

  const emails = await client.getTicketEmails(args.ticket_id);

  return {
    ticket_id: args.ticket_id,
    count: emails.length,
    emails: emails.map(formatEmail),
    message: emails.length > 0 ? 'Retrieved ticket emails' : 'No emails found for this ticket'
  };
}

async function queryNotifications(args: any, client: IncidentIQClient): Promise<unknown> {
  const params = {
    IncludeRead: args.include_read !== false,
    IncludeArchived: args.include_archived === true,
    IncludeUnarchived: args.include_unarchived !== false
  };

  const notifications = await client.queryNotifications(params);

  return {
    count: notifications.length,
    notifications: notifications.map(formatNotification),
    filters: params,
    message: `Found ${notifications.length} notifications`
  };
}

async function getUnreadNotifications(client: IncidentIQClient): Promise<unknown> {
  const notifications = await client.getUnreadNotifications();

  return {
    count: notifications.length,
    notifications: notifications.map(formatNotification),
    message: notifications.length > 0 ?
      `You have ${notifications.length} unread notifications` :
      'No unread notifications'
  };
}

async function getUnarchivedNotifications(client: IncidentIQClient): Promise<unknown> {
  const notifications = await client.getUnarchivedNotifications();

  return {
    count: notifications.length,
    notifications: notifications.map(formatNotification),
    message: `Found ${notifications.length} unarchived notifications`
  };
}

async function markAllRead(client: IncidentIQClient): Promise<unknown> {
  const success = await client.markAllNotificationsRead();

  return {
    success: success,
    message: success ? 'All notifications marked as read' : 'Failed to mark notifications as read'
  };
}

async function markRead(args: any, client: IncidentIQClient): Promise<unknown> {
  if (!args.notification_id) {
    throw new Error('notification_id is required');
  }

  const success = await client.markNotificationRead(args.notification_id);

  return {
    notification_id: args.notification_id,
    success: success,
    message: success ? 'Notification marked as read' : 'Failed to mark notification as read'
  };
}

/** Raw IIQ data for a notification tool; `handleNotificationTool` encodes it as the MCP result. */
async function notificationData(name: string, args: any, client: IncidentIQClient): Promise<unknown> {
  switch (name) {
    case 'notification_get_ticket_emails':
      return getTicketEmails(args, client);
    case 'notification_query':
      return queryNotifications(args, client);
    case 'notification_get_unread':
      return getUnreadNotifications(client);
    case 'notification_get_unarchived':
      return getUnarchivedNotifications(client);
    case 'notification_mark_all_read':
      return markAllRead(client);
    case 'notification_mark_read':
      return markRead(args, client);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function handleNotificationTool(name: string, args: any, client: IncidentIQClient): Promise<ToolResult> {
  try {
    return jsonResult(await notificationData(name, args, client));
  } catch (error: any) {
    return textResult(`Error: ${error.message}`);
  }
}
