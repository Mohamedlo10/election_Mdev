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

/**
 * GET /api/auth/me
 * Récupère le profil et l'ensemble des scrutins d'un utilisateur via la fonction RPC PostgreSQL dédiée.
 */
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

    // 2. Vérifier si c'est un super_admin (limit(1) pour éviter les erreurs multiples)
    try {
      const { data: superAdminRows } = await adminClient
        .from('users_roles')
        .select('role')
        .or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`)
        .eq('role', 'super_admin')
        .limit(1);

      if (superAdminRows && superAdminRows.length > 0) {
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
    } catch (saErr) {
      console.warn('[API /me] SuperAdmin check warning:', saErr);
    }

    // 3. Appel de la fonction RPC PostgreSQL get_user_instances
    let allInstances: UserInstanceSummary[] = [];

    try {
      const { data: instancesData, error: rpcError } = await adminClient
        .rpc('get_user_instances', {
          p_user_id: user.id,
          p_email: normalizedEmail,
        });

      if (!rpcError && Array.isArray(instancesData)) {
        allInstances = instancesData.map((row: {
          context: string;
          instance_id: string;
          instance_name: string;
          instance_status: string;
          logo_url: string | null;
          primary_color: string | null;
          user_role: string;
          voter_id: string | null;
          is_registered: boolean | null;
        }) => ({
          context: row.context as 'admin_instance' | 'voter_instance',
          instance_id: row.instance_id,
          instance_name: row.instance_name || 'Élection',
          instance_status: (row.instance_status || 'active') as UserInstanceSummary['instance_status'],
          logo_url: row.logo_url || null,
          primary_color: row.primary_color || '#22c55e',
          role: (row.user_role || 'voter') as UserRole,
          voter_id: row.voter_id || null,
          is_registered: row.is_registered ?? true,
        }));
      } else {
        console.warn('[API /me] RPC fallback needed, error:', rpcError);
        // Fallback direct tables (users_roles + voters)
        const [rolesRes, votersRes] = await Promise.all([
          adminClient
            .from('users_roles')
            .select('role, instance_id, election_instances(id, name, status, logo_url, primary_color)')
            .or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`)
            .in('role', ['admin', 'manager', 'observer']),
          adminClient
            .from('voters')
            .select('id, instance_id, is_registered, election_instances(id, name, status, logo_url, primary_color)')
            .or(`auth_uid.eq.${user.id},email.ilike.${normalizedEmail}`)
        ]);

        if (rolesRes.data) {
          rolesRes.data.forEach((ur) => {
            if (!ur.instance_id) return;
            const inst = ur.election_instances as unknown as {
              id: string;
              name: string;
              status: string;
              logo_url: string | null;
              primary_color: string | null;
            } | null;
            allInstances.push({
              context: 'admin_instance',
              instance_id: ur.instance_id,
              instance_name: inst?.name || 'Élection',
              instance_status: (inst?.status || 'active') as UserInstanceSummary['instance_status'],
              logo_url: inst?.logo_url || null,
              primary_color: inst?.primary_color || '#22c55e',
              role: (ur.role as UserRole) || 'admin',
              voter_id: null,
              is_registered: null,
            });
          });
        }

        if (votersRes.data) {
          votersRes.data.forEach((v) => {
            if (!v.instance_id) return;
            const inst = v.election_instances as unknown as {
              id: string;
              name: string;
              status: string;
              logo_url: string | null;
              primary_color: string | null;
            } | null;
            allInstances.push({
              context: 'voter_instance',
              instance_id: v.instance_id,
              instance_name: inst?.name || 'Élection',
              instance_status: (inst?.status || 'active') as UserInstanceSummary['instance_status'],
              logo_url: inst?.logo_url || null,
              primary_color: inst?.primary_color || '#22c55e',
              role: 'voter',
              voter_id: v.id,
              is_registered: v.is_registered ?? true,
            });
          });
        }
      }
    } catch (rpcCatch) {
      console.warn('[API /me] RPC catch error:', rpcCatch);
    }

    const adminInstances = allInstances.filter((i) => i.context === 'admin_instance');
    const voterInstances = allInstances.filter((i) => i.context === 'voter_instance');
    const hasMultipleContexts = adminInstances.length > 0 && voterInstances.length > 0;

    // 4. Déterminer le rôle primaire
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

    // 5. Récupérer les données de vote si un seul scrutin votant (avec limit(1))
    let voterData: Voter | null = null;
    if (primaryRole === 'voter' && voterInstances.length === 1) {
      try {
        const { data: voterRows } = await adminClient
          .from('voters')
          .select('*')
          .or(`auth_uid.eq.${user.id},email.ilike.${normalizedEmail}`)
          .eq('instance_id', voterInstances[0].instance_id)
          .limit(1);
        voterData = (voterRows?.[0] as Voter) || null;
      } catch (vErr) {
        console.warn('[API /me] Voter fetch warning:', vErr);
      }
    }

    // 6. Nouveau compte sans scrutin assigné
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
    console.error('[API /me] Unhandled Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
