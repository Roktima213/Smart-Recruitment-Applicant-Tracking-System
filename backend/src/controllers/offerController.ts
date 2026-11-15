import { Request, Response } from 'express';
import { getClient, query } from '../config/database';
import { sendNotification } from '../services/notificationService';

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

const isValidDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getActor = async (req: Request) => {
  const uid = req.user?.uid;

  if (!uid) {
    throw new Error('Authenticated user information is missing.');
  }

  const result = await query(
    `SELECT id, company_id, role, is_active
     FROM users
     WHERE firebase_uid = $1
     LIMIT 1`,
    [uid]
  );

  const actor = result.rows[0];

  if (!actor || actor.is_active === false) {
    throw new Error('Your user account is unavailable or deactivated.');
  }

  const role = String(actor.role || '').toUpperCase();

  if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'RECRUITER'].includes(role)) {
    throw new Error('You are not permitted to manage offers.');
  }

  if (role !== 'SUPER_ADMIN' && !actor.company_id) {
    throw new Error('Your account is not associated with a company.');
  }

  return actor;
};

const isCompanyAuthorized = (actor: any, companyId: string): boolean =>
  String(actor.role).toUpperCase() === 'SUPER_ADMIN' ||
  actor.company_id === companyId;

export const listOffers = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = await getActor(req);

    const result = await query(
      `SELECT
         o.id,
         o.application_id,
         o.salary_amount,
         o.currency,
         o.start_date,
         o.status,
         o.issued_at,
         o.expires_at,
         o.created_at,
         o.updated_at,
         a.current_stage,
         candidate_user.full_name AS candidate_name,
         candidate_user.email AS candidate_email,
         j.title AS job_title,
         j.company_id,
         c.name AS company_name
       FROM offer_records o
       JOIN applications a ON a.id = o.application_id
       JOIN jobs j ON j.id = a.job_id
       JOIN candidate_profiles cp ON cp.id = a.candidate_id
       JOIN users candidate_user ON candidate_user.id = cp.user_id
       LEFT JOIN companies c ON c.id = j.company_id
       WHERE ($1::boolean = TRUE OR j.company_id = $2)
       ORDER BY o.created_at DESC`,
      [
        String(actor.role).toUpperCase() === 'SUPER_ADMIN',
        actor.company_id || null,
      ]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    const message = error.message || 'Unable to load offers.';
    const status = message.includes('permitted') ||
      message.includes('associated') ||
      message.includes('deactivated') ? 403 : 500;

    res.status(status).json({
      success: false,
      error: { message },
    });
  }
};

export const createOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = await getActor(req);
    const {
      applicationId,
      salaryAmount,
      currency = 'USD',
      startDate,
      expiryDate,
    } = req.body || {};

    if (typeof applicationId !== 'string' || !applicationId.trim()) {
      res.status(400).json({
        success: false,
        error: { message: 'A valid application must be selected.' },
      });
      return;
    }

    const salary = Number(salaryAmount);

    if (!Number.isSafeInteger(salary) || salary <= 0) {
      res.status(400).json({
        success: false,
        error: { message: 'Salary must be a positive whole number.' },
      });
      return;
    }

    if (
      typeof currency !== 'string' ||
      !/^[A-Za-z]{3,10}$/.test(currency)
    ) {
      res.status(400).json({
        success: false,
        error: { message: 'Enter a valid currency code.' },
      });
      return;
    }

    if (!isValidDate(startDate) || !isValidDate(expiryDate)) {
      res.status(400).json({
        success: false,
        error: { message: 'Enter valid start and expiry dates.' },
      });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (startDate <= today) {
      res.status(400).json({
        success: false,
        error: { message: 'The offer start date must be in the future.' },
      });
      return;
    }

    if (expiryDate <= startDate) {
      res.status(400).json({
        success: false,
        error: { message: 'The expiry date must be after the start date.' },
      });
      return;
    }

    const applicationResult = await query(
      `SELECT
         a.id,
         candidate_user.full_name AS candidate_name,
         candidate_user.email AS candidate_email,
         candidate_user.id AS candidate_user_id,
         j.title AS job_title,
         j.company_id,
         c.name AS company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN candidate_profiles cp ON cp.id = a.candidate_id
       JOIN users candidate_user ON candidate_user.id = cp.user_id
       LEFT JOIN companies c ON c.id = j.company_id
       WHERE a.id = $1
       LIMIT 1`,
      [applicationId]
    );

    const application = applicationResult.rows[0];

    if (!application) {
      res.status(404).json({
        success: false,
        error: { message: 'The selected application was not found.' },
      });
      return;
    }

    if (!isCompanyAuthorized(actor, application.company_id)) {
      res.status(403).json({
        success: false,
        error: { message: 'You cannot create an offer for this application.' },
      });
      return;
    }

    const candidateName = escapeHtml(application.candidate_name);
    const jobTitle = escapeHtml(application.job_title);
    const companyName = escapeHtml(application.company_name || 'Our company');
    const formattedSalary = `${escapeHtml(currency.toUpperCase())} ${salary.toLocaleString('en-US')}`;

    const offerLetterHtml = `
      <div>
        <h1>Employment Offer</h1>
        <p>Dear ${candidateName},</p>
        <p>We are pleased to offer you the position of <strong>${jobTitle}</strong>
        at ${companyName}.</p>
        <p><strong>Compensation:</strong> ${formattedSalary}</p>
        <p><strong>Start date:</strong> ${escapeHtml(startDate)}</p>
        <p><strong>Offer expiry:</strong> ${escapeHtml(expiryDate)}</p>
        <p>We look forward to welcoming you to the team.</p>
      </div>
    `;

    const result = await query(
      `INSERT INTO offer_records (
         application_id,
         salary_amount,
         currency,
         start_date,
         expires_at,
         offer_letter_html,
         created_by
       )
       VALUES ($1, $2, $3, $4::date, $5::date + INTERVAL '1 day' - INTERVAL '1 millisecond', $6, $7)
       RETURNING *`,
      [
        applicationId,
        salary,
        currency.toUpperCase(),
        startDate,
        expiryDate,
        offerLetterHtml,
        actor.id,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Offer draft created successfully.',
      data: result.rows[0],
    });
  } catch (error: any) {
    const message = error.message || 'Unable to create the offer draft.';
    const status = message.includes('permitted') ||
      message.includes('associated') ||
      message.includes('deactivated') ? 403 : 500;

    res.status(status).json({
      success: false,
      error: { message },
    });
  }
};

export const issueOffer = async (req: Request, res: Response): Promise<void> => {
  let offer: any;

  try {
    const actor = await getActor(req);
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT
           o.id,
           o.application_id,
           o.salary_amount,
           o.currency,
           o.start_date,
           o.expires_at,
           o.status,
           o.offer_letter_html,
           a.id AS linked_application_id,
           j.company_id,
           j.title AS job_title,
           c.name AS company_name,
           candidate_user.id AS candidate_user_id,
           candidate_user.full_name AS candidate_name,
           candidate_user.email AS candidate_email
         FROM offer_records o
         JOIN applications a ON a.id = o.application_id
         JOIN jobs j ON j.id = a.job_id
         LEFT JOIN companies c ON c.id = j.company_id
         JOIN candidate_profiles cp ON cp.id = a.candidate_id
         JOIN users candidate_user ON candidate_user.id = cp.user_id
         WHERE o.id = $1
         FOR UPDATE OF o`,
        [req.params.id]
      );

      offer = result.rows[0];

      if (!offer) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          error: { message: 'Offer not found.' },
        });
        return;
      }

      if (!isCompanyAuthorized(actor, offer.company_id)) {
        await client.query('ROLLBACK');
        res.status(403).json({
          success: false,
          error: { message: 'You cannot issue this offer.' },
        });
        return;
      }

      if (offer.status !== 'DRAFT') {
        await client.query('ROLLBACK');
        res.status(409).json({
          success: false,
          error: { message: 'Only draft offers can be issued.' },
        });
        return;
      }

      await client.query(
        `UPDATE offer_records
         SET status = 'ISSUED',
             issued_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [offer.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const notification = await sendNotification({
      recipientUserId: offer.candidate_user_id,
      recipientEmail: offer.candidate_email,
      eventType: 'OFFER_ISSUED',
      subject: `Employment offer from ${offer.company_name || 'our company'}`,
      contentBody:
        `Dear ${offer.candidate_name},\n\n` +
        `An employment offer has been issued for the position of ${offer.job_title}.\n` +
        `Compensation: ${offer.currency} ${Number(offer.salary_amount).toLocaleString('en-US')}\n` +
        `Start date: ${String(offer.start_date).slice(0, 10)}\n` +
        `Please contact the hiring team for the offer letter and next steps.`,
      channel: 'EMAIL',
      metadata: {
        offerId: offer.id,
        applicationId: offer.application_id,
      },
    });

    if (notification.status !== 'SENT') {
      await query(
        `UPDATE offer_records
         SET status = 'DRAFT',
             issued_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'ISSUED'`,
        [offer.id]
      );

      res.status(502).json({
        success: false,
        error: {
          message: 'The offer could not be emailed. It remains a draft and can be issued again.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Offer issued and notification event recorded successfully.',
      data: {
        id: offer.id,
        status: 'ISSUED',
        issuedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message:
          'The issuance result could not be confirmed. Check the offer status before retrying.',
      },
    });
  }
};
