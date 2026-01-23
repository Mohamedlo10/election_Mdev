import { createClient } from '@/lib/supabase/client';
import type { Vote, CreateVote, VoteWithDetails, CategoryResults, ApiResponse } from '@/types';

const supabase = createClient();

// Créer un vote
export async function createVote(vote: CreateVote): Promise<ApiResponse<Vote>> {
  const { data, error } = await supabase
    .from('votes')
    .insert(vote)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'Vous avez déjà voté dans cette catégorie', success: false };
    }
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Vote, error: null, success: true };
}

// Obtenir les votes d'un votant
export async function getVoterVotes(voterId: string): Promise<ApiResponse<VoteWithDetails[]>> {
  const { data, error } = await supabase
    .from('votes')
    .select(`
      *,
      candidate:candidates(*),
      category:categories(*)
    `)
    .eq('voter_id', voterId);

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as VoteWithDetails[], error: null, success: true };
}

// Vérifier si le votant a déjà voté dans une catégorie
export async function hasVotedInCategory(
  voterId: string,
  categoryId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('voter_id', voterId)
    .eq('category_id', categoryId);

  return (count || 0) > 0;
}

// Obtenir les catégories avec statut de vote
export async function getCategoriesWithVoteStatus(
  instanceId: string,
  voterId: string
): Promise<ApiResponse<{
  id: string;
  name: string;
  description: string | null;
  order: number;
  hasVoted: boolean;
  votedCandidateId: string | null;
}[]>> {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('instance_id', instanceId)
    .order('order');

  if (catError) {
    return { data: null, error: catError.message, success: false };
  }

  const { data: votes } = await supabase
    .from('votes')
    .select('category_id, candidate_id')
    .eq('voter_id', voterId);

  const voteMap = new Map(votes?.map((v) => [v.category_id, v.candidate_id]) || []);

  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    order: cat.order,
    hasVoted: voteMap.has(cat.id),
    votedCandidateId: voteMap.get(cat.id) || null,
  }));

  return { data: result, error: null, success: true };
}

// Obtenir les résultats par catégorie
export async function getCategoryResults(categoryId: string): Promise<ApiResponse<CategoryResults>> {
  const { data, error } = await supabase
    .rpc('get_category_results', { p_category_id: categoryId });

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  // Obtenir les infos de la catégorie
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  // Obtenir les infos des candidats
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('category_id', categoryId);

  const candidateMap = new Map(candidates?.map((c) => [c.id, c]) || []);

  const totalVotes = data.reduce((sum: number, r: { votes_count: number }) => sum + Number(r.votes_count), 0);

  const results: CategoryResults = {
    category: category,
    total_votes: totalVotes,
    candidates: data.map((r: { candidate_id: string; votes_count: number; percentage: number }) => ({
      candidate: candidateMap.get(r.candidate_id),
      votes_count: Number(r.votes_count),
      percentage: Number(r.percentage),
    })),
  };

  return { data: results, error: null, success: true };
}

// Obtenir tous les résultats d'une instance
export async function getInstanceResults(instanceId: string): Promise<ApiResponse<CategoryResults[]>> {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id')
    .eq('instance_id', instanceId)
    .order('order');

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  const results: CategoryResults[] = [];

  for (const cat of categories) {
    const result = await getCategoryResults(cat.id);
    if (result.success && result.data) {
      results.push(result.data);
    }
  }

  return { data: results, error: null, success: true };
}

// Obtenir le nombre de votes par heure (pour les graphiques)
export async function getVotesByHour(instanceId: string): Promise<ApiResponse<{
  hour: string;
  count: number;
}[]>> {
  const { data, error } = await supabase
    .from('votes')
    .select('created_at')
    .eq('instance_id', instanceId)
    .order('created_at');

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  const hourCounts = new Map<string, number>();

  data.forEach((vote) => {
    const date = new Date(vote.created_at);
    const hour = `${date.toLocaleDateString('fr-FR')} ${date.getHours()}h`;
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  const result = Array.from(hourCounts.entries()).map(([hour, count]) => ({
    hour,
    count,
  }));

  return { data: result, error: null, success: true };
}
