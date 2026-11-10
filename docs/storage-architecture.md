# Private Storage Architecture & Security Rules
**Project Floor 3 (Day 3) — Cloud Engineering Architecture**

This document establishes the security, permission boundaries, and storage policies for candidate resumes and attachments in the **Smart Recruitment & Applicant Tracking System (ATS)**.

---

## 1. Zero Public Storage Policy

All candidate resumes and identity documents are classified as **Confidential Personal Data (PII)**.
* **No Public URLs:** Resumes are never stored in public web-accessible directories, public S3/GCS buckets, or unauthenticated CDN endpoints.
* **Isolated File System Root:** In development and local Docker, resumes are stored in a private directory located outside the web root (`./uploads`).
* **Authenticated Streaming Only:** File access is exclusively mediated by the backend server via authenticated, role-verified streaming endpoints (`GET /api/resumes/:id/download`).

---

## 2. Environment Variables & Quotas

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `UPLOAD_DIR` | `./uploads` | Absolute or relative path to private storage directory |
| `MAX_UPLOAD_BYTES` | `5242880` (5 MB) | Hard upload payload boundary |
| `ALLOWED_MIME_TYPES` | `application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Permitted document formats |

---

## 3. Storage Ingestion & Sanitization Pipeline

```
Candidate Upload
      │
      ▼
1. Size Check (< 5 MB)
      │
      ▼
2. Magic-Byte Inspection (Assert '%PDF-' or DOCX zip header)
      │
      ▼
3. SHA-256 Checksum Computation (Integrity & Deduplication)
      │
      ▼
4. UUID Anonymization (e.g. `c7a4b89e-2f91-4d7a-8f12-9c1234567890.pdf`)
      │
      ▼
5. Private Write (Restricted OS File Permissions 0600)
      │
      ▼
6. DB Metadata Persistence (`resume_metadata` table)
```

---

## 4. Cloud Object Storage Deployment (Production)

When migrating from local disk to Cloud Storage (AWS S3, Google Cloud Storage, or Azure Blob):
1. **Private Buckets:** Buckets are created with `Block Public Access = TRUE`.
2. **KMS Server-Side Encryption:** Objects encrypted at rest using AES-256 (`aws:kms` or Google-managed encryption keys).
3. **IAM Service Role:** The backend application accesses objects via IAM Service Account credentials with `Storage Object Admin` restricted strictly to the designated bucket.
4. **Time-Limited Signed URLs:** When direct client download offload is preferred, the backend generates short-lived pre-signed URLs with a 5-minute expiration (`ExpiresIn: 300`).
