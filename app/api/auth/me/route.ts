import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { UserInstanceSummary, UserRole } from '@/types';

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

// Ordre de priorité des rôles pour déterminer le rôle "primaire"
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 1,
  admin: 2,
  manager: 3,
  observer: 4,
  voter: 5,
};

export async function GET() {
  try {
    // 1. Obtenir l'utilisateur authentifié via le cookie de session
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Vérifier si c'est un super_admin (instance_id IS NULL dans users_roles)
    const { data: superAdminData } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (superAdminData) {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        role: 'super_admin' as UserRole,
        instance_id: null,
        voter: null,
        admin_instances: [],
        voter_instances: [],
        has_multiple_contexts: false,
      });
    }

    // 3. Récupérer toutes les instances via la fonction PostgreSQL
    const { data: instancesData, error: instancesError } = await adminClient
      .rpc('get_user_instances', { p_user_id: user.id });

    if (instancesError) {
      console.error('[API /me] get_user_instances error:', instancesError);
      // Fallback : essayer l'ancienne logique pour ne pas bloquer
    }

    const allInstances: UserInstanceSummary[] = (instancesData || []).map((row: {
      context: string;
      instance_id: string;
      instance_name: string;
      instance_status: string;
      logo_url: string | null;
      primary_color: string;
      user_role: string;
      voter_id: string | null;
      is_registered: boolean | null;
    }) => ({
      context: row.context as 'admin_instance' | 'voter_instance',
      instance_id: row.instance_id,
      instance_name: row.instance_name,
      instance_status: row.instance_status as UserInstanceSummary['instance_status'],
      logo_url: row.logo_url,
      primary_color: row.primary_color,
      role: row.user_role as UserRole,
      voter_id: row.voter_id,
      is_registered: row.is_registered,
    }));

    const adminInstances = allInstances.filter(i => i.context === 'admin_instance');
    const voterInstances = allInstances.filter(i => i.context === 'voter_instance');
    const hasMultipleContexts = adminInstances.length > 0 && voterInstances.length > 0;

    // 4. Déterminer le rôle primaire (priorité : admin > manager > observer > voter)
    let primaryRole: UserRole = 'voter';
    let primaryInstanceId: string | null = null;

    if (adminInstances.length > 0) {
      // Trier par priorité de rôle
      const sorted = [...adminInstances].sort(
        (a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99)
      );
      primaryRole = sorted[0].role;
      primaryInstanceId = adminInstances.length === 1 ? adminInstances[0].instance_id : null;
    } else if (voterInstances.length > 0) {
      primaryRole = 'voter';
      primaryInstanceId = voterInstances.length === 1 ? voterInstances[0].instance_id : null;
    }

    // 5. Récupérer les données du votant si applicable (pour compatibilité ascendante)
    let voterData = null;
    if (primaryRole === 'voter' && voterInstances.length === 1) {
      const { data } = await adminClient
        .from('voters')
        .select('*')
        .eq('auth_uid', user.id)
        .eq('instance_id', voterInstances[0].instance_id)
        .maybeSingle();
      voterData = data;
    }

    // 6. Si aucune instance rattachée (ex: nouvellement inscrit) → retourner un statut propre avec no_instance_yet
    if (allInstances.length === 0) {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        role: 'admin' as UserRole,
        instance_id: null,
        voter: null,
        admin_instances: [],
        voter_instances: [],
        has_multiple_contexts: false,
        no_instance_yet: true,
      });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: primaryRole,
      instance_id: primaryInstanceId,
      voter: voterData,
      admin_instances: adminInstances,
      voter_instances: voterInstances,
      has_multiple_contexts: hasMultipleContexts,
    });

  } catch (error) {
    console.error('[API /me] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
