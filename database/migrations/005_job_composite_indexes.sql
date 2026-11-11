-- ==============================================================================
-- Migration: 005_job_composite_indexes.sql
-- Description: Composite Indexes for High-Concurrency Job Searching, Filtering & Lifecycle Queries
-- ==============================================================================

-- 1. Composite Index for Public Job Board Filtering & Search
-- Supports queries filtering by status and department/location, sorted by published date
CREATE INDEX IF NOT EXISTS idx_jobs_filter_composite 
ON jobs (status, department, location, published_at DESC);

-- 2. Index for Published Jobs Sorted Chronologically
CREATE INDEX IF NOT EXISTS idx_jobs_status_published_at
ON jobs (status, published_at DESC);

-- 3. Composite Index for Corporate HR Job Dashboards
-- Speeds up queries filtering by company and job lifecycle state
CREATE INDEX IF NOT EXISTS idx_jobs_company_status
ON jobs (company_id, status, created_at DESC);

-- 4. Index for Recruiter / Creator Audits
CREATE INDEX IF NOT EXISTS idx_jobs_created_by
ON jobs (created_by);

-- 5. Index for Salary Range Queries & Compensation Filtering
CREATE INDEX IF NOT EXISTS idx_jobs_salary_range
ON jobs (salary_min, salary_max);
