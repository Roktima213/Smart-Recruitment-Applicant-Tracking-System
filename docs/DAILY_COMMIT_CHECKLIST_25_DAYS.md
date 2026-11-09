# 25-Day (125-Commit) Daily Engineering Commit Checklist

**Smart Recruitment & Applicant Tracking System (ATS)**  
**Team Structure:** 5 Members (1 Leader/DevOps, 1 Cloud, 1 Backend, 2 Frontend)  
**Total Output:** 5 Verified Commits Per Day across 25 Working Days = **125 Total Commits**

---

## Executive Summary & Milestone Schedule

| Tier | Working Days / Floors | System Capabilities Unlocked | Daily Commits | Total Tier Commits | Milestone Release Tag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Week 1)** | Days 1 – 7 (Floors 1 – 7) | Monorepo, Firebase Auth Emulator, 12-Table SQL Schema, RBAC Guards, Admin Dashboard, Synthetic Seed Data | 5 / day | 35 Commits | `v0.1.0-week1` |
| **Tier 2 (Week 2)** | Days 8 – 14 (Floors 8 – 14) | Job Lifecycle CRUD, Candidate Portal, Defensive Resume Upload & Stream, HR Kanban Pipeline, Stage Machine | 5 / day | 35 Commits | `v0.2.0-week2` |
| **Tier 3 (Week 3)** | Days 15 – 21 (Floors 15 – 21) | Interview Scheduling & Conflict Detection, Evaluator Scorecards, Email Retry Logger, Template Offers, Onboarding | 5 / day | 35 Commits | `v0.3.0-week3` |
| **Tier 4 (Week 4)** | Days 22 – 25 (Floors 22 – 25) | Hiring Analytics SQL Engine, Security Hardening & Rate Limiting, Production Docker Containers, Final Audit & Demo | 5 / day | 20 Commits | `v1.0.0` |
| **GRAND TOTAL** | **25 Working Days** | **100% Complete Production-Grade Smart ATS Platform** | **5 / day** | **125 Commits** | **Full v1.0 Release** |

---

## Tier 1 (Week 1): Foundation, Firebase Identity & Core Data Model

### Floor 1 (Day 1 of 25): Monorepo Initialization, Cloud Project Setup & Base Skeletons
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Create Google Firebase project configuration, enable Email/Password & Google OAuth providers, add `firebase.json` for local Auth Emulator on port 9099.
  * *Commit:* `feat(cloud): configure firebase project and local auth emulator`
* **2. Backend Developer (`backend`):**
  * *Task:* Scaffold Node.js + Express + TypeScript server (`backend/src/app.ts`) with `/api/health` endpoint, CORS, Helmet, and environment configuration.
  * *Commit:* `feat(backend): scaffold express typescript server and health route`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Scaffold React + Vite + TypeScript application shell with Tailwind CSS design tokens, base typography, and responsive container layout.
  * *Commit:* `feat(frontend): initialize react vite typescript shell and design tokens`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Set up React Router DOM routing structure, route constants, and `.env.example` client environment definitions.
  * *Commit:* `feat(frontend): configure client route hierarchy and environment setup`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Initialize Git monorepo structure (`frontend/`, `backend/`, `database/`, `tests/`, `docs/`, `uploads/`), `.gitignore`, branch protection documentation, and seal Floor 1 into `main`.
  * *Commit:* `chore(repo): initialize monorepo structure and gitignore rules`

---

### Floor 2 (Day 2 of 25): Database Provisioning, Core User/Company Schema & Linting Pipeline
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Configure PostgreSQL instance parameters, connection pooling limits, and secret environment templates for local and cloud environments.
  * *Commit:* `feat(cloud): add postgresql connection config and secret templates`
* **2. Backend Developer (`backend`):**
  * *Task:* Write `database/migrations/001_users_companies.sql` (`user_role` ENUM, `users` with `firebase_uid` UNIQUE, `companies`) and DB connection pool (`backend/src/config/database.ts`).
  * *Commit:* `feat(db): create users and companies schema migration and db pool`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build responsive application shell: Navbar, Sidebar navigation drawer, Footer, and role-aware layout wrappers.
  * *Commit:* `feat(ui): build responsive app layout shell and navigation bar`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Create central theme state, layout navigation state hooks, and active route link highlighters.
  * *Commit:* `feat(ui): implement navigation state hooks and active route indicators`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Create `docker-compose.yml` spinning up PostgreSQL + Firebase Emulator, plus ESLint/Prettier check workflow in `.github/workflows/lint.yml`, and seal Floor 2.
  * *Commit:* `ci(devops): add docker-compose postgres setup and eslint workflow`

---

### Floor 3 (Day 3 of 25): Jobs, Candidate Profiles & Applications Relational Schema
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Configure private resume storage bucket/directory permissions and document environment variables (`UPLOAD_DIR`, `MAX_UPLOAD_BYTES`).
  * *Commit:* `feat(cloud): configure private resume storage paths and iam rules`
* **2. Backend Developer (`backend`):**
  * *Task:* Write `002_jobs_candidates_applications.sql` (`jobs`, `candidate_profiles`, `applications`, `resume_metadata`, `application_stage_history`).
  * *Commit:* `feat(db): add jobs candidate_profiles applications and stage history ddl`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build responsive UI components for form inputs, dropdown selectors, badge indicators, and action buttons.
  * *Commit:* `feat(ui): create reusable form controls badges and modal primitives`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Configure Firebase Web SDK (`frontend/src/config/firebaseClient.ts`) with automatic toggle for local Auth Emulator (`connectAuthEmulator`).
  * *Commit:* `feat(auth-ui): configure firebase client sdk with emulator toggle`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Create automated SQL migration runner script (`scripts/migrate.sh` / `.ps1`) and wire it into GitHub Actions CI database service container, sealing Floor 3.
  * *Commit:* `ci(db): add automated sql migration runner script to ci pipeline`

---

### Floor 4 (Day 4 of 25): Interviews, Offers, Notifications DDL & Firebase Admin SDK Wiring
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Implement `backend/src/config/firebaseAdmin.ts` supporting both service-account credentials and `FIREBASE_AUTH_EMULATOR_HOST`.
  * *Commit:* `feat(cloud): initialize firebase-admin sdk with emulator and cert support`
* **2. Backend Developer (`backend`):**
  * *Task:* Write `003_interviews_offers_notifications.sql` (`interview_events`, `interview_feedback`, `offer_records`, `onboarding_tasks`, `notification_events`).
  * *Commit:* `feat(db): add interviews feedback offers onboarding and notification tables`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Login, Registration, and Password Reset screens (`/login`, `/register`) with accessible form fields and error banners.
  * *Commit:* `feat(auth-ui): create login registration and password reset screens`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Wire Firebase client authentication logic: email/password login, Google OAuth popup handler, and form validation schemas.
  * *Commit:* `feat(auth-ui): wire firebase auth sign-in registration and google oauth methods`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Configure Jest + Supertest test harness in `backend/jest.config.ts` with isolated test database setup and teardown hooks, sealing Floor 4.
  * *Commit:* `test(devops): configure jest and supertest harness for backend api`

---

### Floor 5 (Day 5 of 25): Server-Side RBAC Middleware & Firebase-to-SQL Account Synchronization
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Create Custom Claims sync utility (`setCustomUserClaims`) so role updates mirror across PostgreSQL `users.role` and Firebase ID tokens.
  * *Commit:* `feat(cloud): add firebase custom claims synchronization helper`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement `authenticateFirebase` and `requireRole` middlewares (`backend/src/middleware/auth.ts`) plus `POST /api/auth/sync` upsert endpoint.
  * *Commit:* `feat(auth-api): implement firebase jwt middleware and sql user sync route`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build User Profile header menu, avatar displays, role badge tags, and logout confirmation dialog.
  * *Commit:* `feat(ui): build user profile menu avatar and logout confirmation modal`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Build `AuthContext.tsx` and Axios interceptor (`apiClient.ts`) that injects `Authorization: Bearer <idToken>` and caches SQL user role.
  * *Commit:* `feat(auth-ui): implement auth context and axios bearer token interceptor`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write automated Supertest unit/integration tests verifying 401 Unauthorized on missing/expired tokens and 200 OK on valid sync, sealing Floor 5.
  * *Commit:* `test(auth): add supertest suite for token verification and user sync`

---

### Floor 6 (Day 6 of 25): Admin Role Management, Protected Route Guards & Synthetic Seeding
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Write synthetic Firebase Auth + PostgreSQL seed script (`database/seed/seed.ts`) provisioning Admin, HR, and Candidate demo accounts.
  * *Commit:* `feat(seed): create synthetic firebase emulator and postgresql seed script`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement Admin user management API (`GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `PUT /api/admin/company`).
  * *Commit:* `feat(admin-api): add user role management and company config endpoints`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Page 1: Admin Overview (`/admin`) dashboard UI with user management table, role selection dropdowns, and company settings form.
  * *Commit:* `feat(admin-ui): build admin overview dashboard and company settings view`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Build `<ProtectedRoute allowedRoles={...} />` route wrapper component and wire admin user role modification API calls.
  * *Commit:* `feat(admin-ui): implement protected route guard and admin user management hooks`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Automate `npm run seed` inside Docker/CI pipeline and add RBAC matrix tests confirming Candidates and HR cannot call `/api/admin/*` (403), sealing Floor 6.
  * *Commit:* `test(rbac): add automated role matrix tests for admin endpoints`

---

### Floor 7 (Day 7 of 25): Week 1 Milestone Verification: ER Diagram, API Spec & Full Foundation Audit
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Verify Firebase Auth Emulator persistence export/import scripts and document cloud IAM & data retention assumptions in `docs/cloud-iam-retention.md`.
  * *Commit:* `docs(cloud): add firebase emulator persistence and data retention guide`
* **2. Backend Developer (`backend`):**
  * *Task:* Add global Express error handler, Zod request validation middleware, and publish `docs/api-spec.md` & `docs/permission-matrix.md`.
  * *Commit:* `feat(backend): add global error handler zod validator and api spec docs`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Add unauthorized (403), not-found (404), and loading skeleton states across all role dashboards; commit UI wireframe diagrams.
  * *Commit:* `feat(ui): add error boundary 403 404 pages and loading skeletons`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Implement global client error notifications (toast system) and offline connectivity detection banners.
  * *Commit:* `feat(ui): add global toast notification provider and network status listener`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Configure full Week 1 GitHub Actions CI gate (`migrate -> seed -> lint -> test -> build`), verify clean main, and tag release `v0.1.0-week1`.
  * *Commit:* `ci(release): finalize week 1 ci gate pipeline and tag v0.1.0-week1`

---

## Tier 2 (Week 2): Job Posting, Candidate Applications & Pipeline

### Floor 8 (Day 8 of 25): Job Creation, Editing & Lifecycle State Transitions
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Add PostgreSQL composite indexes for job search/filtering (`status`, `department`, `location`, `published_at`) and query performance tuning.
  * *Commit:* `perf(db): add composite indexes for job filtering and search queries`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement Job CRUD & lifecycle API (`POST /api/jobs`, `PUT /api/jobs/:id`, `PATCH /api/jobs/:id/status`) restricted to ADMIN and HR.
  * *Commit:* `feat(jobs-api): implement job crud and status transition endpoints`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Page 2: Job Management (`/hr/jobs`) UI with job creation/edit modal form, status filter tabs, and action buttons.
  * *Commit:* `feat(jobs-ui): build hr job management dashboard and create edit modal`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Implement job management state hooks, job status transition mutations (Draft, Published, Closed, Archived), and form validation.
  * *Commit:* `feat(jobs-ui): wire job crud state hooks and status transition handlers`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write Supertest integration tests for Job CRUD, verifying server-side validation and confirming Candidates receive 403 on job mutation, sealing Floor 8.
  * *Commit:* `test(jobs): add api integration tests for job crud and role guards`

---

### Floor 9 (Day 9 of 25): Public/Candidate Job Board, Search, Filtering & Pagination
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Configure API response caching headers and CORS policies for public job board read endpoints.
  * *Commit:* `feat(cloud): configure caching headers and cors rules for job listings`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement paginated `GET /api/jobs` and `GET /api/jobs/:id` supporting keyword search, department/location filters, and applicant counts.
  * *Commit:* `feat(jobs-api): add paginated job listing search and detail endpoints`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Candidate Job Board & Job Detail view (`/jobs`, `/jobs/:id`) with search bar, filter dropdowns, job detail cards, and empty states.
  * *Commit:* `feat(jobs-ui): create candidate job board search filters and detail view`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Wire debounced search query params, pagination controls, and query cache for public job listings.
  * *Commit:* `feat(jobs-ui): implement debounced search pagination and job detail hooks`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Add pagination boundary and SQL injection fuzz tests for `/api/jobs` query parameters in the CI test suite, sealing Floor 9.
  * *Commit:* `test(jobs): add pagination boundary and query sanitization tests`

---

### Floor 10 (Day 10 of 25): Candidate Profile Management & Defensive Resume Upload Engine
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Build private storage service (`backend/src/services/storageService.ts`) that writes files outside web root with UUID names and computes SHA-256 checksums.
  * *Commit:* `feat(storage): implement private resume storage service and sha256 hashing`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement `GET/PUT /api/candidates/me` and Multer resume upload (`POST /api/resumes`) validating 5 MB limit and PDF/DOCX magic bytes.
  * *Commit:* `feat(resume-api): add candidate profile api and magic-byte resume upload`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Candidate Profile & Resume Manager section on Page 3: Candidate Dashboard (`/candidate`) with drag-and-drop file upload zone.
  * *Commit:* `feat(candidate-ui): build candidate profile editor and resume upload widget`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Implement client-side file pre-validation (size limit, mime-type), upload progress bar state, and profile update mutations.
  * *Commit:* `feat(candidate-ui): wire resume file upload client validation and progress state`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write security tests attempting to upload `.exe`/`.html` disguised as `.pdf` and files >5 MB, asserting 400/413 rejection, sealing Floor 10.
  * *Commit:* `test(security): add malicious file upload and size limit rejection tests`

---

### Floor 11 (Day 11 of 25): Validated Job Application Submission & Ownership-Protected Resume Streaming
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Implement authenticated stream handler for `GET /api/resumes/:id/download` verifying ADMIN/HR role or candidate file ownership.
  * *Commit:* `feat(storage): add ownership-verified private resume download stream`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement `POST /api/applications` (atomic insert into applications + initial APPLIED audit log) and `GET /api/applications/me`.
  * *Commit:* `feat(apps-api): implement application submission and candidate history api`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Application Submission Modal on `/jobs/:id` and Application Status Tracker cards on `/candidate` dashboard.
  * *Commit:* `feat(apps-ui): build job application form modal and candidate status tracker`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Connect application submission mutation, prevent duplicate submission state, and wire resume download trigger.
  * *Commit:* `feat(apps-ui): wire application submission hooks and resume download client`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write IDOR security tests verifying Candidate A cannot download Candidate B's resume (403) and duplicate applications return 409 Conflict, sealing Floor 11.
  * *Commit:* `test(apps): add idor resume download and duplicate application tests`

---

### Floor 12 (Day 12 of 25): Controlled Pipeline Stage Transition Machine & Immutable Audit Trail
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Configure database transaction isolation and row-level locking (`SELECT ... FOR UPDATE`) metrics to prevent concurrent stage race conditions.
  * *Commit:* `perf(db): configure row locking and transaction telemetry for stage updates`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement transactional stage machine (`stageMachine.ts`) and `PATCH /api/applications/:id/stage` recording actor & reason in `application_stage_history`.
  * *Commit:* `feat(pipeline-api): build transactional stage state machine and audit log`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Page 4: HR Pipeline (`/hr/pipeline`) Kanban board with columns (`Applied`, `Screening`, `Interview`, `Selected`, `Offered`, `Rejected`) and stage change modal.
  * *Commit:* `feat(pipeline-ui): build hr pipeline kanban board and stage transition modal`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Wire Kanban drag-and-drop / select status transitions, audit reason prompt input, and optimistic pipeline cache updates.
  * *Commit:* `feat(pipeline-ui): wire kanban drag-and-drop state and audit reason handler`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write unit & API tests for all valid and invalid stage transitions (e.g., rejecting APPLIED -> OFFERED or moving out of REJECTED), sealing Floor 12.
  * *Commit:* `test(pipeline): add exhaustive state transition rule unit and api tests`

---

### Floor 13 (Day 13 of 25): HR Candidate Search, Multi-Criteria Filtering & Application Detail Drawer
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Add full-text/trigram search indexes on candidate names, skills, and job titles in PostgreSQL for fast HR pipeline queries.
  * *Commit:* `perf(db): add search indexes on candidate names skills and emails`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement `GET /api/applications` (filter by `jobId`, `stage`, `search`, `dateRange`, `pagination`) and `GET /api/applications/:id/history`.
  * *Commit:* `feat(pipeline-api): add multi-filter candidate search and audit history api`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Candidate Dossier slide-over Drawer on `/hr/pipeline` with full applicant details, resume preview, and timeline activity history.
  * *Commit:* `feat(pipeline-ui): build candidate dossier slide-over drawer and history view`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Implement multi-criteria filter state (job, stage, date, search term), table/Kanban toggle, and dossier data fetching hooks.
  * *Commit:* `feat(pipeline-ui): implement filter state management and dossier data hooks`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Set up Playwright browser E2E test framework (`tests/e2e/`) and automate the Week 2 flow: HR publishes job -> Candidate applies -> HR moves stage, sealing Floor 13.
  * *Commit:* `test(e2e): initialize playwright and automate job-to-pipeline e2e test`

---

### Floor 14 (Day 14 of 25): Week 2 Milestone Verification: Pipeline Stress Testing & Transition Docs
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Expand `seed.ts` to populate 15 synthetic applications across all pipeline stages with sample synthetic PDF resumes in `uploads/`.
  * *Commit:* `feat(seed): expand seed script with multi-stage applications and pdf resumes`
* **2. Backend Developer (`backend`):**
  * *Task:* Document formal status-transition rules in `docs/status-transitions.md` and refine API error codes for invalid pipeline actions.
  * *Commit:* `docs(pipeline): document formal application and job status transition rules`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Polish empty states, error fallbacks, pagination controls, and keyboard accessibility on HR Pipeline and Candidate Dashboard.
  * *Commit:* `fix(ui): polish empty states pagination and accessibility on pipeline views`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Add client-side mutation retry logic and optimistic error rollback for pipeline interactions.
  * *Commit:* `fix(ui): add optimistic UI error rollback and stage action feedback`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Run full Week 2 CI test suite (API + Playwright E2E), verify clean main branch, and tag milestone release `v0.2.0-week2`.
  * *Commit:* `ci(release): verify week 2 api and e2e test gates and tag v0.2.0-week2`

---

## Tier 3 (Week 3): Interviews, Notifications & Offer Letters

### Floor 15 (Day 15 of 25): Interview Creation, Scheduling & Conflict Detection
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Configure UTC timestamp normalization and meeting link generator helper (`meetingService.ts`) for scheduled interview events.
  * *Commit:* `feat(cloud): add utc timezone normalizer and meeting link generator service`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement `POST /api/interviews` and `GET /api/interviews` with interviewer time-slot conflict validation and automatic stage check.
  * *Commit:* `feat(interviews-api): implement interview scheduling and conflict check api`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Page 5: Interviews (`/hr/interviews` & `/candidate/interviews`) with calendar/list toggle and Schedule Interview modal form.
  * *Commit:* `feat(interviews-ui): build interview calendar list view and scheduling modal`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Wire interview scheduling form validation, interviewer conflict error alerts, and interview list state management.
  * *Commit:* `feat(interviews-ui): wire interview form validation and conflict error handling`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write API tests verifying overlapping interview slots for the same interviewer or invalid `ends_at <= starts_at` are rejected (400/409), sealing Floor 15.
  * *Commit:* `test(interviews): add conflict detection and timestamp validation tests`

---

### Floor 16 (Day 16 of 25): Interview Rescheduling, Cancellation & Structured Evaluator Feedback
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Add database audit triggers/logs capturing interview reschedule history and evaluator scorecard submission timestamps.
  * *Commit:* `feat(db): add audit logging for interview reschedules and scorecard events`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement `PATCH /api/interviews/:id` (reschedule/cancel with `reschedule_count++`) and `POST/GET /api/interviews/:id/feedback` (hidden from Candidates).
  * *Commit:* `feat(interviews-api): add reschedule cancel and confidential feedback routes`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Reschedule/Cancel modal and Structured Interview Feedback Scorecard form (1–5 ratings, strengths, concerns, decision) for HR/Admin.
  * *Commit:* `feat(interviews-ui): build reschedule modal and evaluator feedback scorecard`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Wire scorecard submission hook, candidate confidential view protection (hiding scorecards on candidate portal), and reschedule mutation.
  * *Commit:* `feat(interviews-ui): wire scorecard submission and candidate role view isolation`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write authorization tests proving Candidates can view their interview time/link but receive 403 Forbidden when querying `/feedback`, sealing Floor 16.
  * *Commit:* `test(interviews): verify candidate isolation from interviewer feedback api`

---

### Floor 17 (Day 17 of 25): Email Notification Service, Retry Handling & Labeled Simulated Mode
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Configure SMTP / transactional email provider credentials and `EMAIL_MODE=SIMULATED|LIVE_SMTP` environment switch.
  * *Commit:* `feat(cloud): configure smtp transport and simulated email mode toggle`
* **2. Backend Developer (`backend`):**
  * *Task:* Build `notificationService.ts` with exponential backoff retry (up to 2 retries) logging every attempt into `notification_events`.
  * *Commit:* `feat(notify-api): implement email notification service with retry and db log`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Notification Log & Delivery Status viewer component in Admin/HR views showing SENT, FAILED, `retry_count`, and SIMULATED badge.
  * *Commit:* `feat(notify-ui): build notification delivery log table and mode indicator`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Wire in-app notification bell, unread badge counter, and mark-as-read API actions for all roles.
  * *Commit:* `feat(notify-ui): wire in-app notification bell and unread status handler`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write unit tests mocking transient SMTP failures to verify retry counter increments and FAILED / SENT status persistence, sealing Floor 17.
  * *Commit:* `test(notify): add unit tests for email retry logic and simulated mode logging`

---

### Floor 18 (Day 18 of 25): Template-Based Offer Letter Generation & Issuance Workflow
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Store approved HTML offer templates and configure PDF/HTML snapshot archiving for issued offer letters.
  * *Commit:* `feat(cloud): add controlled offer letter templates and snapshot archiving`
* **2. Backend Developer (`backend`):**
  * *Task:* Build `offerTemplateService.ts` (escaping & injecting role, salary, start date) and `POST /api/offers`, `PATCH /api/offers/:id/issue`.
  * *Commit:* `feat(offers-api): build template offer letter generator and issue endpoint`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build HR view of Page 6: Offers & Onboarding (`/hr/offers`) with template composer, live offer preview frame, and Issue Offer dialog.
  * *Commit:* `feat(offers-ui): build hr offer letter composer and live template preview`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Implement offer compensation input validation (positive integer salary, future start date) and issue offer mutation hook.
  * *Commit:* `feat(offers-ui): wire offer form validation and offer issuance mutation`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write API tests confirming offers can only be issued to SELECTED/OFFERED candidates and trigger an offer notification event, sealing Floor 18.
  * *Commit:* `test(offers): add offer generation state and notification trigger tests`

---

### Floor 19 (Day 19 of 25): Candidate Offer Acceptance/Decline & Onboarding Task Checklist
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Enforce strict row-level ownership checks on offer and onboarding endpoints so candidates can never enumerate other offer IDs.
  * *Commit:* `security(cloud): enforce strict candidate ownership checks on offer records`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement `POST /api/offers/:id/respond` (ACCEPTED/DECLINED by owner Candidate) auto-spawning `onboarding_tasks`, plus `PATCH /api/onboarding/:id`.
  * *Commit:* `feat(onboarding-api): add candidate offer response and onboarding task api`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Candidate Offer Review card (Accept/Decline actions) and interactive Onboarding Checklist on `/candidate/offers`.
  * *Commit:* `feat(onboarding-ui): build candidate offer response portal and task checklist`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Wire offer response confirmation dialog, digital signature checkbox, and onboarding task toggle state handlers.
  * *Commit:* `feat(onboarding-ui): wire offer response actions and onboarding task toggle state`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write integration tests verifying Candidate A accepting an offer sets `hired_at`, creates onboarding tasks, and blocks Candidate B (403), sealing Floor 19.
  * *Commit:* `test(onboarding): test offer acceptance transaction and cross-candidate guard`

---

### Floor 20 (Day 20 of 25): System-Wide Activity Log & Cross-Workflow Event Wiring
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Optimize SQL union/join views and pagination indexes for the system activity feed and candidate timeline.
  * *Commit:* `perf(db): optimize activity log view and timeline query indexes`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement unified `GET /api/activity` endpoint aggregating stage transitions, interview events, offer status changes, and email dispatches.
  * *Commit:* `feat(activity-api): implement unified activity history aggregation endpoint`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build reusable Activity Timeline UI component with event badges, user timestamps, and detail expanders.
  * *Commit:* `feat(activity-ui): create visual activity timeline component with event icons`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Embed real-time Activity Timeline into Admin Overview (`/admin`) and HR Candidate Dossier drawer with pagination hooks.
  * *Commit:* `feat(activity-ui): embed unified activity timeline in admin and hr views`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Add Playwright E2E test covering the Week 3 lifecycle: HR schedules interview -> logs feedback -> issues offer -> Candidate accepts, sealing Floor 20.
  * *Commit:* `test(e2e): automate interview feedback offer and onboarding e2e journey`

---

### Floor 21 (Day 21 of 25): Week 3 Milestone Verification: Integration Audit & Seed Expansion
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Update `seed.ts` to include sample scheduled/completed interviews, evaluator scorecards, issued/accepted offers, and onboarding tasks.
  * *Commit:* `feat(seed): add interviews feedback offers and onboarding records to seed`
* **2. Backend Developer (`backend`):**
  * *Task:* Audit all Week 3 endpoints for edge cases (e.g., double offer acceptance, feedback on cancelled interviews) and document mock email mode.
  * *Commit:* `fix(backend): harden edge cases on interview and offer state transitions`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Refine responsive mobile/tablet layouts for Interview Calendar, Offer Letter preview, and Onboarding Checklist.
  * *Commit:* `style(ui): refine responsive layout for interview calendar and offer views`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Perform client state audit: verify zero stale cache on interview reschedule and instant status badge updates.
  * *Commit:* `fix(ui): audit interview and offer cache invalidation rules`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Execute complete Week 1–3 regression test suite in CI, verify clean main, and tag release `v0.3.0-week3`.
  * *Commit:* `ci(release): run week 3 regression suite and tag v0.3.0-week3`

---

## Tier 4 (Week 4): Analytics, Security Hardening & Deployment

### Floor 22 (Day 22 of 25): Hiring Analytics Engine: Funnel Conversion, Time-to-Hire & Offer KPIs
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Verify timezone-consistent date truncation (`AT TIME ZONE 'UTC'`) and zero-division guards (`NULLIF`) across all analytical SQL queries.
  * *Commit:* `perf(analytics): add utc date boundary normalization and nullif sql guards`
* **2. Backend Developer (`backend`):**
  * *Task:* Implement `GET /api/analytics/summary` computing Application count, Stage Conversion rates, Time-to-Hire (days), Interview Reliability, and Offer Acceptance.
  * *Commit:* `feat(analytics-api): implement sql hiring kpi aggregation with filters`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Build Page 7: Hiring Analytics (`/hr/analytics`) UI with KPI summary cards, stage conversion funnel bar charts, and time-to-hire metrics.
  * *Commit:* `feat(analytics-ui): build hiring analytics dashboard charts and layout`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Wire Job, Date range, and Department analytics filter controls with chart tooltips explaining KPI mathematical formulas.
  * *Commit:* `feat(analytics-ui): wire analytics filter controls and formula explanation tooltips`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Write analytical accuracy tests verifying SQL KPI outputs against known synthetic cohorts, empty date ranges, and missing dates, sealing Floor 22.
  * *Commit:* `test(analytics): verify kpi denominator accuracy and empty dataset handling`

---

### Floor 23 (Day 23 of 25): Security Hardening: Rate Limiting, Input Sanitization & Access-Control Audit
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Audit Firebase token revocation handling (`checkRevoked = true`), rotate demo environment templates, and verify zero secrets in Git history.
  * *Commit:* `security(cloud): enable firebase token revocation check and audit env files`
* **2. Backend Developer (`backend`):**
  * *Task:* Audit every controller for strict SQL parameterization, XSS HTML escaping in offer templates, and consistent 401/403/404/422 error payloads.
  * *Commit:* `security(backend): enforce strict html escaping and input validation rules`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Add session-expiry auto-logout modal, client file-type/size pre-checks, and UI sanitization against raw HTML rendering.
  * *Commit:* `feat(ui): add session expiry modal and client upload sanitization`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Implement automatic token refresh listener, clear auth storage on 401 response, and sanitize query parameter inputs.
  * *Commit:* `feat(auth-ui): add token refresh listener and automatic auth state purge`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Add `express-rate-limit` on auth/upload routes, strict CSP/Helmet headers, and automated `npm audit` + secret-scanning in CI, sealing Floor 23.
  * *Commit:* `security(devops): add api rate limiting helmet csp headers and secret scan`

---

### Floor 24 (Day 24 of 25): Production Containerization, Cloud Deployment & Full E2E Regression
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Deploy backend API, PostgreSQL database, and React frontend to cloud hosting (Render/Railway/Cloud Run + Firebase Hosting) and seed demo data.
  * *Commit:* `deploy(cloud): configure cloud deployment pipeline and seed live demo`
* **2. Backend Developer (`backend`):**
  * *Task:* Add `/api/health/readiness` checking PostgreSQL + Firebase Admin connectivity and export Postman/OpenAPI collection in `docs/openapi.json`.
  * *Commit:* `feat(backend): add readiness probe endpoint and openapi collection export`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Capture high-resolution screenshots of all 7 role dashboards for submission documentation and presentation slides.
  * *Commit:* `docs(ui): capture high-resolution screenshots of all 7 role dashboards`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Configure production build optimizations (code-splitting, lazy route imports, bundle visualizer analysis).
  * *Commit:* `chore(frontend): optimize production bundle chunk splitting and lazy routes`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Create multi-stage production Dockerfiles for frontend (Nginx) and backend (Node Alpine) plus `docker-compose.prod.yml`, sealing Floor 24.
  * *Commit:* `build(docker): add multi-stage production dockerfiles and compose stack`

---

### Floor 25 (Day 25 of 25): Final Documentation, Engineering Report, Presentation & Release v1.0.0
* **1. Cloud Engineer (`cloud`):**
  * *Task:* Document complete local emulator vs. cloud deployment instructions and `.env.example` reference tables in `README.md`.
  * *Commit:* `docs(readme): document firebase setup cloud deployment and env configuration`
* **2. Backend Developer (`backend`):**
  * *Task:* Write `docs/final-report.md` detailing architecture decisions, RBAC enforcement, KPI mathematical definitions, known gaps, and future work.
  * *Commit:* `docs(report): author final engineering design and security controls report`
* **3. Frontend Developer 1 (`frontend`):**
  * *Task:* Finalize technical presentation slide deck outline (`docs/presentation-walkthrough.md`) with demo credentials for Admin, HR, and Candidate.
  * *Commit:* `docs(demo): add role-by-role demo walkthrough and presentation guide`
* **4. Frontend Developer 2 (`frontend`):**
  * *Task:* Add interactive system tour walkthrough tooltips and demo credentials auto-fill button on the login screen for review testing.
  * *Commit:* `feat(demo-ui): add quick-fill demo credentials helper for review testing`
* **5. Leader / DevOps Engineer (`devops` & `main`):**
  * *Task:* Export full Jest/Supertest + Playwright test coverage report (`docs/test-evidence.md`), verify clean main branch, and tag `v1.0.0`.
  * *Commit:* `ci(release): publish final test coverage evidence and tag release v1.0.0`
