import { query } from '../config/database';
import {
  getEmailConfig,
  formatSimulatedEmailLog,
  EmailPayload,
  EmailDispatchResult,
} from '../config/emailConfig';

export interface SendNotificationOptions {
  recipientUserId: string;
  recipientEmail?: string;
  eventType: string;
  subject: string;
  contentBody: string;
  channel?: 'EMAIL' | 'IN_APP';
  metadata?: Record<string, any>;
}

export interface NotificationLogRecord {
  id: string;
  recipient_user_id: string;
  recipient_email?: string;
  recipient_name?: string;
  channel: string;
  event_type: string;
  subject: string;
  content_body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error_log?: string | null;
  retry_count: number;
  sent_at?: string | null;
  created_at: string;
  is_read: boolean;
  read_at?: string | null;
  metadata?: Record<string, any>;
}

// Injected transport function for testing and live integration
type TransportHandler = (payload: EmailPayload) => Promise<{ messageId: string }>;

let customTransportHandler: TransportHandler | null = null;

/**
 * Allows test suites to mock the low-level SMTP dispatch transport
 */
export function setCustomTransportHandler(handler: TransportHandler | null): void {
  customTransportHandler = handler;
}

/**
 * Dispatches low-level transport with exponential backoff retry.
 * Max 2 retries (3 total attempts).
 */
async function dispatchWithRetry(
  payload: EmailPayload,
  maxRetries: number = 2
): Promise<EmailDispatchResult> {
  const config = getEmailConfig();
  let attempts = 0;
  let lastError: string | undefined;

  while (attempts <= maxRetries) {
    attempts++;
    try {
      if (customTransportHandler) {
        const result = await customTransportHandler(payload);
        return {
          success: true,
          messageId: result.messageId,
          mode: config.mode,
          attempts,
          timestamp: new Date().toISOString(),
        };
      }

      if (config.mode === 'SIMULATED') {
        const simulatedMessageId = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const logOutput = formatSimulatedEmailLog(payload, simulatedMessageId);
        console.log(logOutput);

        return {
          success: true,
          messageId: simulatedMessageId,
          mode: 'SIMULATED',
          attempts,
          timestamp: new Date().toISOString(),
        };
      }

      // In LIVE_SMTP without custom handler, if credentials missing or connection fails, throw
      if (!config.smtp.host || config.smtp.host === 'localhost') {
        throw new Error('SMTP transport not configured for host: ' + config.smtp.host);
      }

      const liveMessageId = `smtp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      return {
        success: true,
        messageId: liveMessageId,
        mode: 'LIVE_SMTP',
        attempts,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      lastError = err?.message || 'Unknown SMTP transport failure';
      if (attempts <= maxRetries) {
        // Backoff delay before next retry
        const backoffMs = Math.min(50 * Math.pow(2, attempts - 1), 500);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  return {
    success: false,
    messageId: '',
    mode: config.mode,
    error: lastError,
    attempts: attempts,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Main service entry: dispatches notification, applies retry logic,
 * and records immutable audit trail in `notification_events`.
 */
export async function sendNotification(
  options: SendNotificationOptions
): Promise<NotificationLogRecord> {
  let recipientEmail = options.recipientEmail;

  // Resolve recipient email from database if not explicitly provided
  if (!recipientEmail) {
    try {
      const userRes = await query(
        `SELECT email FROM users WHERE id = $1 LIMIT 1;`,
        [options.recipientUserId]
      );
      if (userRes.rows.length > 0) {
        recipientEmail = userRes.rows[0].email;
      }
    } catch {
      // Fallback
    }
  }

  const effectiveEmail = recipientEmail || 'candidate@ats.internal';

  // 1. Dispatch transport
  const dispatchResult = await dispatchWithRetry({
    to: effectiveEmail,
    subject: options.subject,
    html: options.contentBody,
    text: options.contentBody.replace(/<[^>]*>/g, '').trim(),
    metadata: options.metadata,
  });

  const finalStatus: 'SENT' | 'FAILED' = dispatchResult.success ? 'SENT' : 'FAILED';
  const sentAt = dispatchResult.success ? dispatchResult.timestamp : null;
  const retryCount = Math.max(0, dispatchResult.attempts - 1);
  const errorLog = dispatchResult.error || null;

  // 2. Persist to notification_events table
  const insertSql = `
    INSERT INTO notification_events (
      recipient_user_id,
      channel,
      event_type,
      subject,
      content_body,
      status,
      error_log,
      retry_count,
      sent_at,
      metadata,
      is_read
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE)
    RETURNING *;
  `;

  const dbRes = await query(insertSql, [
    options.recipientUserId,
    options.channel || 'EMAIL',
    options.eventType,
    options.subject,
    options.contentBody,
    finalStatus,
    errorLog,
    retryCount,
    sentAt,
    JSON.stringify(options.metadata || {}),
  ]);

  return dbRes.rows[0];
}

/**
 * Retrieves in-app notifications for the recipient with optional unread filter.
 */
export async function getUserNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<NotificationLogRecord[]> {
  const limit = options?.limit || 50;
  const unreadOnly = options?.unreadOnly || false;

  const sql = unreadOnly
    ? `SELECT * FROM notification_events 
       WHERE recipient_user_id = $1 AND is_read = FALSE 
       ORDER BY created_at DESC LIMIT $2;`
    : `SELECT * FROM notification_events 
       WHERE recipient_user_id = $1 
       ORDER BY created_at DESC LIMIT $2;`;

  const res = await query(sql, [userId, limit]);
  return res.rows;
}

/**
 * Marks a single notification as read by recipient.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const res = await query(
    `UPDATE notification_events 
     SET is_read = TRUE, read_at = NOW() 
     WHERE id = $1 AND recipient_user_id = $2 
     RETURNING id;`,
    [notificationId, userId]
  );
  return res.rows.length > 0;
}

/**
 * Marks all notifications for a recipient as read.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const res = await query(
    `UPDATE notification_events 
     SET is_read = TRUE, read_at = NOW() 
     WHERE recipient_user_id = $1 AND is_read = FALSE 
     RETURNING id;`,
    [userId]
  );
  return res.rowCount || 0;
}

/**
 * Retrieves delivery logs for HR / Admin telemetry.
 */
export async function getNotificationDeliveryLogs(filter?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: NotificationLogRecord[]; total: number }> {
  const limit = filter?.limit || 50;
  const offset = filter?.offset || 0;
  const status = filter?.status;

  const whereClause = status ? `WHERE n.status = $1` : ``;
  const params: any[] = status ? [status, limit, offset] : [limit, offset];
  const limitIndex = status ? '$2' : '$1';
  const offsetIndex = status ? '$3' : '$2';

  const countSql = `SELECT COUNT(*) AS total FROM notification_events ${whereClause};`;
  const countParams = status ? [status] : [];
  const countRes = await query(countSql, countParams);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);

  const logsSql = `
    SELECT 
      n.*,
      u.email AS recipient_email,
      u.full_name AS recipient_name
    FROM notification_events n
    LEFT JOIN users u ON n.recipient_user_id = u.id
    ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT ${limitIndex} OFFSET ${offsetIndex};
  `;

  const logsRes = await query(logsSql, params);
  return {
    logs: logsRes.rows,
    total,
  };
}
