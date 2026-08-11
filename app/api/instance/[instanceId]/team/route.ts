import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendAccountInviteEmail } from '@/lib/services/email.service';
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

// Générer un mot de passe aléatoire opaque
function generatePassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * GET /api/instance/[instanceId]/team
 * Liste tous les membres de l'équipe (admin, manager, observer) de l'instance
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

    // 2. Vérifier les autorisations de l'utilisateur courant
    const { data: currentUserRole } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const isSuperAdmin = currentUserRole?.role === 'super_admin';
    const isInstanceStaff = currentUserRole?.instance_id === instanceId &&
      ['admin', 'manager', 'observer'].includes(currentUserRole?.role || '');

    if (!isSuperAdmin && !isInstanceStaff) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // 3. Récupérer les rôles d'équipe pour cette instance (admin, manager, observer)
    const { data: teamRoles, error } = await adminClient
      .from('users_roles')
      .select('id, user_id, role, created_at')
      .eq('instance_id', instanceId)
      .in('role', ['admin', 'manager', 'observer'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Team] Error fetching roles:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement des membres' }, { status: 500 });
    }

    // 4. Récupérer la liste des utilisateurs auth pour associer les emails
    const { data: { users } } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    const emailMap: Record<string, string> = {};
    if (users) {
      users.forEach((u) => {
        if (u.id && u.email) {
          emailMap[u.id] = u.email;
        }
      });
    }

    const members = (teamRoles || []).map((member) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role as UserRole,
      created_at: member.created_at,
      email: emailMap[member.user_id] || 'Email indisponible',
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[API Team] GET error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * POST /api/instance/[instanceId]/team
 * Ajoute ou invite un membre dans l'équipe (admin, manager, observer)
 *
 * Gère le cas où l'utilisateur existe déjà (ex: admin sur autre instance)
 * et le cas où il faut créer un nouveau compte.
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
      .eq('user_id', user.id)
      .maybeSingle();

    const isSuperAdmin = currentUserRole?.role === 'super_admin';
    const isInstanceAdmin = currentUserRole?.role === 'admin' && currentUserRole?.instance_id === instanceId;

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

    // 4. Recherche de l'utilisateur dans Supabase Auth (utilisateur existant ?)
    const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    let existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    let isNewAccount = false;
    let tempPassword: string | null = null;

    // 5. Si l'utilisateur n'existe PAS, créer son compte auth
    if (!existingUser) {
      tempPassword = generatePassword();
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error('[API Team] Error creating auth user:', createError);
        return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 });
      }

      existingUser = newUser.user;
      isNewAccount = true;
    }

    const userId = existingUser!.id;

    // 6. Garde-fou contre le conflit d'intérêts (Admin/Manager = Votant sur la MÊME instance)
    if (['admin', 'manager'].includes(role)) {
      const { data: voterCheck } = await adminClient
        .from('voters')
        .select('id')
        .eq('instance_id', instanceId)
        .or(`auth_uid.eq.${userId},email.eq.${normalizedEmail}`)
        .maybeSingle();

      if (voterCheck) {
        return NextResponse.json({
          error: `Conflit d'intérêts : l'utilisateur ${normalizedEmail} est déjà inscrit comme VOTANT sur cette instance. Il ne peut pas être nommé ${role}.`
        }, { status: 400 });
      }
    }

    // 7. Vérifier si l'utilisateur a déjà un rôle sur CETTE instance
    const { data: existingRole } = await adminClient
      .from('users_roles')
      .select('id, role')
      .eq('user_id', userId)
      .eq('instance_id', instanceId)
      .maybeSingle();

    if (existingRole) {
      return NextResponse.json({
        error: `Cet utilisateur fait déjà partie de l'équipe de cette instance avec le rôle '${existingRole.role}'.`
      }, { status: 400 });
    }

    // 8. Assigner le rôle sur cette instance dans users_roles
    const { error: insertRoleError } = await adminClient
      .from('users_roles')
      .insert({
        user_id: userId,
        instance_id: instanceId,
        role: role,
      });

    if (insertRoleError) {
      console.error('[API Team] Error inserting role:', insertRoleError);
      return NextResponse.json({ error: 'Erreur lors de l\'attribution du rôle' }, { status: 500 });
    }

    // 9. Envoi d'email
    if (isNewAccount && tempPassword) {
      // Pour les nouveaux comptes : envoi des identifiants temporaires
      await sendAccountInviteEmail(
        normalizedEmail,
        tempPassword,
        role,
        instanceName
      );
    } else {
      // Pour les comptes existants : envoi d'un lien expirable de réinitialisation/connexion
      const reqOrigin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/$/, '');
      const reqHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const reqProto = request.headers.get('x-forwarded-proto') || 'https';
      
      let derivedAppUrl = process.env.NEXT_PUBLIC_APP_URL || reqOrigin;
      if (!derivedAppUrl && reqHost) {
        derivedAppUrl = `${reqProto}://${reqHost}`;
      }
      const appUrl = (derivedAppUrl || 'https://election.mouhadev.com').replace(/\/$/, '');

      // Tenter de générer et envoyer un lien propre
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: { redirectTo: `${appUrl}/reset-password` },
      });

      if (linkData?.properties?.action_link) {
        let resetLink = linkData.properties.action_link
          .replace('http://localhost:3000', appUrl)
          .replace('http://localhost:3001', appUrl);
        
        await sendAccountInviteEmail(normalizedEmail, 'Mot de passe existant (conservé)', role, instanceName);
      } else {
        await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${appUrl}/reset-password`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: isNewAccount
        ? `Nouveau compte créé et rôle '${role}' attribué. Un email avec ses identifiants lui a été envoyé.`
        : `L'utilisateur existant a été ajouté à l'équipe de l'instance avec le rôle '${role}'. Un email d'information lui a été envoyé.`,
      is_new_user: isNewAccount,
    });

  } catch (error) {
    console.error('[API Team] POST error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/instance/[instanceId]/team
 * Modifie le rôle d'un membre de l'équipe
 *
 * Query params: ?id=USER_ROLE_ID
 * Body: { role: UserRole }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');
    const { role: newRole } = await request.json();

    if (!roleId) {
      return NextResponse.json({ error: 'ID du membre requis' }, { status: 400 });
    }

    const validRoles: UserRole[] = ['admin', 'manager', 'observer'];
    if (!newRole || !validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Nouveau rôle invalide' }, { status: 400 });
    }

    // 1. Vérifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. Seul un admin ou super_admin peut modifier un rôle
    const { data: currentUserRole } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const isSuperAdmin = currentUserRole?.role === 'super_admin';
    const isInstanceAdmin = currentUserRole?.role === 'admin' && currentUserRole?.instance_id === instanceId;

    if (!isSuperAdmin && !isInstanceAdmin) {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent modifier un rôle' }, { status: 403 });
    }

    // 3. Vérifier la cible à modifier
    const { data: targetRole } = await adminClient
      .from('users_roles')
      .select('id, user_id, role, instance_id')
      .eq('id', roleId)
      .maybeSingle();

    if (!targetRole || targetRole.instance_id !== instanceId) {
      return NextResponse.json({ error: 'Membre introuvable sur cette instance' }, { status: 404 });
    }

    // 4. Empêcher le dernier admin de se rétrograder
    if (targetRole.role === 'admin' && newRole !== 'admin') {
      const { count: adminCount } = await adminClient
        .from('users_roles')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', instanceId)
        .eq('role', 'admin');

      if ((adminCount || 0) <= 1) {
        return NextResponse.json({
          error: 'Impossible de modifier le rôle du dernier administrateur de l\'élection.'
        }, { status: 400 });
      }
    }

    // 5. Mettre à jour le rôle
    const { error: updateError } = await adminClient
      .from('users_roles')
      .update({ role: newRole })
      .eq('id', roleId);

    if (updateError) {
      console.error('[API Team] Update error:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du rôle' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API Team] PUT error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/instance/[instanceId]/team
 * Supprime un membre de l'équipe de l'instance
 *
 * Query params: ?id=USER_ROLE_ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');

    if (!roleId) {
      return NextResponse.json({ error: 'ID du membre requis' }, { status: 400 });
    }

    // 1. Vérifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. Seul un admin ou super_admin peut supprimer un membre
    const { data: currentUserRole } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const isSuperAdmin = currentUserRole?.role === 'super_admin';
    const isInstanceAdmin = currentUserRole?.role === 'admin' && currentUserRole?.instance_id === instanceId;

    if (!isSuperAdmin && !isInstanceAdmin) {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent retirer un membre' }, { status: 403 });
    }

    // 3. Vérifier le membre à supprimer
    const { data: targetRole } = await adminClient
      .from('users_roles')
      .select('id, user_id, role, instance_id')
      .eq('id', roleId)
      .maybeSingle();

    if (!targetRole || targetRole.instance_id !== instanceId) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    // 4. Empêcher la suppression du dernier administrateur
    if (targetRole.role === 'admin') {
      const { count: adminCount } = await adminClient
        .from('users_roles')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', instanceId)
        .eq('role', 'admin');

      if ((adminCount || 0) <= 1) {
        return NextResponse.json({
          error: 'Impossible de supprimer le dernier administrateur de l\'élection.'
        }, { status: 400 });
      }
    }

    // 5. Supprimer le rôle de l'instance
    const { error: deleteError } = await adminClient
      .from('users_roles')
      .delete()
      .eq('id', roleId);

    if (deleteError) {
      console.error('[API Team] Delete error:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API Team] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
