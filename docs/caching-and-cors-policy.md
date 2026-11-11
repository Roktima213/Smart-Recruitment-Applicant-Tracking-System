# Caching & CORS Policy Specification

## 1. Overview
This document defines the HTTP caching directives and Cross-Origin Resource Sharing (CORS) security guidelines for the Smart Recruitment & Applicant Tracking System (ATS).

---

## 2. HTTP Caching Architecture

### 2.1 Public Job Board (`GET /api/jobs`, `GET /api/jobs/:id`)
Public endpoints serve job listings to candidates, search engines, and visitors. These are optimized using short-lived edge caching and conditional validation:
- **Cache-Control:** `public, max-age=60, stale-while-revalidate=30`
  - Responses may be cached by intermediate proxies, CDNs, and browsers for up to 60 seconds.
  - Stale responses may be served for up to 30 seconds while fresh data is revalidated in the background.
- **Vary Header:** `Vary: Accept-Encoding, Origin`
  - Ensures caches differentiate between compression schemes and different client origins.
- **ETag & 304 Validation:**
  - Weak ETags (`W/"<len>-<hash>"`) are automatically computed for JSON responses.
  - Clients sending `If-None-Match: <etag>` receive an immediate `304 Not Modified` without transferring payload bytes.

### 2.2 Authenticated Endpoints (`/api/auth/*`, `/api/applications/*`, `/api/resumes/*`, mutations)
Any request bearing an `Authorization` header or authenticated user session must bypass shared caching completely:
- **Cache-Control:** `private, no-cache, no-store, must-revalidate`
- **Pragma:** `no-cache`
- **Expires:** `0`

---

## 3. CORS Rules & Allowed Origins

1. **Origins:** Multi-origin parsing configured via `FRONTEND_URL` in environment variables:
   - Development default: `http://localhost:5173`
   - Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
   - Allowed headers: `Content-Type, Authorization`
   - Credentials support: `true` (enables cookies and auth headers)
2. **Preflight Optimization:**
   - Preflight `OPTIONS` requests respond with appropriate headers and terminate before database execution.
3. **Public Fallback:**
   - Unauthenticated `GET` requests from browsers and mobile clients can safely read public listings without cross-origin denial.
