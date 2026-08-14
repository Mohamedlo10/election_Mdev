import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { AuthUser, UserInstanceSummary, UserRole, Voter } from '@/types';

/** Client admin (service role) : contourne RLS pour lire le workspace complet. */
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 1,
  admin: 2,
  manager: 3,
  observer: 4,
  voter: 5,
};

/**
 * Utilisateur authentifié : cookies de session d'abord, header Authorization ensuite.
 * `accessToken` sert aux appels API où le cookie n'est pas exploitable.
 */
export async function getAuthenticatedUser(accessToken?: string): Promise<User | null> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) return data.user;
  } catch (e) {
    console.warn('[workspace] getUser (cookies):', e);
  }

  if (accessToken) {
    const { data, error } = await createAdminClient().auth.getUser(accessToken);
    if (!error && data?.user) return data.user;
  }

  return null;
}

/**
 * Profil complet de l'utilisateur en UN appel RPC.
 * Si la migration 010 n'est pas encore appliquée, bascule sur l'ancien chemin
 * (get_user_instances + requêtes directes) pour ne rien casser en attendant.
 */
export async function getWorkspace(user: User): Promise<AuthUser | null> {
  if (!user.email) return null;

  const adminClient = createAdminClient();
  const email = user.email;

  const { data, error } = await adminClient.rpc('get_user_workspace', {
    p_user_id: user.id,
    p_email: email,
  });

  if (!error && data) {
    const payload = data as Record<string, unknown>;
    return {
      id: user.id,
      email,
      role: (payload.role as UserRole) ?? 'admin',
      instance_id: (payload.instance_id as string | null) ?? null,
      voter: (payload.voter as Voter | null) ?? undefined,
      admin_instances: (payload.admin_instances as UserInstanceSummary[]) ?? [],
      voter_instances: (payload.voter_instances as UserInstanceSummary[]) ?? [],
      has_multiple_contexts: Boolean(payload.has_multiple_contexts),
      no_instance_yet: Boolean(payload.no_instance_yet),
    };
  }

  console.warn('[workspace] RPC get_user_workspace indisponible, repli legacy:', error?.message);
  return getWorkspaceLegacy(adminClient, user, email);
}

/**
 * Raccourci pour les Server Components : ne déclenche aucun appel réseau
 * tant qu'aucun cookie de session n'est présent (pages publiques).
 */
export async function getInitialAuthState(): Promise<{
  user: User | null;
  authUser: AuthUser | null;
}> {
  const cookieStore = await cookies();
  const hasSession = cookieStore
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token') && !c.name.includes('code-verifier'));

  if (!hasSession) {
    return { user: null, authUser: null };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { user: null, authUser: null };
  }

  return { user, authUser: await getWorkspace(user) };
}

// ────────────────────────────────────────────────────────────────────────────
// Repli : ancien chemin en trois requêtes, conservé tant que la migration 010
// n'est pas déployée sur toutes les bases.
// ────────────────────────────────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>;

async function getWorkspaceLegacy(
  adminClient: AdminClient,
  user: User,
  email: string
): Promise<AuthUser | null> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data: superAdminRows } = await adminClient
    .from('users_roles')
    .select('role')
    .or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`)
    .eq('role', 'super_admin')
    .limit(1);

  if (superAdminRows && superAdminRows.length > 0) {
    return {
      id: user.id,
      email,
      role: 'super_admin',
      instance_id: null,
      voter: undefined,
      admin_instances: [],
      voter_instances: [],
      has_multiple_contexts: false,
    };
  }

  const allInstances: UserInstanceSummary[] = [];

  const { data: instancesData, error: rpcError } = await adminClient.rpc('get_user_instances', {
    p_user_id: user.id,
    p_email: normalizedEmail,
  });

  if (!rpcError && Array.isArray(instancesData)) {
    instancesData.forEach((row: {
      context: string;
      instance_id: string;
      instance_name: string;
      instance_status: string;
      logo_url: string | null;
      primary_color: string | null;
      user_role: string;
      voter_id: string | null;
      is_registered: boolean | null;
    }) => {
      allInstances.push({
        context: row.context as UserInstanceSummary['context'],
        instance_id: row.instance_id,
        instance_name: row.instance_name || 'Élection',
        instance_status: (row.instance_status || 'active') as UserInstanceSummary['instance_status'],
        logo_url: row.logo_url || null,
        primary_color: row.primary_color || '#22c55e',
        role: (row.user_role || 'voter') as UserRole,
        voter_id: row.voter_id || null,
        is_registered: row.is_registered ?? true,
      });
    });
  } else {
    console.warn('[workspace] get_user_instances indisponible:', rpcError?.message);

    const [rolesRes, votersRes] = await Promise.all([
      adminClient
        .from('users_roles')
        .select('role, instance_id, election_instances(id, name, status, logo_url, primary_color)')
        .or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`)
        .in('role', ['admin', 'manager', 'observer']),
      adminClient
        .from('voters')
        .select('id, instance_id, is_registered, election_instances(id, name, status, logo_url, primary_color)')
        .or(`auth_uid.eq.${user.id},email.ilike.${normalizedEmail}`),
    ]);

    type InstanceJoin = {
      id: string;
      name: string;
      status: string;
      logo_url: string | null;
      primary_color: string | null;
    } | null;

    rolesRes.data?.forEach((ur) => {
      if (!ur.instance_id) return;
      const inst = ur.election_instances as unknown as InstanceJoin;
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

    votersRes.data?.forEach((v) => {
      if (!v.instance_id) return;
      const inst = v.election_instances as unknown as InstanceJoin;
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

  const adminInstances = allInstances.filter((i) => i.context === 'admin_instance');
  const voterInstances = allInstances.filter((i) => i.context === 'voter_instance');

  if (adminInstances.length === 0 && voterInstances.length === 0) {
    return {
      id: user.id,
      email,
      role: 'admin',
      instance_id: null,
      voter: undefined,
      admin_instances: [],
      voter_instances: [],
      has_multiple_contexts: false,
      no_instance_yet: true,
    };
  }

  let primaryRole: UserRole = 'admin';
  let primaryInstanceId: string | null = null;

  if (adminInstances.length > 0) {
    const sorted = [...adminInstances].sort(
      (a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99)
    );
    primaryRole = sorted[0].role;
    primaryInstanceId = adminInstances.length === 1 ? adminInstances[0].instance_id : null;
  } else {
    primaryRole = 'voter';
    primaryInstanceId = voterInstances.length === 1 ? voterInstances[0].instance_id : null;
  }

  let voterData: Voter | undefined;
  if (primaryRole === 'voter' && voterInstances.length === 1) {
    const { data: voterRows } = await adminClient
      .from('voters')
      .select('*')
      .or(`auth_uid.eq.${user.id},email.ilike.${normalizedEmail}`)
      .eq('instance_id', voterInstances[0].instance_id)
      .limit(1);
    voterData = (voterRows?.[0] as Voter) || undefined;
  }

  return {
    id: user.id,
    email,
    role: primaryRole,
    instance_id: primaryInstanceId,
    voter: voterData,
    admin_instances: adminInstances,
    voter_instances: voterInstances,
    has_multiple_contexts: adminInstances.length > 0 && voterInstances.length > 0,
  };
}
