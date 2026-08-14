import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';

/**
 * Échange le code PKCE contre une session ET garantit l'écriture des cookies
 * sur la réponse avant qu'elle ne soit renvoyée.
 *
 * Pourquoi ce sas est nécessaire :
 * `@supabase/ssr` n'écrit les cookies de session que depuis son listener
 * `onAuthStateChange` (via `applyServerStorage`). Or `auth-js` est le seul, dans
 * `_exchangeCodeForSession`, à différer l'émission de `SIGNED_IN` dans un
 * `setTimeout(..., 0)` — tous les autres flux (verifyOtp, signInWithPassword,
 * setSession…) l'attendent inline. Sans ce sas, `exchangeCodeForSession` résout
 * AVANT l'écriture des cookies : la redirection part sans session et
 * l'utilisateur est renvoyé sur /login.
 */
export async function exchangeCodeForSessionWithCookies(
  supabase: SupabaseClient,
  code: string,
  response: NextResponse
): Promise<{ error: { message: string } | null }> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return { error };
  }

  // 1. Laisser la boucle d'événements exécuter le `setTimeout(0)` d'auth-js :
  //    notre timer est programmé après le sien, donc il passe en second.
  await new Promise((resolve) => setTimeout(resolve, 0));

  // 2. Filet de sécurité si l'écriture n'a toujours pas eu lieu :
  //    `setSession` émet `SIGNED_IN` de façon synchrone (awaité inline),
  //    ce qui force `@supabase/ssr` à poser les cookies.
  if (response.cookies.getAll().length === 0 && data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  return { error: null };
}
