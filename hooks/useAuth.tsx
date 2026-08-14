'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthUser, UserRole, Voter, UserInstanceSummary } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authUser: AuthUser | null;
  loading: boolean;
  hasNoRole: boolean;
  adminInstances: UserInstanceSummary[];
  voterInstances: UserInstanceSummary[];
  hasMultipleContexts: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'esea_auth_user';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 8000; // 8 secondes max pour l'API

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ authUser, timestamp: Date.now() }));
  } catch { /* ignore */ }
}

function clearStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch { /* ignore */ }
}

/** Fetch avec timeout garanti */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasNoRole, setHasNoRole] = useState(false);
  const [adminInstances, setAdminInstances] = useState<UserInstanceSummary[]>([]);
  const [voterInstances, setVoterInstances] = useState<UserInstanceSummary[]>([]);
  const [hasMultipleContexts, setHasMultipleContexts] = useState(false);

  // Instance Supabase stable — ne recrée jamais une nouvelle référence
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const fetchUserRole = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { data: { session: currentSession } } = await supabaseRef.current.auth.getSession();
      const headers: Record<string, string> = {};
      if (currentSession?.access_token) {
        headers['Authorization'] = `Bearer ${currentSession.access_token}`;
      }

      const response = await fetchWithTimeout('/api/auth/me', { headers }, FETCH_TIMEOUT_MS);
      const data = await response.json();

      if (response.ok && data.role) {
        const authUserData: AuthUser = {
          id: data.id,
          email: data.email,
          role: data.role as UserRole,
          instance_id: data.instance_id,
          voter: data.voter as Voter | undefined,
          admin_instances: data.admin_instances ?? [],
          voter_instances: data.voter_instances ?? [],
          has_multiple_contexts: data.has_multiple_contexts ?? false,
          no_instance_yet: data.no_instance_yet ?? false,
        };

        setAdminInstances(data.admin_instances ?? []);
        setVoterInstances(data.voter_instances ?? []);
        setHasMultipleContexts(data.has_multiple_contexts ?? false);

        return authUserData;
      }

      return null;
    } catch (error) {
      console.error('[Auth] fetchUserRole error (timeout ou réseau):', error);
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUser = useCallback(async () => {
    clearStorage();
    const userRole = await fetchUserRole();
    if (userRole) {
      setAuthUser(userRole);
      setHasNoRole(false);
      saveToStorage(userRole);
    } else {
      setHasNoRole(true);
    }
  }, [fetchUserRole]);

  useEffect(() => {
    let cancelled = false;

    const getSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (cancelled) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const cached = getFromStorage();
          const isCacheValid = cached &&
            cached.authUser.id === currentSession.user.id &&
            Date.now() - cached.timestamp < CACHE_DURATION;

          if (isCacheValid) {
            setAuthUser(cached.authUser);
            setAdminInstances(cached.authUser.admin_instances ?? []);
            setVoterInstances(cached.authUser.voter_instances ?? []);
            setHasMultipleContexts(cached.authUser.has_multiple_contexts ?? false);
            setHasNoRole(false);
          } else {
            const userRole = await fetchUserRole();
            if (cancelled) return;
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
        } else {
          setAuthUser(null);
          setHasNoRole(false);
          clearStorage();
        }
      } catch (e) {
        console.error('[Auth] getSession error:', e);
      } finally {
        // ✅ setLoading(false) garanti quoi qu'il arrive
        if (!cancelled) setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (cancelled) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          try {
            clearStorage();
            const userRole = await fetchUserRole();
            if (cancelled) return;
            if (userRole) {
              setAuthUser(userRole);
              setHasNoRole(false);
              saveToStorage(userRole);
            } else {
              setAuthUser(null);
              setHasNoRole(true);
            }
          } catch (e) {
            console.error('[Auth] SIGNED_IN handler error:', e);
          } finally {
            // ✅ Toujours désactiver le loader, même si fetchUserRole échoue ou timeout
            if (!cancelled) setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setHasNoRole(false);
          clearStorage();
          if (!cancelled) setLoading(false);
        }
        // INITIAL_SESSION, TOKEN_REFRESHED etc. → pas d'action sur loading
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithGoogle = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setAdminInstances([]);
    setVoterInstances([]);
    clearStorage();
  };

  return (
    <AuthContext.Provider value={{
      user, session, authUser, loading, hasNoRole,
      adminInstances, voterInstances, hasMultipleContexts,
      signIn, signInWithGoogle, signOut, refreshUser,
    }}>
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
