import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { exchangeCodeForSessionWithCookies } from '@/lib/supabase/exchange-code';

/**
 * GET /auth/confirm
 * Route de confirmation d'email (et OAuth) avec attachement direct des cookies de session sur la redirection.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const targetUrl = new URL(next.startsWith('/') ? next : `/${next}`, origin);
  let response = NextResponse.redirect(targetUrl);

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

  // 1. Vérification par token_hash (email signup / magic link / recovery)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return response;
    }
    console.error('[auth/confirm] verifyOtp error:', error);
  }

  // 2. Vérification par code PKCE (OAuth Google)
  if (code) {
    const { error } = await exchangeCodeForSessionWithCookies(supabase, code, response);
    if (!error) {
      return response;
    }
    console.error('[auth/confirm] exchangeCode error:', error);
  }

  // 3. Si la session est déjà présente
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return response;
  }

  // Si échec
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'Le lien de confirmation est invalide ou a expiré.');
  return NextResponse.redirect(loginUrl);
}
