import express, { Request, Response } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { AppError, errorHandler } from './errorHandler';
import { validateRequest } from './validateRequest';

describe('Global Error Handler & Zod Validation Middleware', () => {
  const app = express();
  app.use(express.json());

  // Test Zod validation schema
  const userTestSchema = z.object({
    email: z.string().email('Invalid email address format'),
    age: z.number().int().min(18, 'Must be at least 18 years old'),
  });

  app.post('/test/zod-validation', validateRequest({ body: userTestSchema }), (_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Valid request body' });
  });

  app.get('/test/app-error', () => {
    throw new AppError('Resource was not found', 404, { resourceId: '123' });
  });

  app.get('/test/cors-error', () => {
    throw new Error('Not allowed by CORS policy');
  });

  app.get('/test/internal-error', () => {
    throw new Error('Database raw query connection broke');
  });

  app.use(errorHandler);

  it('should validate request body and return 200 for conforming payload', async () => {
    const res = await request(app)
      .post('/test/zod-validation')
      .send({ email: 'test@example.com', age: 25 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should catch ZodError and return formatted 400 with details', async () => {
    const res = await request(app)
      .post('/test/zod-validation')
      .send({ email: 'invalid-email', age: 15 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Validation failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBe(2);
    expect(res.body.error.details[0].field).toBe('email');
    expect(res.body.error.details[1].field).toBe('age');
  });

  it('should handle custom AppError with status code and details', async () => {
    const res = await request(app).get('/test/app-error');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Resource was not found');
    expect(res.body.error.details).toEqual({ resourceId: '123' });
  });

  it('should return 403 Forbidden for CORS rejection errors', async () => {
    const res = await request(app).get('/test/cors-error');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Origin not allowed by CORS');
  });

  it('should sanitize 500 errors in production mode (SEC-04)', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = await request(app).get('/test/internal-error');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('An unexpected internal server error occurred');
    expect(res.body.error.stack).toBeUndefined();

    process.env.NODE_ENV = origEnv;
  });
});
