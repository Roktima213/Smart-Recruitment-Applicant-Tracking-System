import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/database';
import { generateOfferLetterHtml } from '../services/offerTemplateService';
import { validateStageTransition } from '../services/stageMachine';
import { respondToOfferWithOwnershipGuard } from '../services/offerOwnershipService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod validation schema for creating a draft offer
 * Supports both snake_case and camelCase aliases
 */
export const createOfferSchema = z
  .object({
    application_id: z.string().regex(UUID_REGEX, 'Invalid application UUID format').optional(),
    applicationId: z.string().regex(UUID_REGEX, 'Invalid application UUID format').optional(),
    salary_amount: z.union([z.number(), z.string()]).optional(),
    salaryAmount: z.union([z.number(), z.string()]).optional(),
    currency: z.string().trim().min(3, 'Currency must be at least 3 characters').max(10).optional(),
    start_date: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    expires_at: z.string().trim().optional().nullable(),
    expiresAt: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => Boolean(data.application_id || data.applicationId),
    { message: 'application_id is required', path: ['application_id'] }
  )
  .refine(
    (data) => data.salary_amount !== undefined || data.salaryAmount !== undefined,
    { message: 'salary_amount is required', path: ['salary_amount'] }
  )
  .refine(
    (data) => {
      const rawSalary = data.salary_amount !== undefined ? data.salary_amount : data.salaryAmount;
      const num = typeof rawSalary === 'number' ? rawSalary : parseFloat(String(rawSalary));
      return !isNaN(num) && num > 0;
    },
    { message: 'salary_amount must be a positive number', path: ['salary_amount'] }
  )
  .refine(
    (data) => Boolean(data.start_date || data.startDate),
    { message: 'start_date is required', path: ['start_date'] }
  )
  .refine(
    (data) => {
      const rawDate = data.start_date || data.startDate;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      return !isNaN(d.getTime());
    },
    { message: 'start_date must be a valid date', path: ['start_date'] }
  )
  .refine(
    (data) => {
      const rawExpires = data.expires_at !== undefined ? data.expires_at : data.expiresAt;
      if (!rawExpires) return true;
      const d = new Date(rawExpires);
      return !isNaN(d.getTime());
    },
    { message: 'expires_at must be a valid date if provided', path: ['expires_at'] }
  );

/**
 * 1. POST /api/offers
 * Creates or saves a draft offer with HTML snapshot and unique active offer constraint enforcement.
 * Role: HR, ADMIN, SUPER_ADMIN
 */
export async function createDraftOffer(req: Request, res: Response): Promise<void> {
  try {
    const callerUid = req.user?.uid;
    const callerRole = (req.user?.role || '').toUpperCase();

    if (!callerUid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required prior to creating offer', statusCode: 401 },
      });
      return;
    }

    if (callerRole === 'CANDIDATE') {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Candidates are not permitted to create offers', statusCode: 403 },
      });
      return;
    }

    // Resolve caller user in database
    const callerRes = await query(
      'SELECT id, role, company_id, is_active FROM users WHERE firebase_uid = $1 LIMIT 1;',
      [callerUid]
    );

    if (callerRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Authenticated user record not found in database', statusCode: 404 },
      });
      return;
    }

    const callerUser = callerRes.rows[0];
    if (callerUser.is_active === false) {
      res.status(403).json({
        success: false,
        error: { message: 'User account is deactivated', statusCode: 403 },
      });
      return;
    }

    const applicationId = req.body.application_id || req.body.applicationId;
    const rawSalary = req.body.salary_amount !== undefined ? req.body.salary_amount : req.body.salaryAmount;
    const salaryAmount = typeof rawSalary === 'number' ? rawSalary : parseFloat(String(rawSalary));
    const currency = (req.body.currency || 'USD').trim().toUpperCase();
    const rawStartDate = req.body.start_date || req.body.startDate;
    const rawExpiresAt = req.body.expires_at !== undefined ? req.body.expires_at : req.body.expiresAt;

    if (!applicationId || !UUID_REGEX.test(applicationId)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid application UUID format', statusCode: 400 },
      });
      return;
    }

    const startDateObj = new Date(rawStartDate);
    if (isNaN(startDateObj.getTime())) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid start_date format', statusCode: 400 },
      });
      return;
    }

    let expiresAtIso: string | null = null;
    if (rawExpiresAt) {
      const expDateObj = new Date(rawExpiresAt);
      if (isNaN(expDateObj.getTime())) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid expires_at format', statusCode: 400 },
        });
        return;
      }
      expiresAtIso = expDateObj.toISOString();
    }

    // Fetch target application, job, company, and candidate profile
    const appQuery = `
      SELECT 
        a.id,
        a.current_stage,
        a.candidate_id,
        j.id AS job_id,
        j.title AS job_title,
        j.company_id AS job_company_id,
        c.name AS company_name,
        u.id AS candidate_user_id,
        u.full_name AS candidate_name,
        u.email AS candidate_email
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      JOIN candidate_profiles cp ON a.candidate_id = cp.id
      JOIN users u ON cp.user_id = u.id
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

    // Multi-tenant isolation: fail closed
    const isSuperAdmin = callerRole === 'SUPER_ADMIN';
    const callerCompanyId = req.user?.companyId || callerUser.company_id;

    if (callerRole === 'HR') {
      if (!callerCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: HR user has no assigned company', statusCode: 403 },
        });
        return;
      }
      if (callerCompanyId !== appRow.job_company_id) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Application does not belong to your organization', statusCode: 403 },
        });
        return;
      }
    } else if (callerRole === 'ADMIN' && !isSuperAdmin) {
      if (callerCompanyId && callerCompanyId !== appRow.job_company_id) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Application does not belong to your organization', statusCode: 403 },
        });
        return;
      }
    }

    // Pipeline stage verification: Application must be in SELECTED or OFFERED
    if (appRow.current_stage !== 'SELECTED' && appRow.current_stage !== 'OFFERED') {
      res.status(400).json({
        success: false,
        error: {
          message: `Cannot create an offer for an application in '${appRow.current_stage}' stage. Application must be in SELECTED or OFFERED stage.`,
          statusCode: 400,
        },
      });
      return;
    }

    // Generate immutable HTML offer letter snapshot with XSS protection
    const offerLetterHtml = generateOfferLetterHtml({
      candidateName: appRow.candidate_name,
      candidateEmail: appRow.candidate_email,
      jobTitle: appRow.job_title,
      companyName: appRow.company_name,
      salaryAmount,
      currency,
      startDate: startDateObj,
      expiresAt: expiresAtIso,
    });

    // Insert draft offer record into database
    const insertSql = `
      INSERT INTO offer_records (
        application_id,
        salary_amount,
        currency,
        start_date,
        offer_letter_html,
        status,
        expires_at,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7)
      RETURNING 
        id,
        application_id,
        salary_amount,
        currency,
        start_date,
        offer_letter_html,
        status,
        issued_at,
        responded_at,
        expires_at,
        created_by,
        created_at,
        updated_at;
    `;

    try {
      const insertRes = await query(insertSql, [
        applicationId,
        salaryAmount,
        currency,
        startDateObj.toISOString().split('T')[0],
        offerLetterHtml,
        expiresAtIso,
        callerUser.id,
      ]);

      const offer = insertRes.rows[0];

      const formattedOffer = {
        id: offer.id,
        applicationId: offer.application_id,
        application_id: offer.application_id,
        salaryAmount: Number(offer.salary_amount),
        salary_amount: Number(offer.salary_amount),
        currency: offer.currency,
        startDate: offer.start_date,
        start_date: offer.start_date,
        status: offer.status,
        offerLetterHtml: offer.offer_letter_html,
        offer_letter_html: offer.offer_letter_html,
        issuedAt: offer.issued_at,
        issued_at: offer.issued_at,
        respondedAt: offer.responded_at,
        responded_at: offer.responded_at,
        expiresAt: offer.expires_at,
        expires_at: offer.expires_at,
        createdBy: offer.created_by,
        created_by: offer.created_by,
        createdAt: offer.created_at,
        created_at: offer.created_at,
        updatedAt: offer.updated_at,
        updated_at: offer.updated_at,
      };

      res.status(201).json({
        success: true,
        message: 'Draft offer created successfully',
        data: formattedOffer,
        offer: formattedOffer,
      });
    } catch (insertError: any) {
      if (insertError.code === '23505') {
        res.status(409).json({
          success: false,
          error: {
            message: 'An active offer (DRAFT or ISSUED) already exists for this application.',
            statusCode: 409,
          },
        });
        return;
      }
      throw insertError;
    }
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Internal server error while creating draft offer',
        statusCode: error.statusCode || 500,
      },
    });
  }
}

/**
 * 2. PATCH /api/offers/:id/issue
 * Issues an offer in a single ACID transaction with row-level locking on application,
 * stage transition to OFFERED, stage history recording, and pending notification queueing.
 * Role: HR, ADMIN, SUPER_ADMIN
 */
export async function issueOffer(req: Request, res: Response): Promise<void> {
  const client = await getClient();
  let inTransaction = false;

  try {
    const callerUid = req.user?.uid;
    const callerRole = (req.user?.role || '').toUpperCase();

    if (!callerUid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required prior to issuing offer', statusCode: 401 },
      });
      return;
    }

    if (callerRole === 'CANDIDATE') {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Candidates are not permitted to issue offers', statusCode: 403 },
      });
      return;
    }

    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid offer UUID format', statusCode: 400 },
      });
      return;
    }

    // Resolve caller user in database
    const callerRes = await query(
      'SELECT id, role, company_id, is_active FROM users WHERE firebase_uid = $1 LIMIT 1;',
      [callerUid]
    );

    if (callerRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Authenticated user record not found in database', statusCode: 404 },
      });
      return;
    }

    const callerUser = callerRes.rows[0];
    if (callerUser.is_active === false) {
      res.status(403).json({
        success: false,
        error: { message: 'User account is deactivated', statusCode: 403 },
      });
      return;
    }

    // Begin ACID transaction
    await client.query('BEGIN');
    inTransaction = true;

    // Lock application row and retrieve offer details
    const lockAndFetchSql = `
      SELECT 
        o.id,
        o.application_id,
        o.salary_amount,
        o.currency,
        o.start_date,
        o.offer_letter_html,
        o.status,
        o.issued_at,
        o.responded_at,
        o.expires_at,
        o.created_by,
        o.created_at,
        o.updated_at,
        a.current_stage,
        a.candidate_id,
        j.id AS job_id,
        j.title AS job_title,
        j.company_id AS job_company_id,
        c.name AS company_name,
        u.id AS candidate_user_id,
        u.full_name AS candidate_name,
        u.email AS candidate_email
      FROM offer_records o
      JOIN applications a ON o.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      JOIN candidate_profiles cp ON a.candidate_id = cp.id
      JOIN users u ON cp.user_id = u.id
      WHERE o.id = $1
      FOR UPDATE OF a;
    `;

    const offerRes = await client.query(lockAndFetchSql, [id]);

    if (offerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      res.status(404).json({
        success: false,
        error: { message: 'Offer not found', statusCode: 404 },
      });
      return;
    }

    const offerRow = offerRes.rows[0];

    // Multi-tenant check
    const isSuperAdmin = callerRole === 'SUPER_ADMIN';
    const callerCompanyId = req.user?.companyId || callerUser.company_id;

    if (callerRole === 'HR') {
      if (!callerCompanyId) {
        await client.query('ROLLBACK');
        inTransaction = false;
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: HR user has no assigned company', statusCode: 403 },
        });
        return;
      }
      if (callerCompanyId !== offerRow.job_company_id) {
        await client.query('ROLLBACK');
        inTransaction = false;
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Offer does not belong to your organization', statusCode: 403 },
        });
        return;
      }
    } else if (callerRole === 'ADMIN' && !isSuperAdmin) {
      if (callerCompanyId && callerCompanyId !== offerRow.job_company_id) {
        await client.query('ROLLBACK');
        inTransaction = false;
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Offer does not belong to your organization', statusCode: 403 },
        });
        return;
      }
    }

    // Verify offer status is DRAFT
    if (offerRow.status === 'ISSUED') {
      await client.query('ROLLBACK');
      inTransaction = false;
      res.status(400).json({
        success: false,
        error: { message: 'Offer has already been issued', statusCode: 400 },
      });
      return;
    }

    if (offerRow.status !== 'DRAFT') {
      await client.query('ROLLBACK');
      inTransaction = false;
      res.status(400).json({
        success: false,
        error: {
          message: `Cannot issue offer: Offer is in '${offerRow.status}' status. Only DRAFT offers can be issued`,
          statusCode: 400,
        },
      });
      return;
    }

    // Verify application stage is SELECTED or OFFERED
    if (offerRow.current_stage !== 'SELECTED' && offerRow.current_stage !== 'OFFERED') {
      await client.query('ROLLBACK');
      inTransaction = false;
      res.status(400).json({
        success: false,
        error: {
          message: `Cannot issue offer: Application is in '${offerRow.current_stage}' stage. It must be in SELECTED or OFFERED stage.`,
          statusCode: 400,
        },
      });
      return;
    }

    let finalApplicationStage = offerRow.current_stage;

    // If SELECTED, transition to OFFERED with immutable audit log
    if (offerRow.current_stage === 'SELECTED') {
      const transitionReason = 'Formal offer issued';
      const stageValidation = validateStageTransition('SELECTED', 'OFFERED', transitionReason);
      if (!stageValidation.valid) {
        await client.query('ROLLBACK');
        inTransaction = false;
        res.status(400).json({
          success: false,
          error: { message: stageValidation.error || 'Invalid stage transition', statusCode: 400 },
        });
        return;
      }

      await client.query(
        `UPDATE applications SET current_stage = 'OFFERED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [offerRow.application_id]
      );

      await client.query(
        `INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, reason)
         VALUES ($1, 'SELECTED', 'OFFERED', $2, $3);`,
        [offerRow.application_id, callerUser.id, transitionReason]
      );

      finalApplicationStage = 'OFFERED';
    }
    // If already OFFERED, retain stage without fake transition

    // Update offer_records to status ISSUED
    const updateOfferSql = `
      UPDATE offer_records
      SET status = 'ISSUED', issued_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id,
        application_id,
        salary_amount,
        currency,
        start_date,
        offer_letter_html,
        status,
        issued_at,
        responded_at,
        expires_at,
        created_by,
        created_at,
        updated_at;
    `;
    const updateRes = await client.query(updateOfferSql, [id]);
    const updatedOffer = updateRes.rows[0];

    // Insert pending notification event into notification_events table
    const notificationSubject = `Official Offer of Employment - ${offerRow.job_title} at ${offerRow.company_name}`;
    const notificationBody = `Congratulations ${offerRow.candidate_name}! You have received an official employment offer for the position of ${offerRow.job_title} at ${offerRow.company_name}. Please log in to your candidate portal to view and sign your offer letter.`;

    await client.query(
      `INSERT INTO notification_events (
        recipient_user_id,
        channel,
        event_type,
        subject,
        content_body,
        status
      )
      VALUES ($1, 'EMAIL', 'OFFER_ISSUED', $2, $3, 'PENDING');`,
      [offerRow.candidate_user_id, notificationSubject, notificationBody]
    );

    // Commit transaction
    await client.query('COMMIT');
    inTransaction = false;

    const formattedOffer = {
      id: updatedOffer.id,
      applicationId: updatedOffer.application_id,
      application_id: updatedOffer.application_id,
      salaryAmount: Number(updatedOffer.salary_amount),
      salary_amount: Number(updatedOffer.salary_amount),
      currency: updatedOffer.currency,
      startDate: updatedOffer.start_date,
      start_date: updatedOffer.start_date,
      status: updatedOffer.status,
      offerLetterHtml: updatedOffer.offer_letter_html,
      offer_letter_html: updatedOffer.offer_letter_html,
      issuedAt: updatedOffer.issued_at,
      issued_at: updatedOffer.issued_at,
      respondedAt: updatedOffer.responded_at,
      responded_at: updatedOffer.responded_at,
      expiresAt: updatedOffer.expires_at,
      expires_at: updatedOffer.expires_at,
      createdBy: updatedOffer.created_by,
      created_by: updatedOffer.created_by,
      createdAt: updatedOffer.created_at,
      created_at: updatedOffer.created_at,
      updatedAt: updatedOffer.updated_at,
      updated_at: updatedOffer.updated_at,
    };

    res.status(200).json({
      success: true,
      message: 'Offer issued successfully',
      data: {
        offer: formattedOffer,
        applicationStage: finalApplicationStage,
        notificationQueued: true,
      },
      offer: formattedOffer,
    });
  } catch (error: any) {
    if (inTransaction) {
      await client.query('ROLLBACK');
    }
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Internal server error while issuing offer',
        statusCode: error.statusCode || 500,
      },
    });
  } finally {
    client.release();
  }
}

/**
 * 3. GET /api/offers/:id
 * Retrieves offer metadata and the immutable stored offer_letter_html snapshot.
 * Access Control:
 * - Candidate: Can only view offers for their own application
 * - HR: Can only view offers belonging to their organization
 * - ADMIN / SUPER_ADMIN: Permitted with organizational scoping
 */
export async function getOfferById(req: Request, res: Response): Promise<void> {
  try {
    const callerUid = req.user?.uid;
    const callerRole = (req.user?.role || '').toUpperCase();

    if (!callerUid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required prior to retrieving offer', statusCode: 401 },
      });
      return;
    }

    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid offer UUID format', statusCode: 400 },
      });
      return;
    }

    const sql = `
      SELECT 
        o.id,
        o.application_id,
        o.salary_amount,
        o.currency,
        o.start_date,
        o.offer_letter_html,
        o.status,
        o.issued_at,
        o.responded_at,
        o.expires_at,
        o.created_by,
        o.created_at,
        o.updated_at,
        a.current_stage,
        a.candidate_id,
        j.id AS job_id,
        j.title AS job_title,
        j.company_id AS job_company_id,
        c.name AS company_name,
        u.firebase_uid AS candidate_firebase_uid,
        u.id AS candidate_user_id
      FROM offer_records o
      JOIN applications a ON o.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      JOIN candidate_profiles cp ON a.candidate_id = cp.id
      JOIN users u ON cp.user_id = u.id
      WHERE o.id = $1
      LIMIT 1;
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Offer not found', statusCode: 404 },
      });
      return;
    }

    const offerRow = result.rows[0];

    // Authorization & Multi-tenant boundary checks
    if (callerRole === 'CANDIDATE') {
      if (offerRow.candidate_firebase_uid !== callerUid) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You do not have permission to access this offer', statusCode: 403 },
        });
        return;
      }
    } else if (callerRole === 'HR') {
      let hrCompanyId = req.user?.companyId;
      if (!hrCompanyId && callerUid) {
        const userRes = await query('SELECT company_id FROM users WHERE firebase_uid = $1 LIMIT 1;', [callerUid]);
        hrCompanyId = userRes?.rows?.[0]?.company_id || null;
      }
      if (!hrCompanyId || !offerRow.job_company_id || hrCompanyId !== offerRow.job_company_id) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Forbidden: You do not have permission to access offers for another organization',
            statusCode: 403,
          },
        });
        return;
      }
    } else if (callerRole === 'ADMIN') {
      let adminCompanyId = req.user?.companyId;
      if (!adminCompanyId && callerUid) {
        const adminRes = await query('SELECT company_id FROM users WHERE firebase_uid = $1 LIMIT 1;', [callerUid]);
        adminCompanyId = adminRes?.rows?.[0]?.company_id || null;
      }
      if (adminCompanyId && offerRow.job_company_id && adminCompanyId !== offerRow.job_company_id) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Offer does not belong to your organization', statusCode: 403 },
        });
        return;
      }
    } else if (callerRole !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Unauthorized role', statusCode: 403 },
      });
      return;
    }

    const formattedOffer = {
      id: offerRow.id,
      applicationId: offerRow.application_id,
      application_id: offerRow.application_id,
      salaryAmount: Number(offerRow.salary_amount),
      salary_amount: Number(offerRow.salary_amount),
      currency: offerRow.currency,
      startDate: offerRow.start_date,
      start_date: offerRow.start_date,
      status: offerRow.status,
      offerLetterHtml: offerRow.offer_letter_html,
      offer_letter_html: offerRow.offer_letter_html,
      issuedAt: offerRow.issued_at,
      issued_at: offerRow.issued_at,
      respondedAt: offerRow.responded_at,
      responded_at: offerRow.responded_at,
      expiresAt: offerRow.expires_at,
      expires_at: offerRow.expires_at,
      createdBy: offerRow.created_by,
      created_by: offerRow.created_by,
      createdAt: offerRow.created_at,
      created_at: offerRow.created_at,
      updatedAt: offerRow.updated_at,
      updated_at: offerRow.updated_at,
      jobTitle: offerRow.job_title,
      companyName: offerRow.company_name,
    };

    res.status(200).json({
      success: true,
      data: formattedOffer,
      offer: formattedOffer,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Internal server error while retrieving offer',
        statusCode: error.statusCode || 500,
      },
    });
  }
}

/**
 * 4. GET /api/offers
 * Lists offers for the caller's organization (HR/ADMIN) or candidate.
 */
export async function listOffers(req: Request, res: Response): Promise<void> {
  try {
    const callerUid = req.user?.uid;
    const callerRole = (req.user?.role || '').toUpperCase();

    if (!callerUid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required prior to listing offers', statusCode: 401 },
      });
      return;
    }

    let sql = `
      SELECT 
        o.id,
        o.application_id,
        o.salary_amount,
        o.currency,
        o.start_date,
        o.offer_letter_html,
        o.status,
        o.issued_at,
        o.expires_at,
        o.created_at,
        u.full_name AS candidate_name,
        u.email AS candidate_email,
        j.title AS job_title,
        c.name AS company_name
      FROM offer_records o
      JOIN applications a ON o.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      JOIN candidate_profiles cp ON a.candidate_id = cp.id
      JOIN users u ON cp.user_id = u.id
    `;
    const params: any[] = [];

    if (callerRole === 'CANDIDATE') {
      sql += ' WHERE u.firebase_uid = $1 ORDER BY o.created_at DESC';
      params.push(callerUid);
    } else if (callerRole === 'HR') {
      let hrCompanyId = req.user?.companyId;
      if (!hrCompanyId) {
        const userRes = await query('SELECT company_id FROM users WHERE firebase_uid = $1 LIMIT 1;', [callerUid]);
        hrCompanyId = userRes.rows[0]?.company_id || null;
      }
      if (!hrCompanyId) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      sql += ' WHERE j.company_id = $1 ORDER BY o.created_at DESC';
      params.push(hrCompanyId);
    } else {
      sql += ' ORDER BY o.created_at DESC';
    }

    const result = await query(sql, params);
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('[OfferController] Error listing offers:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Internal server error while listing offers',
        statusCode: error.statusCode || 500,
      },
    });
  }
}

/**
 * 5. POST /api/offers/:id/respond
 * Candidate responds to an issued offer (ACCEPT or DECLINE) with strict Anti-IDOR ownership validation.
 * Role: CANDIDATE
 */
export async function respondToOffer(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const caller = {
      uid: req.user?.uid || '',
      role: req.user?.role || '',
      companyId: req.user?.companyId,
      email: req.user?.email,
    };

    const actionRaw = String(req.body.action || '').trim().toUpperCase();
    let action: 'ACCEPT' | 'DECLINE' | null = null;
    if (actionRaw === 'ACCEPT' || actionRaw === 'ACCEPTED') {
      action = 'ACCEPT';
    } else if (actionRaw === 'DECLINE' || actionRaw === 'DECLINED') {
      action = 'DECLINE';
    }

    if (!action) {
      res.status(400).json({
        success: false,
        error: { message: "Invalid action: must be 'ACCEPT' or 'DECLINE'", statusCode: 400 },
      });
      return;
    }

    const declineReason = req.body.decline_reason || req.body.declineReason || req.body.reason;
    const result = await respondToOfferWithOwnershipGuard(id, caller, action, declineReason);

    if (!result.success) {
      res.status(result.statusCode).json({
        success: false,
        error: {
          message: result.error || 'Failed to process offer response',
          statusCode: result.statusCode,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.offer,
      offer: result.offer,
    });
  } catch (error: any) {
    console.error('[OfferController] Error responding to offer:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || 'Internal server error while responding to offer',
        statusCode: error.statusCode || 500,
      },
    });
  }
}


