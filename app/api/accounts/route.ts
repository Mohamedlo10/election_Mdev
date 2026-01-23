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

// Generer un mot de passe aleatoire
function generatePassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET - Liste tous les comptes (users_roles avec email)
export async function GET() {
  try {
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

    // Recuperer tous les users_roles avec infos
    const { data: accounts, error } = await adminClient
      .from('users_roles')
      .select(`
        id,
        user_id,
        instance_id,
        role,
        created_at,
        election_instances (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Recuperer les emails depuis auth.users
    const userIds = accounts?.map((a) => a.user_id) || [];
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    const emailMap: Record<string, string> = {};
    if (users) {
      users.forEach((u) => {
        emailMap[u.id] = u.email || '';
      });
    }

    // Combiner les donnees
    const accountsWithEmail = accounts?.map((account) => ({
      ...account,
      email: emailMap[account.user_id] || 'N/A',
      instance_name: (account.election_instances as { name: string } | null)?.name || null,
    })) || [];

    return NextResponse.json({ accounts: accountsWithEmail });
  } catch (error) {
    console.error('GET accounts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Creer un nouveau compte
export async function POST(request: Request) {
  try {
    const { email, role, instance_id } = await request.json();

    if (!email || !role || !instance_id) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 });
    }

    if (!['admin', 'observer'].includes(role)) {
      return NextResponse.json({ error: 'Role invalide' }, { status: 400 });
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

    // Verifier si l'email existe deja
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    let existingUser = existingUsers.users.find((u) => u.email === email.toLowerCase());

    // Si l'utilisateur n'existe pas, le creer
    if (!existingUser) {
      const password = generatePassword();
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true,
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Erreur lors de la creation du compte' }, { status: 500 });
      }

      existingUser = newUser.user;

      // TODO: Envoyer email avec mot de passe
      console.log(`[Accounts] Nouveau compte cree: ${email} - Password: ${password}`);
    }

    // Verifier si un role existe deja pour cette instance
    const { data: existingRole } = await adminClient
      .from('users_roles')
      .select('id')
      .eq('user_id', existingUser!.id)
      .eq('instance_id', instance_id)
      .single();

    if (existingRole) {
      return NextResponse.json({ error: 'Ce compte a deja un role pour cette instance' }, { status: 400 });
    }

    // Creer le role
    const { error: roleError } = await adminClient
      .from('users_roles')
      .insert({
        user_id: existingUser!.id,
        instance_id: instance_id,
        role: role,
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      return NextResponse.json({ error: 'Erreur lors de l\'attribution du role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST accounts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
