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
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app';
import { storageConfig, ensureStorageDirectory, getSafeStoragePath } from '../config/storage';

describe('Private Resume Streaming & Ownership Verification (/api/resumes)', () => {
  const resumeId = '11111111-2222-4333-8444-555555555555';
  const otherResumeId = '99999999-8888-4777-8666-555555555555';
  const storedFilename = 'resume-test-sample.pdf';
  let testFilePath: string;

  const candidateA = {
    uid: 'candidate-a-firebase-uid',
    email: 'candidate.a@example.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const candidateB = {
    uid: 'candidate-b-firebase-uid',
    email: 'candidate.b@example.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const hrUser = {
    uid: 'hr-user-firebase-uid',
    email: 'hr@company.com',
    role: 'HR',
    isActive: true,
  };

  const adminUser = {
    uid: 'admin-user-firebase-uid',
    email: 'admin@company.com',
    role: 'ADMIN',
    isActive: true,
  };

  const mockResumeRow = {
    id: resumeId,
    candidate_id: 'c1111111-1111-4111-8111-111111111111',
    file_name: 'John_Doe_CV.pdf',
    stored_file_name: storedFilename,
    file_size: 28,
    mime_type: 'application/pdf',
    sha256_hash: '3f5451a511ff312384a2d815777fe12b0bb7538a74e50302b1f8efcfcffc44f3',
    candidate_user_id: 'u1111111-1111-4111-8111-111111111111',
    candidate_firebase_uid: 'candidate-a-firebase-uid',
  };

  beforeAll(() => {
    ensureStorageDirectory();
    testFilePath = getSafeStoragePath(storedFilename);
    fs.writeFileSync(testFilePath, '%PDF-1.7\nSample resume body');
  });

  afterAll(() => {
    if (fs.existsSync(testFilePath)) {
      try {
        fs.unlinkSync(testFilePath);
      } catch {
        // ignore cleanup error
      }
    }
  });

  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
  });

  describe('GET /api/resumes/:id/download', () => {
    it('1. should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/resumes/${resumeId}/download`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('2. should reject invalid non-UUID identifier with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateA);

      const res = await request(app)
        .get('/api/resumes/invalid-non-uuid-string/download')
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid resume identifier format');
    });

    it('3. should return 404 when resume record is not found in database', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateA);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/resumes/${otherResumeId}/download`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Resume document not found');
    });

    it('4. Anti-IDOR: Candidate B cannot download Candidate A resume (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateB); // Different candidate
      mockQuery.mockResolvedValueOnce({ rows: [mockResumeRow] }); // Belongs to candidate A

      const res = await request(app)
        .get(`/api/resumes/${resumeId}/download`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('5. Owner Access: Candidate A can download their own resume (200 OK + Stream)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateA);
      mockQuery.mockResolvedValueOnce({ rows: [mockResumeRow] });

      const res = await request(app)
        .get(`/api/resumes/${resumeId}/download`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('John_Doe_CV.pdf');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.body.toString()).toContain('%PDF-1.7');
    });

    it('6. Privileged Access: HR can download any candidate resume (200 OK)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrUser);
      mockQuery.mockResolvedValueOnce({ rows: [mockResumeRow] });

      const res = await request(app)
        .get(`/api/resumes/${resumeId}/download`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.toString()).toContain('%PDF-1.7');
    });

    it('7. Privileged Access: ADMIN can download any candidate resume (200 OK)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminUser);
      mockQuery.mockResolvedValueOnce({ rows: [mockResumeRow] });

      const res = await request(app)
        .get(`/api/resumes/${resumeId}/download`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.toString()).toContain('%PDF-1.7');
    });

    it('8. should return 404 when physical file is missing from disk', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateA);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockResumeRow,
            stored_file_name: 'missing-on-disk-file.pdf',
          },
        ],
      });

      const res = await request(app)
        .get(`/api/resumes/${resumeId}/download`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Resume file missing from storage');
    });
  });
});
