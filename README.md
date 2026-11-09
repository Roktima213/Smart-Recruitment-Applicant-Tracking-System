# Smart Recruitment & Applicant Tracking System (ATS)

> An enterprise HR Tech / SaaS platform that centralizes the recruitment lifecycle: job posting, candidate application, private resume parsing and streaming, controlled multi-stage pipeline, interview scheduling with conflict detection, evaluator scorecards, template offer issuance, and hiring analytics.

---

## 1. Project Architecture & 5-Member Team Structure

This project is built under a **25-Floor Pyramid Execution Model** across 3.5 weeks (25 working days), structured for a **5-member engineering team** where **every member contributes 1 verified commit per day** (5 commits/day = 125 total commits).

| Role | Responsibility Domain | Branch | Daily Block | Total Commits |
| :--- | :--- | :--- | :--- | :--- |
| **Leader & DevOps Engineer** | Monorepo governance, Docker Compose, CI gates, test harnesses, release gating & floor seal | `devops` / `main` | **Block D** (Floor Seal) | 25 Commits |
| **Cloud Engineer** | Firebase Auth & Emulator (port 9099), Custom Claims, DB parameters, private storage, SMTP config | `cloud` | **Block A** (Contract Lead) | 25 Commits |
| **Backend Developer** | 12-table PostgreSQL DDL, Express TypeScript APIs, JWT/RBAC middleware, stage machine, analytics | `backend` | **Block B** (API Logic) | 25 Commits |
| **Frontend Developer 1** | Responsive layouts, UI design tokens, navigation, dashboard screens, forms, and modals | `frontend` | **Block C1** (UI / Views) | 25 Commits |
| **Frontend Developer 2** | State management, Firebase Web SDK, Axios interceptors, API hooks, client-side validation | `frontend` | **Block C2** (State & Auth) | 25 Commits |

---

## 2. The 5 Repository Branches

The repository maintains **5 persistent branches**:

1. `main`: The stable, integrated production branch. Tagged at milestone releases (`v0.1.0-week1`, `v0.2.0-week2`, `v0.3.0-week3`, `v1.0.0`).
2. `devops`: Active branch for the Project Leader & DevOps Engineer for CI/CD workflows, Docker configs, test configurations, and deployment scripts.
3. `frontend`: Shared active branch for Frontend Developer 1 and Frontend Developer 2. Members branch off into feature branches (`floor-XX/frontend-ui-<topic>` and `floor-XX/frontend-logic-<topic>`) before merging.
4. `backend`: Active branch for the Backend Developer for database migrations, Express routes, controllers, middleware, and business services.
5. `cloud`: Active branch for the Cloud Engineer for Firebase Auth, emulator setups, storage configurations, database connection tuning, and cloud deployment pipelines.

---

## 3. Technology Stack

* **Frontend:** React + Vite + TypeScript, Tailwind CSS / CSS design tokens, Axios with JWT interceptor, Lucide icons.
* **Backend:** Node.js with Express + TypeScript, Zod request validation, Helmet & CORS security middleware.
* **Database:** PostgreSQL (12 relational tables with foreign keys, enums, triggers, and composite indexes).
* **Identity & Auth:** Firebase Authentication with local Auth Emulator (`localhost:9099`) and Custom Claims for role mapping (`ADMIN`, `HR`, `CANDIDATE`).
* **Storage:** Private local / cloud storage with UUID naming, SHA-256 integrity checksums, and magic-byte mime inspection.
* **Testing:** Jest + Supertest (API unit and RBAC integration tests), Playwright (E2E browser journeys).
* **DevOps:** Docker, Docker Compose (`postgres` + `firebase-emulator`), GitHub Actions CI pipeline.

---

## 4. Repository Structure

```text
.
├── .github/workflows/          # GitHub Actions CI pipelines (lint, test, build, release)
├── backend/                    # Express + TypeScript REST API server
│   └── src/                    # Controllers, middleware, routes, services, config
├── frontend/                   # React + Vite + TypeScript SPA
│   └── src/                    # Components, pages, hooks, context, styles
├── database/
│   ├── migrations/             # 12-table incremental PostgreSQL DDL migrations
│   └── seed/                   # Synthetic demo seed scripts (Admin, HR, Candidate)
├── tests/
│   ├── unit/                   # Unit test suites
│   ├── integration/            # RBAC and API integration tests
│   └── e2e/                    # Playwright end-to-end browser tests
├── docs/                       # Architecture specs, API docs, 25-day daily commit checklist
├── scripts/                    # Automation scripts (Git branch setup, DB migrations)
├── uploads/                    # Private resume storage root (git-ignored)
├── .env.example                # Zero-secret environment template
├── .gitignore                  # Comprehensive full-stack ignore rules
└── README.md                   # Repository overview and guide
```

---

## 5. Quick Start & Local Setup

### Prerequisites
* Node.js >= 18.x
* PostgreSQL >= 14
* Git >= 2.40
* Docker & Docker Compose (optional for local containerized environment)

### Environment Configuration
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```

### Linking to Remote GitHub Repository
To link this local monorepo to your GitHub repository and push all 5 branches:
```powershell
.\scripts\setup-git-branches.ps1 -RemoteUrl "https://github.com/<YOUR_ORGANIZATION_OR_USER>/<REPO_NAME>.git"
```

---

## 6. Execution Roadmap & Daily Guides

* Detailed 5-Member Branch Workflow: [docs/TEAM_WORKFLOW_AND_BRANCHING.md](file:///docs/TEAM_WORKFLOW_AND_BRANCHING.md)
* 25-Day (125-Commit) Daily Commit Checklist: [docs/DAILY_COMMIT_CHECKLIST_25_DAYS.md](file:///docs/DAILY_COMMIT_CHECKLIST_25_DAYS.md)
