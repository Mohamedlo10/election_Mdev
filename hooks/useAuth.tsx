'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthUser, UserRole, Voter } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authUser: AuthUser | null;
  loading: boolean;
  hasNoRole: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'esea_auth_user';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CachedUser {
  authUser: AuthUser;
  timestamp: number;
}

function getFromStorage(): CachedUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const cached: CachedUser = JSON.parse(stored);
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function saveToStorage(authUser: AuthUser) {
  if (typeof window === 'undefined') return;
  try {
    const cached: CachedUser = { authUser, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

function clearStorage() {
  if (typeof window === 'undefined') return;
  try {
    // Supprimer le cache utilisateur
    localStorage.removeItem(STORAGE_KEY);

    // Nettoyer les elements Supabase
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasNoRole, setHasNoRole] = useState(false);

  const supabase = createClient();

  const fetchUserRole = useCallback(async (): Promise<AuthUser | null> => {
    console.log('[Auth] Fetching role via API...');

    try {
      // Utiliser l'API route pour contourner les problèmes RLS
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      console.log('[Auth] API /me result:', { status: response.status, data });

      if (response.ok && data.role) {
        return {
          id: data.id,
          email: data.email,
          role: data.role as UserRole,
          instance_id: data.instance_id,
          voter: data.voter as Voter | undefined,
        };
      }

      if (data.noRole) {
        console.log('[Auth] No role found for user');
        return null;
      }

      console.log('[Auth] API error:', data.error);
      return null;
    } catch (error) {
      console.error('[Auth] Fetch error:', error);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser) {
      const userRole = await fetchUserRole();
      if (userRole) {
        setAuthUser(userRole);
        setHasNoRole(false);
        saveToStorage(userRole);
      } else {
        setAuthUser(null);
        setHasNoRole(true);
        clearStorage();
      }
    }
  }, [supabase, fetchUserRole]);

  useEffect(() => {
    // Obtenir la session actuelle
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Verifier le cache
        const cached = getFromStorage();
        const isCacheValid = cached &&
          cached.authUser.id === currentSession.user.id &&
          Date.now() - cached.timestamp < CACHE_DURATION;

        if (isCacheValid) {
          // Utiliser le cache directement
          console.log('[Auth] Using cached user data');
          setAuthUser(cached.authUser);
          setHasNoRole(false);
        } else {
          // Cache invalide ou expire, fetch depuis l'API
          const userRole = await fetchUserRole();
          if (userRole) {
            setAuthUser(userRole);
            setHasNoRole(false);
            saveToStorage(userRole);
          } else {
            // Utilisateur connecte mais sans role assigne
            setAuthUser(null);
            setHasNoRole(true);
            clearStorage();
          }
        }
      } else {
        setAuthUser(null);
        setHasNoRole(false);
        clearStorage();
      }

      setLoading(false);
    };

    getSession();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          const userRole = await fetchUserRole();
          if (userRole) {
            setAuthUser(userRole);
            setHasNoRole(false);
            saveToStorage(userRole);
          } else {
            setAuthUser(null);
            setHasNoRole(true);
            clearStorage();
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setHasNoRole(false);
          clearStorage();
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    clearStorage();
  };

  const value: AuthContextType = {
    user,
    session,
    authUser,
    loading,
    hasNoRole,
    signIn,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
