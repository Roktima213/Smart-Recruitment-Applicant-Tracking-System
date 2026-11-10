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
    revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/claimsSyncService', () => ({
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

describe('Admin APIs (/api/admin)', () => {
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
    it('5. should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/users');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body.message).toContain('Authorization header missing');
    });

    it('4. should reject HR users with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrTokenPayload);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-hr-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
      expect(res.body.message).toContain('Forbidden: User role "HR" is not permitted to access this resource');
    });

    it('4. should reject CANDIDATE users with 403 Forbidden', async () => {
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

  describe('API 1: GET /api/admin/users - List Registered Users', () => {
    it('1. should allow Admin to retrieve all registered users with company details', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const mockUsers = [
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
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockUsers });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count', 2);
      expect(res.body.users).toHaveLength(2);

      const user1 = res.body.users[0];
      expect(user1).toHaveProperty('id', mockUsers[0].id);
      expect(user1).toHaveProperty('fullName', 'Jane Doe');
      expect(user1).toHaveProperty('email', 'jane@example.com');
      expect(user1).toHaveProperty('role', 'HR');
      expect(user1).toHaveProperty('isActive', true);
      expect(user1.company).toEqual({
        id: '99846312-3e28-4835-be02-2374bb4d0234',
        name: 'Acme Corp',
        domain: 'acme.com',
        logoUrl: 'https://example.com/logo.png',
      });

      // Sensitive fields must not be exposed
      expect(user1).not.toHaveProperty('password');
      expect(user1).not.toHaveProperty('firebaseToken');
    });

    it('should return empty list when no users exist', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        count: 0,
        users: [],
      });
    });

    it('9. should handle database errors gracefully with 500 response', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);
      mockQuery.mockRejectedValueOnce(new Error('PostgreSQL connection terminated unexpectedly'));

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('message', 'Failed to retrieve registered users');
    });
  });

  describe('API 2: PATCH /api/admin/users/:id/role - Update User Role', () => {
    const targetUserId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';

    it('2. should allow Admin to successfully update user role to HR and sync Firebase claims', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      // 1. Mock finding target user
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: targetUserId,
            firebase_uid: 'target-fb-uid',
            email: 'user@example.com',
            full_name: 'Regular User',
            role: 'CANDIDATE',
            company_id: 'comp-uuid-1',
            is_active: true,
          },
        ],
      });

      // 2. Mock Firebase claim sync
      mockSyncUserClaims.mockResolvedValueOnce({ success: true });
      mockRevokeUserSessions.mockResolvedValueOnce(undefined);

      // 3. Mock DB update
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: targetUserId,
            firebase_uid: 'target-fb-uid',
            email: 'user@example.com',
            full_name: 'Regular User',
            role: 'HR',
            company_id: 'comp-uuid-1',
            is_active: true,
          },
        ],
      });

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'HR' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toContain('User role updated to HR successfully');
      expect(res.body.user).toHaveProperty('role', 'HR');

      // Verify Firebase sync was called with correct parameters
      expect(mockSyncUserClaims).toHaveBeenCalledWith('target-fb-uid', 'HR', 'comp-uuid-1');
      expect(mockRevokeUserSessions).toHaveBeenCalledWith('target-fb-uid');
    });

    it('2. should return early 200 OK if user already has the requested role', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: targetUserId,
            firebase_uid: 'target-fb-uid',
            email: 'user@example.com',
            full_name: 'Regular User',
            role: 'ADMIN',
            company_id: null,
            is_active: true,
          },
        ],
      });

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('User role is already ADMIN');
      expect(mockSyncUserClaims).not.toHaveBeenCalled();
    });

    it('3. should reject invalid roles with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'SUPER_ROOT_GOD' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Invalid role. Supported roles are: ADMIN, HR, CANDIDATE');
    });

    it('9. should reject malformed or non-UUID user ID with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const res = await request(app)
        .patch('/api/admin/users/not-a-valid-uuid/role')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'HR' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Invalid user ID format');
    });

    it('9. should return 404 Not Found if target user does not exist', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('not found');
    });

    it('6. should handle Firebase sync failure safely and report 500 without corrupting state', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: targetUserId,
            firebase_uid: 'target-fb-uid',
            email: 'user@example.com',
            full_name: 'Regular User',
            role: 'CANDIDATE',
            company_id: null,
            is_active: true,
          },
        ],
      });

      // Firebase sync throws error
      mockSyncUserClaims.mockRejectedValueOnce(new Error('Firebase Auth Service Unavailable'));

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'HR' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Failed to synchronize role with Firebase');

      // Database UPDATE must not have executed if Firebase claims failed
      expect(mockQuery).toHaveBeenCalledTimes(1); // Only the SELECT, no UPDATE
    });

    it('6. should attempt to revert Firebase claims if DB update throws after Firebase sync', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: targetUserId,
            firebase_uid: 'target-fb-uid',
            email: 'user@example.com',
            full_name: 'Regular User',
            role: 'CANDIDATE',
            company_id: null,
            is_active: true,
          },
        ],
      });

      // Firebase sync succeeds
      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      // DB update fails
      mockQuery.mockRejectedValueOnce(new Error('Database disk full'));

      // Revert mock
      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'HR' });

      expect(res.status).toBe(500);
      expect(res.body.error.message).toContain('Failed to update user role in database');

      // Verify it attempted to revert claims back to CANDIDATE
      expect(mockSyncUserClaims).toHaveBeenCalledWith('target-fb-uid', 'CANDIDATE', null);
    });
  });

  describe('API 3: PUT /api/admin/company - Update Company Configuration', () => {
    it('7. should allow Admin to update company profile, branding, and system settings', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        ...adminTokenPayload,
        companyId: 'comp-uuid-1',
      });

      // Mock finding existing company
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-1',
            name: 'Old Company Name',
            domain: 'oldcompany.com',
            logo_url: 'https://example.com/old-logo.png',
            settings: { theme: 'light', timezone: 'UTC' },
            created_at: '2026-11-01T00:00:00Z',
            updated_at: '2026-11-01T00:00:00Z',
          },
        ],
      });

      // Mock update query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-1',
            name: 'Smart ATS Global Corp',
            domain: 'smartats.com',
            logo_url: 'https://example.com/new-logo.png',
            settings: { theme: 'dark', timezone: 'UTC', brandColor: '#2563eb' },
            created_at: '2026-11-01T00:00:00Z',
            updated_at: '2026-11-10T20:00:00Z',
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
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toContain('Company configuration updated successfully');
      expect(res.body.company).toHaveProperty('name', 'Smart ATS Global Corp');
      expect(res.body.company).toHaveProperty('domain', 'smartats.com');
      expect(res.body.company.settings).toHaveProperty('theme', 'dark');
      expect(res.body.company.settings).toHaveProperty('brandColor', '#2563eb');
    });

    it('7. should preserve existing values when partial updates are submitted', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        ...adminTokenPayload,
        companyId: 'comp-uuid-1',
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-1',
            name: 'Original Name',
            domain: 'original.com',
            logo_url: 'https://example.com/logo.png',
            settings: { existingKey: 'preservedValue' },
            created_at: '2026-11-01T00:00:00Z',
            updated_at: '2026-11-01T00:00:00Z',
          },
        ],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp-uuid-1',
            name: 'Updated Name Only',
            domain: 'original.com',
            logo_url: 'https://example.com/logo.png',
            settings: { existingKey: 'preservedValue' },
            created_at: '2026-11-01T00:00:00Z',
            updated_at: '2026-11-10T20:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          name: 'Updated Name Only',
        });

      expect(res.status).toBe(200);
      expect(res.body.company).toHaveProperty('name', 'Updated Name Only');
      expect(res.body.company).toHaveProperty('domain', 'original.com');
    });

    it('8. should reject invalid company data with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          name: '', // Empty name not allowed
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Company name cannot be empty');
    });

    it('should bootstrap initial company if database has no company record yet', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      // No company in fallback
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Insert initial company
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-bootstrapped-company',
            name: 'First ATS Company',
            domain: 'firstats.com',
            logo_url: null,
            settings: {},
            created_at: '2026-11-10T20:00:00Z',
            updated_at: '2026-11-10T20:00:00Z',
          },
        ],
      });

      // Link admin user
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          name: 'First ATS Company',
          domain: 'firstats.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.company).toHaveProperty('name', 'First ATS Company');
    });

    it('9. should handle database errors gracefully during company update', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);
      mockQuery.mockRejectedValueOnce(new Error('PostgreSQL syntax error'));

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          name: 'Any Company',
        });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Failed to update company configuration');
    });
  });
});
