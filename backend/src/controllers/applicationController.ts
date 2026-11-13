import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/database';
import { getOrCreateCandidateProfile } from './candidateController';
import { validateStageTransition } from '../services/stageMachine';
import { executeStageTransitionWithLock } from '../services/stageTransitionDbService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod validation schema for submitting an application
 */
export const submitApplicationSchema = z
  .object({
    job_id: z.string().regex(UUID_REGEX, 'Invalid job UUID format').optional(),
    jobId: z.string().regex(UUID_REGEX, 'Invalid job UUID format').optional(),
    resume_id: z.string().regex(UUID_REGEX, 'Invalid resume UUID format').optional().nullable(),
    resumeId: z.string().regex(UUID_REGEX, 'Invalid resume UUID format').optional().nullable(),
    cover_letter: z.string().trim().max(10000, 'Cover letter cannot exceed 10,000 characters').optional().nullable(),
    coverLetter: z.string().trim().max(10000, 'Cover letter cannot exceed 10,000 characters').optional().nullable(),
    answers: z.union([z.record(z.unknown()), z.array(z.unknown())]).optional().default({}),
  })
  .refine((data) => Boolean(data.job_id || data.jobId), {
    message: 'job_id is required',
    path: ['job_id'],
  });

/**
 * 1. POST /api/applications
 * Submits a new job application for the authenticated candidate inside an ACID transaction.
 */
export async function submitApplication(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to application submission',
      });
      return;
    }

    // Resolve candidate user and profile from authenticated session
    const candidateData = await getOrCreateCandidateProfile(firebaseUid);
    if (!candidateData) {
      res.status(404).json({
        success: false,
        error: { message: 'Candidate user record not found in database', statusCode: 404 },
      });
      return;
    }

    const { user, profile } = candidateData;

    const jobId = req.body.job_id || req.body.jobId;
    if (!jobId || !UUID_REGEX.test(jobId)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or missing job ID format', statusCode: 400 },
      });
      return;
    }

    const resumeId = req.body.resume_id || req.body.resumeId || null;
    const coverLetter = req.body.cover_letter !== undefined
      ? req.body.cover_letter
      : (req.body.coverLetter !== undefined ? req.body.coverLetter : null);
    const answers = req.body.answers || {};

    // Verify requested job exists and is eligible to receive applications (status = 'PUBLISHED')
    const jobCheckSql = `
      SELECT id, status, title
      FROM jobs
      WHERE id = $1
      LIMIT 1;
    `;
    const jobRes = await query(jobCheckSql, [jobId]);

    if (jobRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Job not found', statusCode: 404 },
      });
      return;
    }

    const job = jobRes.rows[0];
    if (job.status !== 'PUBLISHED') {
      res.status(400).json({
        success: false,
        error: { message: 'Job is not open for applications', statusCode: 400 },
      });
      return;
    }

    // If resume_id is provided, verify it belongs to the authenticated candidate
    if (resumeId) {
      if (!UUID_REGEX.test(resumeId)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid resume UUID format', statusCode: 400 },
        });
        return;
      }

      const resumeCheckSql = `
        SELECT id, candidate_id
        FROM resume_metadata
        WHERE id = $1 AND candidate_id = $2
        LIMIT 1;
      `;
      const resumeRes = await query(resumeCheckSql, [resumeId, profile.id]);

      if (resumeRes.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Resume not found or does not belong to the authenticated candidate',
            statusCode: 400,
          },
        });
        return;
      }
    }

    // ACID Database Transaction using dedicated client from connection pool
    const client = await getClient();
    let inTransaction = false;

    try {
      await client.query('BEGIN');
      inTransaction = true;

      // 1. Insert application record
      const insertAppSql = `
        INSERT INTO applications (job_id, candidate_id, resume_id, cover_letter, answers, current_stage)
        VALUES ($1, $2, $3, $4, $5, 'APPLIED')
        RETURNING id, job_id, candidate_id, resume_id, current_stage, cover_letter, answers, applied_at, updated_at;
      `;
      const appResult = await client.query(insertAppSql, [
        jobId,
        profile.id,
        resumeId,
        coverLetter,
        JSON.stringify(answers),
      ]);
      const application = appResult.rows[0];

      // 2. Insert initial stage audit history record
      const insertHistorySql = `
        INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, reason)
        VALUES ($1, NULL, 'APPLIED', $2, 'Initial application submission')
        RETURNING id, application_id, from_stage, to_stage, changed_by, reason, changed_at;
      `;
      const historyResult = await client.query(insertHistorySql, [
        application.id,
        user.id,
      ]);
      const initialHistory = historyResult.rows[0];

      await client.query('COMMIT');
      inTransaction = false;

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: {
          id: application.id,
          jobId: application.job_id,
          candidateId: application.candidate_id,
          resumeId: application.resume_id,
          currentStage: application.current_stage,
          coverLetter: application.cover_letter,
          answers: application.answers,
          appliedAt: application.applied_at,
          updatedAt: application.updated_at,
          stageHistory: [
            {
              id: initialHistory.id,
              applicationId: initialHistory.application_id,
              fromStage: initialHistory.from_stage,
              toStage: initialHistory.to_stage,
              changedBy: initialHistory.changed_by,
              reason: initialHistory.reason,
              changedAt: initialHistory.changed_at,
            },
          ],
        },
      });
    } catch (txError: any) {
      if (inTransaction) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          console.error('[Transaction Rollback Error]', rollbackErr);
        }
      }

      // Handle duplicate application submission via PostgreSQL unique constraint (23505)
      if (
        txError &&
        (txError.code === '23505' ||
          txError.constraint === 'unique_job_candidate_application' ||
          /duplicate key/i.test(txError.message || ''))
      ) {
        res.status(409).json({
          success: false,
          error: {
            message: 'You have already submitted an application for this job',
            statusCode: 409,
          },
        });
        return;
      }

      console.error('[Application Submission Transaction Error]', txError);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to submit application',
          statusCode: 500,
          details: process.env.NODE_ENV !== 'production' ? txError?.message : undefined,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Application Submission Controller Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error while submitting application',
        statusCode: 500,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
    });
  }
}

/**
 * 2. GET /api/applications/me
 * Retrieves all applications submitted by the authenticated candidate, ordered by submission date (newest first).
 */
export async function getMyApplications(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to fetching application history',
      });
      return;
    }

    const candidateData = await getOrCreateCandidateProfile(firebaseUid);
    if (!candidateData) {
      res.status(404).json({
        success: false,
        error: { message: 'Candidate user record not found in database', statusCode: 404 },
      });
      return;
    }

    const { profile } = candidateData;

    const listSql = `
      SELECT 
        a.id,
        a.job_id,
        a.candidate_id,
        a.resume_id,
        a.current_stage,
        a.cover_letter,
        a.answers,
        a.applied_at,
        a.updated_at,
        j.title AS job_title,
        j.department AS job_department,
        j.location AS job_location,
        j.employment_type AS job_employment_type,
        j.status AS job_status,
        c.name AS company_name,
        rm.file_name AS resume_file_name,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', h.id,
                'applicationId', h.application_id,
                'fromStage', h.from_stage,
                'toStage', h.to_stage,
                'changedBy', h.changed_by,
                'reason', h.reason,
                'changedAt', h.changed_at
              ) ORDER BY h.changed_at ASC
            )
            FROM application_stage_history h
            WHERE h.application_id = a.id
          ),
          '[]'::json
        ) AS stage_history
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN resume_metadata rm ON a.resume_id = rm.id
      WHERE a.candidate_id = $1
      ORDER BY a.applied_at DESC;
    `;

    const appRes = await query(listSql, [profile.id]);

    const applications = appRes.rows.map((row) => {
      let stageHistory: any[] = [];
      if (Array.isArray(row.stage_history)) {
        stageHistory = row.stage_history;
      } else if (typeof row.stage_history === 'string') {
        try {
          stageHistory = JSON.parse(row.stage_history);
        } catch {
          stageHistory = [];
        }
      }

      return {
        id: row.id,
        jobId: row.job_id,
        candidateId: row.candidate_id,
        resumeId: row.resume_id,
        currentStage: row.current_stage,
        status: row.current_stage,
        coverLetter: row.cover_letter,
        answers: row.answers,
        appliedAt: row.applied_at,
        updatedAt: row.updated_at,
        jobTitle: row.job_title,
        job: {
          id: row.job_id,
          title: row.job_title,
          department: row.job_department,
          location: row.job_location,
          employmentType: row.job_employment_type,
          status: row.job_status,
          companyName: row.company_name,
        },
        resumeFileName: row.resume_file_name || null,
        stageHistory,
      };
    });

    res.status(200).json({
      success: true,
      applications,
      data: applications,
    });
  } catch (error: any) {
    console.error('[Get My Applications Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve application history',
        statusCode: 500,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
    });
  }
}

/**
 * 3. GET /api/applications/:id
 * Retrieves a single application by ID if the requester is the candidate owner or privileged staff (HR/ADMIN).
 */
export async function getApplicationById(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUid = req.user?.uid;
    const userRole = req.user?.role;
    if (!firebaseUid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to fetching application',
      });
      return;
    }

    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid application UUID format', statusCode: 400 },
      });
      return;
    }

    const sql = `
      SELECT 
        a.id,
        a.job_id,
        a.candidate_id,
        a.resume_id,
        a.current_stage,
        a.cover_letter,
        a.answers,
        a.applied_at,
        a.updated_at,
        u.firebase_uid AS candidate_firebase_uid
      FROM applications a
      JOIN candidate_profiles cp ON a.candidate_id = cp.id
      JOIN users u ON cp.user_id = u.id
      WHERE a.id = $1
      LIMIT 1;
    `;

    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Application not found', statusCode: 404 },
      });
      return;
    }

    const appRecord = result.rows[0];
    const isOwner = appRecord.candidate_firebase_uid === firebaseUid;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'HR';

    if (!isOwner && !isPrivileged) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: You do not have permission to access this application',
          statusCode: 403,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: appRecord,
    });
  } catch (error: any) {
    console.error('[Get Application By Id Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve application details',
        statusCode: 500,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
    });
  }
}

/**
 * Zod validation schema for updating application pipeline stage
 */
export const updateApplicationStageSchema = z
  .object({
    to_stage: z.string().trim().optional(),
    toStage: z.string().trim().optional(),
    stage: z.string().trim().optional(),
    reason: z.string().trim().min(3, 'A transition reason of at least 3 characters is required for audit trail tracking.'),
  })
  .refine((data) => Boolean(data.to_stage || data.toStage || data.stage), {
    message: 'Target stage is required (to_stage, toStage, or stage)',
    path: ['to_stage'],
  });

/**
 * 4. PATCH /api/applications/:id/stage
 * Advances or transitions candidate application stage with state machine validation,
 * row-level lock concurrency protection, and immutable audit logging.
 */
export async function updateApplicationStage(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUid = req.user?.uid;
    const userRole = req.user?.role;
    if (!firebaseUid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to updating stage',
      });
      return;
    }

    if (userRole !== 'ADMIN' && userRole !== 'HR') {
      res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: Only HR or ADMIN users can perform pipeline stage transitions',
          statusCode: 403,
        },
      });
      return;
    }

    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid application UUID format', statusCode: 400 },
      });
      return;
    }

    const toStage = (req.body.to_stage || req.body.toStage || req.body.stage || '').toUpperCase();
    const reason = (req.body.reason || '').trim();

    // Fetch actor's user database record
    const userRes = await query(
      `SELECT id, company_id, role, is_active FROM users WHERE firebase_uid = $1 LIMIT 1;`,
      [firebaseUid]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Authenticated user record not found in database', statusCode: 404 },
      });
      return;
    }

    const actorUser = userRes.rows[0];
    if (!actorUser.is_active) {
      res.status(403).json({
        success: false,
        error: { message: 'Your account is deactivated', statusCode: 403 },
      });
      return;
    }

    // Execute state transition inside row-level locked transaction
    try {
      const result = await executeStageTransitionWithLock({
        applicationId: id,
        toStage,
        actorUserId: actorUser.id,
        reason,
        validateTransition: (from, to) => validateStageTransition(from, to, reason),
      });

      res.status(200).json({
        success: true,
        message: `Application transitioned from ${result.history.from_stage} to ${result.history.to_stage}`,
        data: {
          application: result.application,
          history: result.history,
        },
      });
    } catch (txError: any) {
      if (txError.statusCode === 404) {
        res.status(404).json({
          success: false,
          error: { message: txError.message, statusCode: 404 },
        });
        return;
      }

      if (txError.statusCode === 400 || txError.statusCode === 422) {
        res.status(400).json({
          success: false,
          error: { message: txError.message, statusCode: 400 },
        });
        return;
      }

      console.error('[Update Application Stage Transaction Error]', txError);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update application stage',
          statusCode: 500,
          details: process.env.NODE_ENV !== 'production' ? txError.message : undefined,
        },
      });
    }
  } catch (error: any) {
    console.error('[Update Application Stage Controller Error]', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error while updating application stage',
        statusCode: 500,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
    });
  }
}



