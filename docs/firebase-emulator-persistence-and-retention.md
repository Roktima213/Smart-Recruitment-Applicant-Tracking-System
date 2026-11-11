# Firebase Emulator Persistence and Data Retention Guide

This document defines the configuration, automated workflows, and compliance policies for local Firebase Emulator data persistence and project-wide data retention.

---

## 1. Local Emulator Persistence Architecture

During local development and automated CI testing, the Firebase Auth Emulator is used in place of production Google Identity Platform instances.

### 1.1 Emulator Configuration
- **Auth Emulator Port:** `9099` (configured in `firebase.json` and `.env.example`)
- **Emulator UI Port:** `4000`
- **Host Binding:** `0.0.0.0` (accessible from host and Docker containers)
- **Data Directory:** `.firebase-emulator-data/` (strictly excluded via `.gitignore`)

### 1.2 Automated Export and Import Workflows

To preserve user accounts, email credentials, and custom claims across local system restarts:

- **Launch with Auto-Import & Export on Exit:**
  ```bash
  # Linux / macOS
  ./scripts/emulator-import.sh

  # Windows PowerShell
  .\scripts\emulator-import.ps1
  ```
  This passes `--import=.firebase-emulator-data --export-on-exit=.firebase-emulator-data` to the Firebase CLI.

- **Manual Snapshot Export:**
  ```bash
  # Linux / macOS
  ./scripts/emulator-export.sh

  # Windows PowerShell
  .\scripts\emulator-export.ps1
  ```

---

## 2. ATS Data Retention & Archival Policies

In accordance with enterprise recruitment standards and GDPR Article 5(1)(e) (storage limitation):

| Data Category | Tables / Storage | Retention Period | Deletion / Anonymization Strategy |
| :--- | :--- | :--- | :--- |
| **Authentication & Profile** | `users`, Firebase Auth | Duration of active employment or account lifetime + 30 days after deletion request | Soft delete (`is_active = FALSE`, token revocation); hard delete after 30-day grace period. |
| **Candidate Resumes & Files** | `uploads/` directory, `resumes` table | 12 months from application date (or local statutory compliance period) | Physical file unlink using SHA-256 verification; metadata record flagged as purged. |
| **Job Applications** | `applications`, `application_stages` | 24 months for rejected candidates; permanent for hired personnel (transferred to HRIS) | Anonymization of PII fields (name, phone, address) while preserving aggregate hiring funnel metrics. |
| **Security & Audit Logs** | `audit_logs`, auth logs | Minimum 365 days | Append-only immutability; partitioned quarterly by timestamp. |

---

## 3. Disaster Recovery & Synthetic Seed Restoration

If the local database or emulator state is corrupted or reset:

1. **Re-run Schema Migrations:**
   ```bash
   npm run migrate:up
   ```
2. **Re-run Synthetic Demo Seeder:**
   ```bash
   cd backend && npm run seed
   ```
   This will idempotently re-provision demo accounts (`admin@ats.local`, `hr@ats.local`, `candidate@ats.local`) and company configuration.
