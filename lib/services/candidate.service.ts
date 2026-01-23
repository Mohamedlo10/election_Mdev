import { createClient } from '@/lib/supabase/client';
import type { Candidate, CreateCandidate, UpdateCandidate, CandidateWithCategory, ApiResponse } from '@/types';

const supabase = createClient();

export async function getCandidates(categoryId: string): Promise<ApiResponse<Candidate[]>> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('category_id', categoryId)
    .order('full_name');

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Candidate[], error: null, success: true };
}

export async function getCandidatesByInstance(instanceId: string): Promise<ApiResponse<CandidateWithCategory[]>> {
  const { data, error } = await supabase
    .from('candidates')
    .select(`
      *,
      category:categories!inner(*)
    `)
    .eq('category.instance_id', instanceId)
    .order('full_name');

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as CandidateWithCategory[], error: null, success: true };
}

export async function getCandidate(id: string): Promise<ApiResponse<Candidate>> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Candidate, error: null, success: true };
}

export async function createCandidate(candidate: CreateCandidate): Promise<ApiResponse<Candidate>> {
  const { data, error } = await supabase
    .from('candidates')
    .insert(candidate)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Candidate, error: null, success: true };
}

export async function updateCandidate(id: string, updates: UpdateCandidate): Promise<ApiResponse<Candidate>> {
  const { data, error } = await supabase
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Candidate, error: null, success: true };
}

export async function deleteCandidate(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id);

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: null, error: null, success: true };
}

export async function uploadCandidatePhoto(file: File, candidateId: string): Promise<ApiResponse<string>> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${candidateId}-${Date.now()}.${fileExt}`;
  const filePath = `photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filePath, file);

  if (uploadError) {
    return { data: null, error: uploadError.message, success: false };
  }

  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath);

  return { data: urlData.publicUrl, error: null, success: true };
}

export async function uploadCandidateProgram(file: File, candidateId: string): Promise<ApiResponse<string>> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${candidateId}-${Date.now()}.${fileExt}`;
  const filePath = `programs/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('programs')
    .upload(filePath, file);

  if (uploadError) {
    return { data: null, error: uploadError.message, success: false };
  }

  const { data: urlData } = supabase.storage
    .from('programs')
    .getPublicUrl(filePath);

  return { data: urlData.publicUrl, error: null, success: true };
}
