import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { syncUserClaims, revokeUserSessions } from '../services/claimsSyncService';

const RoleSchema = z.enum(['ADMIN', 'HR', 'CANDIDATE']);

const UpdateRoleSchema = z.object({
  role: RoleSchema,
});

const UpdateStatusSchema = z.object({
  isActive: z.boolean(),
});

const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().max(255).optional().nullable(),
  logoUrl: z.string().url().max(1000).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * GET /api/admin/users
 * Lists users with optional pagination, role filter, and keyword search
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const roleFilter = req.query.role ? String(req.query.role).toUpperCase() : null;
    const searchQuery = req.query.q ? String(req.query.q).trim() : null;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (roleFilter && ['ADMIN', 'HR', 'CANDIDATE'].includes(roleFilter)) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(roleFilter);
    }

    if (searchQuery) {
      conditions.push(`(email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM users ${whereClause};`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const listSql = `
      SELECT id, firebase_uid, email, full_name, role, company_id, avatar_url, is_active, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const listRes = await query(listSql, [...params, limit, offset]);

    res.status(200).json({
      success: true,
      users: listRes.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('[AdminController.listUsers Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user directory',
    });
  }
}

/**
 * PATCH /api/admin/users/:id/role
 * Updates a user's role and synchronizes their Firebase custom claims
 */
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id;
    const parseResult = UpdateRoleSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid role supplied. Role must be ADMIN, HR, or CANDIDATE.',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { role: newRole } = parseResult.data;

    // Check if target user exists
    const userRes = await query(
      'SELECT id, firebase_uid, email, role, company_id, is_active FROM users WHERE id = $1;',
      [userId]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: `User with ID "${userId}" does not exist`,
      });
      return;
    }

    const targetUser = userRes.rows[0];

    // Prevent Admin from removing their own admin privilege
    if (req.user?.uid === targetUser.firebase_uid && newRole !== 'ADMIN') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Admins cannot revoke their own administrator privileges',
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
    const updateRes = await query(updateSql, [newRole, userId]);
    const updatedUser = updateRes.rows[0];

    // Mirror to Firebase custom claims
    try {
      await syncUserClaims(targetUser.firebase_uid, newRole, targetUser.company_id);
    } catch (fbErr: any) {
      console.warn(`[AdminController] Firebase claim sync failed for ${targetUser.firebase_uid}: ${fbErr.message}`);
    }

    res.status(200).json({
      success: true,
      message: `User role updated to "${newRole}"`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[AdminController.updateUserRole Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user role',
    });
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Activates or deactivates a user account
 */
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id;
    const parseResult = UpdateStatusSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'isActive boolean property is required',
      });
      return;
    }

    const { isActive } = parseResult.data;

    // Fetch user
    const userRes = await query(
      'SELECT id, firebase_uid, is_active FROM users WHERE id = $1;',
      [userId]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    const targetUser = userRes.rows[0];

    // Prevent self-deactivation
    if (req.user?.uid === targetUser.firebase_uid && !isActive) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Administrators cannot deactivate their own active account',
      });
      return;
    }

    // Update in database
    const updateRes = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, firebase_uid, email, full_name, role, is_active, updated_at;',
      [isActive, userId]
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
      error: 'Internal Server Error',
      message: 'Failed to update user status',
    });
  }
}

/**
 * GET /api/admin/company
 * Fetches company profile and settings
 */
export async function getCompany(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.user?.companyId;

    let companyRes;
    if (companyId) {
      companyRes = await query('SELECT * FROM companies WHERE id = $1;', [companyId]);
    } else {
      companyRes = await query('SELECT * FROM companies ORDER BY created_at ASC LIMIT 1;');
    }

    if (companyRes.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No company profile configured yet',
      });
      return;
    }

    res.status(200).json({
      success: true,
      company: companyRes.rows[0],
    });
  } catch (error: any) {
    console.error('[AdminController.getCompany Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve company profile',
    });
  }
}

/**
 * PUT /api/admin/company
 * Updates company profile and configuration
 */
export async function updateCompany(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = UpdateCompanySchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid company payload',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { name, domain, logoUrl, settings } = parseResult.data;
    const companyId = req.user?.companyId;

    // Find company to update or update first existing
    let targetId = companyId;
    if (!targetId) {
      const firstComp = await query('SELECT id FROM companies ORDER BY created_at ASC LIMIT 1;');
      targetId = firstComp.rows[0]?.id;
    }

    if (!targetId) {
      // Create new company if none exist
      const insertRes = await query(
        `
        INSERT INTO companies (name, domain, logo_url, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *;
        `,
        [name || 'Smart ATS Org', domain || null, logoUrl || null, JSON.stringify(settings || {})]
      );

      res.status(200).json({
        success: true,
        message: 'Company initialized successfully',
        company: insertRes.rows[0],
      });
      return;
    }

    const updateSql = `
      UPDATE companies
      SET
        name = COALESCE($1, name),
        domain = COALESCE($2, domain),
        logo_url = COALESCE($3, logo_url),
        settings = COALESCE($4, settings),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;

    const updateRes = await query(updateSql, [
      name || null,
      domain !== undefined ? domain : null,
      logoUrl !== undefined ? logoUrl : null,
      settings ? JSON.stringify(settings) : null,
      targetId,
    ]);

    res.status(200).json({
      success: true,
      message: 'Company configuration saved',
      company: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error('[AdminController.updateCompany Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update company configuration',
    });
  }
}
