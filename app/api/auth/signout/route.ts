import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/signout
 * Déconnecte l'utilisateur côté serveur et supprime les cookies de session.
 * La révocation distante est bornée dans le temps : les cookies sont effacés
 * quoi qu'il arrive, pour qu'une déconnexion ne puisse jamais rester bloquée.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  try {
    const supabase = await createClient();
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (error) {
    console.warn('[api/auth/signout] révocation impossible:', error);
  }

  // Purge explicite : indépendante du succès de l'appel ci-dessus
  const cookieStore = await cookies();
  cookieStore.getAll().forEach(({ name }) => {
    if (name.startsWith('sb-')) {
      response.cookies.set(name, '', { path: '/', maxAge: 0 });
    }
  });

  return response;
}
