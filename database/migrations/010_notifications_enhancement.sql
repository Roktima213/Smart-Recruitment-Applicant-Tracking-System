-- ============================================================================
-- Migration 010: Notification Events In-App Delivery & Read Status
-- Enhances notification_events table with in-app read tracking and metadata
-- ============================================================================

-- 1. Add is_read flag for in-app bell notification drawer
ALTER TABLE notification_events
ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add read_at timestamp
ALTER TABLE notification_events
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 3. Add metadata JSONB column for application / interview deep-linking
ALTER TABLE notification_events
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Add high-performance index for querying unread in-app notifications
CREATE INDEX IF NOT EXISTS idx_notification_events_recipient_unread
ON notification_events (recipient_user_id, is_read, created_at DESC);

-- 5. Add index for delivery status telemetry
CREATE INDEX IF NOT EXISTS idx_notification_events_status_created
ON notification_events (status, created_at DESC);
