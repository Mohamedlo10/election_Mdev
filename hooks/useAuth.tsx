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
  signInWithGoogle: (next?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FETCH_TIMEOUT_MS = 6000; // 6 secondes max pour /api/auth/me
const SAFETY_TIMEOUT_MS = 4000; // ne jamais rester bloqué sur l'écran de chargement
const LEGACY_STORAGE_KEY = 'esea_auth_user';

/**
 * Purge du stockage local.
 * Le profil n'est plus mis en cache ici : il est injecté par le serveur au
 * chargement et conservé en mémoire ensuite. On nettoie donc uniquement les
 * reliquats de l'ancienne version et les clés Supabase orphelines.
 */
function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch { /* ignore */ }
}

/**
 * Suppression des cookies de session côté navigateur.
 * Indispensable à la déconnexion : si `supabase.auth.signOut()` traîne ou échoue,
 * les cookies subsistent et le serveur nous renverrait aussitôt sur le dashboard.
 */
function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !name.startsWith('sb-')) return;
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`;
  });
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

export function AuthProvider({
  children,
  initialUser = null,
  initialAuthUser = null,
}: {
  children: ReactNode;
  /** Session résolue côté serveur (root layout) : évite tout aller-retour au premier rendu */
  initialUser?: User | null;
  initialAuthUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(initialAuthUser);
  const [loading, setLoading] = useState<boolean>(!initialUser);
  const [hasNoRole, setHasNoRole] = useState(false);
  const [adminInstances, setAdminInstances] = useState<UserInstanceSummary[]>(initialAuthUser?.admin_instances ?? []);
  const [voterInstances, setVoterInstances] = useState<UserInstanceSummary[]>(initialAuthUser?.voter_instances ?? []);
  const [hasMultipleContexts, setHasMultipleContexts] = useState<boolean>(initialAuthUser?.has_multiple_contexts ?? false);

  const supabase = createClient();
  const sessionRef = useRef<Session | null>(null);
  const authUserRef = useRef<AuthUser | null>(initialAuthUser);
  const inFlightRef = useRef<Promise<AuthUser | null> | null>(null);

  const applyAuthUser = useCallback((next: AuthUser | null) => {
    authUserRef.current = next;
    setAuthUser(next);
    setAdminInstances(next?.admin_instances ?? []);
    setVoterInstances(next?.voter_instances ?? []);
    setHasMultipleContexts(next?.has_multiple_contexts ?? false);
  }, []);

  /**
   * Récupère le profil auprès de /api/auth/me.
   *
   * Aucun appel à `supabase.auth` ici : chaque méthode du client d'auth prend le
   * verrou `navigator.locks` partagé, celui-là même par lequel passe le token de
   * toutes les requêtes PostgREST. Le jeton est lu dans la session déjà reçue par
   * l'écouteur d'événements ; à défaut, la route lit les cookies.
   *
   * Les appels concurrents partagent la même requête : renvoyer `null` au second
   * appelant effaçait le profil et figeait l'écran.
   */
  const fetchProfile = useCallback(async (): Promise<AuthUser | null> => {
    if (inFlightRef.current) return inFlightRef.current;

    const request = (async (): Promise<AuthUser | null> => {
      try {
        const headers: Record<string, string> = {};
        const token = sessionRef.current?.access_token;
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetchWithTimeout('/api/auth/me', { headers }, FETCH_TIMEOUT_MS);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data?.role) return null;

        return {
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
      } catch (error) {
        console.warn('[Auth] chargement du profil:', error);
        return null;
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = request;
    return request;
  }, []);

  const loadProfile = useCallback(async () => {
    const profile = await fetchProfile();
    applyAuthUser(profile);
    setHasNoRole(profile === null);
    setLoading(false);
  }, [fetchProfile, applyAuthUser]);

  const refreshUser = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let isMounted = true;

    // Filet de sécurité : si aucun événement d'auth n'arrive, on ne reste pas
    // bloqué indéfiniment sur l'écran de chargement.
    const safety = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, SAFETY_TIMEOUT_MS);

    // `INITIAL_SESSION` est émis dès l'abonnement : inutile d'appeler getSession()
    // au montage, ce qui économise une prise de verrou supplémentaire.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      sessionRef.current = newSession;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_OUT' || !newSession?.user) {
        applyAuthUser(null);
        setHasNoRole(false);
        setLoading(false);
        return;
      }

      // Profil déjà chargé pour cet utilisateur (injection serveur ou état en
      // mémoire) : rien à refaire, notamment sur TOKEN_REFRESHED.
      if (authUserRef.current?.id === newSession.user.id) {
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Profil pas encore connu : on affiche l'écran de chargement plutôt que
        // l'état intermédiaire « session sans profil ».
        setLoading(true);
        // ⚠️ Ce callback s'exécute AVEC le verrou d'authentification tenu
        // (_notifyAllSubscribers est appelé depuis _acquireLock, qui draine la
        // file d'attente avant de relâcher). Un appel réseau ici gèle toutes les
        // requêtes de l'application, puisque chaque requête PostgREST résout son
        // token via getSession() — donc via ce même verrou. On diffère d'un tick
        // pour être hors du verrou avant de charger le profil.
        setTimeout(() => {
          if (isMounted) void loadProfile();
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [supabase, applyAuthUser, loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithGoogle = async (next: string = '/dashboard') => {
    // Toujours revenir sur l'origine courante (localhost en dev, domaine en prod)
    const origin = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || '');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  /**
   * Déconnexion garantie sans dépendance au réseau.
   * `supabase.auth.signOut()` peut rester en attente indéfiniment (verrou
   * navigator.locks partagé entre onglets, token expiré, POST /logout sans
   * timeout) : on vide donc l'état local d'abord, et la révocation distante est
   * bornée dans le temps. Cette fonction résout toujours.
   */
  const signOut = async () => {
    // 1. État local et stockage vidés immédiatement
    applyAuthUser(null);
    setUser(null);
    setSession(null);
    setHasNoRole(false);
    sessionRef.current = null;
    clearStoredAuth();
    clearAuthCookies();

    // 2. Révocation distante + purge des cookies serveur, sans jamais bloquer
    await Promise.race([
      Promise.allSettled([
        supabase.auth.signOut({ scope: 'global' }),
        fetch('/api/auth/signout', { method: 'POST' }),
      ]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);

    // 3. Les cookies ont pu être réécrits par un rafraîchissement concurrent
    clearAuthCookies();
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
