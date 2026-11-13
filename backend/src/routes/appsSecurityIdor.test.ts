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
import fs from 'fs';
import path from 'path';
import app from '../app';
import { ensureStorageDirectory, getSafeStoragePath } from '../config/storage';

describe('Security & IDOR Auditing: Resume Streaming & Job Applications (Floor 11)', () => {
  const candidateA = {
    uid: 'victim-candidate-uid-01',
    email: 'alice@domain.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const candidateB = {
    uid: 'attacker-candidate-uid-02',
    email: 'bob.attacker@domain.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const hrUser = {
    uid: 'hr-recruiter-uid-01',
    email: 'recruiter@company.com',
    role: 'HR',
    isActive: true,
  };

  const resumeAliceId = '11111111-aaaa-4111-8111-111111111111';
  const storedAliceFilename = 'alice-resume-secure.pdf';
  const jobId = '22222222-bbbb-4222-8222-222222222222';
  const appAliceId = '33333333-cccc-4333-8333-333333333333';
  let testFilePath: string;

  beforeAll(() => {
    ensureStorageDirectory();
    testFilePath = getSafeStoragePath(storedAliceFilename);
    fs.writeFileSync(testFilePath, '%PDF-1.7\nAlice Confidential Resume');
  });

  afterAll(() => {
    if (fs.existsSync(testFilePath)) {
      try {
        fs.unlinkSync(testFilePath);
      } catch {
        // ignore
      }
    }
  });

  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
  });

  describe('IDOR Protection on Resume Streaming (GET /api/resumes/:id/download)', () => {
    it('SEC-IDOR-01: Attacker Candidate B cannot access Victim Candidate A resume (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateB); // Attacker
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: resumeAliceId,
            candidate_id: 'c-alice',
            file_name: 'Alice_Resume.pdf',
            stored_file_name: storedAliceFilename,
            file_size: 32,
            mime_type: 'application/pdf',
            sha256_hash: 'abc123hash',
            candidate_user_id: 'u-alice',
            candidate_firebase_uid: candidateA.uid, // Alice is owner
          },
        ],
      });

      const res = await request(app)
        .get(`/api/resumes/${resumeAliceId}/download`)
        .set('Authorization', 'Bearer attacker-jwt');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('SEC-PATH-01: Rejects path traversal attempts in resume ID with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateB);

      const res = await request(app)
        .get('/api/resumes/..%2F..%2Fetc%2Fpasswd/download')
        .set('Authorization', 'Bearer attacker-jwt');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid resume identifier format');
    });

    it('SEC-AUTH-01: Authorized Candidate A can download their own resume with verified ETag', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateA);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: resumeAliceId,
            candidate_id: 'c-alice',
            file_name: 'Alice_Resume.pdf',
            stored_file_name: storedAliceFilename,
            file_size: 32,
            mime_type: 'application/pdf',
            sha256_hash: 'abc123hash',
            candidate_user_id: 'u-alice',
            candidate_firebase_uid: candidateA.uid,
          },
        ],
      });

      const res = await request(app)
        .get(`/api/resumes/${resumeAliceId}/download`)
        .set('Authorization', 'Bearer alice-jwt');

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('Alice_Resume.pdf');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.body.toString()).toContain('Alice Confidential Resume');
    });
  });

  describe('IDOR & Conflict Protection on Job Applications (POST & GET /api/applications)', () => {
    it('SEC-IDOR-02: Attacker cannot submit an application attaching another candidate resume', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateB); // Attacker
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u-bob', full_name: 'Bob Attacker' }] }); // users lookup
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'c-bob', user_id: 'u-bob' }] }); // candidate_profiles lookup
      mockQuery.mockResolvedValueOnce({ rows: [{ id: jobId, title: 'Lead Architect', status: 'PUBLISHED' }] }); // job lookup
      mockQuery.mockResolvedValueOnce({ rows: [] }); // duplicate check: none
      // Resume check: Bob tries to use Alice's resumeId -> DB returns no matching rows for Bob's profile
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer attacker-jwt')
        .send({
          jobId,
          resumeId: resumeAliceId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Specified resume does not belong');
    });

    it('SEC-DUP-01: Re-submitting an application for the same job returns 409 Conflict', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateA);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u-alice', full_name: 'Alice Candidate' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'c-alice', user_id: 'u-alice' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: jobId, title: 'Lead Architect', status: 'PUBLISHED' }] });
      // Duplicate application found
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: appAliceId, current_stage: 'APPLIED', applied_at: new Date().toISOString() }],
      });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', 'Bearer alice-jwt')
        .send({ jobId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already submitted an application');
    });

    it('SEC-IDOR-03: Attacker Candidate B cannot access Alice application details or audit log', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateB); // Attacker
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: appAliceId,
            job_id: jobId,
            candidate_id: 'c-alice',
            candidate_firebase_uid: candidateA.uid, // Alice is owner
          },
        ],
      });

      const res = await request(app)
        .get(`/api/applications/${appAliceId}`)
        .set('Authorization', 'Bearer attacker-jwt');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });
  });
});
