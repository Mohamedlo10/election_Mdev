import { createClient } from '@/lib/supabase/client';
import type { Voter, CreateVoter, UpdateVoter, VoterImport, ApiResponse } from '@/types';
import * as XLSX from 'xlsx';

const supabase = createClient();

export async function getVoters(instanceId: string): Promise<ApiResponse<Voter[]>> {
  const { data, error } = await supabase
    .from('voters')
    .select('*')
    .eq('instance_id', instanceId)
    .order('full_name');

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Voter[], error: null, success: true };
}

export async function getVoter(id: string): Promise<ApiResponse<Voter>> {
  const { data, error } = await supabase
    .from('voters')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Voter, error: null, success: true };
}

export async function createVoter(voter: CreateVoter): Promise<ApiResponse<Voter>> {
  const { data, error } = await supabase
    .from('voters')
    .insert({
      ...voter,
      email: voter.email.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'Cet email existe déjà pour cette instance', success: false };
    }
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Voter, error: null, success: true };
}

export async function updateVoter(id: string, updates: UpdateVoter): Promise<ApiResponse<Voter>> {
  const { data, error } = await supabase
    .from('voters')
    .update({
      ...updates,
      email: updates.email?.toLowerCase(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Voter, error: null, success: true };
}

export async function deleteVoter(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('voters')
    .delete()
    .eq('id', id);

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: null, error: null, success: true };
}

export async function deleteMultipleVoters(ids: string[]): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('voters')
    .delete()
    .in('id', ids);

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: null, error: null, success: true };
}

// Parse Excel file
export function parseExcelFile(file: File): Promise<VoterImport[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir en tableau de tableaux pour prendre les colonnes par position
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        
        // Ignorer la première ligne (en-têtes) et mapper les colonnes par position
        const voters: VoterImport[] = jsonData
          .slice(1) // Ignorer les en-têtes
          .map((row) => ({
            full_name: String(row[0] || '').trim(),
            email: String(row[1] || '').trim().toLowerCase(),
          }))
          .filter((v) => v.full_name && v.email);

        resolve(voters);
      } catch {
        reject(new Error('Erreur lors de la lecture du fichier Excel'));
      }
    };

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsBinaryString(file);
  });
}

// Import voters from Excel
export async function importVoters(
  instanceId: string,
  voters: VoterImport[]
): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
  const errors: string[] = [];
  let imported = 0;

  for (const voter of voters) {
    const { error } = await supabase
      .from('voters')
      .insert({
        instance_id: instanceId,
        full_name: voter.full_name,
        email: voter.email.toLowerCase(),
      });

    if (error) {
      if (error.code === '23505') {
        errors.push(`${voter.email}: Email déjà existant`);
      } else {
        errors.push(`${voter.email}: ${error.message}`);
      }
    } else {
      imported++;
    }
  }

  return {
    data: { imported, errors },
    error: null,
    success: true,
  };
}

// Get voters stats
export async function getVotersStats(instanceId: string): Promise<ApiResponse<{
  total: number;
  registered: number;
  notRegistered: number;
}>> {
  const [totalRes, registeredRes] = await Promise.all([
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
    supabase.from('voters').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId).eq('is_registered', true),
  ]);

  const total = totalRes.count || 0;
  const registered = registeredRes.count || 0;

  return {
    data: {
      total,
      registered,
      notRegistered: total - registered,
    },
    error: null,
    success: true,
  };
}
