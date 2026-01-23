import { createClient } from '@/lib/supabase/client';
import type {
  ElectionInstance,
  CreateElectionInstance,
  UpdateElectionInstance,
  ElectionStats,
  ApiResponse
} from '@/types';

const supabase = createClient();

// Obtenir toutes les instances (super admin)
export async function getAllInstances(): Promise<ApiResponse<ElectionInstance[]>> {
  const { data, error } = await supabase
    .from('election_instances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as ElectionInstance[], error: null, success: true };
}

// Obtenir une instance par ID
export async function getInstance(id: string): Promise<ApiResponse<ElectionInstance>> {
  const { data, error } = await supabase
    .from('election_instances')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as ElectionInstance, error: null, success: true };
}

// Créer une instance
export async function createInstance(
  instance: CreateElectionInstance
): Promise<ApiResponse<ElectionInstance>> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('election_instances')
    .insert({
      ...instance,
      created_by: userData.user?.id,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as ElectionInstance, error: null, success: true };
}

// Mettre à jour une instance
export async function updateInstance(
  id: string,
  updates: UpdateElectionInstance
): Promise<ApiResponse<ElectionInstance>> {
  const { data, error } = await supabase
    .from('election_instances')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as ElectionInstance, error: null, success: true };
}

// Supprimer une instance
export async function deleteInstance(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('election_instances')
    .delete()
    .eq('id', id);

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: null, error: null, success: true };
}

// Démarrer une élection
export async function startElection(id: string): Promise<ApiResponse<ElectionInstance>> {
  return updateInstance(id, {
    status: 'active',
  });
}

// Mettre en pause une élection
export async function pauseElection(id: string): Promise<ApiResponse<ElectionInstance>> {
  return updateInstance(id, {
    status: 'paused',
  });
}

// Terminer une élection
export async function endElection(id: string): Promise<ApiResponse<ElectionInstance>> {
  return updateInstance(id, {
    status: 'completed',
  });
}

// Archiver une élection
export async function archiveElection(id: string): Promise<ApiResponse<ElectionInstance>> {
  return updateInstance(id, {
    status: 'archived',
  });
}

// Obtenir les statistiques d'une instance
export async function getElectionStats(instanceId: string): Promise<ApiResponse<ElectionStats>> {
  const { data, error } = await supabase
    .rpc('get_election_stats', { p_instance_id: instanceId });

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  const stats = data[0];
  return {
    data: {
      instance_id: instanceId,
      total_voters: Number(stats.total_voters),
      registered_voters: Number(stats.registered_voters),
      votes_cast: Number(stats.votes_cast),
      participation_rate: stats.registered_voters > 0
        ? (stats.votes_cast / stats.registered_voters) * 100
        : 0,
      categories_count: Number(stats.categories_count),
      candidates_count: Number(stats.candidates_count),
    },
    error: null,
    success: true,
  };
}

// Upload logo
export async function uploadLogo(file: File, instanceId: string): Promise<ApiResponse<string>> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${instanceId}-${Date.now()}.${fileExt}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(filePath, file);

  if (uploadError) {
    return { data: null, error: uploadError.message, success: false };
  }

  const { data: urlData } = supabase.storage
    .from('logos')
    .getPublicUrl(filePath);

  return { data: urlData.publicUrl, error: null, success: true };
}

// Assigner un admin à une instance
export async function assignAdmin(
  userId: string,
  instanceId: string,
  role: 'admin' | 'observer'
): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('users_roles')
    .insert({
      user_id: userId,
      instance_id: instanceId,
      role,
    });

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: null, error: null, success: true };
}

// Supprimer un admin d'une instance
export async function removeAdmin(
  userId: string,
  instanceId: string
): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('users_roles')
    .delete()
    .eq('user_id', userId)
    .eq('instance_id', instanceId);

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: null, error: null, success: true };
}

// Obtenir les admins d'une instance
export async function getInstanceAdmins(instanceId: string): Promise<ApiResponse<{
  user_id: string;
  role: string;
  email: string;
}[]>> {
  const { data, error } = await supabase
    .from('users_roles')
    .select('user_id, role')
    .eq('instance_id', instanceId)
    .in('role', ['admin', 'observer']);

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as { user_id: string; role: string; email: string }[], error: null, success: true };
}
