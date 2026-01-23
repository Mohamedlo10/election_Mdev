import { createClient } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

// Générer un code à 6 chiffres
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Vérifier si l'email est dans la liste des votants
export async function checkVoterEmail(email: string): Promise<ApiResponse<{
  voter_id: string;
  instance_id: string;
  instance_name: string;
  full_name: string;
  is_registered: boolean;
} | null>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('check_voter_email', { p_email: email });

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  if (!data || data.length === 0) {
    return { data: null, error: 'Email non trouvé dans la liste des votants', success: false };
  }

  // Prendre le premier résultat (un email peut être dans plusieurs instances)
  const voter = data[0];
  return {
    data: {
      voter_id: voter.voter_id,
      instance_id: voter.instance_id,
      instance_name: voter.instance_name,
      full_name: voter.full_name,
      is_registered: voter.is_registered,
    },
    error: null,
    success: true,
  };
}

// Créer un compte votant avec code à 6 chiffres
export async function registerVoter(
  email: string,
  voterId: string,
  code: string
): Promise<ApiResponse<{ userId: string }>> {
  const supabase = createClient();

  // Créer le compte auth avec le code comme mot de passe
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: code,
  });

  if (authError) {
    return { data: null, error: authError.message, success: false };
  }

  if (!authData.user) {
    return { data: null, error: 'Erreur lors de la création du compte', success: false };
  }

  // Mettre à jour le votant avec l'auth_uid
  const { error: updateError } = await supabase
    .rpc('register_voter', {
      p_voter_id: voterId,
      p_auth_uid: authData.user.id,
    });

  if (updateError) {
    return { data: null, error: updateError.message, success: false };
  }

  return {
    data: { userId: authData.user.id },
    error: null,
    success: true,
  };
}

// Connexion votant
export async function signInVoter(
  email: string,
  code: string
): Promise<ApiResponse<{ userId: string }>> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: code,
  });

  if (error) {
    return { data: null, error: 'Email ou code invalide', success: false };
  }

  return {
    data: { userId: data.user.id },
    error: null,
    success: true,
  };
}

// Connexion admin/super admin
export async function signInAdmin(
  email: string,
  password: string
): Promise<ApiResponse<{ userId: string; role: string }>> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { data: null, error: 'Email ou mot de passe invalide', success: false };
  }

  // Vérifier le rôle
  const { data: roleData, error: roleError } = await supabase
    .from('users_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  if (roleError || !roleData) {
    await supabase.auth.signOut();
    return { data: null, error: 'Accès non autorisé', success: false };
  }

  return {
    data: { userId: data.user.id, role: roleData.role },
    error: null,
    success: true,
  };
}

// Déconnexion
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

// Vérifier si l'utilisateur a un rôle spécifique
export async function checkUserRole(
  userId: string,
  roles: string[]
): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('users_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', roles)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}
