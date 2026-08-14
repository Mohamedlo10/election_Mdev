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
const FETCH_TIMEOUT_MS = 6000; // 6 secondes max pour l'API

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
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialisation immédiate depuis le cache pour supprimer tout flash de chargement
  const cachedInitial = typeof window !== 'undefined' ? getFromStorage() : null;

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => cachedInitial?.authUser ?? null);
  const [loading, setLoading] = useState<boolean>(() => !cachedInitial);
  const [hasNoRole, setHasNoRole] = useState(false);
  const [adminInstances, setAdminInstances] = useState<UserInstanceSummary[]>(() => cachedInitial?.authUser.admin_instances ?? []);
  const [voterInstances, setVoterInstances] = useState<UserInstanceSummary[]>(() => cachedInitial?.authUser.voter_instances ?? []);
  const [hasMultipleContexts, setHasMultipleContexts] = useState<boolean>(() => cachedInitial?.authUser.has_multiple_contexts ?? false);

  const supabase = createClient();
  const isFetchingRef = useRef(false);

  const fetchUserRole = useCallback(async (): Promise<AuthUser | null> => {
    if (isFetchingRef.current) return null;
    isFetchingRef.current = true;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (currentSession?.access_token) {
        headers['Authorization'] = `Bearer ${currentSession.access_token}`;
      }

      const response = await fetchWithTimeout('/api/auth/me', { headers }, FETCH_TIMEOUT_MS);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();

      if (data && data.role) {
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
      console.warn('[Auth] fetchUserRole:', error);
      return null;
    } finally {
      isFetchingRef.current = false;
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
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

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
            if (!isMounted) return;
            if (userRole) {
              setAuthUser(userRole);
              setHasNoRole(false);
              saveToStorage(userRole);
            } else {
              setAuthUser(null);
              setHasNoRole(true);
            }
          }
        } else {
          setAuthUser(null);
          setHasNoRole(false);
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          // Vérifier si le cache actuel correspond déjà
          const cached = getFromStorage();
          if (cached && cached.authUser.id === newSession.user.id) {
            setAuthUser(cached.authUser);
            setAdminInstances(cached.authUser.admin_instances ?? []);
            setVoterInstances(cached.authUser.voter_instances ?? []);
            setHasMultipleContexts(cached.authUser.has_multiple_contexts ?? false);
            setHasNoRole(false);
            setLoading(false);
            return;
          }

          const userRole = await fetchUserRole();
          if (!isMounted) return;
          if (userRole) {
            setAuthUser(userRole);
            setHasNoRole(false);
            saveToStorage(userRole);
          } else {
            setAuthUser(null);
            setHasNoRole(true);
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setHasNoRole(false);
          clearStorage();
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
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
