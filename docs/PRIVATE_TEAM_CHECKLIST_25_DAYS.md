# 📋 25-Day Private Team Execution Master Checklist
### Smart Recruitment & Applicant Tracking System (ATS)
**Confidential — For Internal 5-Member Team Use Only**

---

## 👥 The 5-Member Team Roster & Responsibility Split

| Role & Color | Member | Branch | Daily Focus & Domain |
| :--- | :--- | :--- | :--- |
| 🛡️ **Leader & DevOps Engineer** | Ranadeep | `devops` & `main` | Git governance, CI/CD gates, Docker compose, test suites, floor seal & release tagging |
| ☁️ **Cloud Engineer** | Roktima | `cloud` | Firebase Auth Emulator (port 9099), Custom Claims, PostgreSQL params, private storage, SMTP config |
| ⚙️ **Backend Developer** | Member 3 | `backend` | 12-table PostgreSQL DDL, Express TypeScript APIs, RBAC middleware, stage machine, analytics queries |
| 🎨 **Frontend Developer 1** | Member 4 | `frontend-1` | Visual UI, responsive shells, CSS design tokens, dashboard pages, modal forms, accessibility |
| ⚡ **Frontend Developer 2** | Member 5 | `frontend-2` | Client Firebase SDK, Axios JWT interceptors, AuthContext, API hooks, state & form validation |

---

## ⚡ How All 5 Members Execute Simultaneously (Zero Idle Blocking)

To avoid waiting on each other, team members work in parallel using **Contract-First Development**:

```
                       [ 09:00 AM - Floor Kickoff ]
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
[Cloud & Backend]                                         [Frontend 1 & 2]
Establish Schema / API Contract               Build UI & State using Mock Data (mockData.ts)
(Endpoints, DDL, Types)                                   (Layouts, Forms, Validation)
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    ▼
                       [ 02:00 PM - Integration ]
             Replace Mock Data with Real Backend Endpoints
                                    │
                                    ▼
                       [ 05:00 PM - DevOps Verification ]
                  Leader runs Test Suite & Seals Floor into main
```

1. **Morning Kickoff (9:00 AM):** Backend and Cloud share the TypeScript interface / API payload contract.
2. **Parallel Sprint (9:30 AM – 2:00 PM):**
   - **Cloud:** Configures environment, DB indexes, emulator, or storage rules.
   - **Backend:** Implements real SQL queries and Express controllers.
   - **Frontend 1:** Builds the visual layout and forms using the shared TypeScript types and mock JSON.
   - **Frontend 2:** Builds the API client hook, form validation schema, and AuthContext.
   - **Leader / DevOps:** Prepares test assertions and CI pipeline checks.
3. **Midday Sync & Wire-up (2:00 PM – 4:30 PM):** Frontend swaps mock JSON for live backend routes on localhost.
4. **Floor Seal (5:00 PM):** Leader runs tests, validates the 5 commits, merges into `main`, and marks the day complete.

---

## 📅 Complete 25-Day Checklist

---

### 🏛️ TIER 1: Foundation, Firebase Identity & Core Data Model (Days 1–7)
**Milestone Release:** `v0.1.0-week1`

#### 🔹 Day 1 (Floor 1): Monorepo Initialization & Base Skeletons
* [x] **Cloud:** `feat(cloud): configure firebase project and local auth emulator`
  * Enable Email/Password & Google OAuth in Firebase; add `firebase.json` for Auth Emulator on port `9099`.
* [x] **Backend:** `feat(backend): scaffold express typescript server and health route`
  * Scaffold Express + TypeScript in `backend/src/app.ts` with `/api/health`, CORS, and Helmet.
* [x] **Frontend 1:** `feat(frontend): initialize react vite typescript shell and design tokens`
  * Initialize React + Vite + TS in `frontend/`, configure Tailwind CSS design tokens and base typography.
* [x] **Frontend 2:** `feat(frontend): configure client route hierarchy and environment setup`
  * Set up React Router DOM, route constants, and client `.env.example`.
* [x] **Leader / DevOps:** `chore(repo): initialize monorepo structure and gitignore rules`
  * Configure `.gitignore`, folder structure, baseline commit, and seal Floor 1 into `main`.
* **Daily Done Criteria:** Server runs on port `5000` with `/api/health` returning `200 OK`; frontend renders Vite home page; Auth Emulator runs on `9099`.

---

#### 🔹 Day 2 (Floor 2): Database Provisioning, Core User/Company Schema & Linting
* [x] **Cloud:** `feat(cloud): add postgresql connection config and secret templates`
  * Set up PostgreSQL pool parameters and `.env` template for local Docker / cloud DB.
* [x] **Backend:** `feat(db): create users and companies schema migration and db pool`
  * Create `database/migrations/001_users_companies.sql` (`user_role` ENUM, `users`, `companies`) and `backend/src/config/database.ts`.
* [x] **Frontend 1:** `feat(ui): build responsive app layout shell and navigation bar`
  * Build responsive App Shell: Navbar, Sidebar drawer, and role-aware navigation wrapper.
* [x] **Frontend 2:** `feat(ui): implement navigation state hooks and active route indicators`
  * Create navigation active-link state, sidebar toggle hooks, and theme tokens.
* [x] **Leader / DevOps:** `ci(devops): add docker-compose postgres setup and eslint workflow`
  * Create `docker-compose.yml` (Postgres + Firebase Emulator) and `.github/workflows/lint.yml`.
* **Daily Done Criteria:** `docker-compose up` brings up Postgres and Firebase; migration 001 applies with zero SQL syntax errors.

---

#### 🔹 Day 3 (Floor 3): Jobs, Candidate Profiles & Applications Schema
* [x] **Cloud:** `feat(cloud): configure private resume storage paths and iam rules`
  * Configure private resume directory permissions, `UPLOAD_DIR`, and `MAX_UPLOAD_BYTES` (5 MB).
* [x] **Backend:** `feat(db): add jobs candidate_profiles applications and stage history ddl`
  * Create `database/migrations/002_jobs_candidates_applications.sql` (foreign keys, timestamps, stage history).
* [x] **Frontend 1:** `feat(ui): create reusable form controls badges and modal primitives`
  * Create UI primitive components: Input, Select, Button, Status Badge, and Modal wrapper.
* [x] **Frontend 2:** `feat(auth-ui): configure firebase client sdk with emulator toggle`
  * Wire `frontend/src/config/firebaseClient.ts` with `connectAuthEmulator` localhost switch.
* [x] **Leader / DevOps:** `ci(db): add automated sql migration runner script to ci pipeline`
  * Write automated migration runner script (`scripts/migrate.ps1` / `.sh`) and wire into CI.
* **Daily Done Criteria:** Tables `jobs`, `candidate_profiles`, `applications` migrate cleanly; Firebase client SDK connects to emulator.

---

#### 🔹 Day 4 (Floor 4): Interviews, Offers, Notifications Schema & Firebase Admin SDK
* [x] **Cloud:** `feat(cloud): initialize firebase-admin sdk with emulator and cert support`
  * Implement `backend/src/config/firebaseAdmin.ts` supporting emulator and service-account certs.
* [x] **Backend:** `feat(db): add interviews feedback offers onboarding and notification tables`
  * Create `database/migrations/003_interviews_offers_notifications.sql` completing the 12 core tables.
* [x] **Frontend 1:** `feat(auth-ui): create login registration and password reset screens`
  * Build Login (`/login`) and Register (`/register`) screens with error banners and form inputs.
* [x] **Frontend 2:** `feat(auth-ui): wire firebase auth sign-in registration and google oauth methods`
  * Implement sign-in with email/password and Google OAuth popup handler.
* [x] **Leader / DevOps:** `test(devops): configure jest and supertest harness for backend api`
  * Set up `backend/jest.config.ts` with isolated test database setup and teardown hooks.
* **Daily Done Criteria:** All 12 tables created in PostgreSQL; Firebase Admin SDK initializes successfully.

---

#### 🔹 Day 5 (Floor 5): Server-Side RBAC Middleware & Firebase-to-SQL Account Sync
* [x] **Cloud:** `feat(cloud): add firebase custom claims synchronization helper`
  * Build custom claims sync helper (`setCustomUserClaims`) to mirror role changes.
* [x] **Backend:** `feat(auth-api): implement firebase jwt middleware and sql user sync route`
  * Build `authenticateFirebase` & `requireRole` middleware and `POST /api/auth/sync` upsert endpoint.
* [x] **Frontend 1:** `feat(ui): build user profile menu avatar and logout confirmation modal`
  * Create User Profile dropdown in navbar with user role badge and logout action.
* [x] **Frontend 2:** `feat(auth-ui): implement auth context and axios bearer token interceptor`
  * Build `AuthContext.tsx` and Axios interceptor injecting `Authorization: Bearer <idToken>`.
* [x] **Leader / DevOps:** `test(auth): add supertest suite for token verification and user sync`
  * Add Supertest suite verifying 401 on missing token and 200 on valid sync.
* **Daily Done Criteria:** Signing in on frontend creates or updates user in PostgreSQL with role; protected route rejects unauthorized requests.

---

#### 🔹 Day 6 (Floor 6): Admin Role Management, Protected Routes & Synthetic Seeding
* [x] **Cloud:** `feat(seed): create synthetic firebase emulator and postgresql seed script`
  * Write `database/seed/seed.ts` provisioning demo Admin, HR, and Candidate accounts.
* [x] **Backend:** `feat(admin-api): add user role management and company config endpoints`
  * Implement `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `PUT /api/admin/company`.
* [x] **Frontend 1:** `feat(admin-ui): build admin overview dashboard and company settings view`
  * Build Page 1: Admin Overview (`/admin`) UI with user table, role select, and company form.
* [x] **Frontend 2:** `feat(admin-ui): implement protected route guard and admin user management hooks`
  * Build `<ProtectedRoute allowedRoles={['ADMIN']} />` wrapper and role update mutation hook.
* [x] **Leader / DevOps:** `test(rbac): add automated role matrix tests for admin endpoints`
  * Automate `npm run seed` and write RBAC tests proving HR/Candidates receive 403 on `/api/admin/*`.
* **Daily Done Criteria:** `npm run seed` populates demo users; Admin can change user roles from the UI; Candidate gets redirected/403.

---

#### 🔹 Day 7 (Floor 7): Week 1 Milestone Verification & Full Foundation Audit
* [x] **Cloud:** `docs(cloud): add firebase emulator persistence and data retention guide`
  * Verify emulator import/export persistence scripts and document retention policies.
* [x] **Backend:** `feat(backend): add global error handler zod validator and api spec docs`
  * Add global error handling middleware, Zod validation, and publish `docs/api-spec.md`.
* [x] **Frontend 1:** `feat(ui): add error boundary 403 404 pages and loading skeletons`
  * Build 403 Forbidden, 404 Not Found, and skeleton loading card components.
* [x] **Frontend 2:** `feat(ui): add global toast notification provider and network status listener`
  * Build toast notification context for success/error alerts and offline banner.
* [x] **Leader / DevOps:** `ci(release): finalize week 1 ci gate pipeline and tag v0.1.0-week1`
  * Run CI gate (migrate → seed → lint → test → build) and tag `v0.1.0-week1`.
* **Daily Done Criteria:** All tests pass in CI; release tag `v0.1.0-week1` pushed to GitHub.

---

### 🚀 TIER 2: Job Lifecycle, Candidate Applications & Pipeline (Days 8–14)
**Milestone Release:** `v0.2.0-week2`

#### 🔹 Day 8 (Floor 8): Job Creation, Editing & Lifecycle State Transitions
* [x] **Cloud:** `perf(db): add composite indexes for job filtering and search queries`
  * Add PostgreSQL indexes on `(status, department, location, published_at)`.
* [x] **Backend:** `feat(jobs-api): implement job crud and status transition endpoints`
  * Build `POST /api/jobs`, `PUT /api/jobs/:id`, `PATCH /api/jobs/:id/status` (ADMIN/HR only).
* [x] **Frontend 1:** `feat(jobs-ui): build hr job management dashboard and create edit modal`
  * Build Page 2: Job Management (`/hr/jobs`) UI with Job Modal (Draft, Published, Closed).
* [x] **Frontend 2:** `feat(jobs-ui): wire job crud state hooks and status transition handlers`
  * Wire job creation form state, status transition buttons, and Zod client validation.
* [x] **Leader / DevOps:** `test(jobs): add api integration tests for job crud and role guards`
  * Add Supertest integration tests verifying Candidate gets 403 when creating or editing jobs.
* **Daily Done Criteria:** HR can create and publish jobs; Candidate cannot access `/api/jobs` mutation routes.

---

#### 🔹 Day 9 (Floor 9): Public Job Board, Search, Filtering & Pagination
* [x] **Cloud:** `feat(cloud): configure caching headers and cors rules for job listings`
  * Configure caching headers (`Cache-Control: public, max-age=60`) on published job list endpoint.
* [x] **Backend:** `feat(jobs-api): add paginated job listing search and detail endpoints`
  * Build `GET /api/jobs` (paginated, keyword search, filters) and `GET /api/jobs/:id`.
* [x] **Frontend 1:** `feat(jobs-ui): create candidate job board search filters and detail view`
  * Build Candidate Job Board (`/jobs`) and Job Detail (`/jobs/:id`) view cards.
* [x] **Frontend 2:** `feat(jobs-ui): implement debounced search pagination and job detail hooks`
  * Wire debounced search query params, filter dropdowns, and pagination controls.
* [x] **Leader / DevOps:** `test(jobs): add pagination boundary and query sanitization tests`
  * Add fuzz tests checking pagination edge cases (`page=0`, `limit=1000`) and SQL injection safety.
* **Daily Done Criteria:** Unauthenticated candidates can search and filter published jobs with fast pagination.

---

#### 🔹 Day 10 (Floor 10): Candidate Profile & Defensive Resume Upload
* [x] **Cloud:** `feat(storage): implement private resume storage service and sha256 hashing`
  * Build `storageService.ts` saving files outside web root with UUID names and SHA-256 hashes.
* [x] **Backend:** `feat(resume-api): add candidate profile api and magic-byte resume upload`
  * Implement `GET/PUT /api/candidates/me` and Multer upload checking PDF/DOCX magic bytes.
* [x] **Frontend 1:** `feat(candidate-ui): build candidate profile editor and resume upload widget`
  * Build Candidate Dashboard (`/candidate`) profile form and drag-and-drop resume upload zone.
* [x] **Frontend 2:** `feat(candidate-ui): wire resume file upload client validation and progress state`
  * Add client-side size (< 5 MB) and MIME checks, upload progress bar, and profile update hook.
* [x] **Leader / DevOps:** `test(security): add malicious file upload and size limit rejection tests`
  * Add tests verifying `.exe`/`.html` renamed to `.pdf` or files > 5 MB return 400/413 errors.
* **Daily Done Criteria:** Candidate can update profile and upload PDF resume; non-PDF and oversized files rejected.

---

#### 🔹 Day 11 (Floor 11): Job Application Submission & Private Resume Streaming
* [x] **Cloud:** `feat(storage): add ownership-verified private resume download stream`
  * Build `GET /api/resumes/:id/download` verifying ADMIN/HR role or candidate ownership.
* [x] **Backend:** `feat(apps-api): implement application submission and candidate history api`
  * Implement `POST /api/applications` (atomic insert + APPLIED stage log) and `GET /api/applications/me`.
* [x] **Frontend 1:** `feat(apps-ui): build job application form modal and candidate status tracker`
  * Build Application Submission Modal on `/jobs/:id` and Application Tracker cards on `/candidate`.
* [x] **Frontend 2:** `feat(apps-ui): wire application submission hooks and resume download client`
  * Connect submit application mutation and download resume link with auth headers.
* [x] **Leader / DevOps:** `test(apps): add idor resume download and duplicate application tests`
  * Add IDOR tests verifying Candidate A cannot download Candidate B's resume (403).
* **Daily Done Criteria:** Candidate applies to a job; application displays in candidate tracker; duplicate application returns 409.

---

#### 🔹 Day 12 (Floor 12): Controlled Pipeline Stage Machine & Audit Trail
* [x] **Cloud:** `perf(db): configure row locking and transaction telemetry for stage updates`
  * Configure `SELECT ... FOR UPDATE` row-level locking on application stage transitions.
* [x] **Backend:** `feat(pipeline-api): build transactional stage state machine and audit log`
  * Build `stageMachine.ts` and `PATCH /api/applications/:id/stage` recording actor and reason.
* [x] **Frontend 1:** `feat(pipeline-ui): build hr pipeline kanban board and stage transition modal`
  * Build Page 4: HR Pipeline (`/hr/pipeline`) Kanban board with columns (`Applied`, `Screening`, `Interview`, `Selected`, `Offered`, `Rejected`).
* [x] **Frontend 2:** `feat(pipeline-ui): wire kanban drag-and-drop state and audit reason handler`
  * Wire Kanban stage change triggers, audit note modal, and optimistic UI update.
* [x] **Leader / DevOps:** `test(pipeline): add exhaustive state transition rule unit and api tests`
  * Write tests proving illegal transitions (e.g. `Applied` → `Offered` or moving out of `Rejected`) fail.
* **Daily Done Criteria:** Dragging candidate card between allowed stages prompts for reason and records audit entry.

---

#### 🔹 Day 13 (Floor 13): HR Candidate Search, Filters & Candidate Dossier Drawer
* [ ] **Cloud:** `perf(db): add search indexes on candidate names skills and emails`
  * Add PostgreSQL pg_trgm / full-text search indexes on candidate names and skills.
* [ ] **Backend:** `feat(pipeline-api): add multi-filter candidate search and audit history api`
  * Implement `GET /api/applications` with multi-filters (`jobId`, `stage`, `search`, `dateRange`) and `GET /api/applications/:id/history`.
* [ ] **Frontend 1:** `feat(pipeline-ui): build candidate dossier slide-over drawer and history view`
  * Build slide-over Candidate Dossier Drawer with profile info, resume preview, and timeline.
* [ ] **Frontend 2:** `feat(pipeline-ui): implement filter state management and dossier data hooks`
  * Wire search bar, stage filters, and dossier detail fetcher.
* [ ] **Leader / DevOps:** `test(e2e): initialize playwright and automate job-to-pipeline e2e test`
  * Automate Playwright E2E journey: HR creates job → Candidate applies → HR moves candidate to Screening.
* **Daily Done Criteria:** HR filters candidates by skill/job; clicking a candidate opens dossier with stage history.

---

#### 🔹 Day 14 (Floor 14): Week 2 Milestone Verification & Pipeline Stress Testing
* [ ] **Cloud:** `feat(seed): expand seed script with multi-stage applications and pdf resumes`
  * Expand `seed.ts` with 15 realistic candidates across all stages with mock PDF resumes in `uploads/`.
* [ ] **Backend:** `docs(pipeline): document formal application and job status transition rules`
  * Publish `docs/status-transitions.md` defining valid state transitions and error codes.
* [ ] **Frontend 1:** `fix(ui): polish empty states pagination and accessibility on pipeline views`
  * Polish empty pipeline columns, keyboard navigation, and ARIA labels.
* [ ] **Frontend 2:** `fix(ui): add optimistic UI error rollback and stage action feedback`
  * Add rollback on network failure when moving candidate cards.
* [ ] **Leader / DevOps:** `ci(release): verify week 2 api and e2e test gates and tag v0.2.0-week2`
  * Execute full test suite (API + Playwright E2E) and tag release `v0.2.0-week2`.
* **Daily Done Criteria:** E2E test passes headless; tag `v0.2.0-week2` pushed to GitHub.

---

### 🤝 TIER 3: Interviews, Notifications & Offer Letters (Days 15–21)
**Milestone Release:** `v0.3.0-week3`

#### 🔹 Day 15 (Floor 15): Interview Creation, Scheduling & Conflict Detection
* [ ] **Cloud:** `feat(cloud): add utc timezone normalizer and meeting link generator service`
  * Build `meetingService.ts` normalizing timestamps to UTC and generating meeting URLs.
* [ ] **Backend:** `feat(interviews-api): implement interview scheduling and conflict check api`
  * Implement `POST /api/interviews` and `GET /api/interviews` with interviewer conflict validation.
* [ ] **Frontend 1:** `feat(interviews-ui): build interview calendar list view and scheduling modal`
  * Build Page 5: Interviews (`/hr/interviews` & `/candidate/interviews`) with Calendar/List view and Schedule Modal.
* [ ] **Frontend 2:** `feat(interviews-ui): wire interview form validation and conflict error handling`
  * Wire interview form date-time picker, interviewer selector, and schedule mutation.
* [ ] **Leader / DevOps:** `test(interviews): add conflict detection and timestamp validation tests`
  * Write tests verifying overlapping interview times or `ends_at <= starts_at` return 400/409.
* **Daily Done Criteria:** Scheduling an interview validates availability; conflicting schedule is rejected.

---

#### 🔹 Day 16 (Floor 16): Interview Rescheduling & Confidential Evaluator Scorecards
* [ ] **Cloud:** `feat(db): add audit logging for interview reschedules and scorecard events`
  * Add DB audit log triggers for interview reschedules and scorecard submissions.
* [ ] **Backend:** `feat(interviews-api): add reschedule cancel and confidential feedback routes`
  * Implement `PATCH /api/interviews/:id` (reschedule/cancel) and `POST/GET /api/interviews/:id/feedback`.
* [ ] **Frontend 1:** `feat(interviews-ui): build reschedule modal and evaluator feedback scorecard`
  * Build Reschedule Modal and Structured Scorecard form (1–5 ratings, strengths, concerns, hire decision).
* [ ] **Frontend 2:** `feat(interviews-ui): wire scorecard submission and candidate role view isolation`
  * Wire scorecard submit hook; hide evaluator feedback from candidate views.
* [ ] **Leader / DevOps:** `test(interviews): verify candidate isolation from interviewer feedback api`
  * Add tests proving Candidate receives 403 Forbidden when requesting `/feedback`.
* **Daily Done Criteria:** Interviewer submits scorecard; Candidate sees interview status but cannot see internal feedback.

---

#### 🔹 Day 17 (Floor 17): Email Notification Service, Retry Logger & Simulated Mode
* [ ] **Cloud:** `feat(cloud): configure smtp transport and simulated email mode toggle`
  * Configure SMTP credentials and `EMAIL_MODE=SIMULATED|LIVE_SMTP` environment toggle.
* [ ] **Backend:** `feat(notify-api): implement email notification service with retry and db log`
  * Build `notificationService.ts` with exponential backoff retry (up to 2 retries) logging to `notification_events`.
* [ ] **Frontend 1:** `feat(notify-ui): build notification delivery log table and mode indicator`
  * Build Notification Delivery Log viewer in Admin/HR showing status (SENT/FAILED) and SIMULATED badge.
* [ ] **Frontend 2:** `feat(notify-ui): wire in-app notification bell and unread status handler`
  * Wire in-app notification bell icon, unread counter badge, and mark-as-read click handler.
* [ ] **Leader / DevOps:** `test(notify): add unit tests for email retry logic and simulated mode logging`
  * Write unit tests mocking SMTP failure to verify retry counter increments and failure is logged.
* **Daily Done Criteria:** Application actions trigger notification log entries; SIMULATED mode outputs email content cleanly to logs/UI.

---

#### 🔹 Day 18 (Floor 18): Template Offer Letter Generator & Issuance
* [ ] **Cloud:** `feat(cloud): add controlled offer letter templates and snapshot archiving`
  * Store approved HTML templates and configure snapshot archiving for issued offers.
* [ ] **Backend:** `feat(offers-api): build template offer letter generator and issue endpoint`
  * Build `offerTemplateService.ts` (safe HTML injection of salary, title, start date) and `POST /api/offers`, `PATCH /api/offers/:id/issue`.
* [ ] **Frontend 1:** `feat(offers-ui): build hr offer letter composer and live template preview`
  * Build Page 6: Offers & Onboarding (`/hr/offers`) with offer template composer and live preview.
* [ ] **Frontend 2:** `feat(offers-ui): wire offer form validation and offer issuance mutation`
  * Wire salary number validation, start date validation, and Issue Offer action button.
* [ ] **Leader / DevOps:** `test(offers): add offer generation state and notification trigger tests`
  * Add tests proving offers can only be issued to candidates in `Selected` or `Offered` stages.
* **Daily Done Criteria:** HR creates an offer with live preview; issuing the offer transitions candidate stage to `Offered`.

---

#### 🔹 Day 19 (Floor 19): Candidate Offer Acceptance/Decline & Onboarding Checklist
* [ ] **Cloud:** `security(cloud): enforce strict candidate ownership checks on offer records`
  * Enforce row-level ownership checks ensuring Candidate A cannot view or respond to Candidate B's offer.
* [ ] **Backend:** `feat(onboarding-api): add candidate offer response and onboarding task api`
  * Implement `POST /api/offers/:id/respond` (ACCEPT/DECLINE auto-spawning tasks) and `PATCH /api/onboarding/:id`.
* [ ] **Frontend 1:** `feat(onboarding-ui): build candidate offer response portal and task checklist`
  * Build Candidate Offer Review card (`/candidate/offers`) with Accept/Decline and Onboarding Checklist.
* [ ] **Frontend 2:** `feat(onboarding-ui): wire offer response actions and onboarding task toggle state`
  * Wire digital acceptance checkbox, confirmation dialog, and onboarding task check/uncheck state.
* [ ] **Leader / DevOps:** `test(onboarding): test offer acceptance transaction and cross-candidate guard`
  * Write tests proving accepting offer updates `hired_at`, spawns onboarding tasks, and blocks other candidates.
* **Daily Done Criteria:** Candidate accepts offer; status updates to Hired; onboarding checklist appears with initial tasks.

---

#### 🔹 Day 20 (Floor 20): System-Wide Unified Activity Log
* [ ] **Cloud:** `perf(db): optimize activity log view and timeline query indexes`
  * Create unified database union view or query aggregating all audit tables with indexes.
* [ ] **Backend:** `feat(activity-api): implement unified activity history aggregation endpoint`
  * Implement `GET /api/activity` endpoint with actor, entity, event type, and pagination.
* [ ] **Frontend 1:** `feat(activity-ui): create visual activity timeline component with event icons`
  * Build visual Activity Timeline UI component with color-coded badges and timestamp formatters.
* [ ] **Frontend 2:** `feat(activity-ui): embed unified activity timeline in admin and hr views`
  * Embed Activity Timeline into Admin Overview and Candidate Dossier drawer.
* [ ] **Leader / DevOps:** `test(e2e): automate interview feedback offer and onboarding e2e journey`
  * Add Playwright E2E test for complete journey: Schedule interview → Submit feedback → Issue offer → Candidate accepts.
* **Daily Done Criteria:** Unified activity feed shows end-to-end recruitment audit trail; Playwright journey passes.

---

#### 🔹 Day 21 (Floor 21): Week 3 Milestone Verification & Seed Expansion
* [ ] **Cloud:** `feat(seed): add interviews feedback offers and onboarding records to seed`
  * Update `seed.ts` with completed interviews, scorecards, issued/accepted offers, and onboarding tasks.
* [ ] **Backend:** `fix(backend): harden edge cases on interview and offer state transitions`
  * Audit and patch edge cases (double offer acceptances, feedback on cancelled interviews).
* [ ] **Frontend 1:** `style(ui): refine responsive layout for interview calendar and offer views`
  * Polish mobile/tablet viewports for calendar, offer preview, and onboarding checklist.
* [ ] **Frontend 2:** `fix(ui): audit interview and offer cache invalidation rules`
  * Ensure cache invalidation immediately updates UI badges when offers or interviews change.
* [ ] **Leader / DevOps:** `ci(release): run week 3 regression suite and tag v0.3.0-week3`
  * Run complete Week 1–3 regression test suite in CI and tag release `v0.3.0-week3`.
* **Daily Done Criteria:** All regression tests green; release tag `v0.3.0-week3` pushed to GitHub.

---

### 📊 TIER 4: Analytics, Security Hardening & Production Release (Days 22–25)
**Milestone Release:** `v1.0.0`

#### 🔹 Day 22 (Floor 22): Hiring Analytics Engine & Funnel Metrics
* [ ] **Cloud:** `perf(analytics): add utc date boundary normalization and nullif sql guards`
  * Add UTC date truncation and `NULLIF(denominator, 0)` guards to prevent division-by-zero errors.
* [ ] **Backend:** `feat(analytics-api): implement sql hiring kpi aggregation with filters`
  * Implement `GET /api/analytics/summary` computing Volume, Stage Conversion, Time-to-Hire, and Offer Acceptance.
* [ ] **Frontend 1:** `feat(analytics-ui): build hiring analytics dashboard charts and layout`
  * Build Page 7: Hiring Analytics (`/hr/analytics`) UI with KPI summary cards and funnel visualization bars.
* [ ] **Frontend 2:** `feat(analytics-ui): wire analytics filter controls and formula explanation tooltips`
  * Wire Job/Date/Department filters and add formula explanation tooltips on each metric card.
* [ ] **Leader / DevOps:** `test(analytics): verify kpi denominator accuracy and empty dataset handling`
  * Write analytical tests verifying metrics with empty date ranges and incomplete datasets.
* **Daily Done Criteria:** Analytics dashboard renders accurate calculations without division-by-zero errors.

---

#### 🔹 Day 23 (Floor 23): Security Hardening, Rate Limiting & Input Sanitization
* [ ] **Cloud:** `security(cloud): enable firebase token revocation check and audit env files`
  * Audit Firebase token revocation (`checkRevoked = true`), rotate demo keys, verify zero git secrets.
* [ ] **Backend:** `security(backend): enforce strict html escaping and input validation rules`
  * Audit controllers for SQL parameterization, XSS escaping in offer templates, and standard error envelopes.
* [ ] **Frontend 1:** `feat(ui): add session expiry modal and client upload sanitization`
  * Add session-expiry auto-logout warning modal and client upload file-extension check.
* [ ] **Frontend 2:** `feat(auth-ui): add token refresh listener and automatic auth state purge`
  * Implement automatic Firebase token refresh listener and clean token purge on 401 response.
* [ ] **Leader / DevOps:** `security(devops): add api rate limiting helmet csp headers and secret scan`
  * Add `express-rate-limit` on auth/upload routes, strict Helmet CSP headers, and CI secret scanner.
* **Daily Done Criteria:** Rapid requests trigger 429 Too Many Requests; automated secret scanner finds 0 secrets.

---

#### 🔹 Day 24 (Floor 24): Production Containerization & Cloud Deployment
* [ ] **Cloud:** `deploy(cloud): configure cloud deployment pipeline and seed live demo`
  * Deploy backend, PostgreSQL, and frontend to cloud hosting and verify live connectivity.
* [ ] **Backend:** `feat(backend): add readiness probe endpoint and openapi collection export`
  * Implement `/api/health/readiness` (checking DB + Firebase connectivity) and export `docs/openapi.json`.
* [ ] **Frontend 1:** `docs(ui): capture high-resolution screenshots of all 7 role dashboards`
  * Capture crisp screenshots of all 7 dashboards for documentation and presentation slides.
* [ ] **Frontend 2:** `chore(frontend): optimize production bundle chunk splitting and lazy routes`
  * Configure Vite production chunk-splitting, lazy route imports, and verify bundle size < 500 KB.
* [ ] **Leader / DevOps:** `build(docker): add multi-stage production dockerfiles and compose stack`
  * Create multi-stage Dockerfiles (`frontend/Dockerfile` with Nginx, `backend/Dockerfile` with Node Alpine) and `docker-compose.prod.yml`.
* **Daily Done Criteria:** `docker-compose -f docker-compose.prod.yml up` builds and runs the entire production stack locally.

---

#### 🔹 Day 25 (Floor 25): Final Documentation, Engineering Report & v1.0.0 Release
* [ ] **Cloud:** `docs(readme): document firebase setup cloud deployment and env configuration`
  * Finalize `README.md` with complete local emulator vs. cloud deployment instructions and env tables.
* [ ] **Backend:** `docs(report): author final engineering design and security controls report`
  * Write `docs/final-report.md` detailing architecture decisions, RBAC, KPI math, and future roadmap.
* [ ] **Frontend 1:** `docs(demo): add role-by-role demo walkthrough and presentation guide`
  * Write `docs/presentation-walkthrough.md` with demo scripts for Admin, HR, and Candidate journeys.
* [ ] **Frontend 2:** `feat(demo-ui): add quick-fill demo credentials helper for review testing`
  * Add a 1-click Demo Account Quick-Fill button on `/login` to ease evaluator testing.
* [ ] **Leader / DevOps:** `ci(release): publish final test coverage evidence and tag release v1.0.0`
  * Run complete test suite, export coverage report to `docs/test-evidence.md`, verify clean main, and tag `v1.0.0`.
* **Daily Done Criteria:** Clean git log with all 125 commits; 100% tests passing; release `v1.0.0` tagged and pushed.

---

## 🏆 Final Pre-Submission Sign-Off (Day 25 Verification)

* [ ] **Cloud Engineer Sign-Off:** Firebase Auth Emulator runs offline on port 9099; `seed.ts` provisions Admin, HR, and Candidate users; private resume streaming verified; zero secrets committed.
* [ ] **Backend Developer Sign-Off:** All 12 PostgreSQL tables and enums migrate cleanly; RBAC enforced on all routes; stage transitions follow strict ACID state machine; analytics queries use documented formulas.
* [ ] **Frontend Developer 1 Sign-Off:** All 7 dashboards (Admin, Jobs, Candidate, Pipeline, Interviews, Offers, Analytics) responsive and polished with loading/empty/error states.
* [ ] **Frontend Developer 2 Sign-Off:** AuthContext, Axios Bearer interceptor, and real-time state management operate with zero client errors and smooth cache updates.
* [ ] **Leader / DevOps Engineer Sign-Off:** Exactly 125 atomic commits (25 per member across Floors 1–25) merged cleanly into `main`; CI passes lint, tests, and Playwright E2E; release `v1.0.0` published.
