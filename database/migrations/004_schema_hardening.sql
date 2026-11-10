-- ==============================================================================
-- Migration: 004_schema_hardening.sql
-- Description: Integrity constraints, numeric precision, partial indexes & index cleanup
-- ==============================================================================

-- 1. Jobs: ensure non-negative salary and maximum salary is greater than or equal to minimum salary
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_jobs_salary_positive'
    ) THEN
        ALTER TABLE jobs
        ADD CONSTRAINT check_jobs_salary_positive
        CHECK (salary_min IS NULL OR salary_min >= 0);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_jobs_salary_range'
    ) THEN
        ALTER TABLE jobs
        ADD CONSTRAINT check_jobs_salary_range
        CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min);
    END IF;
END $$;

-- 2. Candidate Profiles: ensure experience_years is non-negative
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_candidate_experience_positive'
    ) THEN
        ALTER TABLE candidate_profiles
        ADD CONSTRAINT check_candidate_experience_positive
        CHECK (experience_years >= 0);
    END IF;
END $$;

-- 3. Interview Events: ensure reschedule_count is non-negative
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_interview_reschedule_positive'
    ) THEN
        ALTER TABLE interview_events
        ADD CONSTRAINT check_interview_reschedule_positive
        CHECK (reschedule_count >= 0);
    END IF;
END $$;

-- 4. Offer Records: increase precision to NUMERIC(14, 2) for fractional currency handling
ALTER TABLE offer_records
ALTER COLUMN salary_amount TYPE NUMERIC(14, 2);

-- 5. Partial Unique Constraint: at most one active (DRAFT or ISSUED) offer per application
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_offer_per_app
ON offer_records (application_id)
WHERE status IN ('DRAFT', 'ISSUED');

-- 6. Index Optimization: drop redundant indexes covered by unique constraints
-- candidate_profiles(user_id) is already backed by unique constraint candidate_profiles_user_id_key
DROP INDEX IF EXISTS idx_candidate_profiles_user_id;

-- applications(job_id) is the leading column of unique constraint unique_job_candidate_application (job_id, candidate_id)
DROP INDEX IF EXISTS idx_applications_job_id;

-- 7. Add missing index on foreign key applications(resume_id)
CREATE INDEX IF NOT EXISTS idx_applications_resume_id
ON applications(resume_id);
