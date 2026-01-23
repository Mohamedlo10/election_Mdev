'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ElectionProvider } from '@/hooks/useElection';
import Sidebar from '@/components/dashboard/Sidebar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { authUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authUser) {
      router.push('/login');
    }
  }, [loading, authUser, router]);

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
