/**
 * Smart ATS - Controlled Offer Letter Templates & Snapshot Archiving
 * Floor 18 Deliverable (Cloud & Database Engineer: Roktima)
 *
 * Responsibilities:
 * 1. Store approved HTML offer letter templates with company branding placeholders.
 * 2. Sanitize and render candidate/company variables securely without XSS vulnerabilities.
 * 3. Generate SHA-256 integrity checksums for immutable snapshot archiving in the database.
 * 4. Enforce strict lifecycle transitions across DRAFT, ISSUED, ACCEPTED, DECLINED, EXPIRED.
 */

import crypto from 'crypto';

export type OfferTemplateType =
  | 'STANDARD_FULL_TIME'
  | 'EXECUTIVE_LEADERSHIP'
  | 'TECHNICAL_ENGINEERING'
  | 'INTERNSHIP_CONTRACT';

export type OfferLifecycleStatus = 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface OfferTemplate {
  id: string;
  name: string;
  templateType: OfferTemplateType;
  description: string;
  bodyHtml: string;
  placeholders: string[];
  isActive: boolean;
  isDefault: boolean;
  version: number;
}

export interface OfferBrandingPlaceholders {
  company_name: string;
  company_address?: string;
  company_website?: string;
  company_logo?: string;
  candidate_name: string;
  candidate_email: string;
  candidate_address?: string;
  job_title: string;
  department?: string;
  employment_type?: string;
  start_date: string;
  salary_amount: string | number;
  currency?: string;
  reporting_manager?: string;
  benefits_summary?: string;
  equity_grant?: string;
  offer_expiry_date: string;
  issued_date?: string;
  signatory_name: string;
  signatory_title: string;
  [key: string]: unknown;
}

export interface OfferSnapshotPayload {
  offerId: string;
  offerLetterHtml: string;
  salaryAmount: number;
  currency: string;
  startDate: string;
  issuedAt: string;
  expiresAt?: string;
  sha256Checksum: string;
  issuedBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Approved System-Wide Offer Letter Templates with Company Branding Placeholders
 */
export const APPROVED_OFFER_TEMPLATES: OfferTemplate[] = [
  {
    id: '11111111-2222-3333-4444-555555550001',
    name: 'Standard Full-Time Offer Letter',
    templateType: 'STANDARD_FULL_TIME',
    description: 'Standard corporate formal employment offer with company branding, salary breakdown, and at-will terms.',
    placeholders: [
      'company_name',
      'company_address',
      'company_website',
      'company_logo',
      'issued_date',
      'candidate_name',
      'candidate_email',
      'job_title',
      'department',
      'employment_type',
      'start_date',
      'salary_amount',
      'currency',
      'reporting_manager',
      'benefits_summary',
      'offer_expiry_date',
      'signatory_name',
      'signatory_title',
    ],
    isActive: true,
    isDefault: true,
    version: 1,
    bodyHtml: `<div class="offer-letter-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.6;">
  <div class="header" style="border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h1 style="color: #0f172a; margin: 0; font-size: 24px;">{{company_name}}</h1>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">{{company_address}} | {{company_website}}</p>
    </div>
    <div class="logo">
      <img src="{{company_logo}}" alt="{{company_name}} Logo" style="max-height: 60px; max-width: 180px;" />
    </div>
  </div>

  <div class="date-recipient" style="margin-bottom: 24px;">
    <p style="margin: 0 0 16px;"><strong>Date:</strong> {{issued_date}}</p>
    <p style="margin: 0;"><strong>To:</strong> {{candidate_name}}</p>
    <p style="margin: 0; color: #64748b;">{{candidate_email}}</p>
  </div>

  <div class="greeting" style="margin-bottom: 20px;">
    <p>Dear {{candidate_name}},</p>
    <p>On behalf of <strong>{{company_name}}</strong>, we are thrilled to offer you the position of <strong>{{job_title}}</strong> within our <strong>{{department}}</strong> department. We believe your experience and skills will be an exceptional fit for our organization.</p>
  </div>

  <div class="terms-table" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
    <h3 style="margin-top: 0; color: #0f172a; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">Summary of Offer Terms</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 6px 0; color: #64748b; width: 40%;">Position Title:</td><td style="padding: 6px 0; font-weight: bold;">{{job_title}}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Department:</td><td style="padding: 6px 0; font-weight: bold;">{{department}}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Employment Type:</td><td style="padding: 6px 0; font-weight: bold;">{{employment_type}}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Anticipated Start Date:</td><td style="padding: 6px 0; font-weight: bold;">{{start_date}}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Base Compensation:</td><td style="padding: 6px 0; font-weight: bold;">{{salary_amount}} {{currency}} per year</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Reporting Manager:</td><td style="padding: 6px 0; font-weight: bold;">{{reporting_manager}}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Benefits:</td><td style="padding: 6px 0;">{{benefits_summary}}</td></tr>
    </table>
  </div>

  <div class="provisions" style="font-size: 13px; color: #475569; margin-bottom: 24px;">
    <p>This offer is contingent upon successful verification of employment eligibility. This offer remains valid until <strong>{{offer_expiry_date}}</strong>.</p>
  </div>

  <div class="signatures" style="margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 24px;">
    <div style="width: 45%;">
      <p style="margin: 0 0 40px 0; font-size: 13px; color: #64748b;">Sincerely,</p>
      <div style="border-bottom: 1px solid #94a3b8; margin-bottom: 8px;"></div>
      <p style="margin: 0; font-weight: bold;">{{signatory_name}}</p>
      <p style="margin: 0; font-size: 13px; color: #64748b;">{{signatory_title}}, {{company_name}}</p>
    </div>
    <div style="width: 45%;">
      <p style="margin: 0 0 40px 0; font-size: 13px; color: #64748b;">Accepted & Acknowledged:</p>
      <div style="border-bottom: 1px solid #94a3b8; margin-bottom: 8px;"></div>
      <p style="margin: 0; font-weight: bold;">{{candidate_name}}</p>
      <p style="margin: 0; font-size: 13px; color: #64748b;">Candidate Signature & Date</p>
    </div>
  </div>
</div>`,
  },
  {
    id: '11111111-2222-3333-4444-555555550002',
    name: 'Executive Leadership Offer Letter',
    templateType: 'EXECUTIVE_LEADERSHIP',
    description: 'Executive and director leadership offer package including performance bonuses, equity incentives, and governance provisions.',
    placeholders: [
      'company_name',
      'company_address',
      'company_website',
      'company_logo',
      'issued_date',
      'candidate_name',
      'candidate_email',
      'job_title',
      'salary_amount',
      'currency',
      'equity_grant',
      'start_date',
      'reporting_manager',
      'benefits_summary',
      'offer_expiry_date',
      'signatory_name',
      'signatory_title',
    ],
    isActive: true,
    isDefault: false,
    version: 1,
    bodyHtml: `<div class="offer-letter-container" style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.7;">
  <div class="header" style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h1 style="color: #0f172a; margin: 0; font-size: 26px; letter-spacing: 0.5px;">{{company_name}}</h1>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">{{company_address}} | {{company_website}}</p>
    </div>
    <div class="logo">
      <img src="{{company_logo}}" alt="{{company_name}} Logo" style="max-height: 60px; max-width: 180px;" />
    </div>
  </div>

  <div class="date-recipient" style="margin-bottom: 24px;">
    <p style="margin: 0 0 16px;"><strong>Date of Issuance:</strong> {{issued_date}}</p>
    <p style="margin: 0;"><strong>Delivered Confidentially To:</strong> {{candidate_name}} ({{candidate_email}})</p>
  </div>

  <p>Dear {{candidate_name}},</p>
  <p>The Board of Directors and Executive Committee of <strong>{{company_name}}</strong> are pleased to formally extend this executive appointment offer for the position of <strong>{{job_title}}</strong>.</p>

  <div class="terms" style="background-color: #f1f5f9; border-left: 4px solid #0f172a; padding: 20px; margin: 24px 0;">
    <h3 style="margin-top: 0; color: #0f172a;">Executive Compensation Architecture</h3>
    <p><strong>Base Salary:</strong> {{salary_amount}} {{currency}} per annum, payable in regular intervals.</p>
    <p><strong>Incentive Bonus & Equity:</strong> {{equity_grant}}</p>
    <p><strong>Effective Appointment Date:</strong> {{start_date}}</p>
    <p><strong>Reporting Structure:</strong> Reports directly to {{reporting_manager}}.</p>
    <p><strong>Comprehensive Executive Benefits:</strong> {{benefits_summary}}</p>
  </div>

  <p style="font-size: 13px; color: #475569;">This confidential offer shall expire if not signed and returned by <strong>{{offer_expiry_date}}</strong>.</p>

  <div class="signatures" style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 20px; display: flex; justify-content: space-between;">
    <div style="width: 45%;">
      <p style="margin-bottom: 40px;">For the Company:</p>
      <p><strong>{{signatory_name}}</strong><br/><span style="color:#64748b;">{{signatory_title}}</span></p>
    </div>
    <div style="width: 45%;">
      <p style="margin-bottom: 40px;">Candidate Acceptance:</p>
      <p><strong>{{candidate_name}}</strong><br/><span style="color:#64748b;">Date: ____________________</span></p>
    </div>
  </div>
</div>`,
  },
  {
    id: '11111111-2222-3333-4444-555555550003',
    name: 'Technical & Engineering Offer Letter',
    templateType: 'TECHNICAL_ENGINEERING',
    description: 'Specialized engineering and technical contributor offer featuring intellectual property assignment and equipment stipend.',
    placeholders: [
      'company_name',
      'company_address',
      'company_website',
      'company_logo',
      'issued_date',
      'candidate_name',
      'candidate_email',
      'job_title',
      'department',
      'salary_amount',
      'currency',
      'start_date',
      'reporting_manager',
      'benefits_summary',
      'offer_expiry_date',
      'signatory_name',
      'signatory_title',
    ],
    isActive: true,
    isDefault: false,
    version: 1,
    bodyHtml: `<div class="offer-letter-container" style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #0f172a; line-height: 1.6;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px;">
    <div>
      <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">{{company_name}} Engineering</h1>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">{{company_website}} | {{company_address}}</p>
    </div>
    <img src="{{company_logo}}" alt="Logo" style="max-height: 55px;" />
  </div>

  <p><strong>Date:</strong> {{issued_date}}</p>
  <p><strong>Recipient:</strong> {{candidate_name}} ({{candidate_email}})</p>

  <p>Dear {{candidate_name}},</p>
  <p>We are excited to invite you to join our engineering organization at <strong>{{company_name}}</strong> as <strong>{{job_title}}</strong> in {{department}}.</p>

  <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1e40af;">Engineering Package Highlights</h3>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #1e3a8a;">
      <li><strong>Annual Base Compensation:</strong> {{salary_amount}} {{currency}}</li>
      <li><strong>Target Start Date:</strong> {{start_date}}</li>
      <li><strong>Engineering Lead / Manager:</strong> {{reporting_manager}}</li>
      <li><strong>Equipment & Work Setup:</strong> Modern workstation setup and engineering tooling stipend included.</li>
      <li><strong>Health & Wellness:</strong> {{benefits_summary}}</li>
    </ul>
  </div>

  <p style="font-size: 13px; color: #64748b;">This offer remains open for acceptance until <strong>{{offer_expiry_date}}</strong>.</p>

  <div style="margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between;">
    <div>
      <p style="margin-bottom: 36px; color:#64748b;">Authorized Signature:</p>
      <p><strong>{{signatory_name}}</strong><br/>{{signatory_title}}</p>
    </div>
    <div>
      <p style="margin-bottom: 36px; color:#64748b;">Candidate Signature:</p>
      <p><strong>{{candidate_name}}</strong><br/>Date: __________________</p>
    </div>
  </div>
</div>`,
  },
  {
    id: '11111111-2222-3333-4444-555555550004',
    name: 'Internship & Cooperative Offer Letter',
    templateType: 'INTERNSHIP_CONTRACT',
    description: 'Fixed-term internship / cooperative education offer letter with mentorship assignments and stipend terms.',
    placeholders: [
      'company_name',
      'company_address',
      'company_website',
      'company_logo',
      'issued_date',
      'candidate_name',
      'candidate_email',
      'job_title',
      'department',
      'salary_amount',
      'currency',
      'start_date',
      'reporting_manager',
      'offer_expiry_date',
      'signatory_name',
      'signatory_title',
    ],
    isActive: true,
    isDefault: false,
    version: 1,
    bodyHtml: `<div class="offer-letter-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.6;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px;">
    <div>
      <h1 style="color: #065f46; margin: 0; font-size: 24px;">{{company_name}} Internship Program</h1>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">{{company_website}}</p>
    </div>
    <img src="{{company_logo}}" alt="Logo" style="max-height: 50px;" />
  </div>

  <p>Dear {{candidate_name}},</p>
  <p>We are pleased to offer you an internship appointment as <strong>{{job_title}}</strong> at <strong>{{company_name}}</strong> within our {{department}} team.</p>

  <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
    <h3 style="margin-top: 0; color: #065f46;">Internship Terms</h3>
    <p><strong>Stipend / Compensation:</strong> {{salary_amount}} {{currency}}</p>
    <p><strong>Session Start Date:</strong> {{start_date}}</p>
    <p><strong>Assigned Mentor:</strong> {{reporting_manager}}</p>
  </div>

  <p style="font-size: 13px; color: #64748b;">Please accept by <strong>{{offer_expiry_date}}</strong>.</p>
</div>`,
  },
];

/**
 * Returns all active system-wide approved offer letter templates.
 */
export function getApprovedOfferTemplates(): OfferTemplate[] {
  return APPROVED_OFFER_TEMPLATES.filter((tpl) => tpl.isActive);
}

/**
 * Retrieves an approved offer letter template by its unique ID or template type.
 */
export function getApprovedOfferTemplate(identifier: string): OfferTemplate | undefined {
  if (!identifier) return undefined;
  const needle = identifier.trim().toLowerCase();
  return APPROVED_OFFER_TEMPLATES.find(
    (tpl) => tpl.id.toLowerCase() === needle || tpl.templateType.toLowerCase() === needle
  );
}

/**
 * Extracts all `{{placeholder}}` token keys embedded within an HTML template.
 */
export function extractTemplatePlaceholders(templateHtml: string): string[] {
  if (!templateHtml) return [];
  const matches = templateHtml.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
  if (!matches) return [];
  const keys = matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim());
  return Array.from(new Set(keys));
}

/**
 * Escapes HTML characters in user-provided inputs to prevent Cross-Site Scripting (XSS).
 */
export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates whether all mandatory placeholders required by the template are present.
 */
export function validateOfferTemplateVariables(
  templateHtml: string,
  variables: Partial<OfferBrandingPlaceholders>
): { isValid: boolean; missingFields: string[] } {
  const requiredTokens = extractTemplatePlaceholders(templateHtml);
  const missingFields: string[] = [];

  for (const token of requiredTokens) {
    const val = variables[token];
    if (val === undefined || val === null || String(val).trim() === '') {
      missingFields.push(token);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Renders an offer letter by interpolating placeholders with sanitized values.
 */
export function renderOfferLetterHtml(
  templateHtml: string,
  variables: Partial<OfferBrandingPlaceholders>,
  options?: { allowUnescapedHtml?: boolean; fallbackDefaults?: boolean }
): string {
  if (!templateHtml) return '';

  const defaults: Partial<OfferBrandingPlaceholders> = options?.fallbackDefaults
    ? {
        company_logo: 'https://via.placeholder.com/150x50?text=Company+Logo',
        company_address: '100 Enterprise Way, Suite 400',
        company_website: 'https://company.example.com',
        currency: 'USD',
        benefits_summary: 'Comprehensive Health, Dental, Vision, and 401(k) Retirement Plan.',
        equity_grant: 'Standard equity options subject to four-year vesting.',
        reporting_manager: 'Hiring Team Director',
        signatory_title: 'Head of Talent Acquisition',
        signatory_name: 'Authorized Executive',
        employment_type: 'Full-Time Regular',
        department: 'Operations',
        issued_date: new Date().toISOString().split('T')[0],
      }
    : {};

  const merged = { ...defaults, ...variables };

  return templateHtml.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    const rawVal = merged[key];
    if (rawVal === undefined || rawVal === null) {
      return `[Pending ${key.replace(/_/g, ' ')}]`;
    }

    // Logo URLs and safe styles may remain raw if explicitly approved
    if (key === 'company_logo' && options?.allowUnescapedHtml) {
      return String(rawVal);
    }

    return escapeHtml(rawVal);
  });
}

/**
 * Computes a deterministic SHA-256 cryptographic digest of the offer terms.
 * Used for immutable snapshot verification to detect retroactive tampering.
 */
export function computeOfferChecksum(payload: {
  offerLetterHtml: string;
  salaryAmount: number | string;
  currency: string;
  startDate: string;
  applicationId?: string;
}): string {
  const canonicalString = [
    String(payload.applicationId || '').trim(),
    Number(payload.salaryAmount).toFixed(2),
    String(payload.currency || 'USD').trim().toUpperCase(),
    String(payload.startDate).trim(),
    String(payload.offerLetterHtml).trim(),
  ].join('|');

  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

/**
 * Formats a standardized immutable snapshot payload for database insertion.
 */
export function createOfferSnapshotPayload(data: {
  offerId: string;
  offerLetterHtml: string;
  salaryAmount: number | string;
  currency?: string;
  startDate: string;
  expiresAt?: string;
  issuedBy?: string;
  metadata?: Record<string, unknown>;
}): OfferSnapshotPayload {
  const currency = (data.currency || 'USD').trim().toUpperCase();
  const salaryAmount = typeof data.salaryAmount === 'number' ? data.salaryAmount : parseFloat(data.salaryAmount);
  const issuedAt = new Date().toISOString();

  const sha256Checksum = computeOfferChecksum({
    offerLetterHtml: data.offerLetterHtml,
    salaryAmount,
    currency,
    startDate: data.startDate,
  });

  return {
    offerId: data.offerId,
    offerLetterHtml: data.offerLetterHtml,
    salaryAmount,
    currency,
    startDate: data.startDate,
    issuedAt,
    expiresAt: data.expiresAt,
    sha256Checksum,
    issuedBy: data.issuedBy,
    metadata: data.metadata || {},
  };
}

/**
 * Legal offer lifecycle transitions state machine
 */
export const ALLOWED_OFFER_LIFECYCLE_TRANSITIONS: Record<OfferLifecycleStatus, OfferLifecycleStatus[]> = {
  DRAFT: ['DRAFT', 'ISSUED'],
  ISSUED: ['ISSUED', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
  ACCEPTED: [], // Terminal state
  DECLINED: [], // Terminal state
  EXPIRED: [],  // Terminal state
};

/**
 * Validates whether an offer status transition is allowed by the ATS lifecycle rules.
 */
export function validateOfferLifecycleTransition(
  currentStatus: OfferLifecycleStatus,
  targetStatus: OfferLifecycleStatus
): { isValid: boolean; error?: string } {
  if (currentStatus === targetStatus && ['DRAFT', 'ISSUED'].includes(currentStatus)) {
    return { isValid: true };
  }

  const allowed = ALLOWED_OFFER_LIFECYCLE_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    return {
      isValid: false,
      error: `Illegal offer transition: Cannot transition from ${currentStatus} to ${targetStatus}. Allowed targets: [${(allowed || []).join(', ')}]`,
    };
  }

  return { isValid: true };
}

export default {
  APPROVED_OFFER_TEMPLATES,
  getApprovedOfferTemplates,
  getApprovedOfferTemplate,
  extractTemplatePlaceholders,
  escapeHtml,
  validateOfferTemplateVariables,
  renderOfferLetterHtml,
  computeOfferChecksum,
  createOfferSnapshotPayload,
  validateOfferLifecycleTransition,
};
