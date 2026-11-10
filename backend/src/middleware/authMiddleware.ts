import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: string;
  companyId?: string | null;
  isActive?: boolean;
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
 * Case-insensitive scheme match per RFC 6750 (SEC-05)
 * Guards against array headers and deactivated accounts (SEC-03).
 */
export async function authenticateFirebase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawHeader = req.headers.authorization;
    // Guard against array headers
    const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header missing or invalid format. Expected "Bearer <token>"',
      });
      return;
    }

    // Case-insensitive RFC 6750 Bearer token parsing
    const match = authHeader.match(/^Bearer\s+(\S+)/i);
    if (!match || !match[1]) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header missing or invalid format. Expected "Bearer <token>"',
      });
      return;
    }

    const token = match[1].trim();

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token string is empty',
      });
      return;
    }

    const decodedToken = await verifyFirebaseIdToken(token);

    // Active user check (SEC-03)
    const isUserActive = decodedToken.isActive ?? decodedToken.is_active ?? true;
    if (isUserActive === false) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'User account is deactivated',
      });
      return;
    }

    req.user = {
      ...decodedToken,
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: (decodedToken.role as string) || 'CANDIDATE',
      companyId: (decodedToken.companyId as string) || null,
      isActive: isUserActive,
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
 * Role hierarchy levels for RBAC (SEC-06):
 * SUPER_ADMIN (40) > ADMIN (30) > HR (20) > CANDIDATE (10)
 */
const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 40,
  ADMIN: 30,
  HR: 20,
  HR_MANAGER: 20,
  RECRUITER: 20,
  INTERVIEWER: 20,
  CANDIDATE: 10,
};

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Restricts access to endpoints based on allowed roles and hierarchy.
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

    // Active user check (SEC-03)
    if (req.user.isActive === false || (req.user as any).is_active === false) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'User account is deactivated',
      });
      return;
    }

    const userRole = (req.user.role || 'CANDIDATE').toUpperCase();

    // Check exact match first
    if (normalizedAllowed.includes(userRole)) {
      next();
      return;
    }

    // Hierarchy check: allow higher privilege roles to access lower privilege endpoints
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const minAllowedLevel = Math.min(
      ...normalizedAllowed.map((r) => ROLE_HIERARCHY[r] ?? Infinity)
    );

    if (minAllowedLevel !== Infinity && userLevel >= minAllowedLevel) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden',
      message: `Forbidden: User role "${userRole}" is not permitted to access this resource`,
      allowedRoles: normalizedAllowed,
    });
  };
}
