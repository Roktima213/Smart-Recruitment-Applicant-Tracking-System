import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod validation schema for scheduling an interview event
 */
export const createInterviewSchema = z
  .object({
    application_id: z.string().regex(UUID_REGEX, 'Invalid application UUID format').optional(),
    applicationId: z.string().regex(UUID_REGEX, 'Invalid application UUID format').optional(),
    interviewer_id: z.string().regex(UUID_REGEX, 'Invalid interviewer UUID format').optional(),
    interviewerId: z.string().regex(UUID_REGEX, 'Invalid interviewer UUID format').optional(),
    title: z.string().trim().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
    description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional().nullable(),
    scheduled_start: z.string().trim().optional(),
    scheduledStart: z.string().trim().optional(),
    scheduled_end: z.string().trim().optional(),
    scheduledEnd: z.string().trim().optional(),
    location_or_link: z.string().trim().max(2048, 'Location or link cannot exceed 2048 characters').optional().nullable(),
    locationOrLink: z.string().trim().max(2048, 'Location or link cannot exceed 2048 characters').optional().nullable(),
  })
  .refine(
    (data) => Boolean(data.application_id || data.applicationId),
    { message: 'application_id is required', path: ['application_id'] }
  )
  .refine(
    (data) => Boolean(data.interviewer_id || data.interviewerId),
    { message: 'interviewer_id is required', path: ['interviewer_id'] }
  )
  .refine(
    (data) => Boolean(data.scheduled_start || data.scheduledStart),
    { message: 'scheduled_start is required', path: ['scheduled_start'] }
  )
  .refine(
    (data) => Boolean(data.scheduled_end || data.scheduledEnd),
    { message: 'scheduled_end is required', path: ['scheduled_end'] }
  )
  .refine(
    (data) => {
      const rawStart = data.scheduled_start || data.scheduledStart;
      const rawEnd = data.scheduled_end || data.scheduledEnd;
      if (!rawStart || !rawEnd) return false;
      const start = new Date(rawStart);
      const end = new Date(rawEnd);
      return !isNaN(start.getTime()) && !isNaN(end.getTime());
    },
    { message: 'scheduled_start and scheduled_end must be valid date strings', path: ['scheduled_start'] }
  )
  .refine(
    (data) => {
      const rawStart = data.scheduled_start || data.scheduledStart;
      const rawEnd = data.scheduled_end || data.scheduledEnd;
      if (!rawStart || !rawEnd) return true;
      const start = new Date(rawStart);
      const end = new Date(rawEnd);
      return end.getTime() > start.getTime();
    },
    { message: 'scheduled_end must be strictly after scheduled_start', path: ['scheduled_end'] }
  );

/**
 * 1. POST /api/interviews
 * Schedules an interview with transactional advisory locking, overlap conflict detection,
 * fail-closed multi-tenant isolation, and automatic application stage updating.
 */
export async function scheduleInterview(req: Request, res: Response): Promise<void> {
  const client = await getClient();
  let inTransaction = false;

  try {
    const callerRole = (req.user?.role || '').toUpperCase();
    const callerUid = req.user?.uid;

    if (!callerUid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required prior to interview scheduling', statusCode: 401 },
      });
      return;
    }

    // Role check: Only HR, RECRUITER, ADMIN, SUPER_ADMIN permitted
    if (callerRole === 'CANDIDATE') {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Candidates are not permitted to schedule interviews', statusCode: 403 },
      });
      return;
    }

    // Resolve caller's database user record
    const callerRes = await query(
      'SELECT id, role, company_id, is_active FROM users WHERE firebase_uid = $1 LIMIT 1;',
      [callerUid]
    );

    if (callerRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Caller user record not found in database', statusCode: 404 },
      });
      return;
    }

    const callerUser = callerRes.rows[0];
    if (callerUser.is_active === false) {
      res.status(403).json({
        success: false,
        error: { message: 'Caller user account is deactivated', statusCode: 403 },
      });
      return;
    }

    // Extract payload fields
    const applicationId = req.body.application_id || req.body.applicationId;
    const interviewerId = req.body.interviewer_id || req.body.interviewerId;
    const title = (req.body.title || '').trim();
    const description = req.body.description !== undefined ? req.body.description : null;
    const rawStart = req.body.scheduled_start || req.body.scheduledStart;
    const rawEnd = req.body.scheduled_end || req.body.scheduledEnd;
    const locationOrLink = req.body.location_or_link !== undefined
      ? req.body.location_or_link
      : (req.body.locationOrLink !== undefined ? req.body.locationOrLink : null);

    // Validate format defensives
    if (!applicationId || !UUID_REGEX.test(applicationId)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or missing application ID format', statusCode: 400 },
      });
      return;
    }

    if (!interviewerId || !UUID_REGEX.test(interviewerId)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or missing interviewer ID format', statusCode: 400 },
      });
      return;
    }

    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid start or end date format', statusCode: 400 },
      });
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      res.status(400).json({
        success: false,
        error: { message: 'scheduled_end must be strictly after scheduled_start', statusCode: 400 },
      });
      return;
    }

    const scheduledStartIso = startDate.toISOString();
    const scheduledEndIso = endDate.toISOString();

    // Multi-tenant check 1: Target application & job company
    const appQuery = `
      SELECT 
        a.id,
        a.current_stage,
        a.candidate_id,
        j.id AS job_id,
        j.title AS job_title,
        j.company_id,
        c.name AS company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE a.id = $1
      LIMIT 1;
    `;
    const appRes = await query(appQuery, [applicationId]);

    if (appRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Application not found', statusCode: 404 },
      });
      return;
    }

    const appRow = appRes.rows[0];

    // Status transition business rule: Cannot schedule interview for rejected application
    if (appRow.current_stage === 'REJECTED') {
      res.status(400).json({
        success: false,
        error: { message: 'Cannot schedule an interview for an application in REJECTED stage', statusCode: 400 },
      });
      return;
    }

    // Multi-tenant check 2: Fail-closed organization check on caller
    const isSuperAdmin = callerRole === 'SUPER_ADMIN';
    const callerCompanyId = req.user?.companyId || callerUser.company_id;

    if (!isSuperAdmin) {
      if (!callerCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: User is not assigned to any organization', statusCode: 403 },
        });
        return;
      }

      if (appRow.company_id !== callerCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Application does not belong to your organization', statusCode: 403 },
        });
        return;
      }
    }

    // Multi-tenant check 3: Verify assigned interviewer belongs to the same target organization
    const interviewerRes = await query(
      'SELECT id, full_name, email, role, company_id, is_active FROM users WHERE id = $1 LIMIT 1;',
      [interviewerId]
    );

    if (interviewerRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Interviewer user record not found', statusCode: 404 },
      });
      return;
    }

    const interviewerUser = interviewerRes.rows[0];
    if (interviewerUser.is_active === false) {
      res.status(400).json({
        success: false,
        error: { message: 'Assigned interviewer account is deactivated', statusCode: 400 },
      });
      return;
    }

    if (interviewerUser.company_id !== appRow.company_id) {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Assigned interviewer does not belong to the target application organization', statusCode: 403 },
      });
      return;
    }

    // ========================================================================
    // ACID TRANSACTION WITH ADVISORY LOCK & OVERLAP DETECTION
    // ========================================================================
    await client.query('BEGIN');
    inTransaction = true;

    // 1. Transaction-scoped advisory lock: serializes scheduling attempts for this interviewer
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1));',
      [`interviewer_${interviewerId}`]
    );

    // 2. Overlap conflict query: ignores CANCELLED interviews
    // Overlap condition: existing.scheduled_start < requested.scheduled_end AND existing.scheduled_end > requested.scheduled_start
    const conflictSql = `
      SELECT id, title, scheduled_start, scheduled_end, status
      FROM interview_events
      WHERE interviewer_id = $1
        AND status != 'CANCELLED'
        AND scheduled_start < $3
        AND scheduled_end > $2
      LIMIT 1;
    `;
    const conflictRes = await client.query(conflictSql, [
      interviewerId,
      scheduledStartIso,
      scheduledEndIso,
    ]);

    if (conflictRes.rows.length > 0) {
      const conflictRow = conflictRes.rows[0];
      await client.query('ROLLBACK');
      inTransaction = false;

      res.status(409).json({
        success: false,
        error: {
          message: 'The selected interviewer has an overlapping interview scheduled during this time slot',
          statusCode: 409,
          conflict: {
            id: conflictRow.id,
            title: conflictRow.title,
            scheduledStart: conflictRow.scheduled_start,
            scheduledEnd: conflictRow.scheduled_end,
            status: conflictRow.status,
          },
        },
      });
      return;
    }

    // 3. Insert interview event
    const insertInterviewSql = `
      INSERT INTO interview_events (
        application_id,
        interviewer_id,
        title,
        description,
        scheduled_start,
        scheduled_end,
        location_or_link,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'SCHEDULED', $8)
      RETURNING id, application_id, interviewer_id, title, description, scheduled_start, scheduled_end, location_or_link, status, reschedule_count, created_by, created_at, updated_at;
    `;
    const insertRes = await client.query(insertInterviewSql, [
      applicationId,
      interviewerId,
      title,
      description,
      scheduledStartIso,
      scheduledEndIso,
      locationOrLink,
      callerUser.id,
    ]);
    const interview = insertRes.rows[0];

    // 4. Automatic Stage Transition to INTERVIEW (if currently APPLIED or SCREENING)
    let stageUpdated = false;
    if (appRow.current_stage === 'APPLIED' || appRow.current_stage === 'SCREENING') {
      const prevStage = appRow.current_stage;
      await client.query(
        'UPDATE applications SET current_stage = $1, updated_at = NOW() WHERE id = $2;',
        ['INTERVIEW', applicationId]
      );

      await client.query(
        `INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, reason)
         VALUES ($1, $2, 'INTERVIEW', $3, 'Stage transitioned automatically upon scheduling interview');`,
        [applicationId, prevStage, callerUser.id]
      );
      stageUpdated = true;
    }

    await client.query('COMMIT');
    inTransaction = false;

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      interview: {
        id: interview.id,
        applicationId: interview.application_id,
        interviewerId: interview.interviewer_id,
        title: interview.title,
        description: interview.description,
        scheduledStart: interview.scheduled_start,
        scheduledEnd: interview.scheduled_end,
        locationOrLink: interview.location_or_link,
        status: interview.status,
        rescheduleCount: interview.reschedule_count,
        createdBy: interview.created_by,
        createdAt: interview.created_at,
        updatedAt: interview.updated_at,
      },
      data: {
        id: interview.id,
        applicationId: interview.application_id,
        interviewerId: interview.interviewer_id,
        title: interview.title,
        description: interview.description,
        scheduledStart: interview.scheduled_start,
        scheduledEnd: interview.scheduled_end,
        locationOrLink: interview.location_or_link,
        status: interview.status,
        rescheduleCount: interview.reschedule_count,
        stageUpdated,
      },
    });
  } catch (error: any) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[Schedule Interview Rollback Error]', rollbackErr);
      }
    }

    console.error('[Schedule Interview Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to schedule interview',
        statusCode: 500,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
    });
  } finally {
    client.release();
  }
}

/**
 * 2. GET /api/interviews
 * Retrieves interview events with strict tenant and candidate isolation.
 */
export async function listInterviews(req: Request, res: Response): Promise<void> {
  try {
    const callerRole = (req.user?.role || '').toUpperCase();
    const callerUid = req.user?.uid;

    if (!callerUid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required prior to listing interviews', statusCode: 401 },
      });
      return;
    }

    // Resolve caller user record
    const callerRes = await query(
      'SELECT id, role, company_id, is_active FROM users WHERE firebase_uid = $1 LIMIT 1;',
      [callerUid]
    );

    if (callerRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Caller user record not found in database', statusCode: 404 },
      });
      return;
    }

    const callerUser = callerRes.rows[0];
    if (callerUser.is_active === false) {
      res.status(403).json({
        success: false,
        error: { message: 'Caller user account is deactivated', statusCode: 403 },
      });
      return;
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 1. Enforce Role & Tenant Boundaries
    if (callerRole === 'CANDIDATE') {
      // Candidate Isolation: can only retrieve interviews for their own applications
      const profileRes = await query(
        'SELECT id FROM candidate_profiles WHERE user_id = $1 LIMIT 1;',
        [callerUser.id]
      );

      if (profileRes.rows.length === 0) {
        // No candidate profile yet -> returns empty array
        res.status(200).json({
          success: true,
          interviews: [],
          data: [],
        });
        return;
      }

      const candidateProfileId = profileRes.rows[0].id;
      conditions.push(`a.candidate_id = $${paramIndex++}`);
      values.push(candidateProfileId);
    } else if (callerRole === 'SUPER_ADMIN') {
      // Super admin: system-wide, optional company_id filter
      const companyFilter = req.query.company_id || req.query.companyId;
      if (typeof companyFilter === 'string' && UUID_REGEX.test(companyFilter)) {
        conditions.push(`j.company_id = $${paramIndex++}`);
        values.push(companyFilter);
      }
    } else {
      // HR, RECRUITER, ADMIN: strictly tenant-isolated to their assigned company
      const callerCompanyId = req.user?.companyId || callerUser.company_id;
      if (!callerCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: User is not assigned to any organization', statusCode: 403 },
        });
        return;
      }

      conditions.push(`j.company_id = $${paramIndex++}`);
      values.push(callerCompanyId);
    }

    // 2. Optional query filters
    const statusFilter = req.query.status;
    if (typeof statusFilter === 'string' && ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'].includes(statusFilter.toUpperCase())) {
      conditions.push(`i.status = $${paramIndex++}`);
      values.push(statusFilter.toUpperCase());
    }

    const appFilter = req.query.application_id || req.query.applicationId;
    if (typeof appFilter === 'string' && UUID_REGEX.test(appFilter)) {
      conditions.push(`i.application_id = $${paramIndex++}`);
      values.push(appFilter);
    }

    const interviewerFilter = req.query.interviewer_id || req.query.interviewerId;
    if (typeof interviewerFilter === 'string' && UUID_REGEX.test(interviewerFilter)) {
      conditions.push(`i.interviewer_id = $${paramIndex++}`);
      values.push(interviewerFilter);
    }

    const fromDateFilter = req.query.from || req.query.start_date;
    if (typeof fromDateFilter === 'string' && !isNaN(new Date(fromDateFilter).getTime())) {
      conditions.push(`i.scheduled_start >= $${paramIndex++}`);
      values.push(new Date(fromDateFilter).toISOString());
    }

    const toDateFilter = req.query.to || req.query.end_date;
    if (typeof toDateFilter === 'string' && !isNaN(new Date(toDateFilter).getTime())) {
      conditions.push(`i.scheduled_end <= $${paramIndex++}`);
      values.push(new Date(toDateFilter).toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listSql = `
      SELECT 
        i.id,
        i.application_id,
        i.interviewer_id,
        i.title,
        i.description,
        i.scheduled_start,
        i.scheduled_end,
        i.location_or_link,
        i.status,
        i.reschedule_count,
        i.created_by,
        i.created_at,
        i.updated_at,
        u_interviewer.full_name AS interviewer_name,
        u_interviewer.email AS interviewer_email,
        a.current_stage AS application_stage,
        a.candidate_id,
        u_candidate.full_name AS candidate_name,
        u_candidate.email AS candidate_email,
        j.id AS job_id,
        j.title AS job_title,
        j.department AS job_department,
        j.location AS job_location,
        j.company_id,
        c.name AS company_name
      FROM interview_events i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      LEFT JOIN users u_interviewer ON i.interviewer_id = u_interviewer.id
      LEFT JOIN candidate_profiles cp ON a.candidate_id = cp.id
      LEFT JOIN users u_candidate ON cp.user_id = u_candidate.id
      ${whereClause}
      ORDER BY i.scheduled_start ASC;
    `;

    const listRes = await query(listSql, values);

    const interviews = listRes.rows.map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      interviewerId: row.interviewer_id,
      title: row.title,
      description: row.description,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      locationOrLink: row.location_or_link,
      status: row.status,
      rescheduleCount: row.reschedule_count,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      interviewer: row.interviewer_id
        ? {
            id: row.interviewer_id,
            fullName: row.interviewer_name || 'Assigned Interviewer',
            email: row.interviewer_email,
          }
        : null,
      application: {
        id: row.application_id,
        currentStage: row.application_stage,
        candidateId: row.candidate_id,
      },
      candidate: {
        id: row.candidate_id,
        fullName: row.candidate_name || 'Candidate',
        email: row.candidate_email,
      },
      job: {
        id: row.job_id,
        title: row.job_title,
        department: row.job_department,
        location: row.job_location,
        companyId: row.company_id,
        companyName: row.company_name,
      },
    }));

    res.status(200).json({
      success: true,
      interviews,
      data: interviews,
    });
  } catch (error: any) {
    console.error('[List Interviews Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve interviews',
        statusCode: 500,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
    });
  }
}
