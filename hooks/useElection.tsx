'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ElectionInstance, InstanceTheme } from '@/types';

interface ElectionContextType {
  currentInstance: ElectionInstance | null;
  setCurrentInstance: (instance: ElectionInstance | null) => void;
  theme: InstanceTheme;
  refreshInstance: () => Promise<void>;
}

const defaultTheme: InstanceTheme = {
  primary: '#22c55e',
  secondary: '#1f2937',
  accent: '#eab308',
};

const ElectionContext = createContext<ElectionContextType | undefined>(undefined);

export function ElectionProvider({ children }: { children: ReactNode }) {
  const [currentInstance, setCurrentInstance] = useState<ElectionInstance | null>(null);

  const theme: InstanceTheme = currentInstance
    ? {
        primary: currentInstance.primary_color,
        secondary: currentInstance.secondary_color,
        accent: currentInstance.accent_color,
      }
    : defaultTheme;

  const refreshInstance = useCallback(async () => {
    // Refresh instance data if needed
    if (currentInstance) {
      // Re-fetch from API if needed
    }
  }, [currentInstance]);

  return (
    <ElectionContext.Provider
      value={{
        currentInstance,
        setCurrentInstance,
        theme,
        refreshInstance,
      }}
    >
      {children}
    </ElectionContext.Provider>
  );
}

export function useElection() {
  const context = useContext(ElectionContext);
  if (context === undefined) {
    throw new Error('useElection must be used within an ElectionProvider');
  }
  return context;
}
