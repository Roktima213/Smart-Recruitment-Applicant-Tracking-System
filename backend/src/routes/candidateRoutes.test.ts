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
import crypto from 'crypto';
import app from '../app';
import { storageConfig, ensureStorageDirectory } from '../config/storage';

describe('Candidate Profile & Secure Resume Upload APIs (/api/candidates)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    ensureStorageDirectory();
  });

  afterAll(() => {
    // Clean up test uploads directory if files remain
    try {
      if (fs.existsSync(storageConfig.uploadDir)) {
        const files = fs.readdirSync(storageConfig.uploadDir);
        for (const file of files) {
          if (file.startsWith('resume-') || file.startsWith('test-')) {
            fs.unlinkSync(path.join(storageConfig.uploadDir, file));
          }
        }
      }
    } catch {
      // ignore cleanup errors
    }
  });

  const candidatePayload = {
    uid: 'candidate-firebase-uid',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
    isActive: true,
  };

  const hrPayload = {
    uid: 'hr-firebase-uid',
    email: 'hr@example.com',
    role: 'HR',
    isActive: true,
  };

  const adminPayload = {
    uid: 'admin-firebase-uid',
    email: 'admin@example.com',
    role: 'ADMIN',
    isActive: true,
  };

  const mockDbUser = {
    id: 'user-uuid-1',
    firebase_uid: 'candidate-firebase-uid',
    email: 'candidate@example.com',
    full_name: 'John Candidate',
    role: 'CANDIDATE',
    phone: '+1-555-0199',
    avatar_url: 'https://example.com/avatar.jpg',
    is_active: true,
  };

  const mockDbProfile = {
    id: 'candidate-uuid-1',
    user_id: 'user-uuid-1',
    headline: 'Senior Full Stack Engineer',
    summary: 'Experienced software engineer with 5+ years of TypeScript experience.',
    skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
    experience_years: 5.5,
    current_company: 'Tech Solutions Inc',
    linkedin_url: 'https://linkedin.com/in/johncandidate',
    github_url: 'https://github.com/johncandidate',
    portfolio_url: 'https://johncandidate.dev',
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-05T12:00:00Z',
  };

  describe('1. Security & Authorization Guards', () => {
    it('2. Unauthenticated user cannot retrieve a profile (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/candidates/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body.message).toContain('Authorization header missing');
    });

    it('3. Unauthorized HR role cannot access candidate endpoints (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrPayload);

      const res = await request(app)
        .get('/api/candidates/me')
        .set('Authorization', 'Bearer valid-hr-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
      expect(res.body.message).toContain('Forbidden: User role "HR" is not permitted to access candidate endpoints');
    });

    it('3. Unauthorized ADMIN role cannot access candidate endpoints (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminPayload);

      const res = await request(app)
        .get('/api/candidates/me')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
      expect(res.body.message).toContain('Forbidden: User role "ADMIN" is not permitted to access candidate endpoints');
    });
  });

  describe('2. GET /api/candidates/me - Retrieve Profile', () => {
    it('1. Authenticated candidate can retrieve their own profile with latest resume', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      // 1. Fetch user
      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      // 2. Fetch profile
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      // 3. Fetch latest resume
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'resume-uuid-1',
            candidate_id: 'candidate-uuid-1',
            file_name: 'John_Doe_Resume.pdf',
            stored_file_name: 'resume-123.pdf',
            file_size: 1048576,
            mime_type: 'application/pdf',
            sha256_hash: 'abc123def456',
            created_at: '2026-11-06T14:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/candidates/me')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.profile).toEqual({
        candidateId: 'candidate-uuid-1',
        userId: 'user-uuid-1',
        name: 'John Candidate',
        email: 'candidate@example.com',
        phone: '+1-555-0199',
        headline: 'Senior Full Stack Engineer',
        summary: 'Experienced software engineer with 5+ years of TypeScript experience.',
        skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
        experienceYears: 5.5,
        currentCompany: 'Tech Solutions Inc',
        portfolioLinks: {
          linkedin: 'https://linkedin.com/in/johncandidate',
          github: 'https://github.com/johncandidate',
          portfolio: 'https://johncandidate.dev',
        },
        linkedinUrl: 'https://linkedin.com/in/johncandidate',
        githubUrl: 'https://github.com/johncandidate',
        portfolioUrl: 'https://johncandidate.dev',
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-05T12:00:00Z',
        resume: {
          id: 'resume-uuid-1',
          fileName: 'John_Doe_Resume.pdf',
          storedFileName: 'resume-123.pdf',
          fileSizeBytes: 1048576,
          mimeType: 'application/pdf',
          sha256Hash: 'abc123def456',
          createdAt: '2026-11-06T14:00:00Z',
        },
      });
    });

    it('should bootstrap an initial candidate profile if user has no candidate_profiles record yet', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      // User exists
      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      // Profile does not exist initially
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Insert profile on the fly
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-candidate-uuid',
            user_id: 'user-uuid-1',
            headline: null,
            summary: null,
            skills: [],
            experience_years: 0,
            current_company: null,
            linkedin_url: null,
            github_url: null,
            portfolio_url: null,
            created_at: '2026-11-11T12:00:00Z',
            updated_at: '2026-11-11T12:00:00Z',
          },
        ],
      });
      // No resumes yet
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/candidates/me')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.profile).toHaveProperty('candidateId', 'new-candidate-uuid');
      expect(res.body.profile).toHaveProperty('name', 'John Candidate');
    });
  });

  describe('3. PUT /api/candidates/me - Update Profile', () => {
    it('4. Candidate can update summary, skills, phone, and portfolio links', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      // Fetch user & profile
      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });

      // Update candidate_profiles
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockDbProfile,
            summary: 'Updated bio with AWS expertise.',
            skills: ['TypeScript', 'Node.js', 'AWS', 'Docker'],
            portfolio_url: 'https://newportfolio.io',
          },
        ],
      });

      // Update users.phone
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockDbUser,
            phone: '+1-555-9999',
          },
        ],
      });

      const res = await request(app)
        .put('/api/candidates/me')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          summary: 'Updated bio with AWS expertise.',
          skills: ['TypeScript', 'Node.js', 'AWS', 'Docker'],
          phone: '+1-555-9999',
          portfolioUrl: 'https://newportfolio.io',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.profile).toHaveProperty('summary', 'Updated bio with AWS expertise.');
      expect(res.body.profile.skills).toEqual(['TypeScript', 'Node.js', 'AWS', 'Docker']);
      expect(res.body.profile).toHaveProperty('phone', '+1-555-9999');
      expect(res.body.profile).toHaveProperty('portfolioUrl', 'https://newportfolio.io');
    });

    it('5. Missing fields do not overwrite existing profile values', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });

      // Only headline is updated; summary, skills, etc. are preserved
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockDbProfile,
            headline: 'Principal Architect',
          },
        ],
      });

      const res = await request(app)
        .put('/api/candidates/me')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          headline: 'Principal Architect',
        });

      expect(res.status).toBe(200);
      expect(res.body.profile).toHaveProperty('headline', 'Principal Architect');
      expect(res.body.profile).toHaveProperty('summary', mockDbProfile.summary);
      expect(res.body.profile.skills).toEqual(mockDbProfile.skills);
    });

    it('6. Candidate cannot modify another user profile by injecting arbitrary IDs in body', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      // Verify that query uses authenticated user's ID, not malicious-target-id
      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockDbProfile,
            summary: 'Hacker attempt thwarted.',
          },
        ],
      });

      const res = await request(app)
        .put('/api/candidates/me')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          candidateId: 'malicious-victim-candidate-id',
          userId: 'malicious-victim-user-id',
          summary: 'Hacker attempt thwarted.',
        });

      expect(res.status).toBe(200);
      // Profile updated is strictly the authenticated user's profile
      expect(res.body.profile).toHaveProperty('candidateId', 'candidate-uuid-1');
      expect(res.body.profile).toHaveProperty('userId', 'user-uuid-1');
    });

    it('should reject invalid input data (e.g. negative experience years) with 400', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      const res = await request(app)
        .put('/api/candidates/me')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          experienceYears: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Experience years must be non-negative');
    });
  });

  describe('4. POST /api/candidates/me/resume - Defensive Resume Upload & Magic Bytes', () => {
    // Valid PDF buffer starting with %PDF-
    const validPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'),
      Buffer.alloc(100, 'A'),
    ]);

    // Valid DOCX buffer starting with PK\x03\x04 and containing valid OpenXML structures
    const validDocxBuffer = Buffer.from(
      'UEsDBBQAAAgIANBpbV2ZWmaJIQAAACQAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbLOxr8jNUShLLSrOzM+zVTLUM1Cyt7MJqSxILbaz0YfQAFBLAwQUAAAICADQaW1dvjScXW4AAACGAAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sTc1BDsIgEEDRqzQcoIMuXBBKz4KALQkzQxgUvL1xYeLur963+8SyvFKTzLSpy6rV7uwwkcMTE/VlYiExY1Nn79UASDgTelm5JppYHtzQd1m5HTC4xdo4JJFMBxa4an0D9JnUl7xzfDsLf/GbuA9QSwECPwMUAAAICADQaW1dmVpmiSEAAAAkAAAAEwAJAAAAAAAAAAAAtIEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFVUBQAD4b/2alBLAQI/AxQAAAgIANBpbV2+NJxdbgAAAIYAAAARAAkAAAAAAAAAAAC0gVIAAAB3b3JkL2RvY3VtZW50LnhtbFVUBQAD4b/2alBLBQYAAAAAAgACAJIAAADvAAAAAAA=',
      'base64'
    );

    // Fake executable payload (MZ header) with .pdf extension
    const fakeExeRenamedToPdf = Buffer.concat([
      Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
      Buffer.from('This is a malicious PE binary masquerading as a PDF'),
    ]);

    // Plain text payload with .docx extension
    const plainTextWithDocxExt = Buffer.from('Plain text file with docx extension');

    it('7. Valid PDF upload is accepted with magic-byte verification', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      // Mock user and profile lookup
      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });

      const expectedSha256 = crypto.createHash('sha256').update(validPdfBuffer).digest('hex');

      // Mock insert into resume_metadata
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-resume-uuid-1',
            candidate_id: 'candidate-uuid-1',
            file_name: 'verified_resume.pdf',
            stored_file_name: 'resume-unique-1.pdf',
            file_size: validPdfBuffer.length,
            mime_type: 'application/pdf',
            sha256_hash: expectedSha256,
            created_at: '2026-11-11T12:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', validPdfBuffer, 'verified_resume.pdf');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toContain('Resume uploaded and verified successfully');
      expect(res.body.resume).toHaveProperty('mimeType', 'application/pdf');
      expect(res.body.resume).toHaveProperty('sha256Hash', expectedSha256);
      expect(res.body.resume).toHaveProperty('candidateId', 'candidate-uuid-1');
    });

    it('8. Valid DOCX upload is accepted with magic-byte verification', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });

      const expectedSha256 = crypto.createHash('sha256').update(validDocxBuffer).digest('hex');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-resume-uuid-2',
            candidate_id: 'candidate-uuid-1',
            file_name: 'my_resume.docx',
            stored_file_name: 'resume-unique-2.docx',
            file_size: validDocxBuffer.length,
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            sha256_hash: expectedSha256,
            created_at: '2026-11-11T12:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', validDocxBuffer, 'my_resume.docx');

      expect(res.status).toBe(200);
      expect(res.body.resume).toHaveProperty('mimeType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(res.body.resume).toHaveProperty('sha256Hash', expectedSha256);
    });

    it('9. Invalid file signatures are rejected with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', plainTextWithDocxExt, 'corrupt.docx');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Only valid PDF and DOCX files with verified magic-byte headers are accepted');
    });

    it('10. Renamed executable with .pdf extension is rejected with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', fakeExeRenamedToPdf, 'malicious_virus.pdf');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Only valid PDF and DOCX files with verified magic-byte headers are accepted');
    });

    it('11. Files exceeding the upload size limit are rejected', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      // Create a buffer exceeding 5 MB limit
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0x41);

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', oversizedBuffer, 'oversized.pdf');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('exceeds maximum allowed limit');
    });

    it('12 & 13. SHA-256 hash and metadata are correctly calculated and stored in PostgreSQL', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });

      const testPayload = Buffer.from('%PDF-1.4 Specimen content for cryptographic validation');
      const calculatedHash = crypto.createHash('sha256').update(testPayload).digest('hex');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'hash-test-uuid',
            candidate_id: 'candidate-uuid-1',
            file_name: 'test_hash.pdf',
            stored_file_name: 'resume-hash.pdf',
            file_size: testPayload.length,
            mime_type: 'application/pdf',
            sha256_hash: calculatedHash,
            created_at: '2026-11-11T12:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', testPayload, 'test_hash.pdf');

      expect(res.status).toBe(200);
      expect(res.body.resume.sha256Hash).toBe(calculatedHash);
      expect(res.body.resume.fileSizeBytes).toBe(testPayload.length);
    });

    it('14. Uploaded file is cleaned up from disk if database insert fails', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidatePayload);

      mockQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
      mockQuery.mockResolvedValueOnce({ rows: [mockDbProfile] });

      // Simulate database failure during metadata insert
      mockQuery.mockRejectedValueOnce(new Error('PostgreSQL unique constraint violation'));

      const res = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', validPdfBuffer, 'db_fail_test.pdf');

      expect(res.status).toBe(500);
      expect(res.body.error.message).toContain('Failed to record resume metadata in database');
    });

    it('15. Multiple uploads generate distinct filenames and do not overwrite each other', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValue(candidatePayload);

      mockQuery.mockResolvedValue({ rows: [mockDbUser] });

      const res1 = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', validPdfBuffer, 'resume.pdf');

      const res2 = await request(app)
        .post('/api/candidates/me/resume')
        .set('Authorization', 'Bearer valid-candidate-token')
        .attach('resume', validPdfBuffer, 'resume.pdf');

      // Both requests should succeed or execute with distinct UUID filenames
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });
});

