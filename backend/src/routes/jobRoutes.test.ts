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

describe('Job Requisitions & Lifecycle Endpoints (/api/jobs)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
  });

  const adminTokenPayload = {
    uid: 'admin-firebase-uid',
    email: 'admin@ats.local',
    role: 'ADMIN',
    isActive: true,
  };

  const hrTokenPayload = {
    uid: 'hr-firebase-uid',
    email: 'hr@ats.local',
    role: 'HR',
    companyId: 'comp-uuid-1',
    isActive: true,
  };

  const candidateTokenPayload = {
    uid: 'cand-firebase-uid',
    email: 'candidate@ats.local',
    role: 'CANDIDATE',
    isActive: true,
  };

  const validJobId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

  describe('Security & RBAC Mutation Guards', () => {
    it('should reject unauthenticated POST /api/jobs with 401', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .send({ title: 'Test Job', description: 'Detailed job description goes here' });

      expect(res.status).toBe(401);
    });

    it('should reject CANDIDATE role on POST /api/jobs with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateTokenPayload);

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          title: 'Software Engineer',
          description: 'A great role for backend engineers.',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should reject CANDIDATE role on PUT /api/jobs/:id with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateTokenPayload);

      const res = await request(app)
        .put(`/api/jobs/${validJobId}`)
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });

    it('should reject CANDIDATE role on PATCH /api/jobs/:id/status with 403 Forbidden', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(candidateTokenPayload);

      const res = await request(app)
        .patch(`/api/jobs/${validJobId}/status`)
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/jobs - Requisition Creation & Zod Validation', () => {
    it('should allow HR to create a job requisition with 201 Created', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrTokenPayload);
      // resolve creator id & company id
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'usr-hr-uuid', company_id: 'comp-uuid-1' }] });
      // insert job returning
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: validJobId,
            title: 'Senior Frontend Engineer',
            department: 'Engineering',
            status: 'DRAFT',
            created_at: new Date().toISOString(),
          },
        ],
      });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer hr-token')
        .send({
          title: 'Senior Frontend Engineer',
          description: 'Experience with React, TypeScript, and modern state architectures.',
          department: 'Engineering',
          salary_min: 120000,
          salary_max: 160000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.job.title).toBe('Senior Frontend Engineer');
    });

    it('should reject creation when salary_min is greater than salary_max with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrTokenPayload);

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer hr-token')
        .send({
          title: 'DevOps Engineer',
          description: 'Kubernetes, Terraform, and cloud automation expertise.',
          salary_min: 180000,
          salary_max: 120000, // Invalid: min > max
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Validation failed');
    });

    it('should reject creation when title is too short (< 3 characters) with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer admin-token')
        .send({
          title: 'SE', // Too short
          description: 'Valid description that has sufficient character length.',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/jobs - Listing & Filtering', () => {
    it('should return paginated jobs list for public request', async () => {
      // count query
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      // data query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: validJobId,
            title: 'Full Stack Engineer',
            department: 'Engineering',
            status: 'PUBLISHED',
          },
        ],
      });

      const res = await request(app).get('/api/jobs?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobs.length).toBe(1);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/jobs/:id - Single Job Details', () => {
    it('should return 400 Bad Request for non-UUID id param', async () => {
      const res = await request(app).get('/api/jobs/invalid-non-uuid');
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid job UUID');
    });

    it('should return 404 Not Found when job does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get(`/api/jobs/${validJobId}`);
      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Job not found');
    });

    it('should return 200 with job details when found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: validJobId,
            title: 'Lead Architect',
            department: 'Architecture',
            status: 'PUBLISHED',
          },
        ],
      });

      const res = await request(app).get(`/api/jobs/${validJobId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job.title).toBe('Lead Architect');
    });
  });

  describe('PUT /api/jobs/:id - Job Requisition Update', () => {
    it('should allow Admin to update an existing job with 200 OK', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(adminTokenPayload);
      // existing job check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: validJobId, title: 'Old Title', status: 'DRAFT' }],
      });
      // update query returning
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: validJobId, title: 'Updated Title', status: 'DRAFT' }],
      });

      const res = await request(app)
        .put(`/api/jobs/${validJobId}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job.title).toBe('Updated Title');
    });
  });

  describe('PATCH /api/jobs/:id/status - Lifecycle Transitions', () => {
    it('should allow HR to transition status to PUBLISHED with 200 OK', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrTokenPayload);
      // existing job check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: validJobId, company_id: 'comp-uuid-1', status: 'DRAFT', published_at: null }],
      });
      // update query returning
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: validJobId, status: 'PUBLISHED', published_at: new Date().toISOString() }],
      });

      const res = await request(app)
        .patch(`/api/jobs/${validJobId}/status`)
        .set('Authorization', 'Bearer hr-token')
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job.status).toBe('PUBLISHED');
    });

    it('should reject invalid status value with 400 Bad Request', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce(hrTokenPayload);

      const res = await request(app)
        .patch(`/api/jobs/${validJobId}/status`)
        .set('Authorization', 'Bearer hr-token')
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
