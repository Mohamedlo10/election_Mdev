import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /auth/callback
 * Route de callback OAuth pour échanger le code contre une session Supabase et attacher les cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const targetUrl = new URL(next.startsWith('/') ? next : `/${next}`, origin);
  let response = NextResponse.redirect(targetUrl);

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error('[auth/callback] exchangeCode error:', error);
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'Erreur lors de la connexion avec Google.');
  return NextResponse.redirect(loginUrl);
}
