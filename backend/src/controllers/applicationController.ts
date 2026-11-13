import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/database';

export const applyJobSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  resumeId: z.string().uuid('Invalid resume ID format').optional().nullable(),
  coverLetter: z.string().trim().max(10000, 'Cover letter cannot exceed 10000 characters').optional().nullable(),
  answers: z.record(z.any()).optional().default({}),
});

/**
 * Helper to fetch or bootstrap candidate record from authenticated Firebase UID
 */
async function getCandidateUserAndProfile(firebaseUid: string) {
  const userRes = await query(
    `SELECT id, firebase_uid, email, full_name, role, is_active FROM users WHERE firebase_uid = $1 LIMIT 1;`,
    [firebaseUid]
  );

  if (userRes.rows.length === 0) {
    return null;
  }

  const user = userRes.rows[0];

  let profileRes = await query(
    `SELECT id, user_id FROM candidate_profiles WHERE user_id = $1 LIMIT 1;`,
    [user.id]
  );

  if (profileRes.rows.length === 0) {
    profileRes = await query(
      `INSERT INTO candidate_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
       RETURNING id, user_id;`,
      [user.id]
    );
  }

  return {
    user,
    profile: profileRes.rows[0],
  };
}

/**
 * POST /api/applications
 * Atomic application submission with initial APPLIED stage audit trail.
 */
export async function submitApplication(req: Request, res: Response): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  // Validate payload
  const parseResult = applyJobSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: parseResult.error.flatten(),
      },
    });
    return;
  }

  const { jobId, resumeId, coverLetter, answers } = parseResult.data;

  // Retrieve candidate profile
  const candidateData = await getCandidateUserAndProfile(uid);
  if (!candidateData) {
    res.status(404).json({
      success: false,
      error: { message: 'Candidate user record not found in database', statusCode: 404 },
    });
    return;
  }

  const { user, profile } = candidateData;

  // 1. Verify job exists and is in PUBLISHED state
  const jobRes = await query(
    `SELECT id, title, status, company_id FROM jobs WHERE id = $1 LIMIT 1;`,
    [jobId]
  );

  if (jobRes.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: { message: 'Job requisition not found', statusCode: 404 },
    });
    return;
  }

  const job = jobRes.rows[0];
  if (job.status !== 'PUBLISHED') {
    res.status(400).json({
      success: false,
      error: {
        message: `Applications can only be submitted to PUBLISHED openings (current status: ${job.status})`,
        statusCode: 400,
      },
    });
    return;
  }

  // 2. Prevent duplicate application
  const existingAppRes = await query(
    `SELECT id, current_stage, applied_at FROM applications WHERE job_id = $1 AND candidate_id = $2 LIMIT 1;`,
    [jobId, profile.id]
  );

  if (existingAppRes.rows.length > 0) {
    res.status(409).json({
      success: false,
      error: {
        message: 'Candidate has already submitted an application for this job',
        statusCode: 409,
        existingApplicationId: existingAppRes.rows[0].id,
      },
    });
    return;
  }

  // 3. Resolve active resume
  let activeResumeId = resumeId || null;

  if (activeResumeId) {
    // Verify resume belongs to this candidate
    const resumeCheck = await query(
      `SELECT id FROM resume_metadata WHERE id = $1 AND candidate_id = $2 LIMIT 1;`,
      [activeResumeId, profile.id]
    );
    if (resumeCheck.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Specified resume does not belong to your candidate profile',
          statusCode: 400,
        },
      });
      return;
    }
  } else {
    // Fall back to candidate's latest resume
    const latestResumeRes = await query(
      `SELECT id FROM resume_metadata WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1;`,
      [profile.id]
    );
    if (latestResumeRes.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'A verified resume must be uploaded before submitting an application',
          statusCode: 400,
        },
      });
      return;
    }
    activeResumeId = latestResumeRes.rows[0].id;
  }

  // 4. ACID Transaction: Insert application + initial stage audit log
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const appInsertSql = `
      INSERT INTO applications (
        job_id,
        candidate_id,
        resume_id,
        current_stage,
        cover_letter,
        answers,
        applied_at
      ) VALUES ($1, $2, $3, 'APPLIED', $4, $5, NOW())
      RETURNING id, job_id, candidate_id, resume_id, current_stage, cover_letter, answers, applied_at, updated_at;
    `;
    const appResult = await client.query(appInsertSql, [
      jobId,
      profile.id,
      activeResumeId,
      coverLetter || null,
      JSON.stringify(answers || {}),
    ]);

    const newApplication = appResult.rows[0];

    // Insert initial stage audit history
    const historyInsertSql = `
      INSERT INTO application_stage_history (
        application_id,
        from_stage,
        to_stage,
        changed_by,
        reason,
        changed_at
      ) VALUES ($1, NULL, 'APPLIED', $2, 'Initial application submission', NOW())
      RETURNING id, application_id, from_stage, to_stage, changed_at;
    `;
    await client.query(historyInsertSql, [newApplication.id, user.id]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: newApplication.id,
        jobId: newApplication.job_id,
        candidateId: newApplication.candidate_id,
        resumeId: newApplication.resume_id,
        currentStage: newApplication.current_stage,
        coverLetter: newApplication.cover_letter,
        answers: newApplication.answers,
        appliedAt: newApplication.applied_at,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[Application Submission Transaction Error]', error);

    // Check unique constraint code 23505 (Postgres unique violation)
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        error: {
          message: 'Candidate has already submitted an application for this job',
          statusCode: 409,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message: 'Failed to record application transaction', statusCode: 500 },
    });
  } finally {
    client.release();
  }
}

/**
 * GET /api/applications/me
 * Retrieves all submitted applications for the authenticated candidate.
 */
export async function getMyApplications(req: Request, res: Response): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  try {
    const candidateData = await getCandidateUserAndProfile(uid);
    if (!candidateData) {
      res.status(404).json({
        success: false,
        error: { message: 'Candidate profile not found', statusCode: 404 },
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
        rm.file_name AS resume_file_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN resume_metadata rm ON a.resume_id = rm.id
      WHERE a.candidate_id = $1
      ORDER BY a.applied_at DESC;
    `;
    const result = await query(listSql, [profile.id]);

    const applications = result.rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      jobTitle: row.job_title,
      department: row.job_department,
      location: row.job_location,
      employmentType: row.job_employment_type,
      jobStatus: row.job_status,
      companyName: row.company_name,
      resumeId: row.resume_id,
      resumeFileName: row.resume_file_name,
      currentStage: row.current_stage,
      coverLetter: row.cover_letter,
      answers: row.answers,
      appliedAt: row.applied_at,
      updatedAt: row.updated_at,
    }));

    res.status(200).json({
      success: true,
      applications,
      count: applications.length,
    });
  } catch (error: any) {
    console.error('[Get My Applications Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve applications', statusCode: 500 },
    });
  }
}

/**
 * GET /api/applications/:id
 * Retrieve application details and complete stage timeline audit trail.
 */
export async function getApplicationById(req: Request, res: Response): Promise<void> {
  const uid = req.user?.uid;
  const role = (req.user?.role || '').toUpperCase();
  const applicationId = req.params.id;

  if (!uid) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(applicationId)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid application identifier format', statusCode: 400 },
    });
    return;
  }

  try {
    const appSql = `
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
        c.name AS company_name,
        rm.file_name AS resume_file_name,
        cp.user_id AS candidate_user_id,
        u.firebase_uid AS candidate_firebase_uid,
        u.full_name AS candidate_name,
        u.email AS candidate_email
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN resume_metadata rm ON a.resume_id = rm.id
      JOIN candidate_profiles cp ON a.candidate_id = cp.id
      JOIN users u ON cp.user_id = u.id
      WHERE a.id = $1
      LIMIT 1;
    `;
    const appResult = await query(appSql, [applicationId]);

    if (appResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Application not found', statusCode: 404 },
      });
      return;
    }

    const app = appResult.rows[0];

    // Authorization: Admin/HR or Candidate owner
    const isPrivileged = role === 'ADMIN' || role === 'HR';
    const isOwner = uid === app.candidate_firebase_uid;

    if (!isPrivileged && !isOwner) {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: You do not have permission to view this application', statusCode: 403 },
      });
      return;
    }

    // Fetch audit timeline
    const timelineSql = `
      SELECT 
        ash.id,
        ash.from_stage,
        ash.to_stage,
        ash.changed_by,
        ash.reason,
        ash.changed_at,
        u.full_name AS changed_by_name
      FROM application_stage_history ash
      LEFT JOIN users u ON ash.changed_by = u.id
      WHERE ash.application_id = $1
      ORDER BY ash.changed_at ASC;
    `;
    const timelineResult = await query(timelineSql, [applicationId]);

    res.status(200).json({
      success: true,
      application: {
        id: app.id,
        jobId: app.job_id,
        jobTitle: app.job_title,
        department: app.job_department,
        location: app.job_location,
        employmentType: app.job_employment_type,
        companyName: app.company_name,
        resumeId: app.resume_id,
        resumeFileName: app.resume_file_name,
        currentStage: app.current_stage,
        coverLetter: app.cover_letter,
        answers: app.answers,
        appliedAt: app.applied_at,
        updatedAt: app.updated_at,
        candidate: {
          id: app.candidate_id,
          name: app.candidate_name,
          email: app.candidate_email,
        },
        stageHistory: timelineResult.rows.map((row) => ({
          id: row.id,
          fromStage: row.from_stage,
          toStage: row.to_stage,
          changedBy: row.changed_by_name || 'System',
          reason: row.reason,
          changedAt: row.changed_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Get Application By Id Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve application details', statusCode: 500 },
    });
  }
}
