'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ElectionProvider } from '@/hooks/useElection';
import Sidebar from '@/components/dashboard/Sidebar';
import { Loader2, AlertCircle, LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { authUser, loading, hasNoRole, user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authUser && !hasNoRole && !user) {
      router.push('/login');
    }
  }, [loading, authUser, hasNoRole, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto" />
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Utilisateur connecté mais sans rôle assigné
  if (hasNoRole && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Accès non autorisé
          </h2>
          <p className="text-gray-600 mb-6">
            Votre compte ({user.email}) n&apos;a pas encore été assigné à une élection.
            Veuillez contacter l&apos;administrateur pour obtenir l&apos;accès.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  return (
    <ElectionProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="ml-64 min-h-screen transition-all duration-300">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ElectionProvider>
  );
}
