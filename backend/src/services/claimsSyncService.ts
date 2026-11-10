import { adminAuth, setCustomClaims } from '../config/firebaseAdmin';

export const VALID_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR_MANAGER',
  'RECRUITER',
  'INTERVIEWER',
  'CANDIDATE',
] as const;

export type AtsRole = (typeof VALID_ROLES)[number];

export interface CustomUserClaims {
  role: AtsRole;
  companyId?: string | null;
  syncedAt: number;
  [key: string]: unknown;
}

/**
 * Validates whether a provided string is an ATS system role.
 */
export function isValidAtsRole(role: string): role is AtsRole {
  return VALID_ROLES.includes(role as AtsRole);
}

/**
 * Synchronizes ATS custom claims with Firebase Authentication for a given user.
 * Custom claims allow instantaneous client and server RBAC verification without DB round-trips.
 */
export async function syncUserClaims(
  uid: string,
  role: string,
  companyId?: string | null
): Promise<{ success: boolean; claims: CustomUserClaims }> {
  if (!uid || typeof uid !== 'string') {
    throw new Error('A valid Firebase UID is required to set custom claims');
  }

  const normalizedRole = role.toUpperCase();
  if (!isValidAtsRole(normalizedRole)) {
    throw new Error(`Invalid role: "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const claims: CustomUserClaims = {
    role: normalizedRole,
    companyId: companyId || null,
    syncedAt: Date.now(),
  };

  await setCustomClaims(uid, claims);

  return {
    success: true,
    claims,
  };
}

/**
 * Retrieves the current custom claims for a given user from Firebase Auth.
 */
export async function getUserClaims(uid: string): Promise<Record<string, unknown>> {
  const user = await adminAuth.getUser(uid);
  return (user.customClaims as Record<string, unknown>) || {};
}

/**
 * Revokes refresh tokens for a user when permissions or roles change drastically.
 */
export async function revokeUserSessions(uid: string): Promise<void> {
  await adminAuth.revokeRefreshTokens(uid);
}
