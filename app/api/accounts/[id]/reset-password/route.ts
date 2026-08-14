import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail } from '@/lib/services/email.service';

// Client admin pour contourner RLS
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

// Générer un code à 6 chiffres
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/accounts/[id]/reset-password
 * Réinitialiser le mot de passe d'un compte utilisateur.
 * [id] peut être soit le user_id de l'utilisateur, soit un ID de users_roles.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: roleData } = await adminClient
      .from('users_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer la liste des utilisateurs pour trouver la cible
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des utilisateurs' }, { status: 500 });
    }

    // 1. Chercher si id est directement un user_id
    let targetUser = users.find((u) => u.id === id);
    let targetUserId = targetUser?.id;

    // 2. Si non trouvé directement, chercher dans users_roles
    if (!targetUser) {
      const { data: roleRow } = await adminClient
        .from('users_roles')
        .select('user_id, email')
        .eq('id', id)
        .maybeSingle();

      if (roleRow?.user_id) {
        targetUserId = roleRow.user_id;
        targetUser = users.find((u) => u.id === roleRow.user_id);
      } else if (roleRow?.email) {
        targetUser = users.find((u) => u.email?.toLowerCase() === roleRow.email.toLowerCase());
        targetUserId = targetUser?.id;
      }
    }

    if (!targetUser || !targetUser.email || !targetUserId) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Générer un nouveau mot de passe temporaire
    const newPassword = generateCode();

    // Mettre à jour le mot de passe
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du mot de passe' }, { status: 500 });
    }

    // Envoyer l'email avec le nouveau mot de passe
    const emailResult = await sendPasswordResetEmail(
      targetUser.email,
      newPassword,
      'admin'
    );

    if (!emailResult.success) {
      console.error('Email error:', emailResult.error);
      return NextResponse.json({
        success: true,
        warning: "Mot de passe réinitialisé mais l'email n'a pas pu être envoyé",
        newPassword: newPassword,
      });
    }

    return NextResponse.json({
      success: true,
      newPassword: newPassword,
      message: 'Mot de passe réinitialisé et email envoyé avec succès.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
