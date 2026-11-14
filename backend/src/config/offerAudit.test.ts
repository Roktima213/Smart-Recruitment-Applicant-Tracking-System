import fs from 'fs';
import path from 'path';

describe('Database Migration 011: Controlled Offer Templates & Immutable Snapshot Archiving (Floor 18)', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../database/migrations/011_offer_templates_and_snapshots.sql'
  );

  it('1. Migration file must exist on disk', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('2. Defines offer_letter_templates table with company branding placeholders', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS offer_letter_templates');
    expect(content).toContain('company_id UUID REFERENCES companies(id) ON DELETE CASCADE');
    expect(content).toContain('template_type VARCHAR(50) NOT NULL DEFAULT');
    expect(content).toContain('body_html TEXT NOT NULL');
    expect(content).toContain('placeholders JSONB NOT NULL DEFAULT');
    expect(content).toContain('is_active BOOLEAN NOT NULL DEFAULT TRUE');
    expect(content).toContain('is_default BOOLEAN NOT NULL DEFAULT FALSE');
  });

  it('3. Seeds system-wide approved HTML offer templates with placeholders', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain("INSERT INTO offer_letter_templates");
    expect(content).toContain("'STANDARD_FULL_TIME'");
    expect(content).toContain("'EXECUTIVE_LEADERSHIP'");
    expect(content).toContain("'TECHNICAL_ENGINEERING'");
    expect(content).toContain("{{company_name}}");
    expect(content).toContain("{{company_logo}}");
    expect(content).toContain("{{candidate_name}}");
    expect(content).toContain("{{salary_amount}}");
    expect(content).toContain("{{start_date}}");
  });

  it('4. Enhances offer_records table with audit timestamps and lifecycle constraints', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('template_id UUID REFERENCES offer_letter_templates(id)');
    expect(content).toContain('accepted_at TIMESTAMPTZ');
    expect(content).toContain('declined_at TIMESTAMPTZ');
    expect(content).toContain('expired_at TIMESTAMPTZ');
    expect(content).toContain('sha256_checksum VARCHAR(64)');
    expect(content).toContain('snapshot_html TEXT');
    expect(content).toContain('chk_offer_issued_timestamp');
    expect(content).toContain('chk_offer_accepted_timestamp');
    expect(content).toContain('chk_offer_declined_timestamp');
    expect(content).toContain('chk_offer_expired_timestamp');
    expect(content).toContain('chk_offer_expiry_chronology');
  });

  it('5. Defines offer_snapshots table for immutable archival and anti-tamper verification', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS offer_snapshots');
    expect(content).toContain('offer_id UUID NOT NULL REFERENCES offer_records(id) ON DELETE CASCADE');
    expect(content).toContain('snapshot_version INTEGER NOT NULL DEFAULT 1');
    expect(content).toContain('offer_letter_html TEXT NOT NULL');
    expect(content).toContain('salary_amount NUMERIC(14, 2) NOT NULL');
    expect(content).toContain('sha256_checksum VARCHAR(64) NOT NULL');
    expect(content).toContain('issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(content).toContain('metadata JSONB NOT NULL DEFAULT');
  });

  it('6. Implements immutability protection trigger on offer_snapshots blocking UPDATE/DELETE', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE OR REPLACE FUNCTION fn_protect_offer_snapshots_immutability()');
    expect(content).toContain('RAISE EXCEPTION');
    expect(content).toContain('Immutable snapshot record cannot be modified or deleted once archived');
    expect(content).toContain('CREATE TRIGGER trg_protect_offer_snapshots_immutability');
    expect(content).toContain('BEFORE UPDATE OR DELETE ON offer_snapshots');
  });

  it('7. Implements lifecycle transition rules and tamper protection trigger on offer_records', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE OR REPLACE FUNCTION fn_enforce_offer_lifecycle_rules()');
    expect(content).toContain('Cannot transition offer out of terminal state');
    expect(content).toContain('Core offer terms (salary, start date, currency, letter HTML) are locked');
    expect(content).toContain('CREATE TRIGGER trg_enforce_offer_lifecycle_rules');
    expect(content).toContain('BEFORE UPDATE ON offer_records');
  });

  it('8. Configures performance indexes for template search and snapshot audit', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_offer_templates_company_id');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_offer_templates_type_active');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_offer_records_template_id');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_offer_snapshots_offer_id');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_offer_snapshots_checksum');
  });
});
