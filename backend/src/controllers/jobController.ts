import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalizes query string parameter preventing HTTP Parameter Pollution (HPP)
 */
function getSingleParam(val: unknown): string | undefined {
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0].trim();
  return undefined;
}

export const createJobSchema = z
  .object({
    title: z.string().trim().min(3, 'Job title must be at least 3 characters').max(255),
    description: z.string().trim().min(10, 'Job description must be at least 10 characters'),
    department: z.string().trim().max(100).optional().default('General'),
    location: z.string().trim().max(100).optional().default('Remote'),
    employment_type: z.string().trim().max(50).optional().default('Full-time'),
    salary_min: z.number().int().nonnegative().max(2147483647, 'Salary cannot exceed 2,147,483,647').optional().nullable(),
    salary_max: z.number().int().nonnegative().max(2147483647, 'Salary cannot exceed 2,147,483,647').optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional().default('DRAFT'),
    company_id: z.string().regex(UUID_REGEX, 'Invalid company UUID').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.salary_min != null && data.salary_max != null) {
        return data.salary_min <= data.salary_max;
      }
      return true;
    },
    {
      message: 'salary_min cannot be greater than salary_max',
      path: ['salary_min'],
    }
  );

export const updateJobSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    description: z.string().trim().min(10).optional(),
    department: z.string().trim().max(100).optional(),
    location: z.string().trim().max(100).optional(),
    employment_type: z.string().trim().max(50).optional(),
    salary_min: z.number().int().nonnegative().max(2147483647, 'Salary cannot exceed 2,147,483,647').optional().nullable(),
    salary_max: z.number().int().nonnegative().max(2147483647, 'Salary cannot exceed 2,147,483,647').optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  })
  .refine(
    (data) => {
      if (data.salary_min != null && data.salary_max != null) {
        return data.salary_min <= data.salary_max;
      }
      return true;
    },
    {
      message: 'salary_min cannot be greater than salary_max',
      path: ['salary_min'],
    }
  );

export const updateJobStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'], {
    errorMap: () => ({ message: 'Status must be one of DRAFT, PUBLISHED, CLOSED, or ARCHIVED' }),
  }),
});

/**
 * GET /api/jobs
 * Paginated list of jobs with filtering by status, department, location, employment type, salary, and search keyword.
 * Defensive boundary checks clamp pagination parameters safely.
 */
export const listJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Defensive pagination bounds checking (Fuzz & boundary hardening)
    const rawPageParam = getSingleParam(req.query.page);
    let rawPage = parseInt(rawPageParam as string, 10);
    if (isNaN(rawPage) || rawPage < 1) rawPage = 1;
    if (rawPage > 100000) rawPage = 100000;

    const rawLimitParam = getSingleParam(req.query.limit);
    let rawLimit = parseInt(rawLimitParam as string, 10);
    if (isNaN(rawLimit) || rawLimit < 1) rawLimit = 20;
    if (rawLimit > 100) rawLimit = 100;

    const page = rawPage;
    const limit = rawLimit;
    const offset = (page - 1) * limit;

    const statusParam = getSingleParam(req.query.status);
    const departmentParam = getSingleParam(req.query.department);
    const locationParam = getSingleParam(req.query.location);
    const empTypeParam = getSingleParam(req.query.employment_type || req.query.type);
    const qParam = getSingleParam(req.query.q);
    const companyIdParam = getSingleParam(req.query.company_id);
    const minSalaryParam = getSingleParam(req.query.min_salary || req.query.salary_min);
    const maxSalaryParam = getSingleParam(req.query.max_salary || req.query.salary_max);

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Default: non-admin/HR users only see PUBLISHED jobs unless a status filter is explicitly permitted
    const userRole = (req.user?.role || '').toUpperCase();
    const isStaff = userRole === 'ADMIN' || userRole === 'HR' || userRole === 'SUPER_ADMIN';

    let hrCompanyId: string | null = null;
    if (userRole === 'HR') {
      hrCompanyId = req.user?.companyId || null;
      if (!hrCompanyId && req.user?.uid) {
        const userRes = await pool.query('SELECT company_id FROM users WHERE firebase_uid = $1;', [req.user.uid]);
        hrCompanyId = userRes.rows[0]?.company_id || null;
      }
      if (!hrCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: HR user has no assigned company', statusCode: 403 },
        });
        return;
      }
    }

    if (statusParam) {
      const normalizedStatus = statusParam.toUpperCase();
      const validStatuses = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];
      if (validStatuses.includes(normalizedStatus)) {
        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
          conditions.push(`j.status = $${paramIndex++}`);
          values.push(normalizedStatus);
        } else if (userRole === 'HR') {
          if (normalizedStatus === 'PUBLISHED') {
            conditions.push(`j.status = $${paramIndex++}`);
            values.push('PUBLISHED');
          } else {
            conditions.push(`j.status = $${paramIndex++}`);
            values.push(normalizedStatus);
            conditions.push(`j.company_id = $${paramIndex++}`);
            values.push(hrCompanyId);
          }
        } else if (normalizedStatus === 'PUBLISHED') {
          conditions.push(`j.status = 'PUBLISHED'`);
        } else {
          conditions.push(`j.status = 'PUBLISHED'`);
        }
      } else {
        // Defensive check: filter for non-existent status yields 0 rows or fallback safely without SQL syntax error
        if (isStaff) {
          conditions.push(`1 = 0`);
        } else {
          conditions.push(`j.status = 'PUBLISHED'`);
        }
      }
    } else if (userRole === 'HR') {
      // HR viewing job directory without status filter: can view all PUBLISHED jobs plus non-published jobs from their company
      conditions.push(`(j.status = 'PUBLISHED' OR j.company_id = $${paramIndex++})`);
      values.push(hrCompanyId);
    } else if (!isStaff) {
      conditions.push(`j.status = 'PUBLISHED'`);
    }

    if (departmentParam) {
      conditions.push(`j.department ILIKE $${paramIndex++}`);
      values.push(`%${departmentParam}%`);
    }

    if (locationParam) {
      conditions.push(`j.location ILIKE $${paramIndex++}`);
      values.push(`%${locationParam}%`);
    }

    if (empTypeParam) {
      conditions.push(`j.employment_type ILIKE $${paramIndex++}`);
      values.push(`%${empTypeParam}%`);
    }

    if (companyIdParam && UUID_REGEX.test(companyIdParam)) {
      conditions.push(`j.company_id = $${paramIndex++}`);
      values.push(companyIdParam);
    }

    if (minSalaryParam) {
      const parsedMin = parseInt(minSalaryParam, 10);
      if (!isNaN(parsedMin) && parsedMin >= 0) {
        const clampedMin = Math.min(parsedMin, 2147483647);
        conditions.push(`(j.salary_max IS NULL OR j.salary_max >= $${paramIndex++})`);
        values.push(clampedMin);
      }
    }

    if (maxSalaryParam) {
      const parsedMax = parseInt(maxSalaryParam, 10);
      if (!isNaN(parsedMax) && parsedMax >= 0) {
        const clampedMax = Math.min(parsedMax, 2147483647);
        conditions.push(`(j.salary_min IS NULL OR j.salary_min <= $${paramIndex++})`);
        values.push(clampedMax);
      }
    }

    if (qParam) {
      const sanitizedQ = `%${qParam}%`;
      conditions.push(`(j.title ILIKE $${paramIndex} OR j.description ILIKE $${paramIndex} OR j.department ILIKE $${paramIndex} OR j.location ILIKE $${paramIndex})`);
      values.push(sanitizedQ);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*)::int AS total FROM jobs j ${whereClause};`;
    const countResult = await pool.query(countSql, values);
    const total = countResult.rows[0]?.total || 0;

    const dataSql = `
      SELECT 
        j.id,
        j.company_id,
        c.name AS company_name,
        c.logo_url AS company_logo,
        j.title,
        j.description,
        j.department,
        j.location,
        j.employment_type,
        j.salary_min,
        j.salary_max,
        j.status,
        j.published_at,
        j.closed_at,
        j.created_by,
        u.full_name AS creator_name,
        j.created_at,
        j.updated_at
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN users u ON j.created_by = u.id
      ${whereClause}
      ORDER BY 
        CASE WHEN j.status = 'PUBLISHED' THEN 0 ELSE 1 END,
        j.published_at DESC NULLS LAST,
        j.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    values.push(limit, offset);
    const dataResult = await pool.query(dataSql, values);

    res.status(200).json({
      success: true,
      jobs: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('[Job Controller - List Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve jobs directory', statusCode: 500 },
    });
  }
};

/**
 * GET /api/jobs/:id
 * Retrieve a single job by UUID.
 * Candidate & public visitors can only access PUBLISHED requisitions.
 */
export const getJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid job UUID format', statusCode: 400 },
      });
      return;
    }

    const query = `
      SELECT 
        j.id,
        j.company_id,
        c.name AS company_name,
        c.logo_url AS company_logo,
        j.title,
        j.description,
        j.department,
        j.location,
        j.employment_type,
        j.salary_min,
        j.salary_max,
        j.status,
        j.published_at,
        j.closed_at,
        j.created_by,
        u.full_name AS creator_name,
        j.created_at,
        j.updated_at
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN users u ON j.created_by = u.id
      WHERE j.id = $1;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Job not found', statusCode: 404 },
      });
      return;
    }

    const job = result.rows[0];
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    // Gate unreleased non-published drafts from candidates/public and cross-company HR
    if (job.status !== 'PUBLISHED') {
      if (isAdmin) {
        // Global administrative access allowed
      } else if (userRole === 'HR') {
        let hrCompanyId = req.user?.companyId;
        if (!hrCompanyId && req.user?.uid) {
          const userRes = await pool.query('SELECT company_id FROM users WHERE firebase_uid = $1;', [req.user.uid]);
          hrCompanyId = userRes.rows[0]?.company_id || null;
        }
        if (!hrCompanyId || !job.company_id || hrCompanyId !== job.company_id) {
          res.status(403).json({
            success: false,
            error: {
              message: !hrCompanyId
                ? 'Forbidden: HR user has no assigned company'
                : 'Forbidden: You are not authorized to view unreleased job requisitions belonging to another organization',
              statusCode: 403,
            },
          });
          return;
        }
      } else {
        res.status(404).json({
          success: false,
          error: { message: 'Job not found', statusCode: 404 },
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      job,
    });
  } catch (error: any) {
    console.error('[Job Controller - Get Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve job details', statusCode: 500 },
    });
  }
};

/**
 * POST /api/jobs
 * Creates a new job requisition. Enforced for ADMIN and HR roles.
 */
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      department,
      location,
      employment_type,
      salary_min,
      salary_max,
      status,
      company_id,
    } = req.body;

    const firebaseUid = req.user?.uid;

    // Resolve creator's PostgreSQL user ID and company_id
    let creatorId: string | null = null;
    let targetCompanyId: string | null = null;

    if (firebaseUid) {
      const userRes = await pool.query('SELECT id, company_id FROM users WHERE firebase_uid = $1;', [firebaseUid]);
      if (userRes.rows.length > 0) {
        creatorId = userRes.rows[0].id;
        // Tenant isolation: HR users must always create jobs strictly under their own assigned company
        if (req.user?.role === 'HR') {
          targetCompanyId = userRes.rows[0].company_id || req.user?.companyId || null;
        } else {
          targetCompanyId = company_id || userRes.rows[0].company_id || null;
        }
      }
    }

    if (req.user?.role === 'HR') {
      if (!targetCompanyId) {
        targetCompanyId = req.user?.companyId || null;
      }
      if (!targetCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: HR user has no assigned company', statusCode: 403 },
        });
        return;
      }
    } else if (!targetCompanyId) {
      targetCompanyId = company_id || null;
    }

    // Fallback: If no company assigned, attach to default primary company
    if (!targetCompanyId) {
      const compRes = await pool.query('SELECT id FROM companies ORDER BY created_at ASC LIMIT 1;');
      if (compRes.rows.length > 0) {
        targetCompanyId = compRes.rows[0].id;
      } else {
        // Auto-provision a default company if none exists
        const newComp = await pool.query(
          "INSERT INTO companies (name, domain) VALUES ('Smart ATS Enterprise', 'ats.local') RETURNING id;"
        );
        targetCompanyId = newComp.rows[0].id;
      }
    }

    const isPublished = status === 'PUBLISHED';
    const publishedAt = isPublished ? new Date() : null;

    const insertSql = `
      INSERT INTO jobs (
        company_id,
        created_by,
        title,
        description,
        department,
        location,
        employment_type,
        salary_min,
        salary_max,
        status,
        published_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *;
    `;

    const values = [
      targetCompanyId,
      creatorId,
      title,
      description,
      department,
      location,
      employment_type,
      salary_min != null ? salary_min : null,
      salary_max != null ? salary_max : null,
      status,
      publishedAt,
    ];

    const result = await pool.query(insertSql, values);

    res.status(201).json({
      success: true,
      message: 'Job requisition created successfully',
      job: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Job Controller - Create Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create job requisition', statusCode: 500 },
    });
  }
};

/**
 * PUT /api/jobs/:id
 * Updates an existing job requisition.
 */
export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid job UUID format', statusCode: 400 },
      });
      return;
    }

    const existingRes = await pool.query('SELECT * FROM jobs WHERE id = $1;', [id]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Job not found', statusCode: 404 },
      });
      return;
    }

    const currentJob = existingRes.rows[0];

    // Tenant isolation: HR users can only modify jobs in their own company (strict fail-closed)
    if (req.user?.role === 'HR') {
      let userCompanyId = req.user.companyId;
      if (!userCompanyId && req.user.uid) {
        const userRes = await pool.query('SELECT company_id FROM users WHERE firebase_uid = $1;', [req.user.uid]);
        userCompanyId = userRes.rows[0]?.company_id || null;
      }
      if (!userCompanyId || !currentJob.company_id || currentJob.company_id !== userCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You are not authorized to modify job requisitions belonging to another organization', statusCode: 403 },
        });
        return;
      }
    }

    const {
      title = currentJob.title,
      description = currentJob.description,
      department = currentJob.department,
      location = currentJob.location,
      employment_type = currentJob.employment_type,
      salary_min = currentJob.salary_min,
      salary_max = currentJob.salary_max,
      status = currentJob.status,
    } = req.body;

    let publishedAt = currentJob.published_at;
    let closedAt = currentJob.closed_at;

    if (status === 'PUBLISHED') {
      if (currentJob.status !== 'PUBLISHED' || !publishedAt) {
        publishedAt = new Date();
      }
      closedAt = null; // Reopening clears closed_at
    } else if (status === 'CLOSED') {
      if (currentJob.status !== 'CLOSED' || !closedAt) {
        closedAt = new Date();
      }
    } else if (status === 'DRAFT') {
      publishedAt = null;
      closedAt = null;
    }

    const updateSql = `
      UPDATE jobs
      SET
        title = $1,
        description = $2,
        department = $3,
        location = $4,
        employment_type = $5,
        salary_min = $6,
        salary_max = $7,
        status = $8,
        published_at = $9,
        closed_at = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *;
    `;

    const result = await pool.query(updateSql, [
      title,
      description,
      department,
      location,
      employment_type,
      salary_min != null ? salary_min : null,
      salary_max != null ? salary_max : null,
      status,
      publishedAt,
      closedAt,
      id,
    ]);

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      job: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Job Controller - Update Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update job', statusCode: 500 },
    });
  }
};

/**
 * PATCH /api/jobs/:id/status
 * Updates the lifecycle state of a job (DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED).
 */
export const updateJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid job UUID format', statusCode: 400 },
      });
      return;
    }

    const existingRes = await pool.query('SELECT status, published_at, closed_at, company_id FROM jobs WHERE id = $1;', [id]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Job not found', statusCode: 404 },
      });
      return;
    }

    const current = existingRes.rows[0];

    // Tenant isolation: HR users can only modify jobs in their own company (strict fail-closed)
    if (req.user?.role === 'HR') {
      let userCompanyId = req.user.companyId;
      if (!userCompanyId && req.user.uid) {
        const userRes = await pool.query('SELECT company_id FROM users WHERE firebase_uid = $1;', [req.user.uid]);
        userCompanyId = userRes.rows[0]?.company_id || null;
      }
      if (!userCompanyId || !current.company_id || current.company_id !== userCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You are not authorized to modify job requisitions belonging to another organization', statusCode: 403 },
        });
        return;
      }
    }

    let publishedAt = current.published_at;
    let closedAt = current.closed_at;

    if (status === 'PUBLISHED') {
      if (!publishedAt) {
        publishedAt = new Date();
      }
      closedAt = null; // Reopening clears closed_at
    } else if (status === 'CLOSED') {
      if (!closedAt) {
        closedAt = new Date();
      }
    } else if (status === 'DRAFT') {
      publishedAt = null;
      closedAt = null;
    }

    const updateSql = `
      UPDATE jobs
      SET 
        status = $1,
        published_at = $2,
        closed_at = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `;

    const result = await pool.query(updateSql, [status, publishedAt, closedAt, id]);

    res.status(200).json({
      success: true,
      message: `Job status updated to ${status}`,
      job: result.rows[0],
    });
  } catch (error: any) {
    console.error('[Job Controller - Status Update Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update job status', statusCode: 500 },
    });
  }
};
