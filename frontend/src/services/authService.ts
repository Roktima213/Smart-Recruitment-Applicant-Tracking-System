import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from '../config/firebaseClient';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Normalizes Firebase Auth error codes into human-readable messages.
 */
export function formatAuthError(error: any): string {
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address format is invalid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account exists with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before finishing.';
    default:
      return error.message || 'Authentication error occurred. Please try again.';
  }
}

/**
 * Sign in existing user with email and password.
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(auth, email, pass);
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

/**
 * Register new user with email, password, and display name.
 */
export async function registerWithEmail(
  name: string,
  email: string,
  pass: string
): Promise<UserCredential> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user && name) {
      await updateProfile(cred.user, { displayName: name });
    }
    return cred;
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

/**
 * Sign in or sign up via Google OAuth popup.
 */
export async function loginWithGoogle(): Promise<UserCredential> {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

/**
 * Dispatches password reset email.
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

/**
 * Signs out current user.
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Retrieves the currently authenticated Firebase user or null.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
