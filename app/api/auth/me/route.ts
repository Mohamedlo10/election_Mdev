import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { UserInstanceSummary, UserRole, Voter } from '@/types';

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

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    // 1. Obtenir l'utilisateur authentifié via cookie ou header Authorization
    const supabase = await createServerClient();
    let user = null;

    try {
      const { data: authData } = await supabase.auth.getUser();
      user = authData?.user ?? null;
    } catch (e) {
      console.warn('[API /me] Server cookie getUser warning:', e);
    }

    // Fallback header Authorization
    if (!user) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: tokenData, error: tokenError } = await adminClient.auth.getUser(token);
        if (!tokenError && tokenData?.user) {
          user = tokenData.user;
        }
      }
    }

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const normalizedEmail = user.email.toLowerCase().trim();

    // 2. Auto-lier TOUTES les entrées votants et rôles correspondantes à cet email (insensible à la casse)
    try {
      const { data: matchedVoters } = await adminClient
        .from('voters')
        .select('id, auth_uid, email')
        .or(`auth_uid.eq.${user.id},email.ilike.${normalizedEmail}`);

      if (matchedVoters && matchedVoters.length > 0) {
        const unlinkedVoterIds = matchedVoters
          .filter((v) => v.auth_uid !== user.id)
          .map((v) => v.id);

        if (unlinkedVoterIds.length > 0) {
          await adminClient
            .from('voters')
            .update({
              auth_uid: user.id,
              is_registered: true,
              registered_at: new Date().toISOString(),
            })
            .in('id', unlinkedVoterIds);
        }
      }

      const { data: matchedRoles } = await adminClient
        .from('users_roles')
        .select('id, user_id, email')
        .or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`);

      if (matchedRoles && matchedRoles.length > 0) {
        const unlinkedRoleIds = matchedRoles
          .filter((r) => r.user_id !== user.id)
          .map((r) => r.id);

        if (unlinkedRoleIds.length > 0) {
          await adminClient
            .from('users_roles')
            .update({ user_id: user.id })
            .in('id', unlinkedRoleIds);
        }
      }
    } catch (linkErr) {
      console.warn('[API /me] Auto-link warning:', linkErr);
    }

    // 3. Vérifier si c'est un super_admin
    const { data: allUserRoles } = await adminClient
      .from('users_roles')
      .select(`
        id,
        role,
        instance_id,
        election_instances (
          id,
          name,
          status,
          logo_url,
          primary_color
        )
      `)
      .or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`);

    const isSuperAdmin = allUserRoles?.some((r) => r.role === 'super_admin');

    if (isSuperAdmin) {
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

    // 4. Construire la liste de toutes les instances administrées
    const adminInstancesMap = new Map<string, UserInstanceSummary>();
    (allUserRoles || []).forEach((r) => {
      if (r.role === 'super_admin' || !r.instance_id) return;
      const inst = r.election_instances as unknown as {
        id: string;
        name: string;
        status: string;
        logo_url: string | null;
        primary_color: string | null;
      } | null;

      if (inst && !adminInstancesMap.has(r.instance_id)) {
        adminInstancesMap.set(r.instance_id, {
          context: 'admin_instance',
          instance_id: r.instance_id,
          instance_name: inst.name || 'Élection',
          instance_status: (inst.status || 'active') as UserInstanceSummary['instance_status'],
          logo_url: inst.logo_url || null,
          primary_color: inst.primary_color || '#22c55e',
          role: r.role as UserRole,
          voter_id: null,
          is_registered: null,
        });
      }
    });

    // 5. Récupérer TOUS les scrutins de vote où l'utilisateur est électeur (Scrutin A, Scrutin B, etc.)
    const { data: allVoterRows } = await adminClient
      .from('voters')
      .select(`
        id,
        instance_id,
        is_registered,
        election_instances (
          id,
          name,
          status,
          logo_url,
          primary_color
        )
      `)
      .or(`auth_uid.eq.${user.id},email.ilike.${normalizedEmail}`);

    const voterInstancesMap = new Map<string, UserInstanceSummary>();
    (allVoterRows || []).forEach((v) => {
      if (!v.instance_id) return;
      const inst = v.election_instances as unknown as {
        id: string;
        name: string;
        status: string;
        logo_url: string | null;
        primary_color: string | null;
      } | null;

      if (inst && !voterInstancesMap.has(v.instance_id)) {
        voterInstancesMap.set(v.instance_id, {
          context: 'voter_instance',
          instance_id: v.instance_id,
          instance_name: inst.name || 'Élection',
          instance_status: (inst.status || 'active') as UserInstanceSummary['instance_status'],
          logo_url: inst.logo_url || null,
          primary_color: inst.primary_color || '#22c55e',
          role: 'voter',
          voter_id: v.id,
          is_registered: v.is_registered ?? true,
        });
      }
    });

    const adminInstances = Array.from(adminInstancesMap.values());
    const voterInstances = Array.from(voterInstancesMap.values());
    const hasMultipleContexts = adminInstances.length > 0 && voterInstances.length > 0;

    // 6. Déterminer le rôle primaire
    let primaryRole: UserRole = 'admin';
    let primaryInstanceId: string | null = null;

    if (adminInstances.length > 0) {
      const sorted = [...adminInstances].sort(
        (a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99)
      );
      primaryRole = sorted[0].role;
      primaryInstanceId = adminInstances.length === 1 ? adminInstances[0].instance_id : null;
    } else if (voterInstances.length > 0) {
      primaryRole = 'voter';
      primaryInstanceId = voterInstances.length === 1 ? voterInstances[0].instance_id : null;
    }

    // 7. Données du votant actif si applicable
    let voterData: Voter | null = null;
    if (primaryRole === 'voter' && voterInstances.length === 1) {
      const { data } = await adminClient
        .from('voters')
        .select('*')
        .or(`auth_uid.eq.${user.id},email.ilike.${normalizedEmail}`)
        .eq('instance_id', voterInstances[0].instance_id)
        .maybeSingle();
      voterData = data as Voter | null;
    }

    // 8. Si aucune instance rattachée (nouveau compte sans élection)
    if (adminInstances.length === 0 && voterInstances.length === 0) {
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
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
