import { type NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getWorkspace } from '@/lib/supabase/workspace';

/**
 * GET /api/auth/me
 * Profil et scrutins de l'utilisateur, en un seul appel RPC (get_user_workspace).
 * Utilisé pour les rafraîchissements côté client : au premier rendu, les mêmes
 * données sont déjà injectées par le layout serveur.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const user = await getAuthenticatedUser(accessToken);
    if (!user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const authUser = await getWorkspace(user);
    if (!authUser) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    return NextResponse.json(authUser);
  } catch (error) {
    console.error('[API /me] Unhandled Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
