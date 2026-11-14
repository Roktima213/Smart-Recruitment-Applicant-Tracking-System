import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const scheduleInterviewSchema = z
  .object({
    applicationId: z.string().regex(UUID_REGEX, 'Invalid application ID'),
    interviewerId: z.string().regex(UUID_REGEX, 'Invalid interviewer ID'),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).optional().nullable(),
    scheduledStart: z.string().datetime({ offset: true }),
    scheduledEnd: z.string().datetime({ offset: true }),
    locationOrLink: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (data) => new Date(data.scheduledEnd).getTime() > new Date(data.scheduledStart).getTime(),
    {
      message: 'Interview end time must be after its start time',
      path: ['scheduledEnd'],
    }
  );

async function getActiveHrActor(firebaseUid: string) {
  const result = await query(
    `SELECT id, company_id, role, is_active
     FROM users
     WHERE firebase_uid = $1
     LIMIT 1`,
    [firebaseUid]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const actor = result.rows[0];

  if (!actor.is_active || actor.role !== 'HR' || !actor.company_id) {
    return null;
  }

  return actor;
}

/**
 * GET /api/interviews/interviewers
 * Returns active HR users belonging to the authenticated HR user's company.
 */
export async function listInterviewers(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', statusCode: 401 },
      });
      return;
    }

    const actor = await getActiveHrActor(firebaseUid);

    if (!actor) {
      res.status(403).json({
        success: false,
        error: { message: 'Active HR account with a company assignment required', statusCode: 403 },
      });
      return;
    }

    const result = await query(
      `SELECT id, full_name, email
       FROM users
       WHERE company_id = $1
         AND role = 'HR'
         AND is_active = TRUE
       ORDER BY full_name ASC`,
      [actor.company_id]
    );

    res.status(200).json({
      success: true,
      data: result.rows.map((user) => ({
        id: user.id,
        name: user.full_name,
        email: user.email,
      })),
    });
  } catch (error) {
    console.error('[Interview] Failed to list interviewers:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve interviewers', statusCode: 500 },
    });
  }
}

/**
 * POST /api/interviews
 * Schedules an interview after checking company access and interviewer conflicts.
 */
export async function scheduleInterview(req: Request, res: Response): Promise<void> {
  const parsed = scheduleInterviewSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: parsed.error.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const firebaseUid = req.user?.uid;

  if (!firebaseUid) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required', statusCode: 401 },
    });
    return;
  }

  let client: Awaited<ReturnType<typeof getClient>> | null = null;
  let transactionStarted = false;

  try {
    client = await getClient();
    const actorResult = await client.query(
      `SELECT id, company_id, role, is_active
       FROM users
       WHERE firebase_uid = $1
       LIMIT 1`,
      [firebaseUid]
    );

    if (actorResult.rows.length === 0) {
      res.status(403).json({
        success: false,
        error: { message: 'HR user record not found', statusCode: 403 },
      });
      return;
    }

    const actor = actorResult.rows[0];

    if (!actor.is_active || actor.role !== 'HR' || !actor.company_id) {
      res.status(403).json({
        success: false,
        error: { message: 'Active HR account with a company assignment required', statusCode: 403 },
      });
      return;
    }

    await client.query('BEGIN');
    transactionStarted = true;

    const applicationResult = await client.query(
      `SELECT a.id
       FROM applications a
       INNER JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1
         AND j.company_id = $2
       LIMIT 1`,
      [parsed.data.applicationId, actor.company_id]
    );

    if (applicationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(404).json({
        success: false,
        error: { message: 'Application not found in your company', statusCode: 404 },
      });
      return;
    }

    const interviewerResult = await client.query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND company_id = $2
         AND role = 'HR'
         AND is_active = TRUE
       LIMIT 1`,
      [parsed.data.interviewerId, actor.company_id]
    );

    if (interviewerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(404).json({
        success: false,
        error: { message: 'Selected interviewer is not an active HR user in your company', statusCode: 404 },
      });
      return;
    }

    // Serialize scheduling attempts for this interviewer.
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [parsed.data.interviewerId]
    );

    const conflictResult = await client.query(
      `SELECT id, scheduled_start, scheduled_end
       FROM interview_events
       WHERE interviewer_id = $1
         AND status IN ('SCHEDULED', 'RESCHEDULED')
         AND scheduled_start < $3::timestamptz
         AND scheduled_end > $2::timestamptz
       LIMIT 1`,
      [
        parsed.data.interviewerId,
        parsed.data.scheduledStart,
        parsed.data.scheduledEnd,
      ]
    );

    if (conflictResult.rows.length > 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(409).json({
        success: false,
        error: {
          message: 'The selected interviewer already has an interview scheduled during this time',
          statusCode: 409,
          code: 'INTERVIEWER_SCHEDULE_CONFLICT',
        },
      });
      return;
    }

    const insertResult = await client.query(
      `INSERT INTO interview_events (
         application_id,
         interviewer_id,
         title,
         description,
         scheduled_start,
         scheduled_end,
         location_or_link,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, application_id, interviewer_id, title,
                 description, scheduled_start, scheduled_end,
                 location_or_link, status, created_at`,
      [
        parsed.data.applicationId,
        parsed.data.interviewerId,
        parsed.data.title,
        parsed.data.description || null,
        parsed.data.scheduledStart,
        parsed.data.scheduledEnd,
        parsed.data.locationOrLink || null,
        actor.id,
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: insertResult.rows[0],
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[Interview] Transaction rollback failed:', rollbackError);
      }
    }

    console.error('[Interview] Failed to schedule interview:', error);

    res.status(500).json({
      success: false,
      error: { message: 'Failed to schedule interview', statusCode: 500 },
    });
  } finally {
    client?.release();
  }
}

/**
 * GET /api/interviews
 * Returns real scheduled interviews belonging to the authenticated HR user's company.
 */
export async function listInterviews(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', statusCode: 401 },
      });
      return;
    }

    const actor = await getActiveHrActor(firebaseUid);

    if (!actor) {
      res.status(403).json({
        success: false,
        error: { message: 'Active HR account with a company assignment required', statusCode: 403 },
      });
      return;
    }

    const result = await query(
      `SELECT
         ie.id,
         ie.application_id,
         ie.title,
         ie.description,
         ie.scheduled_start,
         ie.scheduled_end,
         ie.location_or_link,
         ie.status,
         ie.created_at,
         ie.interviewer_id,
         interviewer.full_name AS interviewer_name,
         cp.user_id AS candidate_user_id,
         candidate.full_name AS candidate_name,
         j.id AS job_id,
         j.title AS job_title
       FROM interview_events ie
       INNER JOIN applications a ON a.id = ie.application_id
       INNER JOIN jobs j ON j.id = a.job_id
       INNER JOIN candidate_profiles cp ON cp.id = a.candidate_id
       INNER JOIN users candidate ON candidate.id = cp.user_id
       LEFT JOIN users interviewer ON interviewer.id = ie.interviewer_id
       WHERE j.company_id = $1
       ORDER BY ie.scheduled_start ASC`,
      [actor.company_id]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('[Interview] Failed to list interviews:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve interviews', statusCode: 500 },
    });
  }
}
