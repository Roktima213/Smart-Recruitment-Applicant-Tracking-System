import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { checkDatabaseConnection } from './config/database';

// Load environment variables
dotenv.config();

import authRoutes from './routes/authRoutes';

const app: Application = express();

// Security Middleware
app.use(helmet());

// Multi-Origin CORS Configuration (BUG-07)
const rawFrontendUrls = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = rawFrontendUrls
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server, curl, mobile, and same-origin requests (where origin is undefined)
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      const corsError: Error & { status?: number; statusCode?: number } = new Error(`Origin ${origin} not allowed by CORS`);
      corsError.status = 403;
      corsError.statusCode = 403;
      callback(corsError);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    // Format: [timestamp] METHOD /url status duration
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
  });

  next();
});

// Root route for simple verification
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Smart Recruitment & Applicant Tracking System (ATS) API',
    version: '0.1.0',
    documentation: '/api/health',
  });
});

// Dynamic Health check endpoint with database probe (BUG-05)
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    const isHealthy = dbStatus.connected;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? 'Smart ATS Backend is running' : 'Database connection degraded',
      status: isHealthy ? 'healthy' : 'degraded',
      ...(process.env.NODE_ENV !== 'production' && { latencyMs: dbStatus.latencyMs }),
    });
  } catch {
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      status: 'degraded',
    });
  }
});

// Authentication and RBAC endpoints
app.use('/api/auth', authRoutes);

// 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
});

// Global Error Handler with production sanitization (SEC-04)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  // Handle CORS rejection explicitly with 403 Forbidden
  if (err.message && err.message.includes('not allowed by CORS')) {
    res.status(403).json({
      success: false,
      error: {
        message: 'Origin not allowed by CORS',
        statusCode: 403,
      },
    });
    return;
  }

  const rawStatus = err.statusCode || err.status || 500;
  const statusCode = typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  console.error(`[Error] ${err.name || 'Error'}: ${err.message}`);
  if (err.stack && isDevelopment) {
    console.error(err.stack);
  }

  // Prevent leaking internal SQL queries, DB connection errors, or stack traces in production (SEC-04)
  let safeMessage = err.message || 'Internal Server Error';
  if (!isDevelopment && statusCode >= 500) {
    safeMessage = 'An unexpected internal server error occurred';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: safeMessage,
      statusCode,
      ...(isDevelopment && { stack: err.stack }),
    },
  });
});

export default app;
