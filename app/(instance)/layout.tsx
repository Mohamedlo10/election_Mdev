'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { InstanceProvider, useInstance } from '@/contexts/InstanceContext';
import { InstanceSidebar } from '@/components/sidebar/InstanceSidebar';
import LoadingScreen from '@/components/ui/LoadingScreen';
import SignOutConfirmDialog from '@/components/ui/SignOutConfirmDialog';

function InstanceLayoutContent({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { authUser, loading: authLoading, signOut } = useAuth();
  const { loading: instanceLoading, error: instanceError, currentInstance } = useInstance();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  const instanceId = params.instanceId as string;

  // Rediriger vers login si non authentifié
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/login');
    }
  }, [authLoading, authUser, router]);

  // Verifier l'acces a l'instance
  useEffect(() => {
    if (!authLoading && !instanceLoading && authUser && currentInstance) {
      // super_admin a acces a tout
      if (authUser.role === 'super_admin') return;

      // Les autres rôles doivent avoir une assignation à cette instance (admin ou voter)
      const hasAdminAccess = authUser.admin_instances?.some(i => i.instance_id === instanceId);
      const hasVoterAccess = authUser.voter_instances?.some(i => i.instance_id === instanceId);
      const hasAccess = hasAdminAccess || hasVoterAccess || authUser.instance_id === instanceId;

      if (!hasAccess) {
        router.push('/dashboard');
      }
    }
  }, [authLoading, instanceLoading, authUser, currentInstance, instanceId, router]);

  if (authLoading || instanceLoading) {
    return <LoadingScreen message="Chargement de l'élection..." />;
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

  if (!authUser) {
    return <LoadingScreen message="Redirection en cours..." />;
  }

  // Déterminer si l'utilisateur est administrateur sur CETTE instance spécifique
  const isSuperAdmin = authUser.role === 'super_admin';
  const isAdminOnThisInstance = isSuperAdmin || authUser.admin_instances?.some(i => i.instance_id === instanceId);
  const isVoterOnThisInstance = !isAdminOnThisInstance;

  return (
    <div className="min-h-screen bg-gray-50">
      {isVoterOnThisInstance ? (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
              Retour à Mon Espace
            </Link>
            {currentInstance && (
              <span className="text-sm font-semibold text-gray-800 truncate max-w-xs sm:max-w-md">
                {currentInstance.name}
              </span>
            )}
            <button
              onClick={() => setIsSignOutOpen(true)}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Se déconnecter</span>
            </button>
          </div>
        </header>
      ) : (
        <InstanceSidebar instanceId={instanceId} />
      )}
      <main className={`transition-all duration-300 p-4 sm:p-6 ${isVoterOnThisInstance ? '' : 'lg:ml-64 pt-16 lg:pt-6'}`}>
        {children}
      </main>
      <SignOutConfirmDialog isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} />
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
  return <InstanceLayoutWithProvider>{children}</InstanceLayoutWithProvider>;
}
