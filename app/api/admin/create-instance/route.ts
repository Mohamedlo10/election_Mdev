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

export async function POST(request: Request) {
  try {
    const { name, primary_color, secondary_color, accent_color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    // Verifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verifier que l'utilisateur est admin sans instance
    const { data: roleData } = await adminClient
      .from('users_roles')
      .select('id, role, instance_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return NextResponse.json({ error: 'Vous n\'etes pas administrateur' }, { status: 403 });
    }

    if (roleData.instance_id) {
      return NextResponse.json({
        error: 'Vous etes deja assigne a une instance',
        instance_id: roleData.instance_id,
      }, { status: 400 });
    }

    // Creer l'instance
    const { data: newInstance, error: createError } = await adminClient
      .from('election_instances')
      .insert({
        name: name.trim(),
        primary_color: primary_color || '#22c55e',
        secondary_color: secondary_color || '#1f2937',
        accent_color: accent_color || '#eab308',
        status: 'draft',
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating instance:', createError);
      return NextResponse.json({ error: 'Erreur lors de la creation de l\'instance' }, { status: 500 });
    }

    // Assigner l'admin a cette instance
    const { error: updateError } = await adminClient
      .from('users_roles')
      .update({ instance_id: newInstance.id })
      .eq('id', roleData.id);

    if (updateError) {
      console.error('Error assigning admin to instance:', updateError);
      // Essayer de supprimer l'instance creee
      await adminClient.from('election_instances').delete().eq('id', newInstance.id);
      return NextResponse.json({ error: 'Erreur lors de l\'assignation a l\'instance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      instance_id: newInstance.id,
    });
  } catch (error) {
    console.error('POST create-instance error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
