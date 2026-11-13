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
  pool: {
    query: (...args: any[]) => mockQuery(...args),
  },
  query: (...args: any[]) => mockQuery(...args),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

describe('Adversarial Security, Edge Cases & Robustness Test Suite', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockSyncUserClaims.mockReset();
    mockRevokeUserSessions.mockReset();
    mockQuery.mockReset();
  });

  const adminToken = {
    uid: 'admin-fb-uid',
    email: 'admin@enterprise.local',
    role: 'ADMIN',
    companyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    isActive: true,
  };

  const hrToken = {
    uid: 'hr-fb-uid',
    email: 'recruiter@enterprise.local',
    role: 'HR',
    companyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    isActive: true,
  };

  const candidateToken = {
    uid: 'cand-fb-uid',
    email: 'applicant@external.local',
    role: 'CANDIDATE',
    companyId: null,
    isActive: true,
  };

  const draftJobId = '11111111-1111-4111-8111-111111111111';
  const closedJobId = '22222222-2222-4222-8222-222222222222';

  describe('1. Optional Auth on Job Board & Visibility Scoping', () => {
    it('should allow HR to inspect DRAFT job via GET /api/jobs/:id with Bearer token', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: draftJobId,
            title: 'Confidential Internal Architect',
            status: 'DRAFT',
            company_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          },
        ],
      });

      const res = await request(app)
        .get(`/api/jobs/${draftJobId}`)
        .set('Authorization', 'Bearer valid-hr-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job.status).toBe('DRAFT');
    });

    it('should allow HR to filter by ?status=DRAFT on GET /api/jobs', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      // count
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      // data
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: draftJobId, title: 'Draft Role', status: 'DRAFT' }],
      });

      const res = await request(app)
        .get('/api/jobs?status=DRAFT')
        .set('Authorization', 'Bearer valid-hr-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const queryParams = mockQuery.mock.calls[0][1];
      expect(queryParams).toContain('DRAFT');
    });

    it('should reject unauthenticated request for DRAFT job with 404', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: draftJobId,
            title: 'Confidential Internal Architect',
            status: 'DRAFT',
          },
        ],
      });

      const res = await request(app).get(`/api/jobs/${draftJobId}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Job not found');
    });
  });

  describe('2. HTTP Parameter Pollution (HPP) Defense on Search & Filter', () => {
    it('should safely normalize array query parameters without SQL errors or 500 crash', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'job-1', title: 'Engineer', status: 'PUBLISHED' },
          { id: 'job-2', title: 'Manager', status: 'PUBLISHED' },
        ],
      });

      // Polluting query parameters with multiple values
      const res = await request(app).get(
        '/api/jobs?status=PUBLISHED&status=DRAFT&limit=10&limit=50&page=1&page=2'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.page).toBe(1);
    });

    it('should safely clamp extreme page number to max bound without integer overflow', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs?page=9999999999&limit=20');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(100000);
      const dataParams = mockQuery.mock.calls[1][1];
      // offset = (100000 - 1) * 20 = 1999980
      expect(dataParams).toContain(1999980);
    });

    it('should support salary_min and salary_max query aliases', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs?salary_min=80000&salary_max=150000');

      expect(res.status).toBe(200);
      const queryParams = mockQuery.mock.calls[0][1];
      expect(queryParams).toContain(80000);
      expect(queryParams).toContain(150000);
    });
  });

  describe('3. Salary Falsy Coercion & Zero-Value Preservation', () => {
    it('should preserve salary_min: 0 in database insert (not coerce to null)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      // creator resolution
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'hr-user-id', company_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }],
      });
      // insert job returning
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'job-unpaid-intern',
            title: 'Unpaid Summer Internship',
            salary_min: 0,
            salary_max: 0,
            status: 'DRAFT',
          },
        ],
      });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer hr-token')
        .send({
          title: 'Unpaid Summer Internship',
          description: 'Great educational mentorship role for university students.',
          salary_min: 0,
          salary_max: 0,
        });

      expect(res.status).toBe(201);
      const insertParams = mockQuery.mock.calls[1][1];
      // index 7 is salary_min, index 8 is salary_max
      expect(insertParams[7]).toBe(0);
      expect(insertParams[8]).toBe(0);
    });
  });

  describe('4. Job Reopening Lifecycle & Closed-At Reset', () => {
    it('should clear closed_at to null when reopening a CLOSED job to PUBLISHED', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      // fetch current job state
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            company_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            status: 'CLOSED',
            published_at: new Date('2026-10-01').toISOString(),
            closed_at: new Date('2026-11-01').toISOString(),
          },
        ],
      });
      // update returning
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: closedJobId,
            status: 'PUBLISHED',
            published_at: new Date('2026-10-01').toISOString(),
            closed_at: null,
          },
        ],
      });

      const res = await request(app)
        .patch(`/api/jobs/${closedJobId}/status`)
        .set('Authorization', 'Bearer hr-token')
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const updateParams = mockQuery.mock.calls[1][1];
      // $1: status, $2: publishedAt, $3: closedAt, $4: id
      expect(updateParams[0]).toBe('PUBLISHED');
      expect(updateParams[2]).toBeNull(); // closed_at MUST be null!
    });
  });

  describe('5. Admin Status Toggle Case Compatibility (is_active / isActive)', () => {
    const targetUserId = '33333333-3333-4333-8333-333333333333';

    it('should accept snake_case { is_active: false } on PATCH /api/admin/users/:id/status', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);
      // fetch user
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: targetUserId, firebase_uid: 'target-fb-uid', is_active: true }],
      });
      // update user
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: targetUserId, is_active: false }],
      });
      mockRevokeUserSessions.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.is_active).toBe(false);
      expect(mockRevokeUserSessions).toHaveBeenCalledWith('target-fb-uid');
    });

    it('should accept camelCase { isActive: false } on PATCH /api/admin/users/:id/status', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: targetUserId, firebase_uid: 'target-fb-uid', is_active: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: targetUserId, is_active: false }],
      });
      mockRevokeUserSessions.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.is_active).toBe(false);
    });

    it('should reject payload missing both isActive and is_active with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);

      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('boolean property is required');
    });
  });

  describe('6. User Invitation & Claims Sync Endpoints', () => {
    it('POST /api/admin/users/invite should allow Admin to provision user and sync claims', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);
      // check if exists
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // insert new user
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-invited-uuid',
            firebase_uid: 'invited_123',
            email: 'invited@enterprise.com',
            full_name: 'Invited Recruiter',
            role: 'HR',
            company_id: adminToken.companyId,
            is_active: true,
          },
        ],
      });
      mockSyncUserClaims.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', 'Bearer admin-token')
        .send({
          email: 'invited@enterprise.com',
          fullName: 'Invited Recruiter',
          role: 'HR',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('invited@enterprise.com');
      expect(mockSyncUserClaims).toHaveBeenCalled();
    });

    it('POST /api/admin/users/invite should reject non-Admin callers with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const res = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', 'Bearer hr-token')
        .send({ email: 'hack@domain.com' });

      expect(res.status).toBe(403);
    });

    it('POST /api/auth/sync-claims should synchronize claims for active users', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);
      mockQuery.mockResolvedValueOnce({
        rows: [
          { firebase_uid: 'user-1', role: 'ADMIN', company_id: adminToken.companyId },
          { firebase_uid: 'user-2', role: 'HR', company_id: adminToken.companyId },
        ],
      });
      mockSyncUserClaims.mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/api/auth/sync-claims')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.syncedCount).toBe(2);
      expect(mockSyncUserClaims).toHaveBeenCalledTimes(2);
    });
  });

  describe('7. Multi-Tenant Authorization & Isolation Hardening', () => {
    const foreignCompanyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const foreignJobId = '44444444-4444-4444-8444-444444444444';

    it('should reject HR from updating a job belonging to another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      // Fetch target job belonging to foreign company
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: foreignJobId,
            company_id: foreignCompanyId,
            title: 'Foreign Job',
            description: 'Belongs to Company B',
          },
        ],
      });

      const res = await request(app)
        .put(`/api/jobs/${foreignJobId}`)
        .set('Authorization', 'Bearer valid-hr-token')
        .send({ title: 'Hijacked Job Title' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden: You are not authorized to modify job requisitions belonging to another organization');
    });

    it('should reject HR from changing status of a job belonging to another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      // Fetch target job status & company_id
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: foreignJobId,
            status: 'PUBLISHED',
            company_id: foreignCompanyId,
            published_at: new Date().toISOString(),
            closed_at: null,
          },
        ],
      });

      const res = await request(app)
        .patch(`/api/jobs/${foreignJobId}/status`)
        .set('Authorization', 'Bearer valid-hr-token')
        .send({ status: 'CLOSED' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden: You are not authorized to modify job requisitions belonging to another organization');
    });

    it('should allow ADMIN to update a job regardless of company_id', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);
      // Existing job
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: foreignJobId,
            company_id: foreignCompanyId,
            title: 'Foreign Job',
            description: 'Belongs to Company B',
            department: 'Engineering',
            location: 'Remote',
            employment_type: 'Full-time',
            salary_min: 100000,
            salary_max: 150000,
            status: 'PUBLISHED',
          },
        ],
      });
      // Updated job return
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: foreignJobId,
            company_id: foreignCompanyId,
            title: 'Admin Updated Job',
          },
        ],
      });

      const res = await request(app)
        .put(`/api/jobs/${foreignJobId}`)
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ title: 'Admin Updated Job' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('8. Integer Overflow & Enum Crash Defense', () => {
    it('should clamp extreme min_salary and max_salary to 32-bit INT max (2147483647)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs?min_salary=99999999999999&max_salary=88888888888888');

      expect(res.status).toBe(200);
      const queryParams = mockQuery.mock.calls[0][1];
      expect(queryParams).toContain(2147483647);
    });

    it('should safely handle invalid enum value on ?status=NON_EXISTENT_STATUS without SQL crash', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs?status=CORRUPT_INVALID_ENUM');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should clear published_at when resetting a job back to DRAFT', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: draftJobId,
            status: 'PUBLISHED',
            company_id: hrToken.companyId,
            published_at: new Date('2026-10-15').toISOString(),
            closed_at: null,
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: draftJobId,
            status: 'DRAFT',
            published_at: null,
            closed_at: null,
          },
        ],
      });

      const res = await request(app)
        .patch(`/api/jobs/${draftJobId}/status`)
        .set('Authorization', 'Bearer hr-token')
        .send({ status: 'DRAFT' });

      expect(res.status).toBe(200);
      const updateParams = mockQuery.mock.calls[1][1];
      // $1: status, $2: publishedAt, $3: closedAt, $4: id
      expect(updateParams[0]).toBe('DRAFT');
      expect(updateParams[1]).toBeNull();
      expect(updateParams[2]).toBeNull();
    });
  });

  describe('9. Admin Self-Demotion & Company Config Persistence', () => {
    it('should prevent Admin from demoting self via invite endpoint', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);
      // Existing user lookup matches calling admin's firebase_uid
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'admin-db-id',
            firebase_uid: adminToken.uid,
            email: adminToken.email,
            role: 'ADMIN',
            company_id: adminToken.companyId,
            is_active: true,
          },
        ],
      });

      const res = await request(app)
        .post('/api/admin/users/invite')
        .set('Authorization', 'Bearer admin-token')
        .send({
          email: adminToken.email,
          role: 'CANDIDATE',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Admins cannot revoke their own administrator privileges');
    });

    it('should persist industry, portal_url, and verified in PUT /api/admin/company and surface them in response', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminToken);
      // Existing company
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: adminToken.companyId,
            name: 'Old Name',
            domain: 'old.io',
            logo_url: null,
            settings: {},
          },
        ],
      });
      // Updated company return
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: adminToken.companyId,
            name: 'TechPulse Global Corp',
            domain: 'techpulse.io',
            logo_url: 'https://cdn.example.com/logo.png',
            settings: {
              industry: 'Enterprise SaaS',
              portal_url: 'https://careers.techpulse.io',
              verified: true,
            },
          },
        ],
      });

      const res = await request(app)
        .put('/api/admin/company')
        .set('Authorization', 'Bearer admin-token')
        .send({
          name: 'TechPulse Global Corp',
          domain: 'techpulse.io',
          logo_url: 'https://cdn.example.com/logo.png',
          industry: 'Enterprise SaaS',
          portal_url: 'https://careers.techpulse.io',
          verified: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.company.industry).toBe('Enterprise SaaS');
      expect(res.body.company.portal_url).toBe('https://careers.techpulse.io');
      expect(res.body.company.verified).toBe(true);
    });

    it('should include Authorization in default Vary header on GET /api/jobs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs');

      expect(res.status).toBe(200);
      expect(res.headers['vary']).toBeDefined();
      expect(res.headers['vary']).toContain('Authorization');
    });
  });
});
