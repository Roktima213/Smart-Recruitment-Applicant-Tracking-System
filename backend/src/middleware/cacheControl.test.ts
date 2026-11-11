import express, { Request, Response } from 'express';
import request from 'supertest';
import { publicCache } from './cacheControl';

describe('Cache-Control & ETag Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Public route with caching middleware
    app.get('/api/public-test', publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 30 }), (_req: Request, res: Response) => {
      res.json({ message: 'public listings data', timestamp: '2026-11-11' });
    });

    // POST route with caching middleware (should set no-store)
    app.post('/api/public-test', publicCache(), (_req: Request, res: Response) => {
      res.json({ message: 'created' });
    });
  });

  it('should set public Cache-Control and Vary headers on unauthenticated GET requests', async () => {
    const res = await request(app).get('/api/public-test');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=30');
    expect(res.headers['vary']).toBe('Accept-Encoding, Origin');
    expect(res.headers['etag']).toBeDefined();
    expect(res.body.message).toBe('public listings data');
  });

  it('should return 304 Not Modified when client provides matching If-None-Match ETag', async () => {
    const initialRes = await request(app).get('/api/public-test');
    const etag = initialRes.headers['etag'];
    expect(etag).toBeDefined();

    const conditionalRes = await request(app)
      .get('/api/public-test')
      .set('If-None-Match', etag);

    expect(conditionalRes.status).toBe(304);
    expect(conditionalRes.text).toBe('');
  });

  it('should set private, no-cache headers when request is authenticated', async () => {
    const res = await request(app)
      .get('/api/public-test')
      .set('Authorization', 'Bearer dummy-token');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');
    expect(res.headers['pragma']).toBe('no-cache');
  });

  it('should set no-store on non-GET methods', async () => {
    const res = await request(app).post('/api/public-test').send({ data: 1 });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
