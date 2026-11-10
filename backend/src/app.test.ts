import request from 'supertest';
import app from './app';

describe('Backend Server - Base Endpoints', () => {
  it('GET /api/health should return 200 with status healthy and expected response', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Smart ATS Backend is running',
      status: 'healthy',
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

  it('POST with malformed JSON body returns 400 Bad Request via error handler', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{ "invalidJson": ');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('statusCode', 400);
  });
});
