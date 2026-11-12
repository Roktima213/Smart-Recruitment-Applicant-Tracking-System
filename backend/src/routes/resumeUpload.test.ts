const mockVerifyFirebaseIdToken = jest.fn();
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
import { storageService } from '../services/storageService';

describe('Candidate Profile & Defensive Resume Upload Security (/api/candidates)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
  });

  const candidateAuthHeader = 'Bearer valid-candidate-jwt';
  const candidateUser = {
    uid: 'candidate-firebase-uid-001',
    email: 'candidate@test.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const dbUserId = 'u0000000-0000-0000-0000-000000000001';
  const candidateProfileId = 'c0000000-0000-0000-0000-000000000001';

  describe('Authentication & Profile Management', () => {
    it('should reject unauthenticated profile read with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/candidates/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should retrieve candidate profile and resume metadata for authenticated user', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate', email: 'candidate@test.com' }] }); // users check
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: candidateProfileId,
            user_id: dbUserId,
            full_name: 'Test Candidate',
            email: 'candidate@test.com',
            headline: 'Frontend Engineer',
            summary: 'Experienced with React',
            skills: ['React', 'TypeScript'],
            experience_years: 3.5,
          },
        ],
      }); // candidate_profiles lookup
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'r0000000-0000-0000-0000-000000000001',
            file_name: 'Resume.pdf',
            stored_file_name: 'resume-uuid.pdf',
            file_size: 10240,
            mime_type: 'application/pdf',
            sha256_hash: 'abcdef123456',
            created_at: new Date().toISOString(),
          },
        ],
      }); // resume_metadata lookup

      const res = await request(app)
        .get('/api/candidates/me')
        .set('Authorization', candidateAuthHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.headline).toBe('Frontend Engineer');
      expect(res.body.resume.file_name).toBe('Resume.pdf');
    });

    it('should update candidate profile details via PUT /api/candidates/me', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId, full_name: 'Test Candidate', email: 'candidate@test.com' }] }); // users check
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: candidateProfileId,
            user_id: dbUserId,
            headline: 'Staff Full-Stack Engineer',
            summary: 'Specializing in resilient distributed systems',
            skills: ['Node.js', 'PostgreSQL', 'Docker'],
            experience_years: 6,
          },
        ],
      }); // upsert result
      mockQuery.mockResolvedValueOnce({ rows: [{ full_name: 'Test Candidate', email: 'candidate@test.com' }] }); // user name query

      const res = await request(app)
        .put('/api/candidates/me')
        .set('Authorization', candidateAuthHeader)
        .send({
          headline: 'Staff Full-Stack Engineer',
          summary: 'Specializing in resilient distributed systems',
          skills: ['Node.js', 'PostgreSQL', 'Docker'],
          experience_years: 6,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.headline).toBe('Staff Full-Stack Engineer');
    });
  });

  describe('Defensive Resume Upload Security & Magic-Byte Inspection', () => {
    it('should reject upload when no file is attached with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId }] }); // users lookup

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', candidateAuthHeader);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('No resume file uploaded');
    });

    it('SEC-MALICIOUS: should reject Windows executable (.exe with MZ header) renamed to .pdf', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId }] }); // users lookup

      // Spoofed binary starting with 'MZ' (DOS executable signature)
      const fakePdfExecutable = Buffer.concat([
        Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]), // MZ header
        Buffer.from('This program cannot be run in DOS mode.'),
      ]);

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', candidateAuthHeader)
        .attach('resume', fakePdfExecutable, {
          filename: 'trojan_payload.exe.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('File header signature does not match expected PDF or DOCX format');
    });

    it('SEC-MALICIOUS: should reject HTML/XSS script payload disguised with .pdf extension', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId }] }); // users lookup

      const fakePdfHtml = Buffer.from('<!DOCTYPE html><html><script>alert(document.cookie)</script></html>');

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', candidateAuthHeader)
        .attach('resume', fakePdfHtml, {
          filename: 'xss_exploit.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('File header signature does not match expected PDF or DOCX format');
    });

    it('SEC-DOS: should reject oversized resume payload (> 5 MB) with 413 Payload Too Large', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId }] }); // users lookup

      // 5.5 MB payload starting with valid PDF header
      const largePdfPayload = Buffer.alloc(5.5 * 1024 * 1024);
      largePdfPayload.write('%PDF-1.7\n', 0);

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', candidateAuthHeader)
        .attach('resume', largePdfPayload, {
          filename: 'oversized_cv.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(413);
      expect(res.body.error.message).toContain('File size exceeds maximum allowed limit of 5 MB');
    });

    it('should successfully verify and store valid PDF resume (%PDF- magic bytes)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId }] }); // users lookup
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId }] }); // candidate_profiles lookup
      mockQuery.mockResolvedValueOnce({ rows: [] }); // existing resume check (none)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'r0000000-0000-0000-0000-000000000099',
            file_name: 'Authentic_Resume.pdf',
            stored_file_name: 'stored-resume.pdf',
            file_size: 1024,
            mime_type: 'application/pdf',
            sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
            created_at: new Date().toISOString(),
          },
        ],
      }); // insert resume_metadata

      // Spy on storage save to avoid writing orphaned disk files during test run
      jest.spyOn(storageService, 'saveResumeFile').mockResolvedValueOnce({
        storedFileName: 'stored-resume.pdf',
        filePath: '/mock/path/stored-resume.pdf',
        fileSizeBytes: 1024,
        sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        mimeType: 'application/pdf',
      });

      const validPdfPayload = Buffer.from('%PDF-1.7 Authentic Candidate Resume Document Content');

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', candidateAuthHeader)
        .attach('resume', validPdfPayload, {
          filename: 'Authentic_Resume.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Resume uploaded and verified successfully');
      expect(res.body.resume.file_name).toBe('Authentic_Resume.pdf');
    });

    it('should successfully verify and store valid DOCX resume (PK\\x03\\x04 zip magic bytes)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: dbUserId }] }); // users lookup
      mockQuery.mockResolvedValueOnce({ rows: [{ id: candidateProfileId }] }); // candidate_profiles lookup
      mockQuery.mockResolvedValueOnce({ rows: [] }); // existing resume check (none)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'r0000000-0000-0000-0000-000000000100',
            file_name: 'Authentic_CV.docx',
            stored_file_name: 'stored-cv.docx',
            file_size: 2048,
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            sha256_hash: '1122334455667788',
            created_at: new Date().toISOString(),
          },
        ],
      }); // insert resume_metadata

      jest.spyOn(storageService, 'saveResumeFile').mockResolvedValueOnce({
        storedFileName: 'stored-cv.docx',
        filePath: '/mock/path/stored-cv.docx',
        fileSizeBytes: 2048,
        sha256Hash: '1122334455667788',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const validDocxPayload = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK\x03\x04 zip header
        Buffer.from('word/document.xml with Office Open XML Content'),
      ]);

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', candidateAuthHeader)
        .attach('resume', validDocxPayload, {
          filename: 'Authentic_CV.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.resume.file_name).toBe('Authentic_CV.docx');
    });
  });
});
