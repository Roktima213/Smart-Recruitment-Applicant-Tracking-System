import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
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
  role: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
    z.enum(ALLOWED_ADMIN_ROLES, {
      errorMap: () => ({ message: 'Invalid role. Supported roles are: ADMIN, HR, CANDIDATE' }),
    })
  ),
});

const updateStatusSchema = z
  .object({
    isActive: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => data.isActive !== undefined || data.is_active !== undefined, {
    message: 'isActive or is_active boolean property is required',
  })
  .transform((data) => ({
    isActive: (data.isActive !== undefined ? data.isActive : data.is_active) as boolean,
  }));

const inviteUserSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  fullName: z.string().trim().min(1, 'Full name cannot be empty').max(255).optional(),
  full_name: z.string().trim().min(1, 'Full name cannot be empty').max(255).optional(),
  companyId: z.string().trim().optional().nullable(),
  company_id: z.string().trim().optional().nullable(),
  role: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
    z.enum(ALLOWED_ADMIN_ROLES, {
      errorMap: () => ({ message: 'Invalid role. Supported roles are: ADMIN, HR, CANDIDATE' }),
    })
  ).default('HR'),
});

const updateCompanySchema = z
  .object({
    id: z.string().trim().optional(),
    companyId: z.string().trim().optional(),
    name: z.string().trim().min(1, 'Company name cannot be empty').max(255).optional(),
    domain: z.string().trim().max(255).optional().nullable(),
    logoUrl: z.string().trim().max(2048).optional().nullable(),
    logo_url: z.string().trim().max(2048).optional().nullable(),
    industry: z.string().trim().max(255).optional().nullable(),
    portal_url: z.string().trim().max(2048).optional().nullable(),
    portalUrl: z.string().trim().max(2048).optional().nullable(),
    verified: z.boolean().optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .passthrough();

/**
 * Formats company database row to ensure standard enterprise settings are exposed at top level.
 */
function formatCompanyResponse(row: any): any {
  if (!row) return null;
  const settings = typeof row.settings === 'object' && row.settings !== null ? row.settings : {};
  return {
    ...row,
    industry: settings.industry ?? row.industry ?? 'Technology',
    portal_url: settings.portal_url ?? row.portal_url ?? (row.domain ? `https://careers.${row.domain}` : 'https://careers.ats.local'),
    portalUrl: settings.portal_url ?? row.portal_url ?? (row.domain ? `https://careers.${row.domain}` : 'https://careers.ats.local'),
    verified: settings.verified ?? row.verified ?? true,
    settings,
  };
}

/**
 * GET /api/admin/users
 * Retrieves all registered users with company information, optional search and role filtering.
 */
export async function listAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const rawOffset = Array.isArray(req.query.offset) ? req.query.offset[0] : req.query.offset;
    const rawRole = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role;
    const rawQ = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;

    const limit = Math.min(Math.max(Number(rawLimit) || 50, 1), 100);
    const offset = Math.max(Number(rawOffset) || 0, 0);
    const roleFilter = rawRole ? String(rawRole).trim().toUpperCase() : null;
    const searchQuery = rawQ ? String(rawQ).trim() : null;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (roleFilter && ['ADMIN', 'HR', 'CANDIDATE'].includes(roleFilter)) {
      conditions.push(`u.role = $${paramIndex++}`);
      params.push(roleFilter);
    }

    if (searchQuery) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM users u ${whereClause};`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const listSql = `
      SELECT 
        u.id,
        u.firebase_uid,
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
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const result = await query(listSql, [...params, limit, offset]);

    const formattedUsers = result.rows.map((row) => ({
      id: row.id,
      firebase_uid: row.firebase_uid,
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
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
    }));

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
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

export const listUsers = listAllUsers;

/**
 * PATCH /api/admin/users/:id/role
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

    // Prevent Admin from removing their own admin privilege
    if (req.user?.uid === targetUser.firebase_uid && role !== 'ADMIN') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Admins cannot revoke their own administrator privileges',
          statusCode: 400,
        },
      });
      return;
    }

    // If role is unchanged, return current state
    if (targetUser.role === role) {
      res.status(200).json({
        success: true,
        message: `User role is already ${role}`,
        user: targetUser,
      });
      return;
    }

    // Synchronize Firebase custom claims
    try {
      await syncUserClaims(targetUser.firebase_uid, role, targetUser.company_id);
    } catch (claimError: any) {
      console.error(`[Admin Role Update] Failed to sync Firebase claims: ${claimError.message}`);
      res.status(502).json({
        success: false,
        error: {
          message: `Failed to synchronize role claims with Firebase Auth: ${claimError.message}`,
          statusCode: 502,
        },
      });
      return;
    }

    // Update in database
    const updateSql = `
      UPDATE users
      SET role = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, firebase_uid, email, full_name, role, company_id, is_active, updated_at;
    `;
    const updateResult = await query(updateSql, [role, id]);

    res.status(200).json({
      success: true,
      message: `User role updated successfully to ${role}`,
      user: updateResult.rows[0],
    });
  } catch (error: any) {
    console.error('[Admin Update User Role Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update user role',
        statusCode: 500,
        ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
      },
    });
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Activates or deactivates a user account and revokes tokens upon deactivation.
 */
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
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
    const parseResult = updateStatusSchema.safeParse(rawBody);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'isActive boolean property is required',
          statusCode: 400,
        },
      });
      return;
    }

    const { isActive } = parseResult.data;

    // Fetch user
    const userRes = await query('SELECT id, firebase_uid, is_active, full_name FROM users WHERE id = $1;', [id]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'User not found', statusCode: 404 } });
      return;
    }

    const targetUser = userRes.rows[0];

    // Prevent self-deactivation
    if (req.user?.uid === targetUser.firebase_uid && !isActive) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Administrators cannot deactivate their own active account',
          statusCode: 400,
        },
      });
      return;
    }

    // Update in database
    const updateRes = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, firebase_uid, email, full_name, role, is_active, updated_at;',
      [isActive, id]
    );

    // If deactivated, revoke active Firebase refresh tokens
    if (!isActive) {
      try {
        await revokeUserSessions(targetUser.firebase_uid);
      } catch (err: any) {
        console.warn(`[AdminController] Token revocation warning: ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `User status changed to ${isActive ? 'Active' : 'Deactivated'}`,
      user: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error('[AdminController.updateUserStatus Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update user status',
        statusCode: 500,
      },
    });
  }
}

/**
 * GET /api/admin/company
 * Retrieves company configuration and settings.
 */
export async function getCompany(req: Request, res: Response): Promise<void> {
  try {
    const userCompanyId = req.user?.companyId;

    let companyRes;
    if (isValidUuid(userCompanyId)) {
      companyRes = await query('SELECT * FROM companies WHERE id = $1 LIMIT 1;', [userCompanyId]);
    } else {
      companyRes = await query('SELECT * FROM companies ORDER BY created_at ASC LIMIT 1;');
    }

    if (companyRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'No company profile configured yet',
          statusCode: 404,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      company: formatCompanyResponse(companyRes.rows[0]),
    });
  } catch (error: any) {
    console.error('[Admin Get Company Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve company profile',
        statusCode: 500,
      },
    });
  }
}

export const getCompanyConfiguration = getCompany;

/**
 * PUT /api/admin/company
 * Updates company profile, branding, and system settings.
 */
export async function updateCompany(req: Request, res: Response): Promise<void> {
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
      const resolvedName = validatedData.name !== undefined ? validatedData.name : existingCompany.name;
      const resolvedDomain = validatedData.domain !== undefined ? validatedData.domain : existingCompany.domain;
      const incomingLogo = validatedData.logoUrl !== undefined ? validatedData.logoUrl : validatedData.logo_url;
      const resolvedLogo = incomingLogo !== undefined ? incomingLogo : existingCompany.logo_url;

      const currentSettings = typeof existingCompany.settings === 'object' && existingCompany.settings !== null ? existingCompany.settings : {};
      const newSettings = validatedData.settings && typeof validatedData.settings === 'object' ? validatedData.settings : {};
      const customProps: Record<string, unknown> = {};
      if (validatedData.industry !== undefined) customProps.industry = validatedData.industry;
      if (validatedData.portal_url !== undefined) customProps.portal_url = validatedData.portal_url;
      if (validatedData.portalUrl !== undefined) customProps.portal_url = validatedData.portalUrl;
      if (validatedData.verified !== undefined) customProps.verified = validatedData.verified;

      const mergedSettings = { ...currentSettings, ...customProps, ...newSettings };

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
      const initialName = validatedData.name || 'Smart ATS Company';
      const initialDomain = validatedData.domain || null;
      const initialLogo = validatedData.logoUrl || validatedData.logo_url || null;
      const initialCustomProps: Record<string, unknown> = {};
      if (validatedData.industry !== undefined) initialCustomProps.industry = validatedData.industry;
      if (validatedData.portal_url !== undefined) initialCustomProps.portal_url = validatedData.portal_url;
      if (validatedData.portalUrl !== undefined) initialCustomProps.portal_url = validatedData.portalUrl;
      if (validatedData.verified !== undefined) initialCustomProps.verified = validatedData.verified;

      const initialSettings = { ...initialCustomProps, ...(validatedData.settings || {}) };

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
      company: formatCompanyResponse(updatedCompany),
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

export const updateCompanyConfig = updateCompany;
export const updateCompanyConfiguration = updateCompany;

/**
 * POST /api/admin/users/invite
 * Provisions an invited user, associates their company, and sets initial claims.
 */
export async function inviteUser(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
    const parseResult = inviteUserSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors[0]?.message || 'Invalid invite payload';
      res.status(400).json({
        success: false,
        error: { message: errorMessage, statusCode: 400 },
      });
      return;
    }

    const { email, role } = parseResult.data;
    const resolvedFullName = parseResult.data.fullName || parseResult.data.full_name || email.split('@')[0];
    const incomingCompanyId = parseResult.data.companyId || parseResult.data.company_id;

    // Check if user already exists
    const existing = await query('SELECT id, firebase_uid, email, role, company_id, is_active FROM users WHERE LOWER(email) = LOWER($1);', [email]);
    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];

      // Prevent Admin from removing their own admin privilege via invite
      if (req.user?.uid === existingUser.firebase_uid && role !== 'ADMIN') {
        res.status(400).json({
          success: false,
          error: {
            message: 'Admins cannot revoke their own administrator privileges',
            statusCode: 400,
          },
        });
        return;
      }

      const targetCompanyId = (isValidUuid(incomingCompanyId) ? incomingCompanyId : null) || existingUser.company_id || req.user?.companyId || null;

      const updated = await query(
        'UPDATE users SET role = $1, company_id = COALESCE($2, company_id), is_active = true, updated_at = NOW() WHERE id = $3 RETURNING *;',
        [role, targetCompanyId, existingUser.id]
      );
      try {
        await syncUserClaims(existingUser.firebase_uid, role, targetCompanyId);
      } catch (e: any) {
        console.warn(`[Invite] Firebase claims sync warning: ${e.message}`);
      }
      res.status(200).json({
        success: true,
        message: `Existing user updated to role ${role}`,
        user: updated.rows[0],
      });
      return;
    }

    const companyId = (isValidUuid(incomingCompanyId) ? incomingCompanyId : null) || req.user?.companyId || null;

    // Provision new invited user
    const syntheticUid = `invited_${crypto.randomUUID()}`;
    const insertRes = await query(
      `INSERT INTO users (firebase_uid, email, full_name, role, company_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING *;`,
      [syntheticUid, email.toLowerCase(), resolvedFullName, role, companyId]
    );

    const newUser = insertRes.rows[0];
    try {
      await syncUserClaims(syntheticUid, role, companyId);
    } catch (claimErr: any) {
      console.warn(`[Invite] Claims sync skipped for invited user: ${claimErr.message}`);
    }

    res.status(201).json({
      success: true,
      message: `User invited successfully as ${role}`,
      user: newUser,
    });
  } catch (error: any) {
    console.error('[Admin Invite User Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to invite user', statusCode: 500 },
    });
  }
}

/**
 * POST /api/auth/sync-claims or /api/admin/users/sync-claims
 * Re-synchronizes custom claims for active users with Firebase Admin Auth.
 */
export async function syncAllClaims(req: Request, res: Response): Promise<void> {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    let usersToSync;
    if (isAdmin) {
      usersToSync = await query('SELECT firebase_uid, role, company_id FROM users WHERE is_active = true;');
    } else if (req.user?.uid) {
      usersToSync = await query('SELECT firebase_uid, role, company_id FROM users WHERE firebase_uid = $1;', [req.user.uid]);
    } else {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
      return;
    }

    let syncedCount = 0;
    for (const row of usersToSync.rows) {
      try {
        await syncUserClaims(row.firebase_uid, row.role, row.company_id);
        syncedCount++;
      } catch (err: any) {
        console.warn(`[Sync Claims] Skipped ${row.firebase_uid}: ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully synchronized claims for ${syncedCount} user(s)`,
      syncedCount,
    });
  } catch (error: any) {
    console.error('[Sync All Claims Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to synchronize claims', statusCode: 500 },
    });
  }
}
