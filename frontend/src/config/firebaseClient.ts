import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';

/**
 * Firebase Client SDK Configuration
 * Supports both local offline emulator and cloud Firebase project.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key-for-emulator',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'smart-ats-dev.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'smart-ats-dev',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'smart-ats-dev.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
};

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth: Auth = getAuth(firebaseApp);

// Automatic local emulator connection in development
const useEmulator =
  import.meta.env.VITE_USE_FIREBASE_EMULATOR !== 'false' &&
  (import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true');

const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
const emulatorUrl = `http://${emulatorHost}`;

let emulatorConnected = false;

if (useEmulator && !emulatorConnected) {
  try {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    emulatorConnected = true;
    if (import.meta.env.DEV) {
      console.log(`[Firebase Client] Connected to Auth Emulator at ${emulatorUrl}`);
    }
  } catch (error: any) {
    // Prevent duplicate emulator connection warnings during HMR
    if (!error.message?.includes('has already been called')) {
      console.warn('[Firebase Client] Emulator connection warning:', error.message);
    }
  }
}

export function isEmulatorActive(): boolean {
  return emulatorConnected;
}
