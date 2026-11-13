import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { checkDatabaseConnection } from './config/database';

// Load environment variables
dotenv.config();

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import jobRoutes from './routes/jobRoutes';
import candidateRoutes from './routes/candidateRoutes';
import resumeRoutes from './routes/resumeRoutes';
import { errorHandler } from './middleware/errorHandler';

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

// Admin Role Management & System Configuration endpoints
app.use('/api/admin', adminRoutes);

// Job Requisitions & Lifecycle endpoints
app.use('/api/jobs', jobRoutes);

// Candidate Profile & Resume Management endpoints
app.use('/api/candidates', candidateRoutes);

// Private Resume Streaming & Download endpoints
app.use('/api/resumes', resumeRoutes);

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
app.use(errorHandler);

export default app;
