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

export async function GET() {
  try {
    // Obtenir l'utilisateur authentifié
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Chercher dans users_roles
    const { data: roleData, error: roleError } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', user.id)
      .single();

    console.log('[API /me] users_roles query:', { userId: user.id, roleData, roleError });

    if (roleData) {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        role: roleData.role,
        instance_id: roleData.instance_id,
      });
    }

    // Chercher dans voters
    const { data: voterData, error: voterError } = await adminClient
      .from('voters')
      .select('*')
      .eq('auth_uid', user.id)
      .single();

    console.log('[API /me] voters query:', { userId: user.id, voterData, voterError });

    if (voterData) {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        role: 'voter',
        instance_id: voterData.instance_id,
        voter: voterData,
      });
    }

    // Aucun rôle trouvé
    return NextResponse.json(
      { error: 'Aucun rôle assigné', noRole: true },
      { status: 404 }
    );
  } catch (error) {
    console.error('[API /me] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
