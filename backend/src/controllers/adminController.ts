import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { syncUserClaims, revokeUserSessions } from '../services/claimsSyncService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

/**
 * Supported roles for role update
 */
export const ALLOWED_ADMIN_ROLES = ['ADMIN', 'HR', 'CANDIDATE'] as const;
export type AdminUpdatableRole = (typeof ALLOWED_ADMIN_ROLES)[number];

const updateRoleSchema = z.object({
  role: z.enum(ALLOWED_ADMIN_ROLES, {
    errorMap: () => ({ message: 'Invalid role. Supported roles are: ADMIN, HR, CANDIDATE' }),
  }),
});

const updateCompanySchema = z.object({
  id: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Company name cannot be empty').max(255).optional(),
  domain: z.string().trim().max(255).optional().nullable(),
  logoUrl: z.string().trim().max(2048).optional().nullable(),
  logo_url: z.string().trim().max(2048).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * API 1: GET /api/admin/users
 * Retrieves all registered users with company information.
 */
export async function listAllUsers(_req: Request, res: Response): Promise<void> {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.is_active,
        u.company_id,
        u.avatar_url,
        u.phone,
        u.created_at,
        u.updated_at,
        c.name AS company_name,
        c.domain AS company_domain,
        c.logo_url AS company_logo_url
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY u.created_at DESC;
    `;

    const result = await query(sql);

    const formattedUsers = result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      full_name: row.full_name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      is_active: row.is_active,
      avatarUrl: row.avatar_url,
      phone: row.phone,
      companyId: row.company_id,
      company_id: row.company_id,
      company: row.company_id
        ? {
            id: row.company_id,
            name: row.company_name,
            domain: row.company_domain,
            logoUrl: row.company_logo_url,
          }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers,
    });
  } catch (error: any) {
    console.error('[Admin List Users Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve registered users',
        statusCode: 500,
        ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
      },
    });
  }
}

/**
 * API 2: PATCH /api/admin/users/:id/role
 * Updates a user's role and synchronizes Firebase custom claims.
 */
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!isValidUuid(id)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID format. Must be a valid UUID',
          statusCode: 400,
        },
      });
      return;
    }

    const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
    const parseResult = updateRoleSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors[0]?.message || 'Invalid role payload';
      res.status(400).json({
        success: false,
        error: {
          message: errorMessage,
          statusCode: 400,
        },
      });
      return;
    }

    const { role } = parseResult.data;

    // 1. Verify user exists in PostgreSQL
    const findUserSql = `
      SELECT id, firebase_uid, email, full_name, role, company_id, is_active
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const userResult = await query(findUserSql, [id]);

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: `User with ID "${id}" not found`,
          statusCode: 404,
        },
      });
      return;
    }

    const targetUser = userResult.rows[0];

    // If role is unchanged, return current state
    if (targetUser.role === role) {
      res.status(200).json({
        success: true,
        message: `User role is already ${role}`,
        user: targetUser,
      });
      return;
    }

    // 2. Synchronize Firebase custom claims FIRST before committing DB changes.
    // If Firebase fails, we reject immediately to prevent inconsistency.
    try {
      await syncUserClaims(targetUser.firebase_uid, role, targetUser.company_id);
    } catch (fbErr: any) {
      console.error('[Admin Role Update - Firebase Error]', fbErr);
      res.status(500).json({
        success: false,
        error: {
          message: `Failed to synchronize role with Firebase: ${fbErr.message || 'Firebase error'}`,
          statusCode: 500,
        },
      });
      return;
    }

    // 3. Update PostgreSQL users table
    try {
      const updateSql = `
        UPDATE users
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, firebase_uid, email, full_name, role, company_id, is_active, created_at, updated_at;
      `;
      const updateResult = await query(updateSql, [role, id]);
      const updatedUser = updateResult.rows[0];

      // Revoke refresh tokens so client is forced to refresh token with updated role
      try {
        await revokeUserSessions(targetUser.firebase_uid);
      } catch (revokeErr: any) {
        console.warn(`[Admin Role Update] Token revocation warning: ${revokeErr.message}`);
      }

      res.status(200).json({
        success: true,
        message: `User role updated to ${role} successfully`,
        user: updatedUser,
      });
    } catch (dbErr: any) {
      console.error('[Admin Role Update - DB Error]', dbErr);
      // Revert Firebase claims to previous role to prevent inconsistency
      try {
        await syncUserClaims(targetUser.firebase_uid, targetUser.role, targetUser.company_id);
      } catch (revertErr: any) {
        console.error('[Admin Role Update] Critical: failed to revert Firebase claims:', revertErr.message);
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update user role in database',
          statusCode: 500,
        },
      });
    }
  } catch (error: any) {
    console.error('[Admin Update User Role Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error while updating user role',
        statusCode: 500,
        ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
      },
    });
  }
}

/**
 * API 3: PUT /api/admin/company
 * Updates company profile, branding, and system settings.
 */
export async function updateCompanyConfig(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
    const parseResult = updateCompanySchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors[0]?.message || 'Invalid company configuration payload';
      res.status(400).json({
        success: false,
        error: {
          message: errorMessage,
          statusCode: 400,
        },
      });
      return;
    }

    const validatedData = parseResult.data;

    // Resolve target company ID from:
    // 1. Authenticated user's companyId
    // 2. Body companyId or id
    let targetCompanyId: string | null = null;
    const userCompanyId = req.user?.companyId;

    if (isValidUuid(userCompanyId)) {
      targetCompanyId = userCompanyId;
    } else if (isValidUuid(validatedData.companyId)) {
      targetCompanyId = validatedData.companyId;
    } else if (isValidUuid(validatedData.id)) {
      targetCompanyId = validatedData.id;
    }

    let existingCompany: any = null;

    if (targetCompanyId) {
      const findSql = `SELECT id, name, domain, logo_url, settings, created_at, updated_at FROM companies WHERE id = $1 LIMIT 1;`;
      const findRes = await query(findSql, [targetCompanyId]);
      if (findRes.rows.length > 0) {
        existingCompany = findRes.rows[0];
      }
    }

    // If still no company found by ID, look for the first created company
    if (!existingCompany) {
      const fallbackSql = `SELECT id, name, domain, logo_url, settings, created_at, updated_at FROM companies ORDER BY created_at ASC LIMIT 1;`;
      const fallbackRes = await query(fallbackSql);
      if (fallbackRes.rows.length > 0) {
        existingCompany = fallbackRes.rows[0];
        targetCompanyId = existingCompany.id;
      }
    }

    let updatedCompany: any;

    if (existingCompany) {
      // Prevent unintended overwriting by preserving existing fields unless explicitly provided
      const resolvedName = validatedData.name !== undefined ? validatedData.name : existingCompany.name;
      const resolvedDomain = validatedData.domain !== undefined ? validatedData.domain : existingCompany.domain;
      const incomingLogo = validatedData.logoUrl !== undefined ? validatedData.logoUrl : validatedData.logo_url;
      const resolvedLogo = incomingLogo !== undefined ? incomingLogo : existingCompany.logo_url;

      // Merge new settings with existing settings JSONB without wiping out existing keys
      const currentSettings = typeof existingCompany.settings === 'object' && existingCompany.settings !== null ? existingCompany.settings : {};
      const newSettings = validatedData.settings && typeof validatedData.settings === 'object' ? validatedData.settings : {};
      const mergedSettings = { ...currentSettings, ...newSettings };

      const updateSql = `
        UPDATE companies
        SET
          name = $1,
          domain = $2,
          logo_url = $3,
          settings = $4,
          updated_at = NOW()
        WHERE id = $5
        RETURNING id, name, domain, logo_url, settings, created_at, updated_at;
      `;
      const updateRes = await query(updateSql, [
        resolvedName,
        resolvedDomain,
        resolvedLogo,
        JSON.stringify(mergedSettings),
        existingCompany.id,
      ]);
      updatedCompany = updateRes.rows[0];
    } else {
      // If no company exists in the database, bootstrap initial company
      const initialName = validatedData.name || 'Smart ATS Company';
      const initialDomain = validatedData.domain || null;
      const initialLogo = validatedData.logoUrl || validatedData.logo_url || null;
      const initialSettings = validatedData.settings || {};

      const insertSql = `
        INSERT INTO companies (name, domain, logo_url, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, name, domain, logo_url, settings, created_at, updated_at;
      `;
      const insertRes = await query(insertSql, [
        initialName,
        initialDomain,
        initialLogo,
        JSON.stringify(initialSettings),
      ]);
      updatedCompany = insertRes.rows[0];

      // Associate admin user with newly created company if user has no company_id
      if (req.user?.uid) {
        try {
          await query(`UPDATE users SET company_id = $1 WHERE firebase_uid = $2;`, [updatedCompany.id, req.user.uid]);
        } catch (linkErr: any) {
          console.warn(`[Admin Company Config] Could not link admin to new company: ${linkErr.message}`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Company configuration updated successfully',
      company: updatedCompany,
    });
  } catch (error: any) {
    console.error('[Admin Update Company Config Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update company configuration',
        statusCode: 500,
        ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
      },
    });
  }
}

