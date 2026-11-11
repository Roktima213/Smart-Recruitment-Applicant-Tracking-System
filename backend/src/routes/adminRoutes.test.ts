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
    revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/claimsSyncService', () => ({
  ...jest.requireActual('../services/claimsSyncService'),
  syncUserClaims: (...args: any[]) => mockSyncUserClaims(...args),
  revokeUserSessions: (...args: any[]) => mockRevokeUserSessions(...args),
  isValidAtsRole: (role: string) => ['ADMIN', 'HR', 'CANDIDATE'].includes(role),
}));

jest.mock('../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

describe('Admin APIs & RBAC Directory (/api/admin)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockSyncUserClaims.mockReset();
    mockRevokeUserSessions.mockReset();
    mockQuery.mockReset();
  });

  const adminTokenPayload = {
    uid: 'admin-firebase-uid',
    email: 'admin@ats.com',
    role: 'ADMIN',
    isActive: true,
  };

  const hrTokenPayload = {
    uid: 'hr-firebase-uid',
    email: 'hr@ats.com',
    role: 'HR',
    isActive: true,
  };

  const candidateTokenPayload = {
    uid: 'candidate-firebase-uid',
    email: 'candidate@ats.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  describe('Security & Authorization Guards', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body.message).toContain('Authorization header missing');
    });

    it('should reject HR users with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrTokenPayload);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-hr-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
      expect(res.body.message).toContain('Forbidden: User role "HR" is not permitted to access this resource');
    });

    it('should reject CANDIDATE users with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateTokenPayload);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
      expect(res.body.message).toContain('Forbidden: User role "CANDIDATE" is not permitted to access this resource');
    });

    it('should reject deactivated admin accounts with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        ...adminTokenPayload,
        isActive: false,
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('User account is deactivated');
    });
  });

  describe('GET /api/admin/users - User Directory & Listing', () => {
    it('should allow Admin to retrieve all registered users with company details', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({ rows: [{ total: '2' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'b5f00e12-4021-4f32-8419-79848dc60b45',
            email: 'jane@example.com',
            full_name: 'Jane Doe',
            role: 'HR',
            is_active: true,
            company_id: '99846312-3e28-4835-be02-2374bb4d0234',
            avatar_url: 'https://example.com/jane.jpg',
            phone: '+1234567890',
            created_at: '2026-11-01T10:00:00Z',
            updated_at: '2026-11-01T10:00:00Z',
            company_name: 'Acme Corp',
            company_domain: 'acme.com',
            company_logo_url: 'https://example.com/logo.png',
          },
          {
            id: 'c2d11f23-5132-4e43-9520-80959ed71c56',
            email: 'john@candidate.com',
            full_name: 'John Smith',
            role: 'CANDIDATE',
            is_active: true,
            company_id: null,
            avatar_url: null,
            phone: null,
            created_at: '2026-11-02T12:00:00Z',
            updated_at: '2026-11-02T12:00:00Z',
            company_name: null,
            company_domain: null,
            company_logo_url: null,
          },
        ],
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users[0]).toHaveProperty('company');
      expect(res.body.users[0].company).toHaveProperty('name', 'Acme Corp');
    });

    it('should handle database errors when querying users', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);
      mockQuery.mockRejectedValueOnce(new Error('Connection failure'));

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(500);
      expect(res.body.error.message).toContain('Failed to retrieve registered users');
    });
  });

  describe('PATCH /api/admin/users/:id/role - Role Update & Claim Sync', () => {
    const validUserId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    it('should update user role and synchronize Firebase custom claims', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: validUserId,
            firebase_uid: 'target-fb-uid-123',
            email: 'user@example.com',
            full_name: 'Bob Candidate',
            role: 'CANDIDATE',
            company_id: '99846312-3e28-4835-be02-2374bb4d0234',
            is_active: true,
          },
        ],
      });

      mockSyncUserClaims.mockResolvedValueOnce({
        success: true,
        claims: { role: 'HR', companyId: '99846312-3e28-4835-be02-2374bb4d0234', syncedAt: Date.now() },
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: validUserId,
            firebase_uid: 'target-fb-uid-123',
            email: 'user@example.com',
            full_name: 'Bob Candidate',
            role: 'HR',
            company_id: '99846312-3e28-4835-be02-2374bb4d0234',
            is_active: true,
            updated_at: '2026-11-10T12:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .patch(`/api/admin/users/${validUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'HR' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.user.role).toBe('HR');
      expect(mockSyncUserClaims).toHaveBeenCalledWith(
        'target-fb-uid-123',
        'HR',
        '99846312-3e28-4835-be02-2374bb4d0234'
      );
    });

    it('should reject invalid user UUID format with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const res = await request(app)
        .patch('/api/admin/users/not-a-valid-uuid/role')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'HR' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid user ID format. Must be a valid UUID');
    });

    it('should reject invalid role enum with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const res = await request(app)
        .patch(`/api/admin/users/${validUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'SUPERUSER' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid role');
    });

    it('should return 404 when target user is not found in database', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch(`/api/admin/users/${validUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'HR' });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('not found');
    });

    it('should fail with 502 if Firebase claim synchronization rejects', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: validUserId,
            firebase_uid: 'fb-user-broken',
            role: 'CANDIDATE',
            company_id: null,
          },
        ],
      });

      mockSyncUserClaims.mockRejectedValueOnce(new Error('Firebase network timeout'));

      const res = await request(app)
        .patch(`/api/admin/users/${validUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(502);
      expect(res.body.error.message).toContain('Failed to synchronize role claims with Firebase Auth');
    });
  });

  describe('PATCH /api/admin/users/:id/status - Status Toggle & Revocation', () => {
    const validUserId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    it('should deactivate user and revoke active Firebase sessions', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: validUserId, firebase_uid: 'fb-cand-123', is_active: true, full_name: 'Bob' }],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: validUserId, firebase_uid: 'fb-cand-123', is_active: false, full_name: 'Bob' }],
      });

      mockRevokeUserSessions.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .patch(`/api/admin/users/${validUserId}/status`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.user.is_active).toBe(false);
      expect(mockRevokeUserSessions).toHaveBeenCalledWith('fb-cand-123');
    });

    it('should prevent Admin from deactivating their own account', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: validUserId, firebase_uid: 'admin-firebase-uid', is_active: true, full_name: 'Admin' }],
      });

      const res = await request(app)
        .patch(`/api/admin/users/${validUserId}/status`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot deactivate their own active account');
    });
  });

  describe('GET & PUT /api/admin/company - Company Configuration', () => {
    it('should retrieve company configuration', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-1',
            name: 'Acme Corporation',
            domain: 'acme.com',
            logo_url: 'https://example.com/logo.png',
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

    it('should allow Admin to update company configuration and settings', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-1',
            name: 'Acme Corp',
            domain: 'acme.com',
            logo_url: null,
            settings: {},
          },
        ],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-1',
            name: 'Smart ATS Global Corp',
            domain: 'smartats.com',
            logo_url: 'https://example.com/new-logo.png',
            settings: { theme: 'dark', timezone: 'UTC', brandColor: '#2563eb' },
          },
        ],
      });

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          name: 'Smart ATS Global Corp',
          domain: 'smartats.com',
          logoUrl: 'https://example.com/new-logo.png',
          settings: {
            theme: 'dark',
            brandColor: '#2563eb',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.company.name).toBe('Smart ATS Global Corp');
    });

    it('should reject invalid company data with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Company name cannot be empty');
    });
  });
});
