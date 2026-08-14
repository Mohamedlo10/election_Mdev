import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendAccountInviteEmail } from '@/lib/services/email.service';

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

// Générer un mot de passe temporaire à 6 chiffres
function generatePassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * GET /api/accounts
 * Liste tous les comptes utilisateurs uniques avec leurs assignations d'instances/rôles.
 * Chaque email n'apparaît qu'une seule fois !
 */
export async function GET() {
  try {
    // 1. Vérifier l'authentification et les droits super_admin
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

    // 2. Récupérer tous les utilisateurs Auth
    const { data: { users: authUsers }, error: usersError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des utilisateurs' }, { status: 500 });
    }

    // 3. Récupérer tous les rôles d'équipe avec le nom de l'instance
    const { data: allRoles, error: rolesError } = await adminClient
      .from('users_roles')
      .select(`
        id,
        user_id,
        email,
        instance_id,
        role,
        created_at,
        election_instances (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    // 4. Récupérer les inscriptions votants
    const { data: allVoters } = await adminClient
      .from('voters')
      .select('id, auth_uid, email, instance_id');

    // 5. Regrouper par compte utilisateur unique (par email & user_id)
    const accountsMap = new Map<string, {
      user_id: string;
      email: string;
      created_at: string;
      last_sign_in_at: string | null;
      is_super_admin: boolean;
      roles: Array<{
        id: string;
        role: string;
        instance_id: string | null;
        instance_name: string | null;
        created_at: string;
      }>;
      voter_count: number;
    }>();

    // Initialiser avec tous les comptes auth
    (authUsers || []).forEach((u) => {
      if (!u.email) return;
      const normEmail = u.email.toLowerCase().trim();
      accountsMap.set(normEmail, {
        user_id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        is_super_admin: false,
        roles: [],
        voter_count: 0,
      });
    });

    // Attacher les rôles d'équipe
    (allRoles || []).forEach((r) => {
      const email = r.email?.toLowerCase().trim() ||
        (r.user_id ? authUsers?.find((u) => u.id === r.user_id)?.email?.toLowerCase().trim() : null);

      if (!email) return;

      let account = accountsMap.get(email);
      if (!account) {
        account = {
          user_id: r.user_id || '',
          email: r.email || email,
          created_at: r.created_at,
          last_sign_in_at: null,
          is_super_admin: false,
          roles: [],
          voter_count: 0,
        };
        accountsMap.set(email, account);
      }

      if (r.role === 'super_admin') {
        account.is_super_admin = true;
      } else {
        const instanceName = (r.election_instances as unknown as { name: string } | null)?.name || null;
        account.roles.push({
          id: r.id,
          role: r.role,
          instance_id: r.instance_id,
          instance_name: instanceName,
          created_at: r.created_at,
        });
      }
    });

    // Compter les scrutins votants
    (allVoters || []).forEach((v) => {
      const email = v.email?.toLowerCase().trim();
      if (!email) return;
      const account = accountsMap.get(email);
      if (account) {
        account.voter_count += 1;
      }
    });

    const accountsList = Array.from(accountsMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ accounts: accountsList });
  } catch (error) {
    console.error('GET accounts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/accounts
 * Créer un compte ou assigner un nouveau rôle à un compte existant.
 */
export async function POST(request: Request) {
  try {
    const { email, role, instance_id } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email et rôle sont requis' }, { status: 400 });
    }

    if (!['admin', 'observer'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    if (role === 'observer' && !instance_id) {
      return NextResponse.json({ error: "L'instance est requise pour un observateur" }, { status: 400 });
    }

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

    const normalizedEmail = email.toLowerCase().trim();

    // Récupérer le nom de l'instance si spécifiée
    let instanceName: string | undefined;
    if (instance_id) {
      const { data: instanceData } = await adminClient
        .from('election_instances')
        .select('name')
        .eq('id', instance_id)
        .single();
      instanceName = instanceData?.name;
    }

    // Vérifier si l'instance a déjà un admin
    if (instance_id && role === 'admin') {
      const { data: existingAdmin } = await adminClient
        .from('users_roles')
        .select('id, email')
        .eq('instance_id', instance_id)
        .eq('role', 'admin')
        .maybeSingle();

      if (existingAdmin) {
        return NextResponse.json({
          error: `Cette instance a déjà un administrateur (${existingAdmin.email || 'assigné'}).`,
        }, { status: 400 });
      }
    }

    // Vérifier si l'utilisateur existe dans auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    let existingUser = existingUsers.users.find((u) => u.email?.toLowerCase().trim() === normalizedEmail);

    // S'il n'existe pas, créer le compte auth
    if (!existingUser) {
      const password = generatePassword();
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 });
      }

      existingUser = newUser.user;

      // Envoyer email avec identifiants
      await sendAccountInviteEmail(
        normalizedEmail,
        password,
        role as 'admin' | 'observer',
        instanceName
      );
    }

    // Vérifier si ce rôle/instance existe déjà pour cet email
    if (instance_id) {
      const { data: existingRole } = await adminClient
        .from('users_roles')
        .select('id')
        .eq('instance_id', instance_id)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingRole) {
        return NextResponse.json({ error: 'Cet utilisateur a déjà un rôle pour cette instance.' }, { status: 400 });
      }
    }

    // Créer la ligne de rôle
    const { error: roleError } = await adminClient
      .from('users_roles')
      .insert({
        user_id: existingUser!.id,
        email: normalizedEmail,
        instance_id: instance_id || null,
        role: role,
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      return NextResponse.json({ error: "Erreur lors de l'attribution du rôle" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST accounts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/accounts
 * Supprimer un compte entier (suppression de auth.users + cascades).
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID requis' }, { status: 400 });
    }

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

    // Ne pas supprimer son propre compte super admin
    if (userId === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte Super Admin' }, { status: 400 });
    }

    // Supprimer l'utilisateur de auth.users
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE user error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
