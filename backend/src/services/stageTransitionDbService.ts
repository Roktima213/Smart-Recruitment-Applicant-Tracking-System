import { PoolClient } from 'pg';
import { getClient } from '../config/database';

export interface StageTransitionTelemetry {
  applicationId: string;
  fromStage: string;
  toStage: string;
  actorId: string;
  durationMs: number;
  lockAcquired: boolean;
  success: boolean;
  timestamp: string;
  error?: string;
}

export interface LockedApplicationRecord {
  id: string;
  job_id: string;
  candidate_id: string;
  current_stage: string;
  resume_id: string | null;
  cover_letter: string | null;
  answers: any;
  applied_at: string;
  updated_at: string;
  company_id: string;
  job_title: string;
}

export interface TransitionResult {
  application: {
    id: string;
    job_id: string;
    candidate_id: string;
    current_stage: string;
    updated_at: string;
  };
  history: {
    id: string;
    application_id: string;
    from_stage: string;
    to_stage: string;
    changed_by: string;
    reason: string;
    changed_at: string;
  };
  telemetry: StageTransitionTelemetry;
}

/**
 * SQL Query that acquires an exclusive row-level lock on the target application row.
 * Prevents concurrent race conditions when multiple HR managers update the same application.
 */
export const LOCK_APPLICATION_FOR_UPDATE_SQL = `
  SELECT 
    a.id,
    a.job_id,
    a.candidate_id,
    a.current_stage,
    a.resume_id,
    a.cover_letter,
    a.answers,
    a.applied_at,
    a.updated_at,
    j.company_id,
    j.title AS job_title
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE a.id = $1
  FOR UPDATE OF a;
`;

export const UPDATE_APPLICATION_STAGE_SQL = `
  UPDATE applications
  SET current_stage = $1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
  RETURNING id, job_id, candidate_id, current_stage, updated_at;
`;

export const INSERT_STAGE_AUDIT_LOG_SQL = `
  INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, reason)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id, application_id, from_stage, to_stage, changed_by, reason, changed_at;
`;

// In-memory telemetry log buffer for performance metrics and latency tracking
const telemetryBuffer: StageTransitionTelemetry[] = [];
const MAX_TELEMETRY_LOGS = 500;

/**
 * Records stage transition telemetry metrics.
 */
export function recordStageTransitionTelemetry(entry: StageTransitionTelemetry): void {
  telemetryBuffer.push(entry);
  if (telemetryBuffer.length > MAX_TELEMETRY_LOGS) {
    telemetryBuffer.shift();
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log(
      `[Stage Transition Telemetry] app=${entry.applicationId} ${entry.fromStage}->${entry.toStage} duration=${entry.durationMs}ms lockAcquired=${entry.lockAcquired} success=${entry.success}`
    );
  }
}

/**
 * Retrieves aggregate performance metrics for stage transition transactions.
 */
export function getStageTransitionStats(): {
  totalTransitions: number;
  successCount: number;
  failureCount: number;
  averageDurationMs: number;
  recentEntries: StageTransitionTelemetry[];
} {
  const total = telemetryBuffer.length;
  if (total === 0) {
    return {
      totalTransitions: 0,
      successCount: 0,
      failureCount: 0,
      averageDurationMs: 0,
      recentEntries: [],
    };
  }

  const successCount = telemetryBuffer.filter((e) => e.success).length;
  const failureCount = total - successCount;
  const totalDuration = telemetryBuffer.reduce((sum, e) => sum + e.durationMs, 0);

  return {
    totalTransitions: total,
    successCount,
    failureCount,
    averageDurationMs: Math.round((totalDuration / total) * 100) / 100,
    recentEntries: [...telemetryBuffer],
  };
}

/**
 * Clears telemetry stats (primarily for test resets).
 */
export function clearStageTransitionStats(): void {
  telemetryBuffer.length = 0;
}

/**
 * Executes an application stage transition inside an ACID transaction using row-level locking
 * with SELECT ... FOR UPDATE OF a.
 */
export async function executeStageTransitionWithLock(params: {
  applicationId: string;
  toStage: string;
  actorUserId: string;
  reason: string;
  validateTransition: (fromStage: string, toStage: string) => { valid: boolean; error?: string };
  providedClient?: PoolClient;
  actorRole?: string;
  actorCompanyId?: string | null;
}): Promise<TransitionResult> {
  const { applicationId, toStage, actorUserId, reason, validateTransition, providedClient, actorRole, actorCompanyId } = params;
  const startTime = Date.now();
  const client = providedClient || (await getClient());
  const shouldReleaseClient = !providedClient;
  let inTransaction = false;
  let lockAcquired = false;
  let currentFromStage = 'UNKNOWN';

  try {
    await client.query('BEGIN');
    inTransaction = true;

    // 1. Acquire exclusive row-level lock on the application record
    const lockResult = await client.query(LOCK_APPLICATION_FOR_UPDATE_SQL, [applicationId]);
    if (lockResult.rows.length === 0) {
      const err = new Error(`Application with ID ${applicationId} not found`);
      (err as any).statusCode = 404;
      throw err;
    }

    lockAcquired = true;
    const applicationRecord: LockedApplicationRecord = lockResult.rows[0];
    currentFromStage = applicationRecord.current_stage;

    // Multi-tenant check: HR user can only transition applications for jobs in their own company
    if (actorRole === 'HR') {
      if (!actorCompanyId || !applicationRecord.company_id || actorCompanyId !== applicationRecord.company_id) {
        const err = new Error('Forbidden: You are not authorized to transition applications belonging to another organization');
        (err as any).statusCode = 403;
        throw err;
      }
    }

    // 2. Validate stage transition state machine rules
    const validation = validateTransition(currentFromStage, toStage);
    if (!validation.valid) {
      const err = new Error(validation.error || `Illegal stage transition from ${currentFromStage} to ${toStage}`);
      (err as any).statusCode = 400;
      throw err;
    }

    // 3. Update application stage with new timestamp
    const updateResult = await client.query(UPDATE_APPLICATION_STAGE_SQL, [toStage, applicationId]);
    const updatedApplication = updateResult.rows[0];

    // 4. Insert immutable stage audit record
    const historyResult = await client.query(INSERT_STAGE_AUDIT_LOG_SQL, [
      applicationId,
      currentFromStage,
      toStage,
      actorUserId,
      reason,
    ]);
    const insertedHistory = historyResult.rows[0];

    await client.query('COMMIT');
    inTransaction = false;

    const durationMs = Date.now() - startTime;
    const telemetry: StageTransitionTelemetry = {
      applicationId,
      fromStage: currentFromStage,
      toStage,
      actorId: actorUserId,
      durationMs,
      lockAcquired: true,
      success: true,
      timestamp: new Date().toISOString(),
    };
    recordStageTransitionTelemetry(telemetry);

    return {
      application: updatedApplication,
      history: insertedHistory,
      telemetry,
    };
  } catch (error: any) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[Stage Transition Rollback Error]', rollbackErr);
      }
    }

    const durationMs = Date.now() - startTime;
    const telemetry: StageTransitionTelemetry = {
      applicationId,
      fromStage: currentFromStage,
      toStage,
      actorId: actorUserId,
      durationMs,
      lockAcquired,
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    };
    recordStageTransitionTelemetry(telemetry);

    throw error;
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
}
