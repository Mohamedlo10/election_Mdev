import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendTeamAdditionEmail } from '@/lib/services/email.service';
import type { UserRole } from '@/types';

// Client admin Supabase pour contourner RLS
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
 * GET /api/instance/[instanceId]/team
 * Récupère la liste des membres de l'équipe pour une instance.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;

    // 1. Vérifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. Vérifier que l'utilisateur a accès à l'instance
    const { data: userRoleData } = await adminClient
      .from('users_roles')
      .select('role')
      .eq('instance_id', instanceId)
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    const isSuperAdmin = authUserIsSuperAdmin(user, adminClient);

    if (!userRoleData && !(await isSuperAdmin)) {
      return NextResponse.json({ error: 'Accès non autorisé à cette élection' }, { status: 403 });
    }

    // 3. Récupérer les rôles d'équipe pour cette instance (admin, manager, observer)
    const { data: teamRoles, error } = await adminClient
      .from('users_roles')
      .select('id, user_id, email, role, created_at')
      .eq('instance_id', instanceId)
      .in('role', ['admin', 'manager', 'observer'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Team] Error fetching roles:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement des membres' }, { status: 500 });
    }

    // 4. Récupérer la liste des utilisateurs auth pour compléter les emails si manquants
    const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const emailMap: Record<string, string> = {};
    if (users) {
      users.forEach((u) => {
        if (u.id && u.email) emailMap[u.id] = u.email;
      });
    }

    const members = (teamRoles || []).map((member) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role as UserRole,
      created_at: member.created_at,
      email: member.email || emailMap[member.user_id] || 'Email indisponible',
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[API Team] GET error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

async function authUserIsSuperAdmin(user: any, adminClient: any) {
  const { data } = await adminClient
    .from('users_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .maybeSingle();
  return !!data;
}

/**
 * POST /api/instance/[instanceId]/team
 * Ajoute un membre dans l'équipe d'une instance (admin, manager, observer).
 *
 * Basé sur l'adresse EMAIL : n'appelle JAMAIS auth.admin.createUser().
 * L'utilisateur s'inscrira librement s'il n'a pas encore de compte.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const { email, role } = await request.json();

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'L\'adresse email est requise' }, { status: 400 });
    }

    const validRoles: UserRole[] = ['admin', 'manager', 'observer'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide (admin, manager ou observer attendu)' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Vérifier l'authentification de l'appelant
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. Seul un admin de cette instance ou un super_admin peut ajouter un membre à l'équipe
    const { data: currentUserRole } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('instance_id', instanceId)
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    const isSuperAdmin = await authUserIsSuperAdmin(user, adminClient);
    const isInstanceAdmin = currentUserRole?.role === 'admin';

    if (!isSuperAdmin && !isInstanceAdmin) {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent gérer l\'équipe' }, { status: 403 });
    }

    // 3. Récupérer le nom de l'instance pour l'email
    const { data: instanceData } = await adminClient
      .from('election_instances')
      .select('name')
      .eq('id', instanceId)
      .single();

    const instanceName = instanceData?.name || 'Instance d\'élection';

    // 4. Recherche facultative dans auth.users si l'utilisateur existe déjà
    const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    const userId = existingUser ? existingUser.id : null;

    // 5. Garde-fou contre le conflit d'intérêts (Admin/Manager = Votant sur la MÊME instance)
    if (['admin', 'manager'].includes(role)) {
      const { data: voterCheck } = await adminClient
        .from('voters')
        .select('id')
        .eq('instance_id', instanceId)
        .or(`email.eq.${normalizedEmail}${userId ? `,auth_uid.eq.${userId}` : ''}`)
        .maybeSingle();

      if (voterCheck) {
        return NextResponse.json({
          error: `Conflit d'intérêts : l'utilisateur ${normalizedEmail} est déjà inscrit comme VOTANT sur cette instance. Il ne peut pas être nommé ${role}.`
        }, { status: 400 });
      }
    }

    // 6. Vérifier si un rôle existe déjà pour cet email sur cette instance
    const { data: existingRole } = await adminClient
      .from('users_roles')
      .select('id, role')
      .eq('instance_id', instanceId)
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingRole) {
      return NextResponse.json({
        error: `L'adresse ${normalizedEmail} fait déjà partie de l'équipe de cette instance avec le rôle '${existingRole.role}'.`
      }, { status: 400 });
    }

    // 7. Insérer le rôle dans users_roles (basé sur EMAIL, user_id optionnel)
    const { error: insertRoleError } = await adminClient
      .from('users_roles')
      .insert({
        email: normalizedEmail,
        user_id: userId,
        instance_id: instanceId,
        role: role,
      });

    if (insertRoleError) {
      console.error('[API Team] Error inserting role:', insertRoleError);
      return NextResponse.json({ error: 'Erreur lors de l\'attribution du rôle' }, { status: 500 });
    }

    // 8. Envoi d'email d'information (Sans AUCUN mot de passe temporaire !)
    await sendTeamAdditionEmail(normalizedEmail, role, instanceName);

    return NextResponse.json({
      success: true,
      message: `Invitation envoyée avec succès à ${normalizedEmail} !`,
    });

  } catch (error) {
    console.error('[API Team] POST error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/instance/[instanceId]/team
 * Supprime un membre de l'équipe
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const { roleId } = await request.json();

    if (!roleId) {
      return NextResponse.json({ error: 'ID du rôle requis' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Vérifier les droits d'admin
    const isSuperAdmin = await authUserIsSuperAdmin(user, adminClient);
    const { data: currentUserRole } = await adminClient
      .from('users_roles')
      .select('role')
      .eq('instance_id', instanceId)
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    if (!isSuperAdmin && currentUserRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent retirer un membre' }, { status: 403 });
    }

    // Ne pas se supprimer soi-même
    const { data: targetRole } = await adminClient
      .from('users_roles')
      .select('user_id, email')
      .eq('id', roleId)
      .single();

    if (targetRole && (targetRole.user_id === user.id || targetRole.email === user.email)) {
      return NextResponse.json({ error: 'Vous ne pouvez pas retirer votre propre rôle administrateur' }, { status: 400 });
    }

    const { error: deleteError } = await adminClient
      .from('users_roles')
      .delete()
      .eq('id', roleId)
      .eq('instance_id', instanceId);

    if (deleteError) {
      return NextResponse.json({ error: 'Erreur lors de la suppression du membre' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Membre retiré de l\'équipe avec succès' });

  } catch (error) {
    console.error('[API Team] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
