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
import { LOCK_APPLICATION_FOR_UPDATE_SQL } from '../services/stageTransitionDbService';

describe('Recruitment Pipeline State Machine & Row Locking APIs (Floor 12)', () => {
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

  const candidateUser = {
    uid: 'candidate-user-uid-01',
    email: 'candidate@domain.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const appId = '44444444-4444-4444-8444-444444444444';
  const jobId = '22222222-2222-4222-8222-222222222222';
  const dbActorId = '99999999-9999-4999-8999-999999999999';

  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
  });

  describe('1. Authentication & Role-Based Authorization Guard', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .send({ to_stage: 'SCREENING', reason: 'Passed resume screen' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects CANDIDATE role callers with 403 Forbidden (privilege escalation defense)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer candidate-jwt')
        .send({ to_stage: 'SELECTED', reason: 'Self-selected' });

      expect(res.status).toBe(403);
      expect(res.body.message || res.body.error?.message || res.body.error).toMatch(/Forbidden|not permitted/i);
    });
  });

  describe('2. Input & Request Validation', () => {
    it('rejects malformed non-UUID application IDs with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);

      const res = await request(app)
        .patch('/api/applications/invalid-uuid-format/stage')
        .set('Authorization', 'Bearer hr-jwt')
        .send({ to_stage: 'SCREENING', reason: 'Moving forward' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/invalid application uuid/i);
    });

    it('rejects request with missing target stage with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer hr-jwt')
        .send({ reason: 'Valid reason without stage' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/target stage is required/i);
    });

    it('rejects request with empty or too-short transition reason with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer hr-jwt')
        .send({ to_stage: 'SCREENING', reason: 'ok' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/at least 3 characters/i);
    });
  });

  describe('3. Illegal Stage Transitions & Terminal Stage Defense', () => {
    it('RULE-01: Prohibits stage skipping from APPLIED directly to OFFERED (400 Bad Request)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      // Fetch actor DB user
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: dbActorId, role: 'HR', is_active: true, company_id: 'comp-1' }],
      });

      // Row-level lock returns current stage APPLIED
      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: appId,
              job_id: jobId,
              candidate_id: 'cand-1',
              current_stage: 'APPLIED',
              updated_at: '2026-11-13T08:00:00Z',
              company_id: 'comp-1',
              job_title: 'Full Stack Engineer',
            },
          ],
        }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer hr-jwt')
        .send({ to_stage: 'OFFERED', reason: 'Skip to offer' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/illegal stage transition/i);
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    });

    it('RULE-02: Prohibits transitioning out of terminal REJECTED stage (400 Bad Request)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: dbActorId, role: 'HR', is_active: true, company_id: 'comp-1' }],
      });

      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: appId,
              job_id: jobId,
              candidate_id: 'cand-1',
              current_stage: 'REJECTED',
              updated_at: '2026-11-13T08:00:00Z',
              company_id: 'comp-1',
              job_title: 'Full Stack Engineer',
            },
          ],
        }) // FOR UPDATE returns REJECTED
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer hr-jwt')
        .send({ to_stage: 'INTERVIEW', reason: 'Reopening rejected application' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/terminal 'REJECTED' stage/i);
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    });

    it('RULE-03: Prohibits redundant same-stage transition (APPLIED -> APPLIED)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: dbActorId, role: 'HR', is_active: true, company_id: 'comp-1' }],
      });

      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: appId,
              job_id: jobId,
              candidate_id: 'cand-1',
              current_stage: 'APPLIED',
              updated_at: '2026-11-13T08:00:00Z',
              company_id: 'comp-1',
              job_title: 'Full Stack Engineer',
            },
          ],
        }) // FOR UPDATE returns APPLIED
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer hr-jwt')
        .send({ to_stage: 'APPLIED', reason: 'Re-applying stage' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/already in stage 'APPLIED'/i);
    });
  });

  describe('4. Successful Atomic Transitions & Audit Trail Insertion', () => {
    it('EXEC-01: Successfully advances APPLIED -> SCREENING inside row-locked transaction', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: dbActorId, role: 'HR', is_active: true, company_id: 'comp-1' }],
      });

      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: appId,
              job_id: jobId,
              candidate_id: 'cand-1',
              current_stage: 'APPLIED',
              updated_at: '2026-11-13T08:00:00Z',
              company_id: 'comp-1',
              job_title: 'Full Stack Engineer',
            },
          ],
        }) // FOR UPDATE query
        .mockResolvedValueOnce({
          rows: [
            {
              id: appId,
              job_id: jobId,
              candidate_id: 'cand-1',
              current_stage: 'SCREENING',
              updated_at: '2026-11-13T09:00:00Z',
            },
          ],
        }) // UPDATE applications
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'history-uuid-1',
              application_id: appId,
              from_stage: 'APPLIED',
              to_stage: 'SCREENING',
              changed_by: dbActorId,
              reason: 'Excellent resume portfolio score',
              changed_at: '2026-11-13T09:00:00Z',
            },
          ],
        }) // INSERT history
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer hr-jwt')
        .send({
          to_stage: 'SCREENING',
          reason: 'Excellent resume portfolio score',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.current_stage).toBe('SCREENING');
      expect(res.body.data.history.from_stage).toBe('APPLIED');
      expect(res.body.data.history.to_stage).toBe('SCREENING');
      expect(res.body.data.history.changed_by).toBe(dbActorId);
      expect(res.body.data.history.reason).toBe('Excellent resume portfolio score');

      // Verify row-locking and transaction sequence
      expect(mockClientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClientQuery).toHaveBeenNthCalledWith(2, LOCK_APPLICATION_FOR_UPDATE_SQL, [appId]);
      expect(mockClientQuery).toHaveBeenNthCalledWith(5, 'COMMIT');
    });

    it('EXEC-02: Successfully transitions INTERVIEW -> REJECTED with rejection reason', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminUser);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: dbActorId, role: 'ADMIN', is_active: true, company_id: 'comp-1' }],
      });

      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: appId,
              job_id: jobId,
              candidate_id: 'cand-1',
              current_stage: 'INTERVIEW',
              updated_at: '2026-11-13T08:00:00Z',
              company_id: 'comp-1',
              job_title: 'Full Stack Engineer',
            },
          ],
        }) // FOR UPDATE query
        .mockResolvedValueOnce({
          rows: [
            {
              id: appId,
              job_id: jobId,
              candidate_id: 'cand-1',
              current_stage: 'REJECTED',
              updated_at: '2026-11-13T10:00:00Z',
            },
          ],
        }) // UPDATE applications
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'history-uuid-2',
              application_id: appId,
              from_stage: 'INTERVIEW',
              to_stage: 'REJECTED',
              changed_by: dbActorId,
              reason: 'Did not meet requirements for senior system design loop',
              changed_at: '2026-11-13T10:00:00Z',
            },
          ],
        }) // INSERT history
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer admin-jwt')
        .send({
          to_stage: 'REJECTED',
          reason: 'Did not meet requirements for senior system design loop',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.current_stage).toBe('REJECTED');
      expect(res.body.data.history.to_stage).toBe('REJECTED');
    });

    it('EXEC-03: Returns 404 Not Found when requested application ID does not exist', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: dbActorId, role: 'HR', is_active: true, company_id: 'comp-1' }],
      });

      mockClientQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // FOR UPDATE returns 0 rows
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .patch(`/api/applications/${appId}/stage`)
        .set('Authorization', 'Bearer hr-jwt')
        .send({
          to_stage: 'SCREENING',
          reason: 'Advancing candidate',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/not found/i);
    });
  });
});
