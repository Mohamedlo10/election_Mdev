import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est super_admin
    const adminClient = createAdminClient();
    const { data: roleData, error: roleError } = await adminClient
      .from('users_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Réservé aux super admins.' },
        { status: 403 }
      );
    }

    // Récupérer l'instanceId depuis les query params
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID requis' },
        { status: 400 }
      );
    }

    // Récupérer tous les votes avec les informations liées pour cette instance
    const { data: votesData, error: votesError } = await adminClient
      .from('votes')
      .select(`
        id,
        created_at,
        voter_id,
        candidate_id,
        category_id,
        instance_id,
        voters (
          id,
          full_name,
          email,
          is_registered,
          registered_at
        ),
        candidates (
          id,
          full_name,
          description,
          photo_url
        ),
        categories (
          id,
          name,
          description,
          order
        ),
        election_instances (
          id,
          name,
          status
        )
      `)
      .eq('instance_id', instanceId)
      .order('created_at', { ascending: false });

    if (votesError) {
      console.error('Error fetching votes:', votesError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des votes' },
        { status: 500 }
      );
    }

    // Formater les données pour l'export
    const formattedData = votesData.map((vote: any) => ({
      vote_id: vote.id,
      vote_timestamp: vote.created_at,
      instance_name: vote.election_instances?.name || 'N/A',
      instance_status: vote.election_instances?.status || 'N/A',
      category_id: vote.category_id,
      category_name: vote.categories?.name || 'N/A',
      category_order: vote.categories?.order || 0,
      candidate_name: vote.candidates?.full_name || 'N/A',
      voter_name: vote.voters?.full_name || 'N/A',
      voter_email: vote.voters?.email || 'N/A',
      voter_registered: vote.voters?.is_registered || false,
      voter_registration_date: vote.voters?.registered_at || null
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: formattedData.length
    });

  } catch (error) {
    console.error('Unexpected error in votes export:', error);
    return NextResponse.json(
      { error: 'Erreur inattendue lors de l\'export' },
      { status: 500 }
    );
  }
}
