import dotenv from 'dotenv';

dotenv.config();

export type EmailMode = 'SIMULATED' | 'LIVE_SMTP';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface EmailConfig {
  mode: EmailMode;
  from: string;
  smtp: SmtpConfig;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, any>;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  mode: EmailMode;
  error?: string;
  attempts: number;
  timestamp: string;
}

/**
 * Returns validated Email configuration based on environment variables.
 * Defaults safely to SIMULATED mode for local development, test runners, and sandboxes.
 */
export function getEmailConfig(): EmailConfig {
  const rawMode = (process.env.EMAIL_MODE || 'SIMULATED').toUpperCase().trim();
  const mode: EmailMode = rawMode === 'LIVE_SMTP' ? 'LIVE_SMTP' : 'SIMULATED';

  const host = process.env.SMTP_HOST || 'localhost';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.EMAIL_FROM || 'SmartATS Notifications <no-reply@smart-ats.internal>';

  return {
    mode,
    from,
    smtp: {
      host,
      port: isNaN(port) ? 587 : port,
      secure,
      user,
      pass,
    },
  };
}

/**
 * Convenience helper returning whether the current environment operates in SIMULATED mode.
 */
export function isSimulatedEmailMode(): boolean {
  return getEmailConfig().mode === 'SIMULATED';
}

/**
 * Formats a clean, structured log string for simulated email dispatches.
 */
export function formatSimulatedEmailLog(payload: EmailPayload, messageId: string): string {
  const separator = '='.repeat(60);
  return [
    separator,
    `[SIMULATED EMAIL DISPATCH]`,
    `Message-ID : ${messageId}`,
    `Recipient  : ${payload.to}`,
    `Subject    : ${payload.subject}`,
    `Timestamp  : ${new Date().toISOString()}`,
    `Metadata   : ${payload.metadata ? JSON.stringify(payload.metadata) : 'None'}`,
    `-`.repeat(60),
    payload.text || payload.html.replace(/<[^>]*>/g, '').trim(),
    separator,
  ].join('\n');
}
