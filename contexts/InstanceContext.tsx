'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ElectionInstance, InstanceTheme } from '@/types';

interface InstanceContextType {
  currentInstance: ElectionInstance | null;
  instanceId: string | null;
  loading: boolean;
  error: string | null;
  theme: InstanceTheme;
  setInstanceById: (id: string) => Promise<void>;
  setInstance: (instance: ElectionInstance) => void;
  clearInstance: () => void;
  refreshInstance: () => Promise<void>;
  canModifyCategories: boolean;
  canModifyCandidates: boolean;
  canModifyVoters: boolean;
  canAddVoters: boolean;
}

const defaultTheme: InstanceTheme = {
  primary: '#22c55e',
  secondary: '#1f2937',
  accent: '#eab308',
};

const InstanceContext = createContext<InstanceContextType | undefined>(undefined);

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) - (num >> 16) * percent / 100));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - ((num >> 8) & 0x00FF) * percent / 100));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) - (num & 0x0000FF) * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + (255 - (num >> 16)) * percent / 100);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * percent / 100);
  const b = Math.min(255, (num & 0x0000FF) + (255 - (num & 0x0000FF)) * percent / 100);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function applyThemeToDocument(theme: InstanceTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-primary-light', `${theme.primary}1a`);
  root.style.setProperty('--theme-secondary-light', `${theme.secondary}1a`);
  root.style.setProperty('--theme-accent-light', `${theme.accent}1a`);
  root.style.setProperty('--theme-primary-lighter', `${theme.primary}0d`);
  root.style.setProperty('--theme-secondary-lighter', `${theme.secondary}0d`);
  root.style.setProperty('--theme-accent-lighter', `${theme.accent}0d`);
  root.style.setProperty('--theme-primary-medium', `${theme.primary}33`);
  root.style.setProperty('--theme-secondary-medium', `${theme.secondary}33`);
  root.style.setProperty('--theme-accent-medium', `${theme.accent}33`);
  root.style.setProperty('--theme-primary-dark', darkenColor(theme.primary, 10));
  root.style.setProperty('--theme-secondary-dark', darkenColor(theme.secondary, 10));
  root.style.setProperty('--theme-accent-dark', darkenColor(theme.accent, 10));
  root.style.setProperty('--theme-primary-darker', darkenColor(theme.primary, 20));
  root.style.setProperty('--theme-secondary-darker', darkenColor(theme.secondary, 20));
  root.style.setProperty('--theme-accent-darker', darkenColor(theme.accent, 20));
  root.style.setProperty('--theme-primary-bright', lightenColor(theme.primary, 10));
  root.style.setProperty('--theme-secondary-bright', lightenColor(theme.secondary, 10));
  root.style.setProperty('--theme-accent-bright', lightenColor(theme.accent, 10));
}

function resetThemeToDefault() {
  applyThemeToDocument(defaultTheme);
}

export function InstanceProvider({
  children,
  initialInstanceId
}: {
  children: ReactNode;
  initialInstanceId?: string;
}) {
  const [currentInstance, setCurrentInstance] = useState<ElectionInstance | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(initialInstanceId || null);
  const [loading, setLoading] = useState(!!initialInstanceId);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<InstanceTheme>(defaultTheme);

  // ✅ Instance Supabase stable via useRef — évite la boucle de re-renders
  const supabaseRef = useRef(createClient());

  const applyInstance = useCallback((instance: ElectionInstance) => {
    const newTheme: InstanceTheme = {
      primary: instance.primary_color || defaultTheme.primary,
      secondary: instance.secondary_color || defaultTheme.secondary,
      accent: instance.accent_color || defaultTheme.accent,
    };
    setCurrentInstance(instance);
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
  }, []);

  // ✅ fetchInstance stable (sans dépendance à supabase instable)
  const fetchInstance = useCallback(async (id: string): Promise<ElectionInstance | null> => {
    const { data, error: fetchError } = await supabaseRef.current
      .from('election_instances')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !data) {
      console.error('[Instance] Fetch error:', fetchError);
      return null;
    }
    return data as ElectionInstance;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Stable — supabaseRef.current ne change jamais

  const setInstanceById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const instance = await fetchInstance(id);
      if (instance) {
        setInstanceId(id);
        applyInstance(instance);
      } else {
        setError('Instance non trouvée');
      }
    } catch (e) {
      console.error('[Instance] setInstanceById error:', e);
      setError('Erreur lors du chargement de l\'instance');
    } finally {
      setLoading(false);
    }
  }, [fetchInstance, applyInstance]);

  const setInstance = useCallback((instance: ElectionInstance) => {
    setInstanceId(instance.id);
    applyInstance(instance);
    setLoading(false);
  }, [applyInstance]);

  const clearInstance = useCallback(() => {
    setCurrentInstance(null);
    setInstanceId(null);
    setTheme(defaultTheme);
    resetThemeToDefault();
    setError(null);
  }, []);

  const refreshInstance = useCallback(async () => {
    if (instanceId) {
      await setInstanceById(instanceId);
    }
  }, [instanceId, setInstanceById]);

  // ✅ useEffect stable — s'exécute une seule fois au montage avec l'ID initial
  useEffect(() => {
    if (initialInstanceId) {
      setInstanceById(initialInstanceId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Tableau vide intentionnel — initialInstanceId est stable (vient des params URL)

  // Appliquer le thème quand il change
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const isDraft = currentInstance?.status === 'draft';

  return (
    <InstanceContext.Provider value={{
      currentInstance,
      instanceId,
      loading,
      error,
      theme,
      setInstanceById,
      setInstance,
      clearInstance,
      refreshInstance,
      canModifyCategories: isDraft ?? true,
      canModifyCandidates: isDraft ?? true,
      canModifyVoters: isDraft ?? true,
      canAddVoters: isDraft ?? true,
    }}>
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstance() {
  const context = useContext(InstanceContext);
  if (context === undefined) {
    throw new Error('useInstance must be used within an InstanceProvider');
  }
  return context;
}

export { defaultTheme };
