# Smart Recruitment & Applicant Tracking System - API Specification

**Version:** 1.0.0 (Week 1 Foundation Milestone)  
**Base URL:** `http://localhost:5000/api`  
**Protocol:** HTTP/1.1 with JSON payloads  
**Authentication:** Firebase ID Token (`Authorization: Bearer <idToken>`)

---

## 1. Global Standards & Envelope Formats

### 1.1 Success Response Envelope
All successful requests return a `2xx` HTTP status code and standard JSON payload:
```json
{
  "success": true,
  "data": { ... } // or entity-specific root keys (e.g. "users", "company")
}
```

### 1.2 Error Response Envelope
All failed requests return an appropriate `4xx` or `5xx` HTTP status code:
```json
{
  "success": false,
  "error": {
    "message": "Human-readable failure description",
    "statusCode": 400,
    "details": [ ... ] // Optional Zod validation field errors
  }
}
```

### 1.3 Security & Production Sanitization (SEC-04)
In production environments (`NODE_ENV=production`), internal database exceptions, SQL queries, and stack traces are suppressed, returning:
`"An unexpected internal server error occurred"` with status `500`.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Endpoint Route | Method | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Public | System and PostgreSQL connectivity healthcheck |
| `/api/auth/sync` | `POST` | Authenticated | Synchronizes Firebase user account to PostgreSQL |
| `/api/auth/me` | `GET` | Authenticated | Returns current authenticated user record |
| `/api/admin/users` | `GET` | `ADMIN`, `SUPER_ADMIN` | Paginated user directory with role and status filtering |
| `/api/admin/users/:id/role` | `PATCH` | `ADMIN`, `SUPER_ADMIN` | Updates user role and triggers custom claims sync |
| `/api/admin/users/:id/status`| `PATCH`| `ADMIN`, `SUPER_ADMIN` | Activates or deactivates user; revokes sessions on disable |
| `/api/admin/company` | `GET` | `ADMIN`, `SUPER_ADMIN` | Retrieves corporate settings and workspace config |
| `/api/admin/company` | `PUT` | `ADMIN`, `SUPER_ADMIN` | Updates company name, domain, logo, and settings |

---

## 3. Endpoints Documentation

### 3.1 System Health
#### `GET /api/health`
Returns connection status of backend services and database connection pool.
- **Headers:** None
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-11T09:00:00.000Z",
    "service": "smart-ats-backend",
    "version": "0.1.0",
    "database": {
      "connected": true,
      "totalCount": 5,
      "idleCount": 4,
      "waitingCount": 0
    }
  }
  ```
- **Response `503 Service Unavailable`:** Returned when database pool fails health probe.

---

### 3.2 Authentication & User Sync
#### `POST /api/auth/sync`
Idempotently provisions or updates a PostgreSQL user record upon Firebase authentication.
- **Headers:** `Authorization: Bearer <idToken>`
- **Request Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "companyId": "00000000-0000-0000-0000-000000000001" // Optional UUID
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "user": {
      "id": "c1f2e3d4-...",
      "firebase_uid": "fb_uid_123",
      "email": "jane@example.com",
      "full_name": "Jane Doe",
      "role": "CANDIDATE",
      "company_id": null,
      "is_active": true,
      "created_at": "2026-11-11T09:00:00.000Z"
    }
  }
  ```

#### `GET /api/auth/me`
Retrieves the logged-in user profile from PostgreSQL based on token UID.
- **Headers:** `Authorization: Bearer <idToken>`
- **Response `200 OK`:** `{ "success": true, "user": { ... } }`
- **Response `401 Unauthorized`:** Token missing, expired, or invalid.
- **Response `403 Forbidden`:** User account deactivated in database (`is_active = false`).

---

### 3.3 Administration & User Management
#### `GET /api/admin/users`
Lists registered users with pagination, text search, and role filtering.
- **Headers:** `Authorization: Bearer <idToken>` (Admin required)
- **Query Parameters:**
  - `page`: Integer (default: 1)
  - `limit`: Integer (default: 20, max: 100)
  - `q`: Search keyword matching email or full name
  - `role`: Role filter (`ADMIN`, `HR`, `CANDIDATE`)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "users": [
      {
        "id": "usr-uuid-1",
        "firebase_uid": "seed-admin-001",
        "email": "admin@ats.local",
        "full_name": "Alex Admin",
        "role": "ADMIN",
        "company_id": "comp-uuid",
        "company_name": "Acme Corp",
        "is_active": true,
        "created_at": "2026-11-10T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

#### `PATCH /api/admin/users/:id/role`
Updates the RBAC role of a user and recalculates their Firebase Auth custom claims in real time.
- **Headers:** `Authorization: Bearer <idToken>` (Admin required)
- **Request Body:**
  ```json
  {
    "role": "HR" // Allowed: "ADMIN", "HR", "CANDIDATE"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "User role updated successfully",
    "user": { ... }
  }
  ```
- **Response `400 Bad Request`:** Invalid UUID format or illegal self-demotion attempted.

#### `PATCH /api/admin/users/:id/status`
Toggles user active state. Deactivation triggers immediate revocation of active refresh tokens via Firebase Admin SDK.
- **Headers:** `Authorization: Bearer <idToken>` (Admin required)
- **Request Body:**
  ```json
  {
    "isActive": false
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "User status updated successfully",
    "user": { ... }
  }
  ```

#### `GET /api/admin/company` & `PUT /api/admin/company`
Retrieves or updates corporate workspace configuration (name, domain, logo, and JSON settings).
- **Headers:** `Authorization: Bearer <idToken>` (Admin required)
- **Request Body (PUT):**
  ```json
  {
    "name": "Acme Corp Global",
    "domain": "acme.com",
    "logo_url": "https://cdn.example.com/logo.png",
    "settings": {
      "timezone": "UTC",
      "defaultCurrency": "USD",
      "autoScreening": true
    }
  }
  ```
- **Response `200 OK`:** `{ "success": true, "company": { ... } }`

---

## 4. Planned Tier 2 Endpoints Preview

- **`POST /api/jobs`:** Create job requisition (Draft / Published).
- **`GET /api/jobs`:** Public paginated job board search.
- **`POST /api/applications`:** Submit candidate application with resume attachment.
- **`PATCH /api/applications/:id/stage`:** Controlled Kanban stage transitions with audit notes.
- **`GET /api/resumes/:id/download`:** Streaming resume download with ownership validation.
