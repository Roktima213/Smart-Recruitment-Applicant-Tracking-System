const mockCheckDatabaseConnection = jest.fn();

jest.mock('./config/database', () => ({
  query: jest.fn(),
  checkDatabaseConnection: () => mockCheckDatabaseConnection(),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./config/firebaseAdmin', () => ({
  verifyFirebaseIdToken: jest.fn().mockResolvedValue({ uid: 'test-user', email: 'test@example.com' }),
  setCustomClaims: jest.fn().mockResolvedValue(undefined),
  isAuthEmulatorEnabled: jest.fn().mockReturnValue(true),
  firebaseAdminApp: { name: '[DEFAULT]' },
  adminAuth: {
    getUser: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  },
}));

import request from 'supertest';
import app from './app';

describe('Backend Server - Base Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckDatabaseConnection.mockResolvedValue({ connected: true, latencyMs: 5 });
  });

  it('GET /api/health should return 200 with status healthy when database is connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Smart ATS Backend is running',
      status: 'healthy',
      latencyMs: 5,
    });
  });

  it('GET /api/health should return 503 with degraded status when database is disconnected', async () => {
    mockCheckDatabaseConnection.mockResolvedValueOnce({ connected: false, latencyMs: 15 });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      message: 'Database connection degraded',
      status: 'degraded',
      latencyMs: 15,
    });
  });

  it('GET / should return 200 with ATS welcome message', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service');
    expect(res.body.service).toContain('Smart Recruitment & Applicant Tracking System');
  });

  it('GET /api/non-existent-route should return 404 with structured error payload', async () => {
    const res = await request(app).get('/api/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('statusCode', 404);
    expect(res.body.error.message).toContain('Cannot GET /api/non-existent-route');
  });

  it('Security & Helmet headers are set on responses', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(res.headers).toHaveProperty('x-frame-options');
  });

  it('CORS preflight OPTIONS request returns allowed methods and origin headers', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('CORS rejection should return 403 Forbidden with clean error response for untrusted origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://malicious-hacker.com');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('statusCode', 403);
    expect(res.body.error.message).toContain('Origin not allowed by CORS');
  });

  it('POST with malformed JSON body returns 400 Bad Request via error handler', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{ "invalidJson": ');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('statusCode', 400);
  });

  it('SEC-04: Global error handler sanitizes internal 500 errors in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Simulate an unexpected internal failure in health check
    mockCheckDatabaseConnection.mockRejectedValueOnce(
      new Error('FATAL: password authentication failed for user "postgres" with table schema leak')
    );

    const res = await request(app).get('/api/health');

    // Restore env immediately
    process.env.NODE_ENV = originalEnv;

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    // Ensure DB internal connection leak / SQL details are NOT exposed
    expect(JSON.stringify(res.body)).not.toContain('table schema leak');
    expect(JSON.stringify(res.body)).not.toContain('password authentication');
  });
});
