import { Request, Response } from 'express';
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

/**
 * POST /api/auth/sync
 * Synchronizes Firebase authenticated user account with PostgreSQL users table
 * and updates Firebase custom claims.
 */
export async function syncUser(req: Request, res: Response): Promise<void> {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || req.body.email;

    if (!uid || !email) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Firebase UID and email are required to sync user account',
      });
      return;
    }

    const fullName = req.body.fullName || req.user?.name || email.split('@')[0] || 'ATS User';
    const rawRole = req.body.role || req.user?.role;
    const role = normalizeDbRole(rawRole);
    const companyId = req.body.companyId || null;
    const avatarUrl = req.body.avatarUrl || req.user?.picture || null;

    // Upsert into users table
    const sql = `
      INSERT INTO users (firebase_uid, email, full_name, role, company_id, avatar_url, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        updated_at = NOW()
      RETURNING id, firebase_uid, email, full_name, role, company_id, avatar_url, is_active, created_at, updated_at;
    `;

    const result = await query(sql, [uid, email, fullName, role, companyId, avatarUrl]);
    const dbUser = result.rows[0];

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

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('[GetCurrentUser Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve current user profile',
    });
  }
}
