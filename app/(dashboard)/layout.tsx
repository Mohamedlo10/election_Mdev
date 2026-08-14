'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ElectionProvider } from '@/hooks/useElection';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { authUser, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingScreen message="Chargement de votre espace..." />;
  }

  if (!user) {
    return <LoadingScreen message="Redirection..." />;
  }

  return (
    <ElectionProvider>
      <div className="min-h-screen bg-gray-50">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </ElectionProvider>
  );
}
