import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: string;
  companyId?: string | null;
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication Middleware:
 * Validates Firebase ID Token from Authorization header (Bearer <token>)
 * and attaches verified user data to `req.user`.
 */
export async function authenticateFirebase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header missing or invalid format. Expected "Bearer <token>"',
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1]?.trim();

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token string is empty',
      });
      return;
    }

    const decodedToken = await verifyFirebaseIdToken(token);

    req.user = {
      ...decodedToken,
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: (decodedToken.role as string) || 'CANDIDATE',
      companyId: (decodedToken.companyId as string) || null,
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired Firebase ID token',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Restricts access to endpoints based on allowed roles.
 */
export function requireRole(allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to role verification',
      });
      return;
    }

    const userRole = (req.user.role || 'CANDIDATE').toUpperCase();

    if (!normalizedAllowed.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Forbidden: User role "${userRole}" is not permitted to access this resource`,
        allowedRoles: normalizedAllowed,
      });
      return;
    }

    next();
  };
}
