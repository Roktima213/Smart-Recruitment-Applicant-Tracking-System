/**
 * Smart ATS - Candidate Offer Ownership & Tenant Isolation Security Service
 * Floor 19 Deliverable (Cloud Engineer: Roktima)
 *
 * Responsibilities:
 * 1. Enforce row-level candidate ownership checks ensuring Candidate A cannot view, inspect,
 *    or respond to Candidate B's offer (Anti-IDOR).
 * 2. Validate Firebase UID resolution against PostgreSQL candidate and application records.
 * 3. Guarantee zero data leakage across multi-tenant corporate accounts and unassociated candidates.
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CallerIdentity {
  uid: string;
  role: string;
  companyId?: string | null;
  email?: string;
}

export interface ResolvedCandidate {
  userId: string;
  firebaseUid: string;
  email: string;
  fullName: string;
  candidateId: string | null;
  isActive: boolean;
}

export interface OfferOwnershipRecord {
  id: string;
  application_id: string;
  salary_amount: number;
  currency: string;
  start_date: string;
  offer_letter_html: string;
  status: string;
  issued_at: string | null;
  responded_at: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  expired_at?: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  current_stage: string;
  candidate_id: string;
  job_id: string;
  job_title: string;
  job_company_id: string;
  company_name: string;
  candidate_firebase_uid: string;
  candidate_user_id: string;
  candidate_name: string;
  candidate_email: string;
}

export interface OwnershipVerificationResult {
  authorized: boolean;
  statusCode: number;
  error?: string;
  offer?: OfferOwnershipRecord;
  isCandidateOwner?: boolean;
  isTenantAuthorized?: boolean;
}

/**
 * Resolves a candidate's PostgreSQL user and profile records from their Firebase UID.
 */
export async function resolveCandidateByFirebaseUid(
  firebaseUid: string
): Promise<ResolvedCandidate | null> {
  if (!firebaseUid || typeof firebaseUid !== 'string' || firebaseUid.trim() === '') {
    return null;
  }

  const sql = `
    SELECT 
      u.id AS user_id,
      u.firebase_uid,
      u.email,
      u.full_name,
      u.is_active,
      cp.id AS candidate_id
    FROM users u
    LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
    WHERE u.firebase_uid = $1
    LIMIT 1;
  `;

  const result = await query(sql, [firebaseUid.trim()]);
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    userId: row.user_id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    fullName: row.full_name,
    candidateId: row.candidate_id || null,
    isActive: row.is_active !== false,
  };
}

/**
 * Retrieves an offer and performs strict row-level candidate ownership and multi-tenant isolation checks.
 */
export async function verifyOfferOwnershipAndAccess(
  offerId: string,
  caller: CallerIdentity
): Promise<OwnershipVerificationResult> {
  // 1. Validate caller authentication
  if (!caller || !caller.uid) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Authentication required prior to accessing offer',
    };
  }

  // 2. Validate offer UUID syntax
  if (!offerId || !UUID_REGEX.test(offerId.trim())) {
    return {
      authorized: false,
      statusCode: 400,
      error: 'Invalid offer UUID format',
    };
  }

  const normalizedOfferId = offerId.trim();

  // 3. Query offer and relational tenant / candidate bindings
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
      o.accepted_at,
      o.declined_at,
      o.expired_at,
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
    LIMIT 1;
  `;

  const result = await query(sql, [normalizedOfferId]);

  // 4. Offer existence check (prevents state leakage to unauthorized callers)
  if (result.rows.length === 0) {
    return {
      authorized: false,
      statusCode: 404,
      error: 'Offer not found',
    };
  }

  const offer: OfferOwnershipRecord = result.rows[0];
  const callerRole = (caller.role || '').toUpperCase();

  // 5. CANDIDATE Role: Strict Anti-IDOR Ownership Guard
  if (callerRole === 'CANDIDATE') {
    if (offer.candidate_firebase_uid !== caller.uid) {
      return {
        authorized: false,
        statusCode: 403,
        error: 'Forbidden: You do not have permission to access or respond to this offer',
        isCandidateOwner: false,
      };
    }

    return {
      authorized: true,
      statusCode: 200,
      offer,
      isCandidateOwner: true,
      isTenantAuthorized: true,
    };
  }

  // 6. HR Role: Multi-Tenant Corporate Boundary Guard
  if (callerRole === 'HR') {
    let hrCompanyId = caller.companyId;
    if (!hrCompanyId) {
      const hrUserRes = await query(
        'SELECT company_id FROM users WHERE firebase_uid = $1 LIMIT 1;',
        [caller.uid]
      );
      hrCompanyId = hrUserRes.rows[0]?.company_id || undefined;
    }

    if (!hrCompanyId || hrCompanyId !== offer.job_company_id) {
      return {
        authorized: false,
        statusCode: 403,
        error: 'Forbidden: You do not have permission to access offers for another organization',
        isTenantAuthorized: false,
      };
    }

    return {
      authorized: true,
      statusCode: 200,
      offer,
      isCandidateOwner: false,
      isTenantAuthorized: true,
    };
  }

  // 7. ADMIN Role: Scoped to their organization if assigned
  if (callerRole === 'ADMIN') {
    let adminCompanyId = caller.companyId;
    if (!adminCompanyId) {
      const adminRes = await query(
        'SELECT company_id FROM users WHERE firebase_uid = $1 LIMIT 1;',
        [caller.uid]
      );
      adminCompanyId = adminRes.rows[0]?.company_id || undefined;
    }

    if (adminCompanyId && adminCompanyId !== offer.job_company_id) {
      return {
        authorized: false,
        statusCode: 403,
        error: 'Forbidden: Offer does not belong to your organization',
        isTenantAuthorized: false,
      };
    }

    return {
      authorized: true,
      statusCode: 200,
      offer,
      isCandidateOwner: false,
      isTenantAuthorized: true,
    };
  }

  // 8. SUPER_ADMIN Role: Full Access
  if (callerRole === 'SUPER_ADMIN') {
    return {
      authorized: true,
      statusCode: 200,
      offer,
      isCandidateOwner: false,
      isTenantAuthorized: true,
    };
  }

  // 9. Any unrecognized or untrusted role
  return {
    authorized: false,
    statusCode: 403,
    error: 'Forbidden: Unauthorized role',
  };
}

/**
 * Express middleware that enforces candidate ownership and tenant isolation on routes with :id
 */
export async function enforceOfferOwnershipMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const offerId = req.params.id;
  const caller: CallerIdentity = {
    uid: req.user?.uid || '',
    role: req.user?.role || '',
    companyId: req.user?.companyId,
    email: req.user?.email,
  };

  const check = await verifyOfferOwnershipAndAccess(offerId, caller);

  if (!check.authorized) {
    res.status(check.statusCode).json({
      success: false,
      error: {
        message: check.error || 'Access denied',
        statusCode: check.statusCode,
      },
    });
    return;
  }

  // Attach verified offer to request context
  (req as any).verifiedOffer = check.offer;
  next();
}

/**
 * Enforces ownership and processes candidate response (ACCEPT or DECLINE) to an offer.
 */
export async function respondToOfferWithOwnershipGuard(
  offerId: string,
  caller: CallerIdentity,
  action: 'ACCEPT' | 'DECLINE',
  declineReason?: string
): Promise<{
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  offer?: any;
}> {
  const authCheck = await verifyOfferOwnershipAndAccess(offerId, caller);

  if (!authCheck.authorized) {
    return {
      success: false,
      statusCode: authCheck.statusCode,
      error: authCheck.error,
    };
  }

  const callerRole = (caller.role || '').toUpperCase();
  if (callerRole !== 'CANDIDATE') {
    return {
      success: false,
      statusCode: 403,
      error: 'Forbidden: Only the candidate owner is authorized to accept or decline an offer',
    };
  }

  const offer = authCheck.offer!;

  // Verify offer is currently in ISSUED status
  if (offer.status !== 'ISSUED') {
    return {
      success: false,
      statusCode: 400,
      error: `Cannot respond to offer: Current status is '${offer.status}'. Only ISSUED offers can be accepted or declined`,
    };
  }

  // Verify offer has not expired
  if (offer.expires_at) {
    const expiresAtDate = new Date(offer.expires_at);
    if (!isNaN(expiresAtDate.getTime()) && expiresAtDate.getTime() < Date.now()) {
      return {
        success: false,
        statusCode: 400,
        error: 'Cannot respond to offer: The offer validity period has expired',
      };
    }
  }

  const targetStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  const timestampField = action === 'ACCEPT' ? 'accepted_at' : 'declined_at';

  const updateSql = `
    UPDATE offer_records
    SET 
      status = $1,
      responded_at = CURRENT_TIMESTAMP,
      ${timestampField} = CURRENT_TIMESTAMP,
      declined_reason = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
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
      accepted_at,
      declined_at,
      expired_at,
      expires_at,
      created_by,
      created_at,
      updated_at;
  `;

  const updateRes = await query(updateSql, [
    targetStatus,
    action === 'DECLINE' ? (declineReason || 'Candidate declined offer terms') : null,
    offer.id,
  ]);

  const updated = updateRes.rows[0];

  return {
    success: true,
    statusCode: 200,
    message: `Offer successfully ${targetStatus.toLowerCase()}`,
    offer: updated,
  };
}

export default {
  resolveCandidateByFirebaseUid,
  verifyOfferOwnershipAndAccess,
  enforceOfferOwnershipMiddleware,
  respondToOfferWithOwnershipGuard,
};
