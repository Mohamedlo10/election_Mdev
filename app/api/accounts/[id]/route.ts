import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

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

// PUT - Modifier un compte (role et/ou instance)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { role, instance_id } = await request.json();

    if (!role) {
      return NextResponse.json({ error: 'Le role est requis' }, { status: 400 });
    }

    if (!['admin', 'observer'].includes(role)) {
      return NextResponse.json({ error: 'Role invalide' }, { status: 400 });
    }

    // Pour les observateurs, l'instance est obligatoire
    if (role === 'observer' && !instance_id) {
      return NextResponse.json({ error: 'L\'instance est requise pour un observateur' }, { status: 400 });
    }

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

    // Verifier que le compte existe et recuperer ses infos
    const { data: existingRole } = await adminClient
      .from('users_roles')
      .select('role, user_id, instance_id')
      .eq('id', id)
      .single();

    if (!existingRole) {
      return NextResponse.json({ error: 'Compte non trouve' }, { status: 404 });
    }

    if (existingRole.role === 'super_admin') {
      return NextResponse.json({ error: 'Impossible de modifier un super admin' }, { status: 403 });
    }

    // Si on assigne une instance a un admin, verifier qu'il n'y a pas deja un admin
    if (instance_id && role === 'admin') {
      const { data: existingAdmin } = await adminClient
        .from('users_roles')
        .select('id')
        .eq('instance_id', instance_id)
        .eq('role', 'admin')
        .neq('id', id) // Exclure le compte actuel
        .single();

      if (existingAdmin) {
        return NextResponse.json({
          error: 'Cette instance a deja un administrateur. Une seule personne peut administrer une instance.'
        }, { status: 400 });
      }
    }

    // Si le nouveau role est admin, verifier que l'utilisateur n'est pas deja admin ailleurs
    if (role === 'admin') {
      const { data: existingAdminRole } = await adminClient
        .from('users_roles')
        .select('id, instance_id')
        .eq('user_id', existingRole.user_id)
        .eq('role', 'admin')
        .neq('id', id) // Exclure le compte actuel
        .single();

      if (existingAdminRole) {
        return NextResponse.json({
          error: 'Cet utilisateur est deja administrateur d\'une autre instance. Un admin ne peut gerer qu\'une seule instance.'
        }, { status: 400 });
      }
    }

    // Mettre a jour le role (instance_id peut etre null pour un admin)
    const { error: updateError } = await adminClient
      .from('users_roles')
      .update({
        role: role,
        instance_id: instance_id || null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise a jour' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT accounts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer un role (pas l'utilisateur auth)
export async function DELETE(
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

    // Verifier que le compte existe et n'est pas super_admin
    const { data: existingRole } = await adminClient
      .from('users_roles')
      .select('role')
      .eq('id', id)
      .single();

    if (!existingRole) {
      return NextResponse.json({ error: 'Compte non trouve' }, { status: 404 });
    }

    if (existingRole.role === 'super_admin') {
      return NextResponse.json({ error: 'Impossible de supprimer un super admin' }, { status: 403 });
    }

    // Supprimer le role
    const { error: deleteError } = await adminClient
      .from('users_roles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting role:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE accounts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
