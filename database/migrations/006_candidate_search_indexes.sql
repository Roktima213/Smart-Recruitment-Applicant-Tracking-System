-- ==============================================================================
-- Migration: 006_candidate_search_indexes.sql
-- Description: PostgreSQL pg_trgm Trigram & Composite Indexes for Candidate Dossier & Pipeline Search
-- ==============================================================================

-- 1. Enable pg_trgm extension for fuzzy string matching, ILIKE search, and trigram acceleration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Trigram GIN Indexes on users for instant recruiter name & email lookup
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm 
ON users USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_email_trgm 
ON users USING gin (email gin_trgm_ops);

-- 3. GIN & Trigram Indexes on candidate_profiles for skills array & headline searches
-- Accelerates array containment queries (e.g. skills @> ARRAY['React'])
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills_gin 
ON candidate_profiles USING gin (skills);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_headline_trgm 
ON candidate_profiles USING gin (headline gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_company_trgm 
ON candidate_profiles USING gin (current_company gin_trgm_ops);

-- 4. High-Performance Composite Indexes for HR Pipeline Filtering & Sorting
-- Accelerates queries filtering candidates by job and stage sorted newest first
CREATE INDEX IF NOT EXISTS idx_applications_job_stage_applied 
ON applications (job_id, current_stage, applied_at DESC);

-- Accelerates candidate application history lookups
CREATE INDEX IF NOT EXISTS idx_applications_candidate_stage 
ON applications (candidate_id, current_stage);

-- 5. Composite Index for Chronological Stage Audit Timeline Retrieval
CREATE INDEX IF NOT EXISTS idx_stage_history_timeline 
ON application_stage_history (application_id, changed_at ASC);
