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

describe('Interview Scheduling & Conflict Check APIs (/api/interviews)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
  });

  const companyAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const companyBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  const hrToken = {
    uid: 'hr-uid-001',
    email: 'hr@companya.com',
    role: 'HR',
    companyId: companyAId,
    isActive: true,
  };

  const recruiterToken = {
    uid: 'recruiter-uid-001',
    email: 'recruiter@companya.com',
    role: 'RECRUITER',
    companyId: companyAId,
    isActive: true,
  };

  const adminToken = {
    uid: 'admin-uid-001',
    email: 'admin@companya.com',
    role: 'ADMIN',
    companyId: companyAId,
    isActive: true,
  };

  const superAdminToken = {
    uid: 'superadmin-uid-001',
    email: 'superadmin@ats.local',
    role: 'SUPER_ADMIN',
    companyId: null,
    isActive: true,
  };

  const candidateToken = {
    uid: 'candidate-uid-001',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
    companyId: null,
    isActive: true,
  };

  const mockHrDbUser = {
    id: '11111111-1111-4111-8111-111111111111',
    firebase_uid: 'hr-uid-001',
    email: 'hr@companya.com',
    role: 'HR',
    company_id: companyAId,
    is_active: true,
  };

  const mockInterviewerDbUser = {
    id: '22222222-2222-4222-8222-222222222222',
    full_name: 'Lead Interviewer',
    email: 'interviewer@companya.com',
    role: 'HR',
    company_id: companyAId,
    is_active: true,
  };

  const mockForeignInterviewerDbUser = {
    id: '33333333-3333-4333-8333-333333333333',
    full_name: 'Foreign Interviewer',
    email: 'foreign@companyb.com',
    role: 'HR',
    company_id: companyBId,
    is_active: true,
  };

  const validApplicationId = '44444444-4444-4444-8444-444444444444';
  const mockApplicationCompanyA = {
    id: validApplicationId,
    current_stage: 'APPLIED',
    candidate_id: '55555555-5555-4555-8555-555555555555',
    job_id: '66666666-6666-4666-8666-666666666666',
    job_title: 'Senior Software Engineer',
    company_id: companyAId,
    company_name: 'Company A Corp',
  };

  const mockApplicationCompanyB = {
    id: '77777777-7777-4777-8777-777777777777',
    current_stage: 'APPLIED',
    candidate_id: '88888888-8888-4888-8888-888888888888',
    job_id: '99999999-9999-4999-8999-999999999999',
    job_title: 'Product Manager',
    company_id: companyBId,
    company_name: 'Company B Corp',
  };

  const scheduledStart = '2026-11-20T10:00:00.000Z';
  const scheduledEnd = '2026-11-20T11:00:00.000Z';

  const mockCreatedInterview = {
    id: 'aaaa1111-2222-4333-8444-555566667777',
    application_id: validApplicationId,
    interviewer_id: mockInterviewerDbUser.id,
    title: 'Technical Round 1',
    description: 'System design and coding',
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    location_or_link: 'https://meet.google.com/abc-defg-hij',
    status: 'SCHEDULED',
    reschedule_count: 0,
    created_by: mockHrDbUser.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // ============================================================================
  // 1. POST /api/interviews - Interview Scheduling & Conflict Detection
  // ============================================================================
  describe('POST /api/interviews - Interview Creation & Scheduling', () => {
    it('1. Successfully schedules an interview, acquires advisory lock, verifies no conflict, inserts event, and transitions stage to INTERVIEW', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      // Caller DB lookup
      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      // Application lookup
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      // Interviewer lookup
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });

      // Transaction queries:
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // pg_advisory_xact_lock
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // conflict check returns 0 overlapping rows
      mockClientQuery.mockResolvedValueOnce({ rows: [mockCreatedInterview] }); // INSERT interview_events
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE applications current_stage = INTERVIEW
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // INSERT application_stage_history
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Technical Round 1',
          description: 'System design and coding',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          location_or_link: 'https://meet.google.com/abc-defg-hij',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.interview.id).toBe(mockCreatedInterview.id);
      expect(res.body.interview.status).toBe('SCHEDULED');
      expect(res.body.data.stageUpdated).toBe(true);

      // Verify transaction sequence
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1));',
        [`interviewer_${mockInterviewerDbUser.id}`]
      );
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });

    it('2. Does not insert duplicate stage history when application is already in INTERVIEW stage', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const appAlreadyInInterview = { ...mockApplicationCompanyA, current_stage: 'INTERVIEW' };
      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [appAlreadyInInterview] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });

      // Transaction
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // lock
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // no conflict
      mockClientQuery.mockResolvedValueOnce({ rows: [mockCreatedInterview] }); // INSERT interview
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT (no stage update)

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Technical Round 2',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.stageUpdated).toBe(false);
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
    });

    it('3. Rejects overlapping interview slot for same interviewer with HTTP 409 Conflict and rolls back', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });

      // Overlapping interview returned by conflict query
      const existingOverlap = {
        id: 'existing-overlap-uuid',
        title: 'Existing Conflicting Interview',
        scheduled_start: '2026-11-20T10:30:00.000Z',
        scheduled_end: '2026-11-20T11:30:00.000Z',
        status: 'SCHEDULED',
      };

      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // advisory lock
      mockClientQuery.mockResolvedValueOnce({ rows: [existingOverlap] }); // OVERLAP FOUND!
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Technical Round 1',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/overlapping interview/i);
      expect(res.body.error.conflict.id).toBe('existing-overlap-uuid');

      // Verify rollback occurred and client released
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });

    it('4. Accepts adjacent non-overlapping slots (ends_at == next.starts_at) without conflict', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });

      // When checking (existing start < requested end AND existing end > requested start),
      // an interview ending exactly at 10:00 does not satisfy existing end > 10:00.
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // lock
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // no conflict (adjacent is allowed)
      mockClientQuery.mockResolvedValueOnce({ rows: [mockCreatedInterview] }); // INSERT interview
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE stage
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // INSERT history
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Back to Back Technical Round',
          scheduled_start: '2026-11-20T11:00:00.000Z',
          scheduled_end: '2026-11-20T12:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('5. Ignores CANCELLED interviews during conflict check', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });

      // The conflict query filters WHERE status != 'CANCELLED'. Mock returns 0 rows.
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // lock
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // 0 rows because cancelled slot is vacant
      mockClientQuery.mockResolvedValueOnce({ rows: [mockCreatedInterview] }); // INSERT
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE stage
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // INSERT history
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Booking Over Cancelled Slot',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('6. Rejects inverted start and end times (scheduled_end <= scheduled_start) with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Inverted Times Round',
          scheduled_start: '2026-11-20T12:00:00.000Z',
          scheduled_end: '2026-11-20T10:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(mockClientQuery).not.toHaveBeenCalled();
    });

    it('7. Rejects missing or invalid date strings with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Invalid Date Round',
          scheduled_start: 'not-a-valid-date',
          scheduled_end: 'also-not-a-date',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('8. Rejects candidate role from scheduling an interview (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer candidate-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Candidate Self Schedule',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it('9. Rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/interviews')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Unauthenticated Request',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('10. Multi-tenant security: Rejects HR from scheduling an interview for an application belonging to another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      // Application belongs to Company B, whereas HR belongs to Company A
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyB] });

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: mockApplicationCompanyB.id,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Cross Tenant Attempt',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/does not belong to your organization/i);
      expect(mockClientQuery).not.toHaveBeenCalled();
    });

    it('11. Multi-tenant security: Rejects assigning an interviewer belonging to another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      // Assigned interviewer belongs to Company B
      mockQuery.mockResolvedValueOnce({ rows: [mockForeignInterviewerDbUser] });

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockForeignInterviewerDbUser.id,
          title: 'Cross Tenant Interviewer Attempt',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/does not belong to the target application organization/i);
      expect(mockClientQuery).not.toHaveBeenCalled();
    });

    it('12. Allows SUPER_ADMIN to schedule cross-company provided interviewer belongs to target application company', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(superAdminToken);

      const mockSuperAdminDbUser = {
        id: 'super-admin-db-uuid',
        firebase_uid: 'superadmin-uid-001',
        email: 'superadmin@ats.local',
        role: 'SUPER_ADMIN',
        company_id: null,
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockSuperAdminDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyB] });
      mockQuery.mockResolvedValueOnce({ rows: [mockForeignInterviewerDbUser] }); // Interviewer matches Company B

      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // lock
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // no conflict
      mockClientQuery.mockResolvedValueOnce({ rows: [mockCreatedInterview] }); // INSERT
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // stage update
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // stage history
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer super-admin-token')
        .send({
          application_id: mockApplicationCompanyB.id,
          interviewer_id: mockForeignInterviewerDbUser.id,
          title: 'Super Admin Scheduled',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('13. Rejects scheduling an interview for an application in REJECTED stage (400 Bad Request)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const rejectedApp = { ...mockApplicationCompanyA, current_stage: 'REJECTED' };
      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [rejectedApp] });

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Interview After Rejection',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/cannot schedule an interview for an application in REJECTED stage/i);
    });

    it('14. Rolls back entire transaction when interview insertion fails', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });

      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // lock
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // conflict check ok
      mockClientQuery.mockRejectedValueOnce(new Error('Database disk write failure')); // INSERT fails
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Failing Insert Round',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(500);
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });

    it('15. Rolls back entire transaction when stage history insertion fails', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });

      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // lock
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // conflict check ok
      mockClientQuery.mockResolvedValueOnce({ rows: [mockCreatedInterview] }); // INSERT interview
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE stage
      mockClientQuery.mockRejectedValueOnce(new Error('Stage history audit insert failure')); // History insert fails
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          title: 'Failing History Round',
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        });

      expect(res.status).toBe(500);
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalledTimes(1);
    });

    it('16. Safely handles concurrent duplicate scheduling attempts via advisory lock and overlap check', async () => {
      // Setup first call: succeeds
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // lock
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ok
      mockClientQuery.mockResolvedValueOnce({ rows: [mockCreatedInterview] });
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // stage
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // history
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Setup second concurrent call: finds overlap because lock serialized them
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);
      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockApplicationCompanyA] });
      mockQuery.mockResolvedValueOnce({ rows: [mockInterviewerDbUser] });
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // lock
      mockClientQuery.mockResolvedValueOnce({ rows: [mockCreatedInterview] }); // CONFLICT!
      mockClientQuery.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/interviews')
          .set('Authorization', 'Bearer token-1')
          .send({
            application_id: validApplicationId,
            interviewer_id: mockInterviewerDbUser.id,
            title: 'Round Parallel 1',
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
          }),
        request(app)
          .post('/api/interviews')
          .set('Authorization', 'Bearer token-2')
          .send({
            application_id: validApplicationId,
            interviewer_id: mockInterviewerDbUser.id,
            title: 'Round Parallel 2',
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
          }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);
    });
  });

  // ============================================================================
  // 2. GET /api/interviews - Interview Listing & Isolation
  // ============================================================================
  describe('GET /api/interviews - Interview Retrieval & Scoping', () => {
    const mockDbInterviewList = [
      {
        id: 'interview-1',
        application_id: validApplicationId,
        interviewer_id: mockInterviewerDbUser.id,
        title: 'Technical Round 1',
        description: 'System design',
        scheduled_start: '2026-11-20T10:00:00Z',
        scheduled_end: '2026-11-20T11:00:00Z',
        location_or_link: 'https://meet.google.com/test',
        status: 'SCHEDULED',
        reschedule_count: 0,
        created_by: mockHrDbUser.id,
        created_at: '2026-11-13T10:00:00Z',
        updated_at: '2026-11-13T10:00:00Z',
        interviewer_name: 'Lead Interviewer',
        interviewer_email: 'interviewer@companya.com',
        application_stage: 'INTERVIEW',
        candidate_id: 'candidate-profile-uuid',
        candidate_name: 'Jane Candidate',
        candidate_email: 'jane@example.com',
        job_id: 'job-uuid-1',
        job_title: 'Senior Software Engineer',
        job_department: 'Engineering',
        job_location: 'Remote',
        company_id: companyAId,
        company_name: 'Company A Corp',
      },
    ];

    it('1. HR retrieves interviews strictly scoped to their assigned company', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: mockDbInterviewList });

      const res = await request(app)
        .get('/api/interviews')
        .set('Authorization', 'Bearer hr-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.interviews).toHaveLength(1);
      expect(res.body.interviews[0].title).toBe('Technical Round 1');
      expect(res.body.interviews[0].companyName).toBeUndefined(); // nested in job
      expect(res.body.interviews[0].job.companyName).toBe('Company A Corp');

      // Verify tenant filter was applied
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('j.company_id = $1'),
        expect.arrayContaining([companyAId])
      );
    });

    it('2. Candidate retrieves only interviews associated with their own candidate profile', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      const mockCandidateDbUser = {
        id: 'candidate-user-uuid',
        firebase_uid: 'candidate-uid-001',
        email: 'candidate@example.com',
        role: 'CANDIDATE',
        company_id: null,
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCandidateDbUser] });
      // Candidate profile lookup
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'candidate-profile-uuid' }] });
      mockQuery.mockResolvedValueOnce({ rows: mockDbInterviewList });

      const res = await request(app)
        .get('/api/interviews')
        .set('Authorization', 'Bearer candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.interviews).toHaveLength(1);

      // Verify candidate isolation filter
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('a.candidate_id = $1'),
        ['candidate-profile-uuid']
      );
    });

    it('3. Candidate with no profile returns empty array without error', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      const mockCandidateDbUser = {
        id: 'candidate-user-uuid',
        firebase_uid: 'candidate-uid-001',
        email: 'candidate@example.com',
        role: 'CANDIDATE',
        company_id: null,
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCandidateDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No profile found

      const res = await request(app)
        .get('/api/interviews')
        .set('Authorization', 'Bearer candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.interviews).toEqual([]);
    });

    it('4. Supports filtering by status, application_id, interviewer_id, and date range', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery.mockResolvedValueOnce({ rows: [mockHrDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: mockDbInterviewList });

      const res = await request(app)
        .get('/api/interviews')
        .query({
          status: 'SCHEDULED',
          application_id: validApplicationId,
          interviewer_id: mockInterviewerDbUser.id,
          from: '2026-11-01T00:00:00Z',
          to: '2026-11-30T23:59:59Z',
        })
        .set('Authorization', 'Bearer hr-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('i.status = $'),
        expect.arrayContaining(['SCHEDULED', validApplicationId, mockInterviewerDbUser.id])
      );
    });

    it('5. Rejects unauthenticated request for interviews with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/interviews');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });
});
