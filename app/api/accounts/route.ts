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

    // Email et role sont toujours requis
    if (!email || !role) {
      return NextResponse.json({ error: 'Email et role sont requis' }, { status: 400 });
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

    // Recuperer le nom de l'instance si specifiee (pour l'email)
    let instanceName: string | undefined;
    if (instance_id) {
      const { data: instanceData } = await adminClient
        .from('election_instances')
        .select('name')
        .eq('id', instance_id)
        .single();
      instanceName = instanceData?.name;
    }

    // Si une instance est specifiee et que le role est admin, verifier qu'il n'y a pas deja un admin
    if (instance_id && role === 'admin') {
      const { data: existingAdmin } = await adminClient
        .from('users_roles')
        .select('id')
        .eq('instance_id', instance_id)
        .eq('role', 'admin')
        .single();

      if (existingAdmin) {
        return NextResponse.json({
          error: 'Cette instance a deja un administrateur. Une seule personne peut administrer une instance.'
        }, { status: 400 });
      }
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

      // Envoyer email avec mot de passe
      const emailResult = await sendAccountInviteEmail(
        email.toLowerCase(),
        password,
        role as 'admin' | 'observer',
        instanceName
      );

      if (!emailResult.success) {
        console.error('Failed to send invite email:', emailResult.error);
        // On continue quand meme - le compte est cree
      }

      console.log(`[Accounts] Nouveau compte cree: ${email} - Email envoye: ${emailResult.success}`);
    }

    // Verifier si l'utilisateur a deja un role admin (avec ou sans instance)
    if (role === 'admin') {
      const { data: existingAdminRole } = await adminClient
        .from('users_roles')
        .select('id, instance_id')
        .eq('user_id', existingUser!.id)
        .eq('role', 'admin')
        .single();

      if (existingAdminRole) {
        if (existingAdminRole.instance_id) {
          return NextResponse.json({
            error: 'Cet utilisateur est deja administrateur d\'une instance. Un admin ne peut gerer qu\'une seule instance.'
          }, { status: 400 });
        } else {
          return NextResponse.json({
            error: 'Cet utilisateur est deja administrateur sans instance assignee.'
          }, { status: 400 });
        }
      }
    }

    // Verifier si un role existe deja pour cette instance (si instance specifiee)
    if (instance_id) {
      const { data: existingRole } = await adminClient
        .from('users_roles')
        .select('id')
        .eq('user_id', existingUser!.id)
        .eq('instance_id', instance_id)
        .single();

      if (existingRole) {
        return NextResponse.json({ error: 'Ce compte a deja un role pour cette instance' }, { status: 400 });
      }
    }

    // Creer le role (instance_id peut etre null pour un admin)
    const { error: roleError } = await adminClient
      .from('users_roles')
      .insert({
        user_id: existingUser!.id,
        instance_id: instance_id || null,
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
