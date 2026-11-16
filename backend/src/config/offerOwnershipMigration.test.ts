import fs from 'fs';
import path from 'path';

describe('Database Migration 012: Candidate Ownership & Tenant Security (Floor 19)', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../database/migrations/012_offer_candidate_ownership_security.sql'
  );

  it('1. Migration file must exist on disk', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('2. Configures high-performance indexes for candidate ownership and tenant resolution', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_users_firebase_uid_active');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_active');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_applications_candidate_stage');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_offer_records_app_status_lifecycle');
  });

  it('3. Defines SQL function fn_verify_candidate_offer_ownership for Anti-IDOR verification', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE OR REPLACE FUNCTION fn_verify_candidate_offer_ownership(');
    expect(content).toContain('p_offer_id UUID');
    expect(content).toContain('p_firebase_uid VARCHAR');
    expect(content).toContain('RETURNS BOOLEAN');
    expect(content).toContain('u.firebase_uid = p_firebase_uid');
    expect(content).toContain('u.is_active = TRUE');
  });

  it('4. Defines SQL function fn_verify_offer_tenant_isolation for corporate tenant boundaries', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE OR REPLACE FUNCTION fn_verify_offer_tenant_isolation(');
    expect(content).toContain('p_offer_id UUID');
    expect(content).toContain('p_company_id UUID');
    expect(content).toContain('RETURNS BOOLEAN');
    expect(content).toContain('j.company_id = p_company_id');
  });
});
