import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken, Auth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Firebase Admin SDK Initialization
 * Automatically detects FIREBASE_AUTH_EMULATOR_HOST for offline testing
 * and falls back to Service Account JSON or applicationDefault() for cloud environments.
 */
const projectId = process.env.FIREBASE_PROJECT_ID || 'smart-ats-dev';
const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (emulatorHost) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHost;
}

let app: App;

if (getApps().length === 0) {
  if (emulatorHost) {
    // Emulator mode: No real private credentials needed
    app = initializeApp({
      projectId,
    });
    console.log(`[Firebase Admin] Initialized with Auth Emulator at ${emulatorHost}`);
  } else {
    // Production/Staging cloud mode
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : undefined;

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
      console.log('[Firebase Admin] Initialized with service account certificate');
    } else {
      app = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      console.log('[Firebase Admin] Initialized with application default credentials');
    }
  }
} else {
  app = getApps()[0]!;
}

export const firebaseAdminApp: App = app;
export const adminAuth: Auth = getAuth(app);

/**
 * Verifies a client Firebase ID token.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  return await adminAuth.verifyIdToken(idToken, true);
}

/**
 * Assigns custom user claims (e.g. role) to a Firebase user.
 */
export async function setCustomClaims(uid: string, claims: { role: string; [key: string]: any }): Promise<void> {
  await adminAuth.setCustomUserClaims(uid, claims);
}

/**
 * Returns whether the Auth Emulator is currently active.
 */
export function isAuthEmulatorEnabled(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
}
