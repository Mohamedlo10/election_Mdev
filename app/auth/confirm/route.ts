import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/confirm
 * Route de confirmation d'email appelée lors du clic sur le lien d'activation envoyé par mail.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');
  redirectTo.searchParams.delete('code');

  const supabase = await createClient();

  // 1. Vérifier via token_hash (magic link / signup)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      redirectTo.searchParams.set('confirmed', 'true');
      return NextResponse.redirect(redirectTo);
    }
  }

  // 2. Vérifier via code PKCE
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirectTo.searchParams.set('confirmed', 'true');
      return NextResponse.redirect(redirectTo);
    }
  }

  // 3. Si la session Supabase est déjà valide et l'email confirmé
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.email_confirmed_at) {
    redirectTo.searchParams.set('confirmed', 'true');
    return NextResponse.redirect(redirectTo);
  }

  // Si échec ou lien expiré
  redirectTo.pathname = '/login';
  redirectTo.searchParams.set('error', 'Le lien de confirmation est invalide ou a expiré.');
  return NextResponse.redirect(redirectTo);
}
