const mockVerifyFirebaseIdToken = jest.fn();
const mockQuery = jest.fn();
const mockGetClient = jest.fn();

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
  getClient: (...args: any[]) => mockGetClient(...args),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';
import { storeResume } from '../services/resumeStorageService';

describe('Adversarial Security & Multi-Tenant Exploitation Audit', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    mockGetClient.mockReset();
  });

  const companyA = '11111111-1111-4111-8111-111111111111';
  const companyB = '22222222-2222-4222-8222-222222222222';
  const draftJobId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const applicationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const resumeId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  const hrCompanyB = {
    uid: 'hr-comp-b-uid',
    email: 'hr@competitor-b.local',
    role: 'HR',
    companyId: companyB,
    isActive: true,
  };

  const hrNullCompany = {
    uid: 'hr-null-comp-uid',
    email: 'hr-unassigned@rogue.local',
    role: 'HR',
    companyId: null,
    isActive: true,
  };

  const adminUser = {
    uid: 'admin-super-uid',
    email: 'admin@global.local',
    role: 'ADMIN',
    companyId: companyA,
    isActive: true,
  };

  describe('1. Cross-Tenant Job Data Disclosure Defense', () => {
    it('Competitor HR cannot view DRAFT job belonging to another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: draftJobId,
            company_id: companyA, // Belongs to Company A!
            title: 'Confidential Stealth Project Architect',
            status: 'DRAFT',
          },
        ],
      });

      const res = await request(app)
        .get(`/api/jobs/${draftJobId}`)
        .set('Authorization', 'Bearer valid-hr-b-token');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('Competitor HR querying ?status=DRAFT has queries scoped strictly to their own companyId', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/jobs?status=DRAFT')
        .set('Authorization', 'Bearer valid-hr-b-token');

      expect(res.status).toBe(200);
      const sqlCall = mockQuery.mock.calls[0];
      const params = sqlCall[1];
      expect(params).toContain('DRAFT');
      expect(params).toContain(companyB); // HR of company B can only filter for company B
      expect(params).not.toContain(companyA);
    });

    it('Competitor HR cannot update job belonging to another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: draftJobId, company_id: companyA, title: 'Company A Title', status: 'DRAFT' }],
      });

      const res = await request(app)
        .put(`/api/jobs/${draftJobId}`)
        .set('Authorization', 'Bearer valid-hr-b-token')
        .send({ title: 'Hacked By Competitor' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('Competitor HR cannot update status of job belonging to another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: draftJobId, company_id: companyA, status: 'DRAFT', published_at: null, closed_at: null }],
      });

      const res = await request(app)
        .patch(`/api/jobs/${draftJobId}/status`)
        .set('Authorization', 'Bearer valid-hr-b-token')
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('HR user cannot update job with NULL company_id (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: draftJobId, company_id: null, title: 'Orphan Job', status: 'DRAFT' }],
      });

      const res = await request(app)
        .put(`/api/jobs/${draftJobId}`)
        .set('Authorization', 'Bearer valid-hr-b-token')
        .send({ title: 'Adversarial Modification' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('HR user cannot update status of job with NULL company_id (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: draftJobId, company_id: null, status: 'DRAFT', published_at: null, closed_at: null }],
      });

      const res = await request(app)
        .patch(`/api/jobs/${draftJobId}/status`)
        .set('Authorization', 'Bearer valid-hr-b-token')
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('HR user attempting to supply competitor company_id in POST /api/jobs is forced to their own companyId', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'hr-b-id', company_id: companyB }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: draftJobId, company_id: companyB, title: 'HR Requisition', status: 'DRAFT' }],
      });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-hr-b-token')
        .send({
          title: 'HR Requisition',
          description: 'Valid job description with sufficient text length',
          company_id: companyA, // Attacker attempts to forge Company A
        });

      expect(res.status).toBe(201);
      // Ensure the INSERT statement used Company B (HR caller's company), not Company A
      const insertCall = mockQuery.mock.calls[1];
      const params = insertCall[1];
      expect(params[0]).toBe(companyB);
      expect(params[0]).not.toBe(companyA);
    });
  });

  describe('2. Multi-Tenant BOLA in Application Inspection & Stage Transitions', () => {
    it('Competitor HR cannot inspect candidate application belonging to another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: applicationId,
            job_id: draftJobId,
            candidate_id: 'cand-1',
            current_stage: 'APPLIED',
            candidate_firebase_uid: 'candidate-victim-uid',
            job_company_id: companyA, // Belongs to Company A!
          },
        ],
      });

      const res = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', 'Bearer valid-hr-b-token');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden: You do not have permission to access this application');
    });

    it('Competitor HR cannot advance or transition application stage of another company (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrCompanyB);
      // Fetch actor's user database record
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'actor-hr-b-id',
            company_id: companyB,
            role: 'HR',
            is_active: true,
          },
        ],
      });

      // Mock pool client for transaction
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // LOCK_APPLICATION_FOR_UPDATE_SQL returning Company A application!
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: applicationId,
            job_id: draftJobId,
            candidate_id: 'cand-1',
            current_stage: 'APPLIED',
            company_id: companyA, // Application is under Company A!
          },
        ],
      });
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      mockGetClient.mockResolvedValueOnce(mockClient);

      const res = await request(app)
        .patch(`/api/applications/${applicationId}/stage`)
        .set('Authorization', 'Bearer valid-hr-b-token')
        .send({
          toStage: 'SCREENING',
          reason: 'Attempting cross-company hijacking',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });
  });

  describe('3. HR with NULL Company Assignment Fails Closed with 403', () => {
    it('HR with NULL company fails closed with 403 on GET /api/jobs?status=DRAFT', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrNullCompany);
      mockQuery.mockResolvedValueOnce({ rows: [{ company_id: null }] }); // No DB company either

      const res = await request(app)
        .get('/api/jobs?status=DRAFT')
        .set('Authorization', 'Bearer hr-null-token');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden: HR user has no assigned company');
    });

    it('HR with NULL company fails closed with 403 on POST /api/jobs', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrNullCompany);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-id', company_id: null }] });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer hr-null-token')
        .send({
          title: 'Unassigned Requisition',
          description: 'Attempting to create job without company association',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden: HR user has no assigned company');
    });

    it('HR with NULL company fails closed with 403 on GET /api/applications', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrNullCompany);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'hr-user-id', company_id: null, role: 'HR', is_active: true }],
      });

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', 'Bearer hr-null-token');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden: HR user has no assigned company');
    });

    it('HR with NULL company fails closed with 403 on GET /api/resumes/:id/download', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrNullCompany);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: resumeId,
            candidate_id: 'cand-1',
            file_name: 'test.pdf',
            stored_file_name: 'test.pdf',
            candidate_firebase_uid: 'other-user',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ company_id: null }] }); // HR DB lookup

      const res = await request(app)
        .get(`/api/resumes/${resumeId}/download`)
        .set('Authorization', 'Bearer hr-null-token');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden: HR user has no assigned company');
    });
  });

  describe('4. Unbounded Pagination & Arithmetic Hardening', () => {
    it('handles offset=Infinity and limit=Infinity safely without NaN or server crash', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminUser);
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 10 }] }); // Count query
      mockQuery.mockResolvedValueOnce({ rows: [] }); // List query

      const res = await request(app)
        .get('/api/admin/users?offset=Infinity&limit=Infinity')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify that SQL query received finite numeric limit & offset
      const listCall = mockQuery.mock.calls[1];
      const params = listCall[1];
      const limitParam = params[params.length - 2];
      const offsetParam = params[params.length - 1];

      expect(Number.isFinite(limitParam)).toBe(true);
      expect(limitParam).toBeLessThanOrEqual(100);
      expect(Number.isFinite(offsetParam)).toBe(true);
      expect(offsetParam).toBe(0); // Offset fallen back to 0
    });

    it('handles giant page parameter in applications query without integer overflow crash', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminUser);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'admin-id', role: 'ADMIN', is_active: true, company_id: companyA }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] }); // Count query
      mockQuery.mockResolvedValueOnce({ rows: [] }); // List query

      const res = await request(app)
        .get('/api/applications?page=9999999999&limit=1000')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const listCall = mockQuery.mock.calls[2];
      const params = listCall[1];
      const limitParam = params[params.length - 2];
      const offsetParam = params[params.length - 1];

      expect(limitParam).toBe(100); // Clamped to 100
      expect(offsetParam).toBeLessThanOrEqual(100000 * 100);
      expect(Number.isFinite(offsetParam)).toBe(true);
    });
  });

  describe('5. OpenXML DOCX Inspection & Malformed Archive / Zip Bomb Rejection', () => {
    it('rejects fake DOCX payload that is not a valid zip archive', async () => {
      const corruptDocxBuffer = Buffer.from('PK\x03\x04This is not a real zip archive');

      await expect(
        storeResume({
          originalFilename: 'malicious.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: corruptDocxBuffer,
        })
      ).rejects.toThrow('File content does not match the declared file type');
    });

    it('rejects zip archive missing mandatory OpenXML parts [Content_Types].xml or word/document.xml', async () => {
      const yazl = require('yazl');
      const zip = new yazl.ZipFile();
      // Add random file, omitting OpenXML structure
      zip.addBuffer(Buffer.from('Hello world'), 'hello.txt');
      zip.end();

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        zip.outputStream.on('data', (c: Buffer) => chunks.push(c));
        zip.outputStream.on('error', reject);
        zip.outputStream.on('end', resolve);
      });

      const invalidDocx = Buffer.concat(chunks);

      await expect(
        storeResume({
          originalFilename: 'not_word_doc.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: invalidDocx,
        })
      ).rejects.toThrow('File content does not match the declared file type');
    });
  });
});
