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

/**
 * POST /api/admin/create-instance
 * Permet à un utilisateur connecté de créer une nouvelle instance d'élection.
 * Il devient automatiquement l'Administrateur de cette instance (ajout dans users_roles).
 */
export async function POST(request: Request) {
  try {
    const { name, primary_color, secondary_color, accent_color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom de l\'élection est requis' }, { status: 400 });
    }

    // 1. Vérifier l'authentification de l'utilisateur
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. Créer l'élection dans election_instances
    const { data: newInstance, error: createError } = await adminClient
      .from('election_instances')
      .insert({
        name: name.trim(),
        primary_color: primary_color || '#22c55e',
        secondary_color: secondary_color || '#1f2937',
        accent_color: accent_color || '#eab308',
        status: 'draft',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[API create-instance] Error creating instance:', createError);
      return NextResponse.json({ error: 'Erreur lors de la création de l\'élection' }, { status: 500 });
    }

    // 3. Assigner l'utilisateur comme Administrateur de cette nouvelle instance dans users_roles
    //    Si l'utilisateur avait une ligne générique sans instance, on l'associe ou on insère la nouvelle.
    const { data: nullInstanceRole } = await adminClient
      .from('users_roles')
      .select('id')
      .eq('user_id', user.id)
      .is('instance_id', null)
      .maybeSingle();

    if (nullInstanceRole) {
      // Mettre à jour la ligne générique avec la nouvelle instance
      await adminClient
        .from('users_roles')
        .update({ instance_id: newInstance.id, role: 'admin' })
        .eq('id', nullInstanceRole.id);
    } else {
      // Insérer la nouvelle association (user_id, instance_id, 'admin')
      const { error: roleError } = await adminClient
        .from('users_roles')
        .upsert({
          user_id: user.id,
          instance_id: newInstance.id,
          role: 'admin',
        }, {
          onConflict: 'user_id,instance_id',
        });

      if (roleError) {
        console.error('[API create-instance] Error inserting admin role:', roleError);
        // Annuler la création d'instance en cas d'échec
        await adminClient.from('election_instances').delete().eq('id', newInstance.id);
        return NextResponse.json({ error: 'Erreur lors de l\'attribution des droits administrateur' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      instance_id: newInstance.id,
      message: 'Élection créée avec succès !',
    });

  } catch (error) {
    console.error('[API create-instance] Error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
