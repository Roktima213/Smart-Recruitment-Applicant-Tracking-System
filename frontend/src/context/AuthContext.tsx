import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseClient';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutUser,
} from '../services/authService';
import { syncUserWithBackend, fetchCurrentUserProfile } from '../services/apiClient';

export interface DbUserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'HR' | 'CANDIDATE';
  company_id?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  dbUser: DbUserProfile | null;
  role: string;
  loading: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, fullName: string, role?: string) => Promise<void>;
  signInWithGoogle: (role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const syncProfile = async (firebaseUser: User, extraData?: { fullName?: string; role?: string }) => {
    try {
      const syncResult = await syncUserWithBackend({
        fullName: extraData?.fullName || firebaseUser.displayName || undefined,
        role: extraData?.role || undefined,
        avatarUrl: firebaseUser.photoURL || undefined,
      });

      if (syncResult?.user) {
        setDbUser(syncResult.user);
      }
    } catch (syncErr: any) {
      console.warn('[AuthProvider] Sync warning:', syncErr.message);
      // Attempt fallback fetch
      try {
        const fetched = await fetchCurrentUserProfile();
        if (fetched?.user) {
          setDbUser(fetched.user);
        }
      } catch {
        // Fallback simulated local user profile
        setDbUser({
          id: firebaseUser.uid,
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          full_name: firebaseUser.displayName || 'ATS User',
          role: (extraData?.role as any) || 'CANDIDATE',
          company_id: null,
          avatar_url: firebaseUser.photoURL || null,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncProfile(currentUser);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const cred = await loginWithEmail(email, pass);
      await syncProfile(cred.user);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    pass: string,
    fullName: string,
    role?: string
  ): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const cred = await registerWithEmail(fullName, email, pass);
      await syncProfile(cred.user, { fullName, role });
    } catch (err: any) {
      setError(err.message || 'Failed to register account');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (role?: string): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const cred = await loginWithGoogle();
      await syncProfile(cred.user, { role });
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setDbUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (auth.currentUser) {
      await syncProfile(auth.currentUser);
    }
  };

  const role = dbUser?.role || 'CANDIDATE';

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        role,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
