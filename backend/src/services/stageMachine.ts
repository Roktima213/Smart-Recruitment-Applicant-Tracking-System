export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'OFFERED'
  | 'REJECTED';

export const ALL_APPLICATION_STAGES: readonly ApplicationStage[] = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'SELECTED',
  'OFFERED',
  'REJECTED',
] as const;

/**
 * Strict Recruitment Pipeline State Machine Transition Graph
 *
 * Rules:
 * - APPLIED can advance to SCREENING or be REJECTED
 * - SCREENING can advance to INTERVIEW or be REJECTED
 * - INTERVIEW can advance to SELECTED or be REJECTED
 * - SELECTED can advance to OFFERED or be REJECTED
 * - OFFERED can be REJECTED (e.g. candidate declined offer or offer revoked)
 * - REJECTED is a terminal state. Once rejected, an application cannot transition to any other stage.
 * - Stage skipping (e.g. APPLIED -> OFFERED) is strictly prohibited.
 */
export const ALLOWED_STAGE_TRANSITIONS: Record<ApplicationStage, readonly ApplicationStage[]> = {
  APPLIED: ['SCREENING', 'REJECTED'],
  SCREENING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['SELECTED', 'REJECTED'],
  SELECTED: ['OFFERED', 'REJECTED'],
  OFFERED: ['REJECTED'],
  REJECTED: [], // Terminal stage: No transitions permitted
};

export interface StageValidationResult {
  valid: boolean;
  error?: string;
  fromStage: ApplicationStage;
  toStage: ApplicationStage;
}

/**
 * Validates whether a proposed stage transition is permitted by the state machine.
 */
export function validateStageTransition(
  rawFromStage: string | undefined | null,
  rawToStage: string | undefined | null,
  reason?: string | null
): StageValidationResult {
  const fromStage = (rawFromStage || '').toUpperCase() as ApplicationStage;
  const toStage = (rawToStage || '').toUpperCase() as ApplicationStage;

  if (!ALL_APPLICATION_STAGES.includes(fromStage)) {
    return {
      valid: false,
      error: `Invalid current stage '${rawFromStage}'. Must be one of: ${ALL_APPLICATION_STAGES.join(', ')}`,
      fromStage,
      toStage,
    };
  }

  if (!ALL_APPLICATION_STAGES.includes(toStage)) {
    return {
      valid: false,
      error: `Invalid target stage '${rawToStage}'. Must be one of: ${ALL_APPLICATION_STAGES.join(', ')}`,
      fromStage,
      toStage,
    };
  }

  if (fromStage === toStage) {
    return {
      valid: false,
      error: `Application is already in stage '${fromStage}'. Same-stage transitions are redundant and not permitted.`,
      fromStage,
      toStage,
    };
  }

  if (fromStage === 'REJECTED') {
    return {
      valid: false,
      error: `Application is in terminal 'REJECTED' stage. Closed applications cannot be transitioned to '${toStage}'.`,
      fromStage,
      toStage,
    };
  }

  const allowedTargets = ALLOWED_STAGE_TRANSITIONS[fromStage] || [];
  if (!allowedTargets.includes(toStage)) {
    return {
      valid: false,
      error: `Illegal stage transition from '${fromStage}' to '${toStage}'. Allowed target stages: ${
        allowedTargets.length > 0 ? allowedTargets.join(', ') : 'none (terminal stage)'
      }. Stage skipping is prohibited.`,
      fromStage,
      toStage,
    };
  }

  // Validate mandatory audit reason
  const trimmedReason = (reason || '').trim();
  if (!trimmedReason || trimmedReason.length < 3) {
    return {
      valid: false,
      error: 'A transition reason of at least 3 characters is required for audit trail tracking.',
      fromStage,
      toStage,
    };
  }

  return {
    valid: true,
    fromStage,
    toStage,
  };
}
