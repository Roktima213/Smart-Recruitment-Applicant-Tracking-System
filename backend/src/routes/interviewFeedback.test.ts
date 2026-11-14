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

describe('Interview Rescheduling & Scorecard Feedback APIs (/api/interviews)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
  });

  const companyAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const companyBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const interviewId = '11111111-1111-4111-8111-111111111111';
  const applicationId = '22222222-2222-4222-8222-222222222222';
  const interviewerId = '33333333-3333-4333-8333-333333333333';

  const hrToken = {
    uid: 'hr-uid-001',
    email: 'hr@companya.com',
    role: 'HR',
    companyId: companyAId,
    isActive: true,
  };

  const interviewerToken = {
    uid: 'interviewer-uid-001',
    email: 'interviewer@companya.com',
    role: 'INTERVIEWER',
    companyId: companyAId,
    isActive: true,
  };

  const candidateToken = {
    uid: 'candidate-uid-001',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
    companyId: null,
    isActive: true,
  };

  describe('PATCH /api/interviews/:id (Reschedule & Cancel)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).patch(`/api/interviews/${interviewId}`).send({
        status: 'CANCELLED',
        reason: 'Candidate request',
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should reject candidate role with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      const res = await request(app)
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({ status: 'CANCELLED', reason: 'Emergency' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('should reject invalid UUID with 400', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const res = await request(app)
        .patch('/api/interviews/invalid-uuid')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({ status: 'CANCELLED', reason: 'Rescheduling requested' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/uuid/i);
    });

    it('should reject when end time is before start time with 400', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const res = await request(app)
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          scheduledStart: '2026-11-20T14:00:00Z',
          scheduledEnd: '2026-11-20T13:00:00Z',
          reason: 'Moved earlier',
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 when interview event does not exist', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ id: 'hr-user-id', company_id: companyAId, role: 'HR', is_active: true }] }) // caller
        .mockResolvedValueOnce({ rows: [] }); // interview query 404

      const res = await request(app)
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', 'Bearer valid-hr-token')
        .send({ status: 'CANCELLED', reason: 'Candidate requested cancellation' });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/not found/i);
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should return 409 Conflict when new time slot has an interviewer overlap', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ id: 'hr-user-id', company_id: companyAId, role: 'HR', is_active: true }] }) // caller
        .mockResolvedValueOnce({
          rows: [
            {
              id: interviewId,
              application_id: applicationId,
              interviewer_id: interviewerId,
              scheduled_start: '2026-11-18T10:00:00Z',
              scheduled_end: '2026-11-18T11:00:00Z',
              status: 'SCHEDULED',
              location_or_link: 'https://meet.google.com/abc',
              job_company_id: companyAId,
            },
          ],
        }) // existing interview
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: interviewId }] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // pg_advisory_xact_lock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'conflicting-interview-id',
              scheduled_start: '2026-11-20T10:00:00Z',
              scheduled_end: '2026-11-20T11:00:00Z',
            },
          ],
        }) // overlap check returns conflict
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          scheduledStart: '2026-11-20T10:30:00Z',
          scheduledEnd: '2026-11-20T11:30:00Z',
          reason: 'Interviewer requested slot change',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INTERVIEW_SCHEDULE_CONFLICT');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should successfully reschedule an interview without conflict', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const updatedRow = {
        id: interviewId,
        application_id: applicationId,
        interviewer_id: interviewerId,
        scheduled_start: '2026-11-22T10:00:00Z',
        scheduled_end: '2026-11-22T11:00:00Z',
        status: 'RESCHEDULED',
        location_or_link: 'https://meet.google.com/new-link',
      };

      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ id: 'hr-user-id', company_id: companyAId, role: 'HR', is_active: true }] }) // caller
        .mockResolvedValueOnce({
          rows: [
            {
              id: interviewId,
              application_id: applicationId,
              interviewer_id: interviewerId,
              scheduled_start: '2026-11-18T10:00:00Z',
              scheduled_end: '2026-11-18T11:00:00Z',
              status: 'SCHEDULED',
              location_or_link: 'https://meet.google.com/abc',
              job_company_id: companyAId,
            },
          ],
        }) // existing interview
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: interviewId }] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // pg_advisory_xact_lock
        .mockResolvedValueOnce({ rows: [] }) // conflict check: empty = no conflict
        .mockResolvedValueOnce({ rows: [updatedRow] }) // UPDATE interview_events
        .mockResolvedValueOnce({ rows: [] }) // INSERT interview_audit_log
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          scheduledStart: '2026-11-22T10:00:00Z',
          scheduledEnd: '2026-11-22T11:00:00Z',
          locationOrLink: 'https://meet.google.com/new-link',
          reason: 'Conflict with prior board meeting',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.interview.status).toBe('RESCHEDULED');
      expect(res.body.interview.scheduledStart).toBe('2026-11-22T10:00:00Z');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should successfully cancel an interview', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      const cancelledRow = {
        id: interviewId,
        application_id: applicationId,
        interviewer_id: interviewerId,
        scheduled_start: '2026-11-18T10:00:00Z',
        scheduled_end: '2026-11-18T11:00:00Z',
        status: 'CANCELLED',
        location_or_link: 'https://meet.google.com/abc',
      };

      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ id: 'hr-user-id', company_id: companyAId, role: 'HR', is_active: true }] }) // caller
        .mockResolvedValueOnce({
          rows: [
            {
              id: interviewId,
              application_id: applicationId,
              interviewer_id: interviewerId,
              scheduled_start: '2026-11-18T10:00:00Z',
              scheduled_end: '2026-11-18T11:00:00Z',
              status: 'SCHEDULED',
              location_or_link: 'https://meet.google.com/abc',
              job_company_id: companyAId,
            },
          ],
        }) // existing interview
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: interviewId }] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [cancelledRow] }) // UPDATE interview_events to CANCELLED
        .mockResolvedValueOnce({ rows: [] }) // INSERT interview_audit_log
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          status: 'CANCELLED',
          reason: 'Position filled internally',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.interview.status).toBe('CANCELLED');
      expect(mockClientRelease).toHaveBeenCalled();
    });
  });

  describe('POST /api/interviews/:id/feedback (Submit Scorecard)', () => {
    const validFeedbackBody = {
      rating: 5,
      recommendation: 'STRONG_HIRE',
      strengths: 'Excellent system architecture and distributed systems mastery.',
      concerns: 'None observed during technical session.',
      confidentialNotes: 'Top 1% candidate for senior staff role.',
    };

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post(`/api/interviews/${interviewId}/feedback`).send(validFeedbackBody);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should strictly reject candidate role with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      const res = await request(app)
        .post(`/api/interviews/${interviewId}/feedback`)
        .set('Authorization', 'Bearer valid-candidate-token')
        .send(validFeedbackBody);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('should reject rating outside 1-5 range with 400', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(interviewerToken);

      const res = await request(app)
        .post(`/api/interviews/${interviewId}/feedback`)
        .set('Authorization', 'Bearer valid-interviewer-token')
        .send({ ...validFeedbackBody, rating: 6 });

      expect(res.status).toBe(400);
    });

    it('should reject invalid recommendation enum with 400', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(interviewerToken);

      const res = await request(app)
        .post(`/api/interviews/${interviewId}/feedback`)
        .set('Authorization', 'Bearer valid-interviewer-token')
        .send({ ...validFeedbackBody, recommendation: 'MAYBE_LATER' });

      expect(res.status).toBe(400);
    });

    it('should submit scorecard successfully and transition interview to COMPLETED', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(interviewerToken);

      const mockScorecard = {
        id: 'scorecard-uuid-001',
        interview_id: interviewId,
        evaluator_id: 'interviewer-user-id',
        rating: 5,
        recommendation: 'STRONG_HIRE',
        strengths: validFeedbackBody.strengths,
        concerns: validFeedbackBody.concerns,
        confidential_notes: validFeedbackBody.confidentialNotes,
        created_at: '2026-11-18T12:00:00Z',
      };

      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ id: 'interviewer-user-id', company_id: companyAId, role: 'INTERVIEWER', is_active: true }] }) // caller
        .mockResolvedValueOnce({
          rows: [
            {
              id: interviewId,
              application_id: applicationId,
              interviewer_id: interviewerId,
              status: 'SCHEDULED',
              job_company_id: companyAId,
            },
          ],
        }) // existing interview
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockScorecard] }) // INSERT interview_scorecards
        .mockResolvedValueOnce({ rows: [] }) // UPDATE interview_events SET status = COMPLETED
        .mockResolvedValueOnce({ rows: [] }) // INSERT interview_audit_log
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post(`/api/interviews/${interviewId}/feedback`)
        .set('Authorization', 'Bearer valid-interviewer-token')
        .send(validFeedbackBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.scorecard.recommendation).toBe('STRONG_HIRE');
      expect(res.body.scorecard.rating).toBe(5);
      expect(mockClientRelease).toHaveBeenCalled();
    });
  });

  describe('GET /api/interviews/:id/feedback (Retrieve Scorecards)', () => {
    it('should strictly return 403 Forbidden for candidate token', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateToken);

      const res = await request(app)
        .get(`/api/interviews/${interviewId}/feedback`)
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('should return scorecards for authorized staff (HR/Interviewer)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrToken);

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'hr-user-id', company_id: companyAId, role: 'HR', is_active: true }] }) // caller
        .mockResolvedValueOnce({ rows: [{ id: interviewId, job_company_id: companyAId }] }) // interview check
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'scorecard-uuid-001',
              interview_id: interviewId,
              evaluator_id: 'interviewer-user-id',
              evaluator_name: 'Jane Doe',
              evaluator_email: 'jane@companya.com',
              rating: 4,
              recommendation: 'HIRE',
              strengths: 'Solid coding and problem solving',
              concerns: 'None',
              confidential_notes: 'Strong addition to team',
              created_at: '2026-11-18T13:00:00Z',
            },
          ],
        }); // scorecards list

      const res = await request(app)
        .get(`/api/interviews/${interviewId}/feedback`)
        .set('Authorization', 'Bearer valid-hr-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scorecards).toHaveLength(1);
      expect(res.body.scorecards[0].recommendation).toBe('HIRE');
      expect(res.body.scorecards[0].evaluatorName).toBe('Jane Doe');
    });
  });
});
