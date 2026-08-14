'use client';

import { useEffect, useState } from 'react';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  timeoutMs?: number;
}

/**
 * Écran de chargement avec timeout de sécurité.
 * Après `timeoutMs` (défaut 5s), affiche un bouton de déconnexion
 * pour permettre à l'utilisateur de repartir d'un état propre.
 */
export default function LoadingScreen({ message = 'Chargement...', timeoutMs = 5000 }: LoadingScreenProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  const handleSignOut = async () => {
    try {
      // Effacer le localStorage
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

      // Effacer les cookies Supabase via l'API
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
    } finally {
      window.location.href = '/login';
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Chargement trop long
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            La session prend trop de temps à répondre. Cela peut être dû à une session expirée ou une connexion instable.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleReload}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter et recommencer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-green-500 mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
}
