const mockVerifyFirebaseIdToken = jest.fn();
const mockSyncUserClaims = jest.fn();
const mockRevokeUserSessions = jest.fn();
const mockQuery = jest.fn();

jest.mock('../config/firebaseAdmin', () => ({
  verifyFirebaseIdToken: (...args: any[]) => mockVerifyFirebaseIdToken(...args),
  setCustomClaims: jest.fn().mockResolvedValue(undefined),
  isAuthEmulatorEnabled: jest.fn().mockReturnValue(true),
  firebaseAdminApp: { name: '[DEFAULT]' },
  adminAuth: {
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  },
}));

jest.mock('../services/claimsSyncService', () => ({
  ...jest.requireActual('../services/claimsSyncService'),
  syncUserClaims: (...args: any[]) => mockSyncUserClaims(...args),
  revokeUserSessions: (...args: any[]) => mockRevokeUserSessions(...args),
}));

jest.mock('../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 5 }),
}));

import request from 'supertest';
import app from '../app';

describe('Admin RBAC & Directory Endpoints (/api/admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthenticated Access Guards', () => {
    it('GET /api/admin/users returns 401 when Authorization header is absent', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });

    it('PATCH /api/admin/users/:id/role returns 401 when Authorization header is absent', async () => {
      const res = await request(app).patch('/api/admin/users/usr-123/role').send({ role: 'HR' });
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/company returns 401 when Authorization header is absent', async () => {
      const res = await request(app).get('/api/admin/company');
      expect(res.status).toBe(401);
    });
  });

  describe('Role Matrix Enforcement: HR and CANDIDATE Receive 403 Forbidden', () => {
    it('CANDIDATE receives 403 on GET /api/admin/users', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'cand-uid',
        email: 'cand@ats.local',
        role: 'CANDIDATE',
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer candidate-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
      expect(res.body.message).toContain('not permitted');
    });

    it('HR receives 403 on GET /api/admin/users', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'hr-uid',
        email: 'hr@ats.local',
        role: 'HR',
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer hr-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
    });

    it('HR receives 403 on PATCH /api/admin/users/:id/role', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'hr-uid',
        email: 'hr@ats.local',
        role: 'HR',
      });

      const res = await request(app)
        .patch('/api/admin/users/usr-123/role')
        .set('Authorization', 'Bearer hr-token')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
    });

    it('CANDIDATE receives 403 on PUT /api/admin/company', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'cand-uid',
        email: 'cand@ats.local',
        role: 'CANDIDATE',
      });

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer candidate-token')
        .send({ name: 'Hacked Corp' });

      expect(res.status).toBe(403);
    });
  });

  describe('ADMIN Privilege Execution (200 OK)', () => {
    const adminTokenPayload = {
      uid: 'admin-uid-01',
      email: 'admin@ats.local',
      role: 'ADMIN',
      companyId: 'comp-uuid-01',
    };

    it('ADMIN successfully lists user directory with pagination', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      // 1. Total count query
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '3' }] });
      // 2. Users list query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'u1', email: 'admin@ats.local', role: 'ADMIN', is_active: true },
          { id: 'u2', email: 'hr@ats.local', role: 'HR', is_active: true },
          { id: 'u3', email: 'cand@ats.local', role: 'CANDIDATE', is_active: true },
        ],
      });

      const res = await request(app)
        .get('/api/admin/users?limit=10&offset=0')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users).toHaveLength(3);
      expect(res.body.pagination).toEqual({
        total: 3,
        limit: 10,
        offset: 0,
        hasMore: false,
      });
    });

    it('ADMIN successfully updates user role and synchronizes Firebase claims', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      // Check target user exists
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'u2',
            firebase_uid: 'fb-hr-01',
            email: 'hr@ats.local',
            role: 'HR',
            company_id: 'comp-uuid-01',
            is_active: true,
          },
        ],
      });

      // Update query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'u2',
            firebase_uid: 'fb-hr-01',
            email: 'hr@ats.local',
            role: 'ADMIN',
            company_id: 'comp-uuid-01',
            is_active: true,
          },
        ],
      });

      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .patch('/api/admin/users/u2/role')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('ADMIN');
      expect(mockSyncUserClaims).toHaveBeenCalledWith('fb-hr-01', 'ADMIN', 'comp-uuid-01');
    });

    it('ADMIN is blocked from removing their own admin privilege (400 Bad Request)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      // Self target lookup
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'self-id',
            firebase_uid: 'admin-uid-01',
            email: 'admin@ats.local',
            role: 'ADMIN',
          },
        ],
      });

      const res = await request(app)
        .patch('/api/admin/users/self-id/role')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'CANDIDATE' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot revoke their own administrator privileges');
    });

    it('ADMIN receives 400 Bad Request for invalid role enum', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const res = await request(app)
        .patch('/api/admin/users/u2/role')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'SUPERHERO' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Role must be ADMIN, HR, or CANDIDATE');
    });

    it('ADMIN successfully deactivates account and triggers token revocation', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      // Lookup target user
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'u3', firebase_uid: 'fb-cand-01', is_active: true },
        ],
      });

      // Update query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'u3', firebase_uid: 'fb-cand-01', is_active: false },
        ],
      });

      mockRevokeUserSessions.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .patch('/api/admin/users/u3/status')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.user.is_active).toBe(false);
      expect(mockRevokeUserSessions).toHaveBeenCalledWith('fb-cand-01');
    });

    it('ADMIN successfully fetches company profile', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-01',
            name: 'Acme Corporation',
            domain: 'acme.local',
            settings: { timezone: 'UTC' },
          },
        ],
      });

      const res = await request(app)
        .get('/api/admin/company')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.company.name).toBe('Acme Corporation');
    });

    it('ADMIN successfully updates company settings', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-01',
            name: 'Acme Global Corp',
            domain: 'acme.global',
            settings: { timezone: 'America/New_York' },
          },
        ],
      });

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          name: 'Acme Global Corp',
          domain: 'acme.global',
          settings: { timezone: 'America/New_York' },
        });

      expect(res.status).toBe(200);
      expect(res.body.company.name).toBe('Acme Global Corp');
    });
  });
});
