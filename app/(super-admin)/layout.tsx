'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminSidebar from '@/components/sidebar/SuperAdminSidebar';
import { Loader2 } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { authUser, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Rediriger si non connecté
      if (!user) {
        router.push('/login');
        return;
      }

      // Rediriger si pas super_admin
      if (authUser && authUser.role !== 'super_admin') {
        // Rediriger vers l'instance si l'utilisateur a une instance assignée
        if (authUser.instance_id) {
          router.push(`/instance/${authUser.instance_id}`);
        } else {
          router.push('/login');
        }
      }
    }
  }, [loading, authUser, user, router]);

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

  // Ne pas afficher si pas super_admin
  if (!authUser || authUser.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <main className="lg:ml-64 min-h-screen transition-all duration-300 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
