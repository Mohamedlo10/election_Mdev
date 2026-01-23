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

// GET - Liste les observateurs de l'instance
export async function GET(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;

    // Verifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verifier que l'utilisateur est admin de cette instance ou super_admin
    const { data: roleData } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', user.id)
      .single();

    if (!roleData) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const isSuperAdmin = roleData.role === 'super_admin';
    const isInstanceAdmin = roleData.role === 'admin' && roleData.instance_id === instanceId;

    if (!isSuperAdmin && !isInstanceAdmin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    // Recuperer les observateurs de l'instance
    const { data: observers, error } = await adminClient
      .from('users_roles')
      .select('id, user_id, created_at')
      .eq('instance_id', instanceId)
      .eq('role', 'observer')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching observers:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Recuperer les emails
    const { data: { users } } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    const emailMap: Record<string, string> = {};
    if (users) {
      users.forEach((u) => {
        emailMap[u.id] = u.email || '';
      });
    }

    const observersWithEmail = observers?.map((obs) => ({
      ...obs,
      email: emailMap[obs.user_id] || 'N/A',
    })) || [];

    return NextResponse.json({ observers: observersWithEmail });
  } catch (error) {
    console.error('GET observers error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Creer un observateur pour l'instance
export async function POST(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const { email } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'L\'email est requis' }, { status: 400 });
    }

    // Verifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verifier que l'utilisateur est admin de cette instance ou super_admin
    const { data: roleData } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', user.id)
      .single();

    if (!roleData) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const isSuperAdmin = roleData.role === 'super_admin';
    const isInstanceAdmin = roleData.role === 'admin' && roleData.instance_id === instanceId;

    if (!isSuperAdmin && !isInstanceAdmin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    // Recuperer le nom de l'instance
    const { data: instanceData } = await adminClient
      .from('election_instances')
      .select('name')
      .eq('id', instanceId)
      .single();

    const instanceName = instanceData?.name;

    // Verifier si l'email existe deja
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    let existingUser = existingUsers.users.find((u) => u.email === email.toLowerCase());
    let passwordGenerated: string | null = null;

    // Si l'utilisateur n'existe pas, le creer
    if (!existingUser) {
      passwordGenerated = generatePassword();
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        password: passwordGenerated,
        email_confirm: true,
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Erreur lors de la creation du compte' }, { status: 500 });
      }

      existingUser = newUser.user;
    }

    // Verifier si un role existe deja pour cette instance
    const { data: existingRole } = await adminClient
      .from('users_roles')
      .select('id')
      .eq('user_id', existingUser!.id)
      .eq('instance_id', instanceId)
      .single();

    if (existingRole) {
      return NextResponse.json({ error: 'Ce compte a deja un role pour cette instance' }, { status: 400 });
    }

    // Creer le role observateur
    const { error: roleError } = await adminClient
      .from('users_roles')
      .insert({
        user_id: existingUser!.id,
        instance_id: instanceId,
        role: 'observer',
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      return NextResponse.json({ error: 'Erreur lors de l\'attribution du role' }, { status: 500 });
    }

    // Envoyer email si nouveau compte cree
    if (passwordGenerated) {
      const emailResult = await sendAccountInviteEmail(
        email.toLowerCase(),
        passwordGenerated,
        'observer',
        instanceName
      );

      if (!emailResult.success) {
        console.error('Failed to send invite email:', emailResult.error);
      }

      console.log(`[Observers] Nouveau observateur cree: ${email} - Email envoye: ${emailResult.success}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST observers error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer un observateur
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const { searchParams } = new URL(request.url);
    const observerId = searchParams.get('id');

    if (!observerId) {
      return NextResponse.json({ error: 'ID observateur requis' }, { status: 400 });
    }

    // Verifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verifier que l'utilisateur est admin de cette instance ou super_admin
    const { data: roleData } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', user.id)
      .single();

    if (!roleData) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const isSuperAdmin = roleData.role === 'super_admin';
    const isInstanceAdmin = roleData.role === 'admin' && roleData.instance_id === instanceId;

    if (!isSuperAdmin && !isInstanceAdmin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    // Verifier que l'observateur appartient a cette instance
    const { data: observerRole } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('id', observerId)
      .single();

    if (!observerRole || observerRole.role !== 'observer' || observerRole.instance_id !== instanceId) {
      return NextResponse.json({ error: 'Observateur non trouve' }, { status: 404 });
    }

    // Supprimer le role
    const { error: deleteError } = await adminClient
      .from('users_roles')
      .delete()
      .eq('id', observerId);

    if (deleteError) {
      console.error('Error deleting observer:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE observers error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
