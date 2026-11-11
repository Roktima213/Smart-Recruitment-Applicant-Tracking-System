import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface CacheOptions {
  maxAgeSeconds?: number;
  staleWhileRevalidateSeconds?: number;
  vary?: string[];
}

/**
 * Cache-Control & ETag Middleware
 * Configures HTTP caching headers on public GET endpoints.
 * Skips caching for authenticated requests to ensure sensitive data isolation.
 */
export const publicCache = (options: CacheOptions = {}) => {
  const maxAge = options.maxAgeSeconds ?? 60;
  const swr = options.staleWhileRevalidateSeconds ?? 30;
  const varyHeaders = options.vary ?? ['Accept-Encoding', 'Origin'];

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache safe, idempotent read requests (GET / HEAD)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }

    // Never cache authenticated sessions publicly
    if (req.headers.authorization || (req as any).user) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return next();
    }

    // Set Cache-Control and Vary headers for CDN and browser caching
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
    res.setHeader('Vary', varyHeaders.join(', '));

    // Capture response body for ETag computation and 304 handling
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function (body: any): Response {
      const content = typeof body === 'string' ? body : JSON.stringify(body);
      const hash = crypto.createHash('md5').update(content).digest('hex');
      const etag = `W/"${content.length.toString(16)}-${hash.substring(0, 16)}"`;

      res.setHeader('ETag', etag);

      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && (clientEtag === etag || clientEtag.includes(etag))) {
        return res.status(304).end();
      }

      return originalJson(body);
    };

    res.send = function (body: any): Response {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const hash = crypto.createHash('md5').update(body).digest('hex');
        const etag = `W/"${body.length.toString(16)}-${hash.substring(0, 16)}"`;

        res.setHeader('ETag', etag);

        const clientEtag = req.headers['if-none-match'];
        if (clientEtag && (clientEtag === etag || clientEtag.includes(etag))) {
          return res.status(304).end();
        }
      }
      return originalSend(body);
    };

    next();
  };
};
