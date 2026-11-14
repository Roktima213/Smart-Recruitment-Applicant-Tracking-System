-- Add interviewer assignment to scheduled interviews.
ALTER TABLE interview_events
ADD COLUMN IF NOT EXISTS interviewer_id UUID
REFERENCES users(id) ON DELETE SET NULL;

-- Support interviewer schedule lookups and overlap checks.
CREATE INDEX IF NOT EXISTS idx_interview_events_interviewer_schedule
ON interview_events (interviewer_id, scheduled_start, scheduled_end)
WHERE interviewer_id IS NOT NULL
  AND status IN ('SCHEDULED', 'RESCHEDULED');
