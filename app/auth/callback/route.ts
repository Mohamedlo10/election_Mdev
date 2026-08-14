import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { exchangeCodeForSessionWithCookies } from '@/lib/supabase/exchange-code';

/**
 * Origine réelle de la requête.
 * Derrière un proxy (Vercel, Nginx…), `request.url` peut contenir le host interne :
 * on privilégie donc les en-têtes forwardés. On n'utilise jamais NEXT_PUBLIC_APP_URL
 * ici, sinon le développement local redirigerait vers la production.
 */
function getOrigin(request: NextRequest, fallbackOrigin: string): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    return `${proto}://${forwardedHost}`;
  }
  return fallbackOrigin;
}

function redirectToLogin(origin: string, message: string) {
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', message);
  return NextResponse.redirect(loginUrl);
}

/**
 * GET /auth/callback
 * Route de callback OAuth : échange le code PKCE contre une session Supabase
 * et attache les cookies de session sur la redirection.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const origin = getOrigin(request, requestOrigin);

  const code = searchParams.get('code');
  const providerError = searchParams.get('error');
  const providerErrorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/dashboard';

  // 1. Le fournisseur (Google) a refusé ou l'utilisateur a annulé
  if (providerError) {
    console.error('[auth/callback] provider error:', providerError, providerErrorDescription);
    return redirectToLogin(
      origin,
      providerErrorDescription || 'Connexion Google annulée ou refusée.'
    );
  }

  const targetUrl = new URL(next.startsWith('/') ? next : `/${next}`, origin);
  const response = NextResponse.redirect(targetUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const debug = process.env.NODE_ENV !== 'production';
  if (debug) {
    console.log('[auth/callback] IN', {
      url: request.url,
      hasCode: Boolean(code),
      next,
      cookies: request.cookies.getAll().map((c) => c.name),
    });
  }

  // 2. Échange du code PKCE contre une session
  if (code) {
    const { error } = await exchangeCodeForSessionWithCookies(supabase, code, response);
    if (!error) {
      if (debug) {
        console.log('[auth/callback] OK', {
          setCookies: response.cookies.getAll().map((c) => c.name),
          redirectTo: targetUrl.toString(),
        });
      }
      return response;
    }
    console.error('[auth/callback] exchangeCode error:', error.message, error);

    // Le code a pu déjà être consommé (double appel, refresh de la page) :
    // si une session valide existe malgré tout, on laisse passer.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return response;
    }

    return redirectToLogin(
      origin,
      `Erreur lors de la connexion avec Google : ${error.message}`
    );
  }

  // 3. Aucun code : session déjà établie ?
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return response;
  }

  console.error('[auth/callback] aucun code ni session dans la requête:', request.url);
  return redirectToLogin(origin, 'Erreur lors de la connexion avec Google.');
}
