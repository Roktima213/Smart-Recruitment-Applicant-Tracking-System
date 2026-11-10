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
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

describe('Auth & RBAC Routes (/api/auth)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockSyncUserClaims.mockReset();
    mockQuery.mockReset();
    delete process.env.BOOTSTRAP_ADMIN_EMAILS;
  });

  describe('Token Verification Middleware (SEC-05)', () => {
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

    it('should accept case-insensitive "bearer" scheme (RFC 6750)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'user-ci-1',
        email: 'ci@example.com',
        role: 'CANDIDATE',
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // lookup
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'uuid-ci',
              firebase_uid: 'user-ci-1',
              email: 'ci@example.com',
              full_name: 'CI User',
              role: 'CANDIDATE',
              company_id: null,
              is_active: true,
            },
          ],
        });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'bearer lowercase-token')
        .send({ fullName: 'CI User' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle array Authorization headers gracefully without crashing', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'user-array-1',
        email: 'array@example.com',
        role: 'CANDIDATE',
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'uuid-arr',
              firebase_uid: 'user-array-1',
              email: 'array@example.com',
              full_name: 'Array User',
              role: 'CANDIDATE',
              company_id: null,
              is_active: true,
            },
          ],
        });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', ['Bearer valid-token-1', 'Bearer valid-token-2'] as any)
        .send({ fullName: 'Array User' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/sync - Robustness & Privilege Escalation (SEC-01, SEC-02, BUG-08, BUG-09)', () => {
    it('should successfully sync new user and return 200 with user profile', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'firebase-user-999',
        email: 'alice@example.com',
        role: 'HR',
      });

      // 1st query: find existing user (returns empty -> new user)
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // 2nd query: insert user
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

    it('SEC-01: should prevent client from assigning ADMIN role and default to CANDIDATE', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'attacker-uid',
        email: 'attacker@evil.com',
      });

      mockQuery.mockResolvedValueOnce({ rows: [] }); // not existing
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-attacker',
            firebase_uid: 'attacker-uid',
            email: 'attacker@evil.com',
            full_name: 'Attacker User',
            role: 'CANDIDATE', // must be CANDIDATE
            company_id: null,
            is_active: true,
          },
        ],
      });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer attacker-token')
        .send({
          fullName: 'Attacker User',
          role: 'ADMIN', // malicious attempt to become admin
        });

      expect(res.status).toBe(200);
      // Verify role in SQL INSERT query was CANDIDATE, not ADMIN
      const insertSqlArgs = mockQuery.mock.calls[1][1];
      expect(insertSqlArgs[3]).toBe('CANDIDATE');
    });

    it('SEC-01: should automatically assign ADMIN to bootstrap admin email configured in env', async () => {
      process.env.BOOTSTRAP_ADMIN_EMAILS = 'lead.admin@company.com,founder@company.com';

      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'founder-uid',
        email: 'FOUNDER@company.com',
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-founder',
            firebase_uid: 'founder-uid',
            email: 'founder@company.com',
            full_name: 'Founder Admin',
            role: 'ADMIN',
            company_id: null,
            is_active: true,
          },
        ],
      });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer founder-token')
        .send({ fullName: 'Founder Admin' });

      expect(res.status).toBe(200);
      const insertSqlArgs = mockQuery.mock.calls[1][1];
      expect(insertSqlArgs[3]).toBe('ADMIN');
    });

    it('SEC-02: should link firebase_uid on email collision with pre-existing account', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'new-firebase-uid-777',
        email: 'collab@company.com',
      });

      // Existing user found by email with an older firebase_uid
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'existing-db-id-123',
            firebase_uid: 'old-firebase-uid-111',
            email: 'collab@company.com',
            full_name: 'Pre-existing Member',
            role: 'HR',
            company_id: '11111111-1111-1111-1111-111111111111',
            avatar_url: null,
            is_active: true,
          },
        ],
      });

      // Update query succeeds
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'existing-db-id-123',
            firebase_uid: 'new-firebase-uid-777',
            email: 'collab@company.com',
            full_name: 'Pre-existing Member',
            role: 'HR',
            company_id: '11111111-1111-1111-1111-111111111111',
            is_active: true,
          },
        ],
      });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer valid-id-token')
        .send({ fullName: 'Pre-existing Member', role: 'ADMIN' }); // attempting role change

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('role', 'HR'); // retained existing role
      // Check that update linked the new firebase_uid to the existing record id
      const updateArgs = mockQuery.mock.calls[1][1];
      expect(updateArgs[0]).toBe('new-firebase-uid-777');
      expect(updateArgs[5]).toBe('existing-db-id-123');
    });

    it('SEC-03: should return 403 Forbidden if user account is deactivated in DB', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'deactivated-uid',
        email: 'former.employee@company.com',
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'deactivated-id',
            firebase_uid: 'deactivated-uid',
            email: 'former.employee@company.com',
            is_active: false,
          },
        ],
      });

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer valid-id-token')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('deactivated');
    });

    it('BUG-08: should handle malformed or non-object req.body safely', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'body-test-uid',
        email: 'bodytest@company.com',
        role: 'CANDIDATE',
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-body',
            firebase_uid: 'body-test-uid',
            email: 'bodytest@company.com',
            full_name: 'bodytest',
            role: 'CANDIDATE',
            is_active: true,
          },
        ],
      });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      // Sending array which is a non-object dictionary in req.body
      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send([]);

      expect(res.status).toBe(200);
    });

    it('BUG-09: should sanitize invalid non-UUID companyId to null', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'uuid-test-uid',
        email: 'uuidtest@company.com',
        role: 'CANDIDATE',
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-test',
            firebase_uid: 'uuid-test-uid',
            email: 'uuidtest@company.com',
            role: 'CANDIDATE',
            company_id: null,
            is_active: true,
          },
        ],
      });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ companyId: 'not-a-valid-uuid-12345' });

      expect(res.status).toBe(200);
      const insertSqlArgs = mockQuery.mock.calls[1][1];
      expect(insertSqlArgs[4]).toBeNull(); // sanitized to null
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

    it('should return 403 Forbidden if user in database is deactivated', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'deactivated-uid',
        email: 'deactivated@example.com',
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-3',
            firebase_uid: 'deactivated-uid',
            email: 'deactivated@example.com',
            is_active: false,
          },
        ],
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-id-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('deactivated');
    });
  });

  describe('RBAC Middleware & Route Guards (SEC-06 Role Hierarchy)', () => {
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

    it('SEC-06: should allow higher authority role (ADMIN) to access lower privilege route (HR)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      const res = await request(app)
        .get('/api/auth/verify-role/hr')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Welcome HR/Recruiter');
    });

    it('SEC-06: should allow SUPER_ADMIN to access ADMIN and HR routes', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'super-admin-uid',
        email: 'super@example.com',
        role: 'SUPER_ADMIN',
      });

      const res = await request(app)
        .get('/api/auth/verify-role/admin')
        .set('Authorization', 'Bearer super-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('SEC-03: should reject deactivated user from protected role route', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'deactivated-admin',
        email: 'deactivated@admin.com',
        role: 'ADMIN',
        isActive: false,
      });

      const res = await request(app)
        .get('/api/auth/verify-role/admin')
        .set('Authorization', 'Bearer deact-token');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('deactivated');
    });
  });
});
