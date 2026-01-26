'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { InstanceProvider, useInstance } from '@/contexts/InstanceContext';
import { InstanceSidebar } from '@/components/sidebar/InstanceSidebar';
import { createClient } from '@/lib/supabase/client';

function InstanceLayoutContent({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { authUser, loading: authLoading } = useAuth();
  const { loading: instanceLoading, error: instanceError, currentInstance } = useInstance();

  const instanceId = params.instanceId as string;

  // Verifier l'acces a l'instance
  useEffect(() => {
    if (!authLoading && !instanceLoading && authUser && currentInstance) {
      // super_admin a acces a tout
      if (authUser.role === 'super_admin') return;

      // Les autres roles doivent avoir une assignation a cette instance
      const hasAccess = authUser.instance_id === instanceId;
      if (!hasAccess) {
        router.push('/');
      }
    }
  }, [authLoading, instanceLoading, authUser, currentInstance, instanceId, router]);

  if (authLoading || instanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (instanceError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{instanceError}</p>
          <button
            onClick={() => router.push('/super-admin')}
            className="mt-4 text-green-600 hover:underline"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  // Rediriger vers login si non authentifié
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/login');
    }
  }, [authLoading, authUser, router]);

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirection...</p>
        </div>
      </div>
    );
  }

  // Les votants n'ont pas besoin de la sidebar - ils voient uniquement la page de vote
  const isVoter = authUser.role === 'voter';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isVoter && <InstanceSidebar instanceId={instanceId} />}
      <main className={`transition-all duration-300 p-4 sm:p-6 ${isVoter ? '' : 'lg:ml-64 pt-16 lg:pt-6'}`}>
        {children}
      </main>
    </div>
  );
}

function InstanceLayoutWithProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const instanceId = params.instanceId as string;

  return (
    <InstanceProvider initialInstanceId={instanceId}>
      <InstanceLayoutContent>{children}</InstanceLayoutContent>
    </InstanceProvider>
  );
}

export default function InstanceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <InstanceLayoutWithProvider>{children}</InstanceLayoutWithProvider>
    </AuthProvider>
  );
}
