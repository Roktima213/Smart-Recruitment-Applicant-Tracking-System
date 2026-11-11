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

describe('Public Job Board, Pagination & Query Sanitization (/api/jobs)', () => {
  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
  });

  describe('Public Unauthenticated Access & Cache Headers', () => {
    it('should allow public access to GET /api/jobs without Authorization header', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'b0000000-0000-0000-0000-000000000001',
            title: 'Staff Platform Engineer',
            department: 'Engineering',
            location: 'Remote',
            status: 'PUBLISHED',
          },
        ],
      });

      const res = await request(app).get('/api/jobs');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobs).toHaveLength(1);
      expect(res.headers['cache-control']).toContain('public, max-age=60');
      expect(res.headers['vary']).toContain('Origin');
      expect(res.headers['etag']).toBeDefined();
    });

    it('should return 304 Not Modified when client provides matching ETag on GET /api/jobs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const initialRes = await request(app).get('/api/jobs');
      const etag = initialRes.headers['etag'];
      expect(etag).toBeDefined();

      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const cachedRes = await request(app)
        .get('/api/jobs')
        .set('If-None-Match', etag);

      expect(cachedRes.status).toBe(304);
      expect(cachedRes.text).toBe('');
    });
  });

  describe('Pagination Boundary & Fuzz Clamping', () => {
    it('should clamp page=0 and negative pages to page=1', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 25 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs?page=0');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);

      // Verify the SQL values array passed offset=0 for page 1
      const lastCall = mockQuery.mock.calls[1];
      const params = lastCall[1];
      expect(params).toContain(0); // offset = (1 - 1) * limit = 0
    });

    it('should clamp limit=1000 down to the maximum allowed limit of 100', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs?limit=1000');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(100);

      const lastCall = mockQuery.mock.calls[1];
      const params = lastCall[1];
      expect(params).toContain(100);
    });

    it('should fallback invalid non-numeric page and limit parameters to default 1 and 20', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 10 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs?page=invalid&limit=abc');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
    });
  });

  describe('SQL Injection & Query Sanitization Defense', () => {
    it('should safely parameterize malicious SQL injection payloads in q search query', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const maliciousPayload = "' OR 1=1; DROP TABLE jobs; --";
      const res = await request(app).get(`/api/jobs?q=${encodeURIComponent(maliciousPayload)}`);

      expect(res.status).toBe(200);
      const queryCall = mockQuery.mock.calls[0];
      const querySql = queryCall[0];
      const queryParams = queryCall[1];

      // Verifies no direct string injection into SQL statement
      expect(querySql).not.toContain("DROP TABLE");
      expect(queryParams).toContain(`%${maliciousPayload}%`);
    });

    it('should safely filter by department and location without syntax errors', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 3 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/jobs?department=Engineering&location=Remote&employment_type=Full-time');

      expect(res.status).toBe(200);
      const queryCall = mockQuery.mock.calls[0];
      const queryParams = queryCall[1];

      expect(queryParams).toContain('%Engineering%');
      expect(queryParams).toContain('%Remote%');
      expect(queryParams).toContain('%Full-time%');
    });

    it('should safely apply salary_min and salary_max boundary filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/jobs?min_salary=100000&max_salary=180000');

      expect(res.status).toBe(200);
      const queryCall = mockQuery.mock.calls[0];
      const queryParams = queryCall[1];

      expect(queryParams).toContain(100000);
      expect(queryParams).toContain(180000);
    });
  });

  describe('Single Job Detail Security & Visibility Controls', () => {
    const publishedJobId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const draftJobId = 'f1e2d3c4-b5a6-4987-9876-543210fedcba';

    it('should allow public access to a PUBLISHED job', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: publishedJobId,
            title: 'Lead Full Stack Engineer',
            status: 'PUBLISHED',
            company_name: 'Acme Corp',
          },
        ],
      });

      const res = await request(app).get(`/api/jobs/${publishedJobId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job.title).toBe('Lead Full Stack Engineer');
      expect(res.headers['cache-control']).toContain('public, max-age=60');
    });

    it('should return 404 for unauthenticated or candidate users requesting a DRAFT job', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: draftJobId,
            title: 'Confidential Internal Requisition',
            status: 'DRAFT',
          },
        ],
      });

      const res = await request(app).get(`/api/jobs/${draftJobId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Job not found');
    });

    it('should reject malformed non-UUID job ID with 400 Bad Request', async () => {
      const res = await request(app).get('/api/jobs/malicious-non-uuid-id');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Invalid job UUID format');
    });
  });
});
