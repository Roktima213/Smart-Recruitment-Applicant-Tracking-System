-- ==============================================================================
-- Migration: 003_interviews_offers_notifications.sql
-- Description: Collaboration, Scheduling, Offers, Onboarding & Notification Schema
--              (Completes the 12 Core Tables of Smart ATS)
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_status') THEN
        CREATE TYPE interview_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
        CREATE TYPE offer_status AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'EXPIRED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE notification_channel AS ENUM ('EMAIL', 'IN_APP');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED');
    END IF;
END $$;

-- 2. Create interview_events table
CREATE TABLE IF NOT EXISTS interview_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    location_or_link TEXT,
    status interview_status NOT NULL DEFAULT 'SCHEDULED',
    reschedule_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_interview_time_order CHECK (scheduled_end > scheduled_start)
);

DROP TRIGGER IF EXISTS set_interview_events_updated_at ON interview_events;
CREATE TRIGGER set_interview_events_updated_at
    BEFORE UPDATE ON interview_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Create interview_feedback table (Evaluator Scorecards)
CREATE TABLE IF NOT EXISTS interview_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interview_events(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    strengths TEXT,
    concerns TEXT,
    recommendation VARCHAR(50) NOT NULL, -- e.g. STRONG_HIRE, HIRE, NO_HIRE, STRONG_NO_HIRE
    confidential_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_interview_evaluator_feedback UNIQUE (interview_id, evaluator_id)
);

DROP TRIGGER IF EXISTS set_interview_feedback_updated_at ON interview_feedback;
CREATE TRIGGER set_interview_feedback_updated_at
    BEFORE UPDATE ON interview_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Create offer_records table
CREATE TABLE IF NOT EXISTS offer_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    salary_amount INTEGER NOT NULL CHECK (salary_amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    start_date DATE NOT NULL,
    offer_letter_html TEXT NOT NULL,
    status offer_status NOT NULL DEFAULT 'DRAFT',
    issued_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_offer_records_updated_at ON offer_records;
CREATE TRIGGER set_offer_records_updated_at
    BEFORE UPDATE ON offer_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Create onboarding_tasks table
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offer_records(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_onboarding_tasks_updated_at ON onboarding_tasks;
CREATE TRIGGER set_onboarding_tasks_updated_at
    BEFORE UPDATE ON onboarding_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Create notification_events table
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL DEFAULT 'EMAIL',
    event_type VARCHAR(100) NOT NULL, -- e.g. APPLICATION_RECEIVED, INTERVIEW_SCHEDULED, OFFER_ISSUED
    subject VARCHAR(255) NOT NULL,
    content_body TEXT NOT NULL,
    status notification_status NOT NULL DEFAULT 'PENDING',
    error_log TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. High-Performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_interview_events_application_id ON interview_events(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_events_scheduled_start ON interview_events(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_interview_events_status ON interview_events(status);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON interview_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_evaluator_id ON interview_feedback(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_offer_records_application_id ON offer_records(application_id);
CREATE INDEX IF NOT EXISTS idx_offer_records_status ON offer_records(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_candidate_id ON onboarding_tasks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_offer_id ON onboarding_tasks(offer_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_recipient ON notification_events(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_status ON notification_events(status);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at);
