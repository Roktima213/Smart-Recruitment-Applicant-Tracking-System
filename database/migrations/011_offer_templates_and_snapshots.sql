-- ============================================================================
-- Migration 011: Controlled Offer Letter Templates & Immutable Snapshot Archiving
-- Floor 18 Deliverable (Cloud & Database Engineer: Roktima)
-- 
-- 1. Creates offer_letter_templates table with approved company branding placeholders
-- 2. Inserts system-wide approved HTML offer templates
-- 3. Enhances offer_records with audit timestamps and strict lifecycle state constraints
-- 4. Creates offer_snapshots table for immutable archival of issued offers
-- 5. Immutability triggers and anti-tampering guards
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create offer_letter_templates Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offer_letter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    template_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    description TEXT,
    body_html TEXT NOT NULL,
    placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_offer_letter_templates_updated_at ON offer_letter_templates;
CREATE TRIGGER set_offer_letter_templates_updated_at
    BEFORE UPDATE ON offer_letter_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_offer_templates_company_id ON offer_letter_templates (company_id);
CREATE INDEX IF NOT EXISTS idx_offer_templates_type_active ON offer_letter_templates (template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_offer_templates_default ON offer_letter_templates (is_default) WHERE is_default = TRUE;

-- ----------------------------------------------------------------------------
-- 2. Seed Approved System Default HTML Offer Letter Templates
-- ----------------------------------------------------------------------------
INSERT INTO offer_letter_templates (
    id,
    company_id,
    name,
    template_type,
    description,
    body_html,
    placeholders,
    is_active,
    is_default,
    version
) VALUES 
(
    '11111111-2222-3333-4444-555555550001',
    NULL,
    'Standard Full-Time Offer Letter',
    'STANDARD_FULL_TIME',
    'Standard corporate formal employment offer with company branding, salary breakdown, and at-will terms.',
    '<div class="offer-letter-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.6;">
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
</div>',
    '["company_name", "company_address", "company_website", "company_logo", "issued_date", "candidate_name", "candidate_email", "job_title", "department", "employment_type", "start_date", "salary_amount", "currency", "reporting_manager", "benefits_summary", "offer_expiry_date", "signatory_name", "signatory_title"]'::jsonb,
    TRUE,
    TRUE,
    1
),
(
    '11111111-2222-3333-4444-555555550002',
    NULL,
    'Executive Leadership Offer Letter',
    'EXECUTIVE_LEADERSHIP',
    'Executive and director leadership offer package including performance bonuses, equity incentives, and governance provisions.',
    '<div class="offer-letter-container" style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.7;">
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
</div>',
    '["company_name", "company_address", "company_website", "company_logo", "issued_date", "candidate_name", "candidate_email", "job_title", "salary_amount", "currency", "equity_grant", "start_date", "reporting_manager", "benefits_summary", "offer_expiry_date", "signatory_name", "signatory_title"]'::jsonb,
    TRUE,
    FALSE,
    1
),
(
    '11111111-2222-3333-4444-555555550003',
    NULL,
    'Technical & Engineering Offer Letter',
    'TECHNICAL_ENGINEERING',
    'Specialized engineering and technical contributor offer featuring intellectual property assignment and equipment stipend.',
    '<div class="offer-letter-container" style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #0f172a; line-height: 1.6;">
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
</div>',
    '["company_name", "company_address", "company_website", "company_logo", "issued_date", "candidate_name", "candidate_email", "job_title", "department", "salary_amount", "currency", "start_date", "reporting_manager", "benefits_summary", "offer_expiry_date", "signatory_name", "signatory_title"]'::jsonb,
    TRUE,
    FALSE,
    1
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    body_html = EXCLUDED.body_html,
    placeholders = EXCLUDED.placeholders,
    updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- 3. Enhance offer_records Table Schema & Constraints
-- ----------------------------------------------------------------------------
-- Add template link and audit timestamps if missing
ALTER TABLE offer_records
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES offer_letter_templates(id) ON DELETE SET NULL;

ALTER TABLE offer_records
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE offer_records
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

ALTER TABLE offer_records
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

ALTER TABLE offer_records
ADD COLUMN IF NOT EXISTS declined_reason TEXT;

ALTER TABLE offer_records
ADD COLUMN IF NOT EXISTS sha256_checksum VARCHAR(64);

ALTER TABLE offer_records
ADD COLUMN IF NOT EXISTS snapshot_html TEXT;

-- Enforce audit timestamp and state integrity constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_offer_issued_timestamp'
    ) THEN
        ALTER TABLE offer_records
        ADD CONSTRAINT chk_offer_issued_timestamp
        CHECK (status = 'DRAFT' OR issued_at IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_offer_accepted_timestamp'
    ) THEN
        ALTER TABLE offer_records
        ADD CONSTRAINT chk_offer_accepted_timestamp
        CHECK (status != 'ACCEPTED' OR (accepted_at IS NOT NULL AND responded_at IS NOT NULL));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_offer_declined_timestamp'
    ) THEN
        ALTER TABLE offer_records
        ADD CONSTRAINT chk_offer_declined_timestamp
        CHECK (status != 'DECLINED' OR (declined_at IS NOT NULL AND responded_at IS NOT NULL));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_offer_expired_timestamp'
    ) THEN
        ALTER TABLE offer_records
        ADD CONSTRAINT chk_offer_expired_timestamp
        CHECK (status != 'EXPIRED' OR expired_at IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_offer_expiry_chronology'
    ) THEN
        ALTER TABLE offer_records
        ADD CONSTRAINT chk_offer_expiry_chronology
        CHECK (expires_at IS NULL OR issued_at IS NULL OR expires_at > issued_at);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_offer_records_template_id ON offer_records (template_id);
CREATE INDEX IF NOT EXISTS idx_offer_records_status_issued ON offer_records (status, issued_at);

-- ----------------------------------------------------------------------------
-- 4. Create offer_snapshots Table (Immutable Archival)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offer_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offer_records(id) ON DELETE CASCADE,
    snapshot_version INTEGER NOT NULL DEFAULT 1,
    offer_letter_html TEXT NOT NULL,
    salary_amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    start_date DATE NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    sha256_checksum VARCHAR(64) NOT NULL,
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offer_snapshots_offer_id ON offer_snapshots (offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_snapshots_checksum ON offer_snapshots (sha256_checksum);
CREATE INDEX IF NOT EXISTS idx_offer_snapshots_created_at ON offer_snapshots (created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Immutability Trigger for offer_snapshots (Anti-Tampering)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_protect_offer_snapshots_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Immutable snapshot record cannot be modified or deleted once archived (snapshot_id: %, offer_id: %)',
        OLD.id, OLD.offer_id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_offer_snapshots_immutability ON offer_snapshots;
CREATE TRIGGER trg_protect_offer_snapshots_immutability
    BEFORE UPDATE OR DELETE ON offer_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION fn_protect_offer_snapshots_immutability();

-- ----------------------------------------------------------------------------
-- 6. Offer Records Lifecycle and Anti-Tamper Transition Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_enforce_offer_lifecycle_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Prohibit updates to terminal states
    IF OLD.status IN ('ACCEPTED', 'DECLINED', 'EXPIRED') THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Cannot transition offer out of terminal state % (offer_id: %)', OLD.status, OLD.id;
        END IF;
    END IF;

    -- 2. Validate legal state transitions
    IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT', 'ISSUED') THEN
        RAISE EXCEPTION 'Draft offers can only be updated in DRAFT or transitioned to ISSUED (target: %, offer_id: %)',
            NEW.status, OLD.id;
    END IF;

    IF OLD.status = 'ISSUED' AND NEW.status NOT IN ('ISSUED', 'ACCEPTED', 'DECLINED', 'EXPIRED') THEN
        RAISE EXCEPTION 'Issued offers can only transition to ACCEPTED, DECLINED, or EXPIRED (target: %, offer_id: %)',
            NEW.status, OLD.id;
    END IF;

    -- 3. Prevent tampering with core terms once issued
    IF OLD.status != 'DRAFT' THEN
        IF NEW.salary_amount IS DISTINCT FROM OLD.salary_amount OR
           NEW.start_date IS DISTINCT FROM OLD.start_date OR
           NEW.currency IS DISTINCT FROM OLD.currency OR
           NEW.offer_letter_html IS DISTINCT FROM OLD.offer_letter_html THEN
            RAISE EXCEPTION 'Core offer terms (salary, start date, currency, letter HTML) are locked and cannot be modified once issued (offer_id: %)',
                OLD.id;
        END IF;
    END IF;

    -- 4. Auto-populate audit timestamps
    IF NEW.status = 'ISSUED' AND (OLD.status IS NULL OR OLD.status = 'DRAFT') THEN
        NEW.issued_at := COALESCE(NEW.issued_at, CURRENT_TIMESTAMP);
    END IF;

    IF NEW.status = 'ACCEPTED' AND (OLD.status IS NULL OR OLD.status = 'ISSUED') THEN
        NEW.accepted_at := COALESCE(NEW.accepted_at, CURRENT_TIMESTAMP);
        NEW.responded_at := COALESCE(NEW.responded_at, CURRENT_TIMESTAMP);
    END IF;

    IF NEW.status = 'DECLINED' AND (OLD.status IS NULL OR OLD.status = 'ISSUED') THEN
        NEW.declined_at := COALESCE(NEW.declined_at, CURRENT_TIMESTAMP);
        NEW.responded_at := COALESCE(NEW.responded_at, CURRENT_TIMESTAMP);
    END IF;

    IF NEW.status = 'EXPIRED' AND (OLD.status IS NULL OR OLD.status = 'ISSUED') THEN
        NEW.expired_at := COALESCE(NEW.expired_at, CURRENT_TIMESTAMP);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_offer_lifecycle_rules ON offer_records;
CREATE TRIGGER trg_enforce_offer_lifecycle_rules
    BEFORE UPDATE ON offer_records
    FOR EACH ROW
    EXECUTE FUNCTION fn_enforce_offer_lifecycle_rules();
