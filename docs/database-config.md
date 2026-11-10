# PostgreSQL Configuration & Connection Pooling Guide
**Project Floor 2 (Day 2) — Cloud Engineering Architecture**

This guide documents the database connection parameters, connection pooling recommendations, environment templates, and secrets handling for the **Smart Recruitment & Applicant Tracking System (ATS)** across local and cloud environments.

---

## 1. Connection Parameters & Sizing

The backend application utilizes the Node.js `pg` (node-postgres) driver with a pooled architecture.

| Parameter | Default (Local Docker) | Production Recommendation | Description |
| :--- | :--- | :--- | :--- |
| `DB_HOST` | `localhost` | Managed DB Host (e.g. AWS RDS, Neon) | Database host address |
| `DB_PORT` | `5432` | `5432` | Database port |
| `DB_NAME` | `smart_ats_db` | `smart_ats_production` | Target database name |
| `DB_USER` | `postgres` | App-specific user (e.g. `ats_app_user`) | Restricted application role |
| `DB_PASSWORD` | `postgres` | High-entropy generated secret | Encrypted secret |
| `DB_POOL_MIN` | `2` | `4` | Minimum warm idle connections in pool |
| `DB_POOL_MAX` | `10` | `20` (scaled to server concurrency) | Maximum concurrent active connections |
| `DB_CONNECTION_TIMEOUT_MS` | `5000` | `10000` | Timeout before rejecting query on pool exhaustion |
| `DB_IDLE_TIMEOUT_MS` | `30000` | `30000` | Milliseconds before an idle client is closed |
| `DB_SSL` | `false` | `true` (`rejectUnauthorized: true` with CA) | Require TLS encryption |

---

## 2. Environment Templates

### Local Docker Environment (`.env.local` or `.env`)
```bash
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_ats_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_CONNECTION_TIMEOUT_MS=5000
DB_IDLE_TIMEOUT_MS=30000
DB_SSL=false
```

### Cloud Production Environment (Render, Railway, AWS, Neon)
In cloud environments, provide either individual parameters or a secure `DATABASE_URL` connection string:
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://ats_app_user:${SECRET_DB_PASSWORD}@db.region.rds.amazonaws.com:5432/smart_ats_production?sslmode=require
DB_POOL_MIN=4
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT_MS=10000
DB_IDLE_TIMEOUT_MS=30000
DB_SSL=true
```

---

## 3. Secret Management Rules

1. **Zero Secrets in Git:** Never commit `.env` or files containing live credentials.
2. **Environment Injections:** In production, secrets are injected through runtime environment variables or secret vaults (e.g. AWS Secrets Manager, Doppler, GCP Secret Manager).
3. **Database Least Privilege:** The application user must only have `SELECT, INSERT, UPDATE, DELETE` permissions on public schema tables, with DDL migrations executed by an administrative migration user in CI/CD.
