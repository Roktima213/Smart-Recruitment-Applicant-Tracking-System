const mockVerifyFirebaseIdToken = jest.fn();
const mockQuery = jest.fn();

jest.mock('../config/firebaseAdmin', () => ({
  verifyFirebaseIdToken: (...args: any[]) => mockVerifyFirebaseIdToken(...args),
  setCustomClaims: jest.fn().mockResolvedValue(undefined),
  isAuthEmulatorEnabled: jest.fn().mockReturnValue(true),
  firebaseAdminApp: { name: '[DEFAULT]' },
  adminAuth: {
    getUser: jest.fn(),
    revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../config/database', () => ({
  pool: {
    query: (...args: any[]) => mockQuery(...args),
    connect: jest.fn(),
  },
  query: (...args: any[]) => mockQuery(...args),
  getClient: jest.fn(),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

describe('Notification Delivery & In-App Notification APIs (/api/notifications)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
  });

  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const notificationId = '11111111-1111-4111-8111-111111111111';

  const candidateToken = {
    uid: 'cand-uid-001',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const adminToken = {
    uid: 'admin-uid-001',
    email: 'admin@smartats.com',
    role: 'ADMIN',
    isActive: true,
  };

  describe('GET /api/notifications', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should return in-app notifications and unread count for authenticated user', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: userId }] }) // user lookup
        .mockResolvedValueOnce({
          rows: [
            {
              id: notificationId,
              event_type: 'INTERVIEW_SCHEDULED',
              subject: 'Technical Round 1 Scheduled',
              content_body: 'Your slot is scheduled',
              status: 'SENT',
              is_read: false,
              created_at: '2026-11-14T10:00:00Z',
              read_at: null,
              metadata: {},
            },
          ],
        }) // notifications list
        .mockResolvedValueOnce({ rows: [{ unread_count: '1' }] }); // unread count

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBe(1);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].subject).toBe('Technical Round 1 Scheduled');
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should reject invalid UUID with 400', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      const res = await request(app)
        .patch('/api/notifications/invalid-uuid/read')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/uuid/i);
    });

    it('should mark notification as read for recipient', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: userId }] }) // user lookup
        .mockResolvedValueOnce({ rows: [{ id: notificationId }] }); // update query

      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/marked as read/i);
    });

    it('should return 404 when notification does not exist or belongs to another user', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: userId }] }) // user lookup
        .mockResolvedValueOnce({ rows: [] }); // update query returns 0 rows

      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/not found/i);
    });
  });

  describe('POST /api/notifications/read-all', () => {
    it('should mark all notifications as read for current user', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: userId }] }) // user lookup
        .mockResolvedValueOnce({ rowCount: 3 }); // update query

      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.markedCount).toBe(3);
    });
  });

  describe('GET /api/notifications/logs (Admin Telemetry)', () => {
    it('should strictly reject candidate role with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      const res = await request(app)
        .get('/api/notifications/logs')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('should return delivery telemetry logs and email mode for Admin/HR', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'log-001',
              recipient_user_id: userId,
              recipient_email: 'candidate@example.com',
              recipient_name: 'Alex Morgan',
              channel: 'EMAIL',
              event_type: 'INTERVIEW_SCHEDULED',
              subject: 'Interview Confirmed',
              content_body: 'Your slot is scheduled',
              status: 'SENT',
              retry_count: 0,
              error_log: null,
              sent_at: '2026-11-14T10:00:00Z',
              created_at: '2026-11-14T10:00:00Z',
              is_read: false,
              metadata: {},
            },
          ],
        }); // list

      const res = await request(app)
        .get('/api/notifications/logs')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mode).toBeDefined();
      expect(res.body.total).toBe(1);
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].recipientEmail).toBe('candidate@example.com');
    });
  });
});
