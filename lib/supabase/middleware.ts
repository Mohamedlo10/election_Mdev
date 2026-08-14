import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timeout')), ms)
    ),
  ]);
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

  let user = null;
  if (hasSupabaseCookie) {
    try {
      const {
        data: { user: authUser },
      } = await withTimeout(supabase.auth.getUser(), 2500); // 2.5 secondes max
      user = authUser;
    } catch {
      user = null;
    }
  }

  // Si pas connecté et route protégée
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Si connecté et sur page login/register, rediriger vers dashboard
  if (user && (pathname === '/login' || pathname === '/register')) {
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
