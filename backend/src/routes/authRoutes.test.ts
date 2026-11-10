const mockVerifyFirebaseIdToken = jest.fn();
const mockSyncUserClaims = jest.fn();
const mockQuery = jest.fn();

jest.mock('../config/firebaseAdmin', () => ({
  verifyFirebaseIdToken: (...args: any[]) => mockVerifyFirebaseIdToken(...args),
  setCustomClaims: jest.fn().mockResolvedValue(undefined),
  isAuthEmulatorEnabled: jest.fn().mockReturnValue(true),
  firebaseAdminApp: { name: '[DEFAULT]' },
  adminAuth: {
    getUser: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  },
}));

jest.mock('../services/claimsSyncService', () => ({
  ...jest.requireActual('../services/claimsSyncService'),
  syncUserClaims: (...args: any[]) => mockSyncUserClaims(...args),
}));

jest.mock('../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

import request from 'supertest';
import app from '../app';

describe('Auth & RBAC Routes (/api/auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Verification Middleware', () => {
    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(app).post('/api/auth/sync').send({});

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body.message).toContain('Authorization header missing');
    });

    it('should return 401 Unauthorized when Authorization header does not use Bearer format', async () => {
      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Basic 123456');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 Unauthorized when token is invalid or expired', async () => {
      mockVerifyFirebaseIdToken.mockRejectedValueOnce(new Error('Firebase ID token has expired'));

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer expired-token');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body.message).toContain('Invalid or expired Firebase ID token');
    });
  });

  describe('POST /api/auth/sync', () => {
    it('should successfully sync user and return 200 with user profile', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'firebase-user-999',
        email: 'alice@example.com',
        role: 'HR',
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-1',
            firebase_uid: 'firebase-user-999',
            email: 'alice@example.com',
            full_name: 'Alice Recruiter',
            role: 'HR',
            company_id: null,
            avatar_url: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer valid-id-token')
        .send({
          fullName: 'Alice Recruiter',
          role: 'HR',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.user).toHaveProperty('email', 'alice@example.com');
      expect(res.body.user).toHaveProperty('role', 'HR');
      expect(mockSyncUserClaims).toHaveBeenCalledWith('firebase-user-999', 'HR', null);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 200 with current user profile if found in database', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'firebase-user-123',
        email: 'bob@example.com',
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-2',
            firebase_uid: 'firebase-user-123',
            email: 'bob@example.com',
            full_name: 'Bob Candidate',
            role: 'CANDIDATE',
            is_active: true,
          },
        ],
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-id-token');

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('full_name', 'Bob Candidate');
    });

    it('should return 404 Not Found if user is not yet in database', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'unknown-uid',
        email: 'new@example.com',
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-id-token');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('User profile not found in database');
    });
  });

  describe('RBAC Middleware & Route Guards', () => {
    it('should reject unauthorized role with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'candidate-uid',
        email: 'cand@example.com',
        role: 'CANDIDATE',
      });

      const res = await request(app)
        .get('/api/auth/verify-role/admin')
        .set('Authorization', 'Bearer candidate-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
      expect(res.body.message).toContain('not permitted');
    });

    it('should allow authorized role with 200 OK', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      const res = await request(app)
        .get('/api/auth/verify-role/admin')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toContain('Welcome Admin');
    });
  });
});
