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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'esea_auth_user';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchUserRole = useCallback(async (userId: string, email: string): Promise<AuthUser | null> => {
    // Vérifier d'abord dans users_roles
    const { data: roleData } = await supabase
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', userId)
      .single();

    if (roleData) {
      return {
        id: userId,
        email,
        role: roleData.role as UserRole,
        instance_id: roleData.instance_id,
      };
    }

    // Sinon vérifier si c'est un votant
    const { data: voterData } = await supabase
      .from('voters')
      .select('*')
      .eq('auth_uid', userId)
      .single();

    if (voterData) {
      return {
        id: userId,
        email,
        role: 'voter' as UserRole,
        instance_id: voterData.instance_id,
        voter: voterData as Voter,
      };
    }

    return null;
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser) {
      const userRole = await fetchUserRole(currentUser.id, currentUser.email || '');
      if (userRole) {
        setAuthUser(userRole);
        saveToStorage(userRole);
      }
    }
  }, [supabase, fetchUserRole]);

  useEffect(() => {
    // Essayer de charger depuis le cache d'abord
    const cached = getFromStorage();
    if (cached) {
      setAuthUser(cached.authUser);
    }

    // Obtenir la session actuelle
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Si pas de cache ou cache expiré, fetch depuis la BD
        if (!cached || Date.now() - cached.timestamp > CACHE_DURATION) {
          const userRole = await fetchUserRole(
            currentSession.user.id,
            currentSession.user.email || ''
          );
          if (userRole) {
            setAuthUser(userRole);
            saveToStorage(userRole);
          }
        }
      } else {
        setAuthUser(null);
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
          const userRole = await fetchUserRole(
            newSession.user.id,
            newSession.user.email || ''
          );
          if (userRole) {
            setAuthUser(userRole);
            saveToStorage(userRole);
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
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
