import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const TIMEOUT_MESSAGE = 'Supabase request timeout';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(TIMEOUT_MESSAGE)), ms)
    ),
  ]);
}

const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

/** Décodage base64url compatible runtime Edge (pas de Buffer). */
function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/**
 * Expiration de la session lue directement dans le cookie (aucun appel réseau).
 * Renvoie null si le cookie est absent ou illisible : on retombe alors sur une
 * vérification complète auprès de Supabase.
 */
function readSessionExpiry(cookies: { name: string; value: string }[]): number | null {
  const chunks = cookies
    .filter((c) => SESSION_COOKIE.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (chunks.length === 0) return null;

  try {
    const raw = chunks.map((c) => c.value).join('');
    const json = raw.startsWith('base64-') ? decodeBase64Url(raw.slice(7)) : raw;
    const expiresAt = JSON.parse(json)?.expires_at;
    return typeof expiresAt === 'number' ? expiresAt : null;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // Filet de sécurité OAuth : si Supabase renvoie le `code` PKCE sur une autre page
  // que /auth/callback (cas classique quand la Redirect URL n'est pas whitelistée
  // et que Supabase retombe sur la Site URL), on le réachemine vers le callback.
  if (!pathname.startsWith('/auth/')) {
    const oauthCode = request.nextUrl.searchParams.get('code');
    // `error_code` / `error_description` = erreur renvoyée par Supabase/Google.
    // On ne teste pas `error` seul : /login?error=... est notre propre message (boucle).
    const oauthError =
      pathname !== '/login' &&
      (request.nextUrl.searchParams.has('error_code') ||
        request.nextUrl.searchParams.has('error_description'));

    if (oauthCode || oauthError) {
      const callbackUrl = request.nextUrl.clone();
      callbackUrl.pathname = '/auth/callback';
      // On repart vers le dashboard depuis les pages d'entrée, sinon on reste sur place
      const isEntryPage = pathname === '/' || pathname === '/login' || pathname === '/register';
      callbackUrl.searchParams.set('next', isEntryPage ? '/dashboard' : pathname);
      return NextResponse.redirect(callbackUrl);
    }
  }

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/');

  // Détection rapide des cookies de session Supabase
  const allCookies = request.cookies.getAll();
  const hasSupabaseCookie = allCookies.some(c => c.name.startsWith('sb-') || c.name.includes('auth-token'));

  // Optimisation de vitesse : si route publique sans cookies d'auth, passer immédiatement sans requête réseau
  if (isPublicRoute && !hasSupabaseCookie && pathname !== '/login' && pathname !== '/register') {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let isAuthenticated = false;
  // La vérification réseau a échoué (timeout, Supabase injoignable) : on ne peut pas
  // en conclure que l'utilisateur est déconnecté.
  let authCheckFailed = false;

  const expiresAt = readSessionExpiry(allCookies);
  const secondsLeft = expiresAt === null ? null : expiresAt - Date.now() / 1000;

  if (secondsLeft !== null && secondsLeft > 60) {
    // Token encore valide : aucun appel réseau. Le middleware ne fait que de
    // l'aiguillage ; l'autorisation réelle est revérifiée côté serveur
    // (root layout, routes API) et par les politiques RLS.
    isAuthenticated = true;
  } else if (hasSupabaseCookie) {
    // Token absent, expiré ou illisible : vérification complète, qui déclenche
    // au passage le rafraîchissement et la réécriture des cookies.
    try {
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), 2500); // 2.5 secondes max
      isAuthenticated = Boolean(user);
    } catch (e) {
      // Seul un timeout réseau justifie de laisser passer : une erreur d'auth
      // (cookie corrompu, token révoqué) doit bien mener à /login.
      authCheckFailed = e instanceof Error && e.message === TIMEOUT_MESSAGE;
    }
  }

  // Session probablement valide mais non vérifiable : on laisse passer,
  // le garde-fou côté client (DashboardLayout) prendra le relais.
  if (authCheckFailed && !isPublicRoute) {
    return supabaseResponse;
  }

  // Si pas connecté et route protégée
  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Si connecté et sur page login/register, rediriger vers dashboard
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
