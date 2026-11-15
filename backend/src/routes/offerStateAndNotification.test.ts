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
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

describe('Offer Generation State & Notification Trigger Tests (Floor 18 - DevOps)', () => {
  const companyAId = '11111111-1111-4111-8111-111111111111';
  const validAppId = '33333333-3333-4333-8333-333333333333';
  const validOfferId = '44444444-4444-4444-8444-444444444444';
  const candidateUserId = '55555555-5555-4555-8555-555555555555';
  const candidateProfileId = '66666666-6666-4666-8666-666666666666';
  const jobId = '77777777-7777-4777-8777-777777777777';
  const hrDbUserId = '88888888-8888-4888-8888-888888888888';

  const HR_USER = {
    uid: 'hr-user-offer-state-test',
    email: 'hr.offer@acme.com',
    role: 'HR',
    companyId: companyAId,
    isActive: true,
  };

  const CANDIDATE_USER = {
    uid: 'candidate-user-offer-state-test',
    email: 'candidate.offer@example.com',
    role: 'CANDIDATE',
    companyId: null,
    isActive: true,
  };

  const OTHER_CANDIDATE_USER = {
    uid: 'other-candidate-user-offer-state-test',
    email: 'other.candidate@example.com',
    role: 'CANDIDATE',
    companyId: null,
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockQuery.mockReset();
  });

  describe('1. Pipeline Stage Gating for Offer Creation (POST /api/offers)', () => {
    it('prohibits creating an offer when application is in APPLIED, SCREENING, or INTERVIEW stage', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: HR_USER.uid,
        email: HR_USER.email,
        role: HR_USER.role,
        companyId: HR_USER.companyId,
        isActive: true,
      });

      mockQuery.mockImplementation(async (sqlText: string) => {
        if (sqlText.includes('FROM users WHERE firebase_uid = $1')) {
          return {
            rows: [
              {
                id: hrDbUserId,
                role: 'HR',
                company_id: companyAId,
                is_active: true,
              },
            ],
          };
        }
        if (sqlText.includes('FROM applications a')) {
          return {
            rows: [
              {
                id: validAppId,
                current_stage: 'INTERVIEW', // Illegal for initial offer creation
                job_id: jobId,
                job_title: 'Senior Distributed Systems Architect',
                job_company_id: companyAId,
                candidate_id: candidateProfileId,
                candidate_name: 'David Kim',
                candidate_email: 'david.kim@example.com',
                company_name: 'Acme Global Corporation',
              },
            ],
          };
        }
        return { rows: [] };
      });

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validAppId,
          salary_amount: 145000,
          currency: 'USD',
          start_date: '2026-12-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toMatch(/cannot create an offer for an application in 'INTERVIEW' stage/i);
      expect(response.body.error.message).toMatch(/SELECTED/);
    });

    it('allows creating an offer when application is in SELECTED stage', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: HR_USER.uid,
        email: HR_USER.email,
        role: HR_USER.role,
        companyId: HR_USER.companyId,
        isActive: true,
      });

      mockQuery.mockImplementation(async (sqlText: string) => {
        if (sqlText.includes('FROM users WHERE firebase_uid = $1')) {
          return {
            rows: [
              {
                id: hrDbUserId,
                role: 'HR',
                company_id: companyAId,
                is_active: true,
              },
            ],
          };
        }
        if (sqlText.includes('FROM applications a')) {
          return {
            rows: [
              {
                id: validAppId,
                current_stage: 'SELECTED', // Legal prerequisite stage!
                job_id: jobId,
                job_title: 'Senior Distributed Systems Architect',
                job_company_id: companyAId,
                candidate_id: candidateProfileId,
                candidate_name: 'David Kim',
                candidate_email: 'david.kim@example.com',
                company_name: 'Acme Global Corporation',
              },
            ],
          };
        }
        if (sqlText.includes('SELECT id FROM offer_records WHERE application_id = $1')) {
          return { rows: [] }; // No existing active offer
        }
        if (sqlText.includes('INSERT INTO offer_records')) {
          return {
            rows: [
              {
                id: validOfferId,
                application_id: validAppId,
                salary_amount: 155000,
                currency: 'USD',
                start_date: '2026-12-01',
                status: 'DRAFT',
                created_at: new Date().toISOString(),
                offer_letter_html: '<html>Mock Offer</html>',
              },
            ],
          };
        }
        return { rows: [] };
      });

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-hr-token')
        .send({
          application_id: validAppId,
          salary_amount: 155000,
          currency: 'USD',
          start_date: '2026-12-01',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('DRAFT');
    });
  });

  describe('2. Atomic State Transition & Notification Dispatch (PATCH /api/offers/:id/issue)', () => {
    it('atomically advances SELECTED stage to OFFERED and enqueues candidate notification event', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: HR_USER.uid,
        email: HR_USER.email,
        role: HR_USER.role,
        companyId: HR_USER.companyId,
        isActive: true,
      });

      // Caller user lookup via pool query
      mockQuery.mockImplementation(async (sqlText: string) => {
        if (sqlText.includes('FROM users WHERE firebase_uid = $1')) {
          return {
            rows: [
              {
                id: hrDbUserId,
                role: 'HR',
                company_id: companyAId,
                is_active: true,
              },
            ],
          };
        }
        return { rows: [] };
      });

      let clientQueries: string[] = [];
      mockClientQuery.mockImplementation(async (sqlText: any) => {
        const text = typeof sqlText === 'string' ? sqlText : sqlText?.text || '';
        clientQueries.push(text);

        if (text.includes('BEGIN') || text.includes('COMMIT')) {
          return { rows: [] };
        }
        if (text.includes('FROM offer_records o') && text.includes('FOR UPDATE')) {
          return {
            rows: [
              {
                id: validOfferId,
                application_id: validAppId,
                salary_amount: '155000.00',
                currency: 'USD',
                start_date: '2026-12-01',
                status: 'DRAFT',
                expires_at: '2026-11-25T23:59:59Z',
                offer_letter_html: '<html>Official Document</html>',
                current_stage: 'SELECTED',
                candidate_id: candidateProfileId,
                job_id: jobId,
                job_title: 'Staff Security Engineer',
                job_company_id: companyAId,
                company_name: 'Acme Cybersecurity Labs',
                candidate_user_id: candidateUserId,
                candidate_email: 'candidate.offer@example.com',
                candidate_name: 'Elena Rostova',
              },
            ],
          };
        }
        if (text.includes('UPDATE offer_records')) {
          return {
            rows: [
              {
                id: validOfferId,
                application_id: validAppId,
                salary_amount: '155000.00',
                currency: 'USD',
                start_date: '2026-12-01',
                offer_letter_html: '<html>Official Document</html>',
                status: 'ISSUED',
                issued_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          };
        }
        if (text.includes('UPDATE applications SET current_stage')) {
          return {
            rows: [{ id: validAppId, current_stage: 'OFFERED' }],
          };
        }
        if (text.includes('INSERT INTO application_stage_history')) {
          return { rows: [{ id: 'hist-1' }] };
        }
        if (text.includes('INSERT INTO notification_events')) {
          return { rows: [{ id: 'notif-1' }] };
        }
        return { rows: [] };
      });

      const response = await request(app)
        .patch(`/api/offers/${validOfferId}/issue`)
        .set('Authorization', 'Bearer valid-hr-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.offer.status).toBe('ISSUED');
      expect(response.body.data.applicationStage).toBe('OFFERED');
      expect(response.body.data.notificationQueued).toBe(true);

      // Verify transaction integrity sequence
      expect(clientQueries.some((q) => q.includes('BEGIN'))).toBe(true);
      expect(clientQueries.some((q) => q.includes('UPDATE offer_records'))).toBe(true);
      expect(clientQueries.some((q) => q.includes('UPDATE applications SET current_stage'))).toBe(true);
      expect(clientQueries.some((q) => q.includes('INSERT INTO application_stage_history'))).toBe(true);
      expect(clientQueries.some((q) => q.includes('INSERT INTO notification_events'))).toBe(true);
      expect(clientQueries.some((q) => q.includes('COMMIT'))).toBe(true);
    });
  });

  describe('3. Candidate Authorization & Multi-Tenant Boundaries (GET /api/offers/:id)', () => {
    it('allows candidate owner to access their own offer snapshot', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: CANDIDATE_USER.uid,
        email: CANDIDATE_USER.email,
        role: CANDIDATE_USER.role,
        isActive: true,
      });

      mockQuery.mockImplementationOnce(async () => {
        return {
          rows: [
            {
              id: validOfferId,
              application_id: validAppId,
              salary_amount: 155000,
              currency: 'USD',
              start_date: '2026-12-01',
              offer_letter_html: '<html>Official Document</html>',
              status: 'ISSUED',
              issued_at: '2026-11-15T00:00:00Z',
              expires_at: '2026-11-25T23:59:59Z',
              created_by: hrDbUserId,
              created_at: '2026-11-15T00:00:00Z',
              updated_at: '2026-11-15T00:00:00Z',
              current_stage: 'OFFERED',
              candidate_id: candidateProfileId,
              job_id: jobId,
              job_title: 'Staff Security Engineer',
              job_company_id: companyAId,
              company_name: 'Acme Cybersecurity Labs',
              candidate_firebase_uid: CANDIDATE_USER.uid, // Owner match!
              candidate_user_id: candidateUserId,
            },
          ],
        };
      });

      const response = await request(app)
        .get(`/api/offers/${validOfferId}`)
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validOfferId);
      expect(response.body.data.offerLetterHtml).toContain('Official Document');
    });

    it('rejects candidate attempting to view another candidate offer with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: OTHER_CANDIDATE_USER.uid, // Different candidate!
        email: OTHER_CANDIDATE_USER.email,
        role: OTHER_CANDIDATE_USER.role,
        isActive: true,
      });

      mockQuery.mockImplementationOnce(async () => {
        return {
          rows: [
            {
              id: validOfferId,
              candidate_firebase_uid: CANDIDATE_USER.uid, // Belongs to Elena, not caller!
              job_company_id: companyAId,
            },
          ],
        };
      });

      const response = await request(app)
        .get(`/api/offers/${validOfferId}`)
        .set('Authorization', 'Bearer valid-other-candidate-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toMatch(/Forbidden: You do not have permission to access this offer/i);
    });
  });
});
