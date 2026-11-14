const mockQuery = jest.fn();

jest.mock('../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

import {
  sendNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationDeliveryLogs,
  setCustomTransportHandler,
} from './notificationService';

describe('Notification Service & Retry Engine (Floor 17)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    setCustomTransportHandler(null);
    process.env.EMAIL_MODE = 'SIMULATED';
  });

  afterAll(() => {
    setCustomTransportHandler(null);
  });

  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const notificationId = '11111111-1111-4111-8111-111111111111';

  it('1. Successfully sends simulated email on first attempt and logs to database', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ email: 'candidate@example.com' }] }) // user query
      .mockResolvedValueOnce({
        rows: [
          {
            id: notificationId,
            recipient_user_id: userId,
            channel: 'EMAIL',
            event_type: 'APPLICATION_RECEIVED',
            subject: 'Application Received: Senior Full Stack Engineer',
            content_body: '<p>Thank you for applying!</p>',
            status: 'SENT',
            error_log: null,
            retry_count: 0,
            sent_at: '2026-11-14T10:00:00Z',
            is_read: false,
          },
        ],
      }); // insert query

    const result = await sendNotification({
      recipientUserId: userId,
      eventType: 'APPLICATION_RECEIVED',
      subject: 'Application Received: Senior Full Stack Engineer',
      contentBody: '<p>Thank you for applying!</p>',
      metadata: { applicationId: 'app-999' },
    });

    expect(result.status).toBe('SENT');
    expect(result.retry_count).toBe(0);
    expect(mockQuery).toHaveBeenCalledTimes(2);

    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[1][5]).toBe('SENT'); // finalStatus
    expect(insertCall[1][7]).toBe(0); // retryCount
  });

  it('2. Retries on transient transport failure and succeeds on retry', async () => {
    let callCount = 0;
    setCustomTransportHandler(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Transient 421 Service not available');
      }
      return { messageId: 'msg-retry-success' };
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [{ email: 'candidate@example.com' }] }) // user query
      .mockResolvedValueOnce({
        rows: [
          {
            id: notificationId,
            recipient_user_id: userId,
            channel: 'EMAIL',
            event_type: 'INTERVIEW_SCHEDULED',
            subject: 'Technical Interview Confirmed',
            content_body: 'Your slot is scheduled',
            status: 'SENT',
            error_log: null,
            retry_count: 1,
            sent_at: '2026-11-14T10:05:00Z',
          },
        ],
      });

    const result = await sendNotification({
      recipientUserId: userId,
      eventType: 'INTERVIEW_SCHEDULED',
      subject: 'Technical Interview Confirmed',
      contentBody: 'Your slot is scheduled',
    });

    expect(callCount).toBe(2);
    expect(result.status).toBe('SENT');
    expect(mockQuery).toHaveBeenCalledTimes(2);

    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[1][5]).toBe('SENT');
    expect(insertCall[1][7]).toBe(1); // retryCount: 1
  });

  it('3. Exhausts max retries on persistent SMTP failure and logs FAILED with error', async () => {
    let callCount = 0;
    setCustomTransportHandler(async () => {
      callCount++;
      throw new Error('550 Requested action not taken: mailbox unavailable');
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [{ email: 'candidate@example.com' }] }) // user query
      .mockResolvedValueOnce({
        rows: [
          {
            id: notificationId,
            recipient_user_id: userId,
            channel: 'EMAIL',
            event_type: 'OFFER_ISSUED',
            subject: 'Offer Letter Available',
            content_body: 'Your offer is ready',
            status: 'FAILED',
            error_log: '550 Requested action not taken: mailbox unavailable',
            retry_count: 2,
            sent_at: null,
          },
        ],
      });

    const result = await sendNotification({
      recipientUserId: userId,
      eventType: 'OFFER_ISSUED',
      subject: 'Offer Letter Available',
      contentBody: 'Your offer is ready',
    });

    // 1 initial attempt + 2 retries = 3 attempts total
    expect(callCount).toBe(3);
    expect(result.status).toBe('FAILED');

    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[1][5]).toBe('FAILED');
    expect(insertCall[1][6]).toContain('550 Requested action not taken');
    expect(insertCall[1][7]).toBe(2); // retryCount: 2
  });

  it('4. Retrieves in-app user notifications with unread filtering', async () => {
    const mockList = [
      { id: 'notif-1', subject: 'Interview scheduled', is_read: false },
      { id: 'notif-2', subject: 'Resume received', is_read: false },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockList });

    const notifications = await getUserNotifications(userId, { unreadOnly: true, limit: 10 });
    expect(notifications).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_read = FALSE'),
      [userId, 10]
    );
  });

  it('5. Marks a single notification as read', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: notificationId }] });
    const success = await markNotificationRead(notificationId, userId);
    expect(success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SET is_read = TRUE'),
      [notificationId, userId]
    );
  });

  it('6. Marks all notifications as read for current user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 4 });
    const count = await markAllNotificationsRead(userId);
    expect(count).toBe(4);
  });

  it('7. Retrieves administrative delivery logs with pagination and total count', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '42' }] }) // count query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'log-1',
            recipient_email: 'user@example.com',
            status: 'SENT',
            retry_count: 0,
          },
        ],
      }); // list query

    const telemetry = await getNotificationDeliveryLogs({ status: 'SENT', limit: 20, offset: 0 });
    expect(telemetry.total).toBe(42);
    expect(telemetry.logs).toHaveLength(1);
    expect(telemetry.logs[0].recipient_email).toBe('user@example.com');
  });
});
