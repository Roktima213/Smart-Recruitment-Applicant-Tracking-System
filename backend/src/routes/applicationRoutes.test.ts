const mockVerifyFirebaseIdToken = jest.fn();
const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();

const mockClient = {
  query: mockClientQuery,
  release: mockClientRelease,
};

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
    connect: jest.fn().mockImplementation(async () => mockClient),
  },
  query: (...args: any[]) => mockQuery(...args),
  getClient: jest.fn().mockImplementation(async () => mockClient),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

describe('Job Application APIs (/api/applications)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
  });

  const candidatePayload = {
    uid: 'candidate-firebase-uid-123',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const hrPayload = {
    uid: 'hr-firebase-uid-456',
    email: 'hr@example.com',
    role: 'HR',
    isActive: true,
  };

  const adminPayload = {
    uid: 'admin-firebase-uid-789',
    email: 'admin@example.com',
    role: 'ADMIN',
    isActive: true,
  };

  const mockDbUser = {
    id: '11111111-1111-4111-8111-111111111111',
    firebase_uid: 'candidate-firebase-uid-123',
    email: 'candidate@example.com',
    full_name: 'Jane Candidate',
    role: 'CANDIDATE',
    is_active: true,
  };

  const mockDbProfile = {
    id: '22222222-2222-4222-8222-222222222222',
    user_id: '11111111-1111-4111-8111-111111111111',
    headline: 'Senior Full Stack Engineer',
  };

  const validJobId = '33333333-3333-4333-8333-333333333333';
  const validResumeId = '44444444-4444-4444-8444-444444444444';
  const validAppId = '55555555-5555-4555-8555-555555555555';
  const validHistoryId = '66666666-6666-4666-8666-666666666666';

  const mockPublishedJob = {
    id: validJobId,
    title: 'Senior Software Engineer',
    status: 'PUBLISHED',
  };

  const mockDraftJob = {
    id: validJobId,
    title: 'Draft Software Engineer',
    status: 'DRAFT',
  };

  const mockInsertedApplication = {
    id: validAppId,
    job_id: validJobId,
    candidate_id: mockDbProfile.id,
    resume_id: validResumeId,
    current_stage: 'APPLIED',
    cover_letter: 'I am excited about this role.',
    answers: { experience_years: '5' },
    applied_at: new Date('2026-11-12T10:00:00Z').toISOString(),
    updated_at: new Date('2026-11-12T10:00:00Z').toISOString(),
  };

  const mockInsertedHistory = {
    id: validHistoryId,
    application_id: validAppId,
    from_stage: null,
    to_stage: 'APPLIED',
    changed_by: mockDbUser.id,
    reason: 'Initial application submission',
    changed_at: new Date('2026-11-12T10:00:01Z').toISOString(),
  };

  // ============================================================================
  // TASK 1 & 2: POST /api/applications Tests
  // ============================================================================
  describe('POST /api/applications - Job Application Submission', () => {
    it('1. Successfully submits application and creates initial APPLIED history record inside ACID transaction', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      // Candidate resolution
      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });

      // Job check (PUBLISHED)
      mockQuery.mockResolvedValueOnce({ rows: [mockPublishedJob] });

      // Resume ownership check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: validResumeId, candidate_id: mockDbProfile.id }] });

      // Transaction queries: BEGIN, INSERT applications, INSERT stage_history, COMMIT
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [mockInsertedApplication] }); // INSERT applications
      mockClientQuery.mockResolvedValueOnce({ rows: [mockInsertedHistory] }); // INSERT application_stage_history
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          job_id: validJobId,
          resume_id: validResumeId,
          cover_letter: 'I am excited about this role.',
          answers: { experience_years: '5' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(validAppId);
      expect(res.body.data.jobId).toBe(validJobId);
      expect(res.body.data.candidateId).toBe(mockDbProfile.id);
      expect(res.body.data.currentStage).toBe('APPLIED');
      expect(res.body.data.stageHistory).toHaveLength(1);
      expect(res.body.data.stageHistory[0].fromStage).toBeNull();
      expect(res.body.data.stageHistory[0].toStage).toBe('APPLIED');
      expect(res.body.data.stageHistory[0].reason).toBe('Initial application submission');

      // Verify ACID transaction workflow on same client
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });

    it('2. Prevents duplicate application submission and returns HTTP 409 Conflict', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [mockPublishedJob] });

      // Transaction queries: BEGIN, then INSERT applications fails with unique violation code 23505
      const duplicateError: any = new Error('duplicate key value violates unique constraint "unique_job_candidate_application"');
      duplicateError.code = '23505';
      duplicateError.constraint = 'unique_job_candidate_application';

      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockRejectedValueOnce(duplicateError); // INSERT fails
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          job_id: validJobId,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already submitted an application/i);
      expect(res.body.error.statusCode).toBe(409);

      // Verify transaction was rolled back and client was released
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });

    it('3. Rejects invalid job ID format with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          job_id: 'not-a-valid-uuid',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
    });

    it('4. Rejects request missing job ID with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          cover_letter: 'No job id provided',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
    });

    it('5. Rejects application when requested job does not exist (404 Not Found)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Job query returns 0 rows

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          job_id: validJobId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/job not found/i);
      expect(mockClientQuery).not.toHaveBeenCalled();
    });

    it('6. Rejects application when requested job is ineligible (status != PUBLISHED) (400 Bad Request)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDraftJob] }); // Status is DRAFT

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          job_id: validJobId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/not open for applications/i);
      expect(mockClientQuery).not.toHaveBeenCalled();
    });

    it('7. Rejects resume that does not belong to authenticated candidate (400 Bad Request)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [mockPublishedJob] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Resume not found for this candidate

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          job_id: validJobId,
          resume_id: validResumeId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/resume not found or does not belong/i);
      expect(mockClientQuery).not.toHaveBeenCalled();
    });

    it('8. Rejects unauthenticated application submission (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          job_id: validJobId,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('9. Rejects non-candidate (HR or ADMIN) application submission (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrPayload);

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          job_id: validJobId,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('10. Rolls back entire transaction when database failure occurs inserting application', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [mockPublishedJob] });

      // Transaction: BEGIN succeeds, INSERT applications throws generic DB failure
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockRejectedValueOnce(new Error('Connection terminated unexpectedly')); // INSERT fails
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          job_id: validJobId,
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });

    it('11. Rolls back entire transaction when history record insertion fails', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [mockPublishedJob] });

      // Transaction: BEGIN succeeds, INSERT applications succeeds, but INSERT history fails
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [mockInsertedApplication] }); // INSERT applications
      mockClientQuery.mockRejectedValueOnce(new Error('Failed inserting stage history audit record')); // INSERT history fails
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          job_id: validJobId,
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });

    it('12. Safely handles concurrent duplicate submissions without creating duplicates', async () => {
      // First request succeeds
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);
      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [mockPublishedJob] });
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [mockInsertedApplication] });
      mockClientQuery.mockResolvedValueOnce({ rows: [mockInsertedHistory] });
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Second concurrent request hits unique constraint
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);
      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [mockPublishedJob] });
      const duplicateError: any = new Error('duplicate key value violates unique constraint "unique_job_candidate_application"');
      duplicateError.code = '23505';
      duplicateError.constraint = 'unique_job_candidate_application';
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockRejectedValueOnce(duplicateError);
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/applications')
          .set('Authorization', 'Bearer token-1')
          .send({ job_id: validJobId }),
        request(app)
          .post('/api/applications')
          .set('Authorization', 'Bearer token-2')
          .send({ job_id: validJobId }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);
    });
  });

  // ============================================================================
  // TASK 3: GET /api/applications/me Tests
  // ============================================================================
  describe('GET /api/applications/me - Candidate Application History', () => {
    it('1. Successfully retrieves the candidate applications ordered newest first', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });

      const mockApplicationsList = [
        {
          id: 'app-uuid-2',
          job_id: validJobId,
          candidate_id: mockDbProfile.id,
          resume_id: validResumeId,
          current_stage: 'SCREENING',
          cover_letter: 'Second application',
          answers: {},
          applied_at: new Date('2026-11-12T15:00:00Z').toISOString(),
          updated_at: new Date('2026-11-12T15:00:00Z').toISOString(),
          job_title: 'Backend Tech Lead',
          job_department: 'Engineering',
          job_location: 'Remote',
          job_employment_type: 'Full-time',
          job_status: 'PUBLISHED',
          company_name: 'Tech Corp',
          resume_file_name: 'resume-lead.pdf',
          stage_history: [
            {
              id: 'hist-1',
              fromStage: null,
              toStage: 'APPLIED',
              reason: 'Initial application submission',
              changedAt: '2026-11-12T15:00:01Z',
            },
            {
              id: 'hist-2',
              fromStage: 'APPLIED',
              toStage: 'SCREENING',
              reason: 'Passed resume screen',
              changedAt: '2026-11-12T16:00:00Z',
            },
          ],
        },
        {
          id: 'app-uuid-1',
          job_id: 'job-uuid-old',
          candidate_id: mockDbProfile.id,
          resume_id: null,
          current_stage: 'APPLIED',
          cover_letter: 'First application',
          answers: {},
          applied_at: new Date('2026-11-10T09:00:00Z').toISOString(),
          updated_at: new Date('2026-11-10T09:00:00Z').toISOString(),
          job_title: 'Junior Software Engineer',
          job_department: 'Engineering',
          job_location: 'New York',
          job_employment_type: 'Full-time',
          job_status: 'PUBLISHED',
          company_name: 'Tech Corp',
          resume_file_name: null,
          stage_history: [
            {
              id: 'hist-0',
              fromStage: null,
              toStage: 'APPLIED',
              reason: 'Initial application submission',
              changedAt: '2026-11-10T09:00:01Z',
            },
          ],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockApplicationsList });

      const res = await request(app)
        .get('/api/applications/me')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.applications).toHaveLength(2);
      expect(res.body.applications[0].id).toBe('app-uuid-2');
      expect(res.body.applications[0].jobTitle).toBe('Backend Tech Lead');
      expect(res.body.applications[0].status).toBe('SCREENING');
      expect(res.body.applications[0].stageHistory).toHaveLength(2);
      expect(res.body.applications[1].id).toBe('app-uuid-1');
      expect(res.body.applications[1].jobTitle).toBe('Junior Software Engineer');

      // Verify newest-first ordering assertion
      const date0 = new Date(res.body.applications[0].appliedAt).getTime();
      const date1 = new Date(res.body.applications[1].appliedAt).getTime();
      expect(date0).toBeGreaterThan(date1);

      // Verify parameterized query uses candidate profile id (candidate data isolation)
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('WHERE a.candidate_id = $1'),
        [mockDbProfile.id]
      );
    });

    it('2. Returns an empty array when no applications have been submitted', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // 0 applications

      const res = await request(app)
        .get('/api/applications/me')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.applications).toEqual([]);
      expect(res.body.data).toEqual([]);
    });

    it('3. Rejects unauthenticated request for application history (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/applications/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('4. Rejects non-candidate (HR or ADMIN) request for candidate application history (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminPayload);

      const res = await request(app)
        .get('/api/applications/me')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });
});

