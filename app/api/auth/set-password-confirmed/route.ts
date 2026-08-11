import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Client admin pour bypass RLS
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * POST /api/auth/set-password-confirmed
 *
 * Appelé après que l'utilisateur a défini son mot de passe permanent
 * via /reset-password. Met à jour password_set_at dans la table voters.
 *
 * Authentification : requiert une session valide (appelé après updateUser)
 * Corps : vide (l'identité est déduite de la session)
 */
export async function POST() {
  try {
    // Récupérer l'utilisateur authentifié depuis la session courante
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Mettre à jour password_set_at pour tous les enregistrements voters de cet utilisateur
    // (un utilisateur peut être votant sur plusieurs instances)
    const { data: updateData, error: updateError } = await adminClient
      .from('voters')
      .update({ password_set_at: new Date().toISOString() })
      .eq('auth_uid', user.id)
      .is('password_set_at', null) // Ne mettre à jour que si pas encore défini
      .select('id, instance_id');

    if (updateError) {
      console.error('[set-password-confirmed] Update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du statut' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated_count: updateData?.length ?? 0,
    });

  } catch (error) {
    console.error('[set-password-confirmed] Error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
