import fs from 'fs';
import path from 'path';

describe('Database Search Indexes & Performance Telemetry (Floor 13)', () => {
  const migrationPath = path.resolve(__dirname, '../../../database/migrations/006_candidate_search_indexes.sql');
  let sqlContent: string;

  beforeAll(() => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    sqlContent = fs.readFileSync(migrationPath, 'utf8');
  });

  it('1. Enables pg_trgm extension for fuzzy trigram search', () => {
    expect(sqlContent).toMatch(/CREATE EXTENSION IF NOT EXISTS pg_trgm/i);
  });

  it('2. Configures GIN trigram indexes on users (full_name and email)', () => {
    expect(sqlContent).toMatch(/CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm\s+ON users USING gin \(full_name gin_trgm_ops\)/i);
    expect(sqlContent).toMatch(/CREATE INDEX IF NOT EXISTS idx_users_email_trgm\s+ON users USING gin \(email gin_trgm_ops\)/i);
  });

  it('3. Configures GIN index on candidate_profiles(skills) for array queries', () => {
    expect(sqlContent).toMatch(/CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills_gin\s+ON candidate_profiles USING gin \(skills\)/i);
  });

  it('4. Configures GIN trigram index on candidate_profiles(headline)', () => {
    expect(sqlContent).toMatch(/CREATE INDEX IF NOT EXISTS idx_candidate_profiles_headline_trgm\s+ON candidate_profiles USING gin \(headline gin_trgm_ops\)/i);
  });

  it('5. Configures composite index on applications (job_id, current_stage, applied_at DESC)', () => {
    expect(sqlContent).toMatch(/CREATE INDEX IF NOT EXISTS idx_applications_job_stage_applied\s+ON applications \(job_id, current_stage, applied_at DESC\)/i);
  });

  it('6. Configures chronological timeline index on application_stage_history', () => {
    expect(sqlContent).toMatch(/CREATE INDEX IF NOT EXISTS idx_stage_history_timeline\s+ON application_stage_history \(application_id, changed_at ASC\)/i);
  });
});
