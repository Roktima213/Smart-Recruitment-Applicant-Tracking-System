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
  query: (...args: any[]) => mockQuery(...args),
  getClient: jest.fn(),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

describe('Candidate Multi-Filter Search & Audit History APIs (Floor 13)', () => {
  const hrUser = {
    uid: 'hr-recruiter-uid-01',
    email: 'recruiter@company.com',
    role: 'HR',
    isActive: true,
  };

  const adminUser = {
    uid: 'admin-platform-uid-01',
    email: 'admin@platform.com',
    role: 'ADMIN',
    isActive: true,
  };

  const candidateAlice = {
    uid: 'alice-candidate-uid-01',
    email: 'alice@domain.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const candidateBobAttacker = {
    uid: 'bob-attacker-uid-02',
    email: 'bob@domain.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const appId = '55555555-5555-4555-8555-555555555555';
  const jobId = '22222222-2222-4222-8222-222222222222';
  const companyId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
  });

  describe('1. GET /api/applications - Multi-Filter Candidate Search', () => {
    it('SEARCH-01: Rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/applications');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('SEARCH-02: Rejects CANDIDATE role callers with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateAlice);

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', 'Bearer candidate-jwt');

      expect(res.status).toBe(403);
      expect(res.body.message || res.body.error?.message || res.body.error).toMatch(/Forbidden|not permitted/i);
    });

    it('SEARCH-03: Allows HR to retrieve filtered candidates with pagination metadata', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      // Fetch HR DB user with company_id
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'hr-db-id', role: 'HR', company_id: companyId, is_active: true }],
      });
      // Count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });
      // List query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: appId,
            job_id: jobId,
            candidate_id: 'c-alice',
            resume_id: 'r-alice',
            current_stage: 'SCREENING',
            cover_letter: 'I love backend development',
            answers: {},
            applied_at: '2026-11-13T10:00:00Z',
            updated_at: '2026-11-13T10:00:00Z',
            user_id: 'u-alice',
            candidate_name: 'Alice Candidate',
            candidate_email: 'alice@domain.com',
            candidate_avatar: null,
            candidate_headline: 'Staff Backend Architect',
            candidate_skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
            candidate_experience: '6.5',
            job_title: 'Lead Architect',
            job_department: 'Engineering',
            job_location: 'Remote',
            job_employment_type: 'Full-time',
            company_name: 'TechCorp Solutions',
            resume_file_name: 'Alice_Resume.pdf',
          },
        ],
      });

      const res = await request(app)
        .get(`/api/applications?stage=SCREENING&search=TypeScript&jobId=${jobId}&page=1&limit=10`)
        .set('Authorization', 'Bearer hr-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].candidate.name).toBe('Alice Candidate');
      expect(res.body.data[0].candidate.skills).toContain('TypeScript');
      expect(res.body.data[0].currentStage).toBe('SCREENING');
      expect(res.body.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('SEARCH-04: Rejects malformed non-UUID jobId parameter with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'hr-db-id', role: 'HR', company_id: companyId, is_active: true }],
      });

      const res = await request(app)
        .get('/api/applications?jobId=not-a-uuid')
        .set('Authorization', 'Bearer hr-jwt');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/invalid job uuid/i);
    });
  });

  describe('2. GET /api/applications/:id/history - Chronological Stage Audit Timeline', () => {
    it('HIST-01: Rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/applications/${appId}/history`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('HIST-02: Prohibits attacker Candidate Bob from accessing Alice application history (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateBobAttacker);
      // App lookup shows Alice is owner
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: appId,
            job_id: jobId,
            candidate_id: 'c-alice',
            candidate_firebase_uid: candidateAlice.uid,
            job_company_id: companyId,
          },
        ],
      });

      const res = await request(app)
        .get(`/api/applications/${appId}/history`)
        .set('Authorization', 'Bearer bob-jwt');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Forbidden/i);
    });

    it('HIST-03: Allows Candidate Alice to view her own application audit timeline', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateAlice);
      // App lookup shows Alice is owner
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: appId,
            job_id: jobId,
            candidate_id: 'c-alice',
            candidate_firebase_uid: candidateAlice.uid,
            job_company_id: companyId,
          },
        ],
      });
      // History query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'h-1',
            application_id: appId,
            from_stage: null,
            to_stage: 'APPLIED',
            reason: 'Initial submission',
            changed_at: '2026-11-13T09:00:00Z',
            actor_id: 'u-alice',
            actor_name: 'Alice Candidate',
            actor_role: 'CANDIDATE',
          },
          {
            id: 'h-2',
            application_id: appId,
            from_stage: 'APPLIED',
            to_stage: 'SCREENING',
            reason: 'Passed technical resume filter',
            changed_at: '2026-11-13T10:00:00Z',
            actor_id: 'hr-1',
            actor_name: 'Recruiter Bob',
            actor_role: 'HR',
          },
        ],
      });

      const res = await request(app)
        .get(`/api/applications/${appId}/history`)
        .set('Authorization', 'Bearer alice-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.timeline).toHaveLength(2);
      expect(res.body.timeline[0].toStage).toBe('APPLIED');
      expect(res.body.timeline[1].toStage).toBe('SCREENING');
      expect(res.body.timeline[1].changedBy.name).toBe('Recruiter Bob');
      expect(res.body.timeline[1].reason).toBe('Passed technical resume filter');
    });

    it('HIST-04: Allows Admin to inspect any application timeline across companies', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminUser);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: appId,
            job_id: jobId,
            candidate_id: 'c-alice',
            candidate_firebase_uid: candidateAlice.uid,
            job_company_id: 'any-company-id',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'h-1',
            application_id: appId,
            from_stage: null,
            to_stage: 'APPLIED',
            reason: 'Initial submission',
            changed_at: '2026-11-13T09:00:00Z',
            actor_id: 'u-alice',
            actor_name: 'Alice Candidate',
            actor_role: 'CANDIDATE',
          },
        ],
      });

      const res = await request(app)
        .get(`/api/applications/${appId}/history`)
        .set('Authorization', 'Bearer admin-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.timeline).toHaveLength(1);
    });

    it('HIST-05: Returns 404 Not Found when application does not exist', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/applications/${appId}/history`)
        .set('Authorization', 'Bearer hr-jwt');

      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/application not found/i);
    });
  });
});
