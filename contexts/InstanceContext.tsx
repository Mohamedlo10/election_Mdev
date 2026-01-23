'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
}

const defaultTheme: InstanceTheme = {
  primary: '#22c55e',
  secondary: '#1f2937',
  accent: '#eab308',
};

const InstanceContext = createContext<InstanceContextType | undefined>(undefined);

function applyThemeToDocument(theme: InstanceTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-accent', theme.accent);

  // Versions claires (10% opacité)
  root.style.setProperty('--theme-primary-light', `${theme.primary}1a`);
  root.style.setProperty('--theme-secondary-light', `${theme.secondary}1a`);
  root.style.setProperty('--theme-accent-light', `${theme.accent}1a`);
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

  const supabase = createClient();

  const fetchInstance = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('election_instances')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('[Instance] Fetch error:', fetchError);
      setError('Instance non trouvée');
      setLoading(false);
      return null;
    }

    return data as ElectionInstance;
  }, [supabase]);

  const setInstanceById = useCallback(async (id: string) => {
    const instance = await fetchInstance(id);
    if (instance) {
      setCurrentInstance(instance);
      setInstanceId(id);
      const newTheme: InstanceTheme = {
        primary: instance.primary_color || defaultTheme.primary,
        secondary: instance.secondary_color || defaultTheme.secondary,
        accent: instance.accent_color || defaultTheme.accent,
      };
      setTheme(newTheme);
      applyThemeToDocument(newTheme);
    }
    setLoading(false);
  }, [fetchInstance]);

  const setInstance = useCallback((instance: ElectionInstance) => {
    setCurrentInstance(instance);
    setInstanceId(instance.id);
    const newTheme: InstanceTheme = {
      primary: instance.primary_color || defaultTheme.primary,
      secondary: instance.secondary_color || defaultTheme.secondary,
      accent: instance.accent_color || defaultTheme.accent,
    };
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
    setLoading(false);
  }, []);

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

  // Charger l'instance initiale si fournie
  useEffect(() => {
    if (initialInstanceId && !currentInstance) {
      setInstanceById(initialInstanceId);
    }
  }, [initialInstanceId, currentInstance, setInstanceById]);

  // Appliquer le thème au chargement
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const value: InstanceContextType = {
    currentInstance,
    instanceId,
    loading,
    error,
    theme,
    setInstanceById,
    setInstance,
    clearInstance,
    refreshInstance,
  };

  return (
    <InstanceContext.Provider value={value}>
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
