const mockVerifyFirebaseIdToken = jest.fn();
const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();

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
  getClient: jest.fn().mockImplementation(() =>
    Promise.resolve({
      query: (...args: any[]) => mockClientQuery(...args),
      release: () => mockClientRelease(),
    })
  ),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

describe('Job Application Submission & Candidate History (/api/applications)', () => {
  const candidateUser = {
    uid: 'candidate-firebase-uid-01',
    email: 'candidate@test.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const otherCandidateUser = {
    uid: 'candidate-firebase-uid-02',
    email: 'other@test.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const hrUser = {
    uid: 'hr-firebase-uid-01',
    email: 'recruiter@test.com',
    role: 'HR',
    isActive: true,
  };

  const dbUserId = '44444444-4444-4444-8444-444444444444';
  const candidateProfileId = '55555555-5555-4555-8555-555555555555';
  const jobId = '11111111-1111-4111-8111-111111111111';
  const resumeId = '22222222-2222-4222-8222-222222222222';
  const applicationId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
  });

  describe('POST /api/applications - Job Application Submission', () => {
    it('1. should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({ jobId });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('2. should reject payload missing valid UUID jobId with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-jwt')
        .send({ jobId: 'invalid-non-uuid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Validation failed');
    });

    it('3. should return 404 when target job requisition does not exist', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      // getCandidateUserAndProfile
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate' }] }); // users
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId, user_id: dbUserId }] }); // candidate_profiles
      // job query: not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-jwt')
        .send({ jobId });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Job requisition not found');
    });

    it('4. should reject application to a non-PUBLISHED (e.g. DRAFT) job with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId, user_id: dbUserId }] });
      // job query: DRAFT status
      mockQuery.mockResolvedValueOnce({ rows: [{ id: jobId, title: 'Draft Role', status: 'DRAFT' }] });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-jwt')
        .send({ jobId });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('PUBLISHED openings');
    });

    it('5. should reject application if candidate has no uploaded resume and none specified', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId, user_id: dbUserId }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: jobId, title: 'Engineer', status: 'PUBLISHED' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // duplicate check: none
      mockQuery.mockResolvedValueOnce({ rows: [] }); // latest resume query: none

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-jwt')
        .send({ jobId });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('verified resume must be uploaded');
    });

    it('6. should reject application using another candidate resume with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId, user_id: dbUserId }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: jobId, title: 'Engineer', status: 'PUBLISHED' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // duplicate check: none
      mockQuery.mockResolvedValueOnce({ rows: [] }); // resume check: not owned by this candidate

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-jwt')
        .send({ jobId, resumeId });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Specified resume does not belong');
    });

    it('7. Duplicate Prevention: should return 409 Conflict if already applied to this job', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId, user_id: dbUserId }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: jobId, title: 'Engineer', status: 'PUBLISHED' }] });
      // duplicate check returns existing application!
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: applicationId, current_stage: 'APPLIED', applied_at: new Date().toISOString() }],
      });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-jwt')
        .send({ jobId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already submitted an application');
    });

    it('8. Atomic Success: should successfully submit application with initial APPLIED stage history', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId, user_id: dbUserId }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: jobId, title: 'Senior Backend Engineer', status: 'PUBLISHED' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // duplicate check: none
      mockQuery.mockResolvedValueOnce({ rows: [{ id: resumeId }] }); // candidate resume verified

      // ACID Transaction Mocking
      mockClientQuery.mockResolvedValueOnce(undefined); // BEGIN
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          {
            id: applicationId,
            job_id: jobId,
            candidate_id: candidateProfileId,
            resume_id: resumeId,
            current_stage: 'APPLIED',
            cover_letter: 'Excited about this opportunity!',
            answers: { remoteReady: true },
            applied_at: new Date().toISOString(),
          },
        ],
      }); // INSERT applications
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'h0000000-0000-0000-0000-000000000001',
            application_id: applicationId,
            from_stage: null,
            to_stage: 'APPLIED',
          },
        ],
      }); // INSERT application_stage_history
      mockClientQuery.mockResolvedValueOnce(undefined); // COMMIT

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer valid-jwt')
        .send({
          jobId,
          resumeId,
          coverLetter: 'Excited about this opportunity!',
          answers: { remoteReady: true },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.application.currentStage).toBe('APPLIED');
      expect(res.body.application.jobId).toBe(jobId);
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/applications/me - Candidate Application History', () => {
    it('9. should retrieve candidate personal application list', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId, user_id: dbUserId }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: applicationId,
            job_id: jobId,
            job_title: 'Staff Platform Engineer',
            job_department: 'Infrastructure',
            job_location: 'Remote',
            job_employment_type: 'Full-time',
            job_status: 'PUBLISHED',
            company_name: 'Velocity Tech',
            resume_id: resumeId,
            resume_file_name: 'Resume.pdf',
            current_stage: 'APPLIED',
            cover_letter: 'Excited about this role!',
            answers: {},
            applied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      const res = await request(app)
        .get('/api/applications/me')
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.applications).toHaveLength(1);
      expect(res.body.applications[0].jobTitle).toBe('Staff Platform Engineer');
      expect(res.body.applications[0].companyName).toBe('Velocity Tech');
      expect(res.body.applications[0].currentStage).toBe('APPLIED');
    });
  });

  describe('GET /api/applications/:id - Detail & Stage Audit Timeline', () => {
    it('10. Anti-IDOR: Candidate B cannot view Candidate A application detail (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(otherCandidateUser); // Candidate B
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: applicationId,
            job_id: jobId,
            candidate_id: candidateProfileId,
            candidate_firebase_uid: candidateUser.uid, // Belongs to Candidate A
          },
        ],
      });

      const res = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('11. Owner Candidate can view their application with complete stage history', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: applicationId,
            job_id: jobId,
            job_title: 'Full Stack Engineer',
            candidate_id: candidateProfileId,
            candidate_firebase_uid: candidateUser.uid,
            candidate_name: 'Test Candidate',
            candidate_email: 'candidate@test.com',
            current_stage: 'APPLIED',
          },
        ],
      });
      // stage history
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'h1',
            from_stage: null,
            to_stage: 'APPLIED',
            changed_by_name: 'System',
            reason: 'Initial application submission',
            changed_at: new Date().toISOString(),
          },
        ],
      });

      const res = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.stageHistory).toHaveLength(1);
      expect(res.body.application.stageHistory[0].toStage).toBe('APPLIED');
    });

    it('12. Privileged Access: HR can view application detail and stage timeline', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: applicationId,
            job_id: jobId,
            job_title: 'Full Stack Engineer',
            candidate_id: candidateProfileId,
            candidate_firebase_uid: candidateUser.uid,
            candidate_name: 'Test Candidate',
            candidate_email: 'candidate@test.com',
            current_stage: 'APPLIED',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
