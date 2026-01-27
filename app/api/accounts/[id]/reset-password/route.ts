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

// Generer un code a 6 chiffres
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST - Reinitialiser le mot de passe d'un compte (admin/observer)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verifier que l'utilisateur est super_admin
    const { data: roleData } = await adminClient
      .from('users_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    // Recuperer les infos du compte a modifier
    const { data: accountRole } = await adminClient
      .from('users_roles')
      .select('role, user_id, instance_id')
      .eq('id', id)
      .single();

    if (!accountRole) {
      return NextResponse.json({ error: 'Compte non trouve' }, { status: 404 });
    }

    if (accountRole.role === 'super_admin') {
      return NextResponse.json({ error: 'Impossible de reinitialiser le mot de passe d\'un super admin via cette methode' }, { status: 403 });
    }

    if (accountRole.role === 'voter') {
      return NextResponse.json({ error: 'Utilisez la gestion des electeurs pour reinitialiser le mot de passe d\'un votant' }, { status: 400 });
    }

    // Recuperer l'email de l'utilisateur
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ error: 'Erreur lors de la recuperation des utilisateurs' }, { status: 500 });
    }

    const targetUser = users.find(u => u.id === accountRole.user_id);
    if (!targetUser || !targetUser.email) {
      return NextResponse.json({ error: 'Utilisateur non trouve' }, { status: 404 });
    }

    // Generer un nouveau code a 6 chiffres
    const newPassword = generateCode();

    // Mettre a jour le mot de passe via l'API admin Supabase
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      accountRole.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise a jour du mot de passe' }, { status: 500 });
    }

    // Recuperer le nom de l'instance si applicable
    let instanceName: string | undefined;
    if (accountRole.instance_id) {
      const { data: instance } = await adminClient
        .from('election_instances')
        .select('name')
        .eq('id', accountRole.instance_id)
        .single();
      instanceName = instance?.name;
    }

    // Envoyer l'email avec le nouveau mot de passe
    const emailResult = await sendPasswordResetEmail(
      targetUser.email,
      newPassword,
      accountRole.role as 'admin' | 'observer',
      instanceName
    );

    if (!emailResult.success) {
      console.error('Email error:', emailResult.error);
      // Le mot de passe a ete change mais l'email n'a pas pu etre envoye
      return NextResponse.json({
        success: true,
        warning: 'Mot de passe reinitialise mais l\'email n\'a pas pu etre envoye',
        newPassword: newPassword, // Retourner le mot de passe pour que l'admin puisse le communiquer
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Mot de passe reinitialise et email envoye',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
