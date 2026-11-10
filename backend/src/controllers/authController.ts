import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { syncUserClaims } from '../services/claimsSyncService';

/**
 * Valid database user roles
 */
const ALLOWED_DB_ROLES = ['ADMIN', 'HR', 'CANDIDATE'] as const;
type DbRole = (typeof ALLOWED_DB_ROLES)[number];

function normalizeDbRole(role?: string): DbRole {
  if (!role) return 'CANDIDATE';
  const upper = role.toUpperCase();
  if (upper === 'HR_MANAGER' || upper === 'RECRUITER' || upper === 'INTERVIEWER') {
    return 'HR';
  }
  if (upper === 'SUPER_ADMIN') {
    return 'ADMIN';
  }
  if (ALLOWED_DB_ROLES.includes(upper as DbRole)) {
    return upper as DbRole;
  }
  return 'CANDIDATE';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

/**
 * Zod validation schema for /api/auth/sync inputs
 */
const syncInputSchema = z.object({
  fullName: z.string().trim().max(255).optional(),
  companyId: z.string().trim().optional().nullable(),
  avatarUrl: z.string().trim().max(2048).optional().nullable(),
});

function getBootstrapAdminEmails(): string[] {
  const envEmails = process.env.BOOTSTRAP_ADMIN_EMAILS || '';
  return envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * POST /api/auth/sync
 * Synchronizes Firebase authenticated user account with PostgreSQL users table
 * and updates Firebase custom claims.
 */
export async function syncUser(req: Request, res: Response): Promise<void> {
  try {
    const uid = req.user?.uid;
    // Guard against malformed or non-object req.body (BUG-08)
    const rawBody = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const email = req.user?.email || (typeof rawBody.email === 'string' ? rawBody.email.trim() : undefined);

    if (!uid || !email) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Firebase UID and email are required to sync user account',
      });
      return;
    }

    // Validate inputs with Zod
    const parseResult = syncInputSchema.safeParse(rawBody);
    const validatedData = parseResult.success ? parseResult.data : {};

    const fullName =
      (typeof validatedData.fullName === 'string' && validatedData.fullName.length > 0)
        ? validatedData.fullName
        : (req.user?.name as string) || email.split('@')[0] || 'ATS User';

    // Handle companyId validation (BUG-09): verify valid UUID or ignore (null)
    const rawCompanyId = validatedData.companyId;
    const companyId = isValidUuid(rawCompanyId) ? rawCompanyId.trim() : null;

    const avatarUrl =
      (typeof validatedData.avatarUrl === 'string' && validatedData.avatarUrl.length > 0)
        ? validatedData.avatarUrl
        : (req.user?.picture as string) || null;

    // Check if user already exists in PostgreSQL by firebase_uid OR email (SEC-02 collision handling)
    const findExistingSql = `
      SELECT id, firebase_uid, email, full_name, role, company_id, avatar_url, is_active
      FROM users
      WHERE firebase_uid = $1 OR LOWER(email) = LOWER($2)
      LIMIT 1;
    `;
    const existingResult = await query(findExistingSql, [uid, email]);
    const existingUser = existingResult.rows[0];

    let dbUser;

    if (existingUser) {
      // Active user check (SEC-03): reject deactivated accounts
      if (existingUser.is_active === false) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'User account is deactivated',
        });
        return;
      }

      // Existing user: preserve assigned role and company_id to prevent client-side privilege escalation (SEC-01)
      // If user's email is in BOOTSTRAP_ADMIN_EMAILS, elevate them to ADMIN; otherwise preserve their existing DB role.
      const bootstrapAdmins = getBootstrapAdminEmails();
      const shouldElevateToAdmin = bootstrapAdmins.includes(email.toLowerCase()) && existingUser.role !== 'ADMIN';
      const targetRole = shouldElevateToAdmin ? 'ADMIN' : existingUser.role;

      // Update firebase_uid if it changed (linking email collision, SEC-02)
      // Retain existing company_id: only set if users.company_id was null!
      const updateSql = `
        UPDATE users
        SET
          firebase_uid = $1,
          email = $2,
          full_name = COALESCE(NULLIF($3, ''), users.full_name),
          avatar_url = COALESCE(NULLIF($4, ''), users.avatar_url),
          company_id = COALESCE(users.company_id, $5),
          role = $6,
          updated_at = NOW()
        WHERE id = $7
        RETURNING id, firebase_uid, email, full_name, role, company_id, avatar_url, is_active, created_at, updated_at;
      `;
      const updateRes = await query(updateSql, [
        uid,
        email,
        fullName,
        avatarUrl,
        companyId,
        targetRole,
        existingUser.id,
      ]);
      dbUser = updateRes.rows[0];
    } else {
      // New user signup: determine initial role
      // Privilege escalation protection (SEC-01): NEVER trust raw req.body.role!
      // Check bootstrap admin emails first
      const bootstrapAdmins = getBootstrapAdminEmails();
      let role: DbRole = 'CANDIDATE';

      if (bootstrapAdmins.includes(email.toLowerCase())) {
        role = 'ADMIN';
      } else if (req.user?.role && typeof req.user.role === 'string') {
        // Only trust verified claims from authenticated token
        role = normalizeDbRole(req.user.role);
      }

      const insertSql = `
        INSERT INTO users (firebase_uid, email, full_name, role, company_id, avatar_url, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
        RETURNING id, firebase_uid, email, full_name, role, company_id, avatar_url, is_active, created_at, updated_at;
      `;
      const insertRes = await query(insertSql, [uid, email, fullName, role, companyId, avatarUrl]);
      dbUser = insertRes.rows[0];
    }

    // Mirror claims back to Firebase
    try {
      await syncUserClaims(uid, dbUser.role, dbUser.company_id);
    } catch (claimErr: any) {
      console.warn(`[AuthSync] Failed to mirror Firebase claims: ${claimErr.message}`);
    }

    res.status(200).json({
      success: true,
      message: 'User synchronized successfully',
      user: dbUser,
    });
  } catch (error: any) {
    console.error('[AuthSync Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to synchronize user account',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
}

/**
 * GET /api/auth/me
 * Retrieves current authenticated user record from PostgreSQL
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    const sql = `
      SELECT id, firebase_uid, email, full_name, role, company_id, phone, avatar_url, is_active, created_at, updated_at
      FROM users
      WHERE firebase_uid = $1;
    `;

    const result = await query(sql, [uid]);

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found in database. Account synchronization required.',
      });
      return;
    }

    const user = result.rows[0];

    // Active user check (SEC-03)
    if (user.is_active === false) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'User account is deactivated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('[GetCurrentUser Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve current user profile',
    });
  }
}

