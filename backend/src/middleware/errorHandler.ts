import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Enterprise Global Error Handler Middleware
 * Normalizes Zod validation errors, custom AppErrors, CORS errors, and handles SEC-04 production sanitization.
 */
export const errorHandler = (
  err: Error & { status?: number; statusCode?: number; details?: unknown },
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';

  // 1. Handle CORS Rejections
  if (err.message && /not allowed by cors/i.test(err.message)) {
    res.status(403).json({
      success: false,
      error: {
        message: 'Origin not allowed by CORS',
        statusCode: 403,
      },
    });
    return;
  }

  // 2. Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedIssues = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: formattedIssues,
      },
    });
    return;
  }

  // 3. Handle JSON Body Parser Syntax Errors
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid JSON payload format',
        statusCode: 400,
      },
    });
    return;
  }

  // 4. Resolve HTTP Status Code
  const rawStatus = err.statusCode || err.status || 500;
  const statusCode = typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;

  // Log error in development or server 500s
  if (isDevelopment || statusCode >= 500) {
    console.error(`[Error] ${err.name || 'Error'} [${statusCode}]: ${err.message}`);
    if (err.stack && isDevelopment) {
      console.error(err.stack);
    }
  }

  // 5. SEC-04 Sanitization: Prevent internal DB or stack leakage in production
  let safeMessage = err.message || 'Internal Server Error';
  if (!isDevelopment && statusCode >= 500) {
    safeMessage = 'An unexpected internal server error occurred';
  }

  const errorBody: Record<string, unknown> = {
    message: safeMessage,
    statusCode,
  };

  if (err.details !== undefined && (isDevelopment || statusCode < 500)) {
    errorBody.details = err.details;
  }

  if (isDevelopment && err.stack) {
    errorBody.stack = err.stack;
  }

  res.status(statusCode).json({
    success: false,
    error: errorBody,
  });
};
