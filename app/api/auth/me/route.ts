import { type NextRequest, NextResponse } from 'next/server';
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

    // 2. Auto-lier les votants et rôles par email si nécessaire
    try {
      await adminClient
        .from('voters')
        .update({
          auth_uid: user.id,
          is_registered: true,
          registered_at: new Date().toISOString(),
        })
        .eq('email', normalizedEmail)
        .or(`auth_uid.is.null,auth_uid.neq.${user.id}`);

      await adminClient
        .from('users_roles')
        .update({ user_id: user.id })
        .eq('email', normalizedEmail)
        .or(`user_id.is.null,user_id.neq.${user.id}`);
    } catch (linkErr) {
      console.warn('[API /me] Auto-link warning:', linkErr);
    }

    // 3. Vérifier si c'est un super_admin
    const { data: superAdminData } = await adminClient
      .from('users_roles')
      .select('role, instance_id')
      .or(`user_id.eq.${user.id},email.eq.${normalizedEmail}`)
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

    // 4. Récupérer toutes les instances (RPC avec fallback direct SQL)
    let adminInstances: UserInstanceSummary[] = [];
    let voterInstances: UserInstanceSummary[] = [];

    const { data: instancesData, error: instancesError } = await adminClient
      .rpc('get_user_instances', { p_user_id: user.id, p_email: normalizedEmail });

    if (!instancesError && Array.isArray(instancesData)) {
      const allInstances: UserInstanceSummary[] = instancesData.map((row: {
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
        primary_color: row.primary_color || '#22c55e',
        role: row.user_role as UserRole,
        voter_id: row.voter_id,
        is_registered: row.is_registered,
      }));

      adminInstances = allInstances.filter((i) => i.context === 'admin_instance');
      voterInstances = allInstances.filter((i) => i.context === 'voter_instance');
    } else {
      // Fallback SQL direct
      const { data: rolesRows } = await adminClient
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
        .or(`user_id.eq.${user.id},email.eq.${normalizedEmail}`);

      if (rolesRows) {
        adminInstances = rolesRows
          .filter((r) => r.role !== 'super_admin' && r.instance_id)
          .map((r) => {
            const inst = r.election_instances as unknown as {
              id: string;
              name: string;
              status: string;
              logo_url: string | null;
              primary_color: string | null;
            } | null;
            return {
              context: 'admin_instance' as const,
              instance_id: r.instance_id!,
              instance_name: inst?.name || 'Élection',
              instance_status: (inst?.status || 'active') as UserInstanceSummary['instance_status'],
              logo_url: inst?.logo_url || null,
              primary_color: inst?.primary_color || '#22c55e',
              role: r.role as UserRole,
              voter_id: null,
              is_registered: null,
            };
          });
      }

      const { data: voterRows } = await adminClient
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
        .or(`auth_uid.eq.${user.id},email.eq.${normalizedEmail}`);

      if (voterRows) {
        voterInstances = voterRows
          .filter((v) => v.instance_id)
          .map((v) => {
            const inst = v.election_instances as unknown as {
              id: string;
              name: string;
              status: string;
              logo_url: string | null;
              primary_color: string | null;
            } | null;
            return {
              context: 'voter_instance' as const,
              instance_id: v.instance_id,
              instance_name: inst?.name || 'Élection',
              instance_status: (inst?.status || 'active') as UserInstanceSummary['instance_status'],
              logo_url: inst?.logo_url || null,
              primary_color: inst?.primary_color || '#22c55e',
              role: 'voter' as UserRole,
              voter_id: v.id,
              is_registered: v.is_registered,
            };
          });
      }
    }

    const hasMultipleContexts = adminInstances.length > 0 && voterInstances.length > 0;

    // 5. Déterminer le rôle primaire
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

    // 6. Données votant si applicable
    let voterData = null;
    if (primaryRole === 'voter' && voterInstances.length === 1) {
      const { data } = await adminClient
        .from('voters')
        .select('*')
        .or(`auth_uid.eq.${user.id},email.eq.${normalizedEmail}`)
        .eq('instance_id', voterInstances[0].instance_id)
        .maybeSingle();
      voterData = data;
    }

    // 7. Si aucune instance (nouveau compte sans élection)
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
