-- ==============================================================================
-- Migration: 006_interview_interviewer_and_conflicts.sql
-- Description: Add interviewer assignment to interview_events, create conflict index,
--              and refresh the interviews compatibility view
-- ==============================================================================

-- 1. Add interviewer_id foreign key column to interview_events
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interview_events' AND column_name = 'interviewer_id'
    ) THEN
        ALTER TABLE interview_events
        ADD COLUMN interviewer_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create partial index for rapid interviewer conflict detection excluding CANCELLED interviews
CREATE INDEX IF NOT EXISTS idx_interview_events_interviewer_conflict
ON interview_events (interviewer_id, scheduled_start, scheduled_end)
WHERE status != 'CANCELLED';

-- 3. Refresh compatibility view without dropping it
CREATE OR REPLACE VIEW interviews AS
SELECT
    id,
    application_id,
    title,
    description,
    scheduled_start,
    scheduled_end,
    location_or_link,
    status,
    reschedule_count,
    created_by,
    created_at,
    updated_at,
    interviewer_id
FROM interview_events;
