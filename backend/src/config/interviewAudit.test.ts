import fs from 'fs';
import path from 'path';

describe('Database Migration 009: Interview Reschedule Audit & Scorecards', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../database/migrations/009_interview_reschedule_and_scorecards.sql'
  );

  it('1. Migration file must exist on disk', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('2. Defines interview_scorecards table with rating and recommendation constraints', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS interview_scorecards');
    expect(content).toContain('rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)');
    expect(content).toContain('recommendation VARCHAR(50) NOT NULL CHECK');
    expect(content).toContain("'STRONG_HIRE', 'HIRE', 'NO_HIRE', 'STRONG_NO_HIRE'");
    expect(content).toContain('confidential_notes TEXT');
    expect(content).toContain('CONSTRAINT uq_interview_evaluator UNIQUE (interview_id, evaluator_id)');
  });

  it('3. Defines interview_audit_log table with action validation and previous/new timestamp tracking', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS interview_audit_log');
    expect(content).toContain("'SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'SCORECARD_SUBMITTED'");
    expect(content).toContain('previous_start TIMESTAMPTZ');
    expect(content).toContain('new_start TIMESTAMPTZ');
    expect(content).toContain('previous_end TIMESTAMPTZ');
    expect(content).toContain('new_end TIMESTAMPTZ');
    expect(content).toContain('metadata JSONB NOT NULL DEFAULT');
  });

  it('4. Configures performance indexes for fast interview scorecard and audit lookup', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_interview_scorecards_interview_id');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_interview_audit_interview_id');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_interview_audit_created_at');
  });

  it('5. Creates automatic trigger function for event change detection and logging', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toContain('CREATE OR REPLACE FUNCTION fn_audit_interview_event_changes()');
    expect(content).toContain('CREATE TRIGGER trg_audit_interview_event_changes');
    expect(content).toContain('OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start');
  });
});
