-- Migration 009: Interview Rescheduling Audit Log & Confidential Scorecards
-- Floor 16 (Day 16) - Smart Recruitment & Applicant Tracking System

-- 1. Create Confidential Interview Scorecards Table
CREATE TABLE IF NOT EXISTS interview_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interview_events(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  recommendation VARCHAR(50) NOT NULL CHECK (recommendation IN ('STRONG_HIRE', 'HIRE', 'NO_HIRE', 'STRONG_NO_HIRE')),
  strengths TEXT,
  concerns TEXT,
  confidential_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_interview_evaluator UNIQUE (interview_id, evaluator_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_scorecards_interview_id 
  ON interview_scorecards(interview_id);

CREATE INDEX IF NOT EXISTS idx_interview_scorecards_evaluator_id 
  ON interview_scorecards(evaluator_id);

-- 2. Create Interview Audit Log Table
CREATE TABLE IF NOT EXISTS interview_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interview_events(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'SCORECARD_SUBMITTED')),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  previous_start TIMESTAMPTZ,
  new_start TIMESTAMPTZ,
  previous_end TIMESTAMPTZ,
  new_end TIMESTAMPTZ,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_audit_interview_id 
  ON interview_audit_log(interview_id);

CREATE INDEX IF NOT EXISTS idx_interview_audit_created_at 
  ON interview_audit_log(created_at DESC);

-- 3. Automatic Trigger Function for Interview Event Changes (Reschedule / Cancellation)
CREATE OR REPLACE FUNCTION fn_audit_interview_event_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Detect Reschedule
    IF (OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start OR OLD.scheduled_end IS DISTINCT FROM NEW.scheduled_end) THEN
      INSERT INTO interview_audit_log (
        interview_id,
        action,
        actor_id,
        previous_start,
        new_start,
        previous_end,
        new_end,
        reason,
        metadata
      ) VALUES (
        NEW.id,
        'RESCHEDULED',
        NEW.created_by,
        OLD.scheduled_start,
        NEW.scheduled_start,
        OLD.scheduled_end,
        NEW.scheduled_end,
        'Scheduled time updated',
        jsonb_build_object('reschedule_count', NEW.reschedule_count)
      );
    -- Detect Cancellation
    ELSIF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'CANCELLED') THEN
      INSERT INTO interview_audit_log (
        interview_id,
        action,
        actor_id,
        previous_start,
        new_start,
        previous_end,
        new_end,
        reason,
        metadata
      ) VALUES (
        NEW.id,
        'CANCELLED',
        NEW.created_by,
        OLD.scheduled_start,
        NEW.scheduled_start,
        OLD.scheduled_end,
        NEW.scheduled_end,
        'Interview status changed to CANCELLED',
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_interview_event_changes ON interview_events;

CREATE TRIGGER trg_audit_interview_event_changes
AFTER UPDATE ON interview_events
FOR EACH ROW
EXECUTE FUNCTION fn_audit_interview_event_changes();
