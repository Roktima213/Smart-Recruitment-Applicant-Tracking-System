import { Request, Response } from 'express';
import { query } from '../config/database';
import { getEmailConfig } from '../config/emailConfig';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationDeliveryLogs,
} from '../services/notificationService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 1. GET /api/notifications
 * Retrieves in-app notifications for the authenticated user
 */
export async function getMyNotifications(req: Request, res: Response): Promise<void> {
  const callerUid = req.user?.uid;
  if (!callerUid) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required', statusCode: 401 },
    });
    return;
  }

  try {
    const userRes = await query(
      `SELECT id FROM users WHERE firebase_uid = $1 LIMIT 1;`,
      [callerUid]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'User record not found', statusCode: 404 },
      });
      return;
    }

    const userId = userRes.rows[0].id;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

    const notifications = await getUserNotifications(userId, { unreadOnly, limit });

    // Compute unread count
    const unreadCountRes = await query(
      `SELECT COUNT(*) AS unread_count FROM notification_events 
       WHERE recipient_user_id = $1 AND is_read = FALSE;`,
      [userId]
    );
    const unreadCount = parseInt(unreadCountRes.rows[0]?.unread_count || '0', 10);

    res.status(200).json({
      success: true,
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        eventType: n.event_type,
        subject: n.subject,
        contentBody: n.content_body,
        status: n.status,
        isRead: n.is_read,
        createdAt: n.created_at,
        readAt: n.read_at,
        metadata: n.metadata,
      })),
    });
  } catch (error: any) {
    console.error('[Get Notifications Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve notifications', statusCode: 500 },
    });
  }
}

/**
 * 2. PATCH /api/notifications/:id/read
 * Marks a notification as read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const callerUid = req.user?.uid;
  const { id } = req.params;

  if (!id || !UUID_REGEX.test(id)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid notification UUID format', statusCode: 400 },
    });
    return;
  }

  if (!callerUid) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required', statusCode: 401 },
    });
    return;
  }

  try {
    const userRes = await query(
      `SELECT id FROM users WHERE firebase_uid = $1 LIMIT 1;`,
      [callerUid]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'User record not found', statusCode: 404 },
      });
      return;
    }

    const userId = userRes.rows[0].id;
    const updated = await markNotificationRead(id, userId);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: { message: 'Notification not found or access denied', statusCode: 404 },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('[Mark Notification Read Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to mark notification as read', statusCode: 500 },
    });
  }
}

/**
 * 3. POST /api/notifications/read-all
 * Marks all notifications for current user as read
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const callerUid = req.user?.uid;
  if (!callerUid) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required', statusCode: 401 },
    });
    return;
  }

  try {
    const userRes = await query(
      `SELECT id FROM users WHERE firebase_uid = $1 LIMIT 1;`,
      [callerUid]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'User record not found', statusCode: 404 },
      });
      return;
    }

    const userId = userRes.rows[0].id;
    const count = await markAllNotificationsRead(userId);

    res.status(200).json({
      success: true,
      markedCount: count,
    });
  } catch (error: any) {
    console.error('[Mark All Read Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to mark all notifications as read', statusCode: 500 },
    });
  }
}

/**
 * 4. GET /api/notifications/logs
 * Administrative delivery log table (restricted to HR, Recruiter, Admin)
 */
export async function getDeliveryLogs(req: Request, res: Response): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    const { logs, total } = await getNotificationDeliveryLogs({ status, limit, offset });
    const emailConfig = getEmailConfig();

    res.status(200).json({
      success: true,
      mode: emailConfig.mode,
      senderFrom: emailConfig.from,
      total,
      limit,
      offset,
      logs: logs.map((log) => ({
        id: log.id,
        recipientUserId: log.recipient_user_id,
        recipientEmail: log.recipient_email,
        recipientName: log.recipient_name,
        channel: log.channel,
        eventType: log.event_type,
        subject: log.subject,
        contentBody: log.content_body,
        status: log.status,
        retryCount: log.retry_count,
        errorLog: log.error_log,
        sentAt: log.sent_at,
        createdAt: log.created_at,
        isRead: log.is_read,
        metadata: log.metadata,
      })),
    });
  } catch (error: any) {
    console.error('[Delivery Logs Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve notification delivery logs', statusCode: 500 },
    });
  }
}
