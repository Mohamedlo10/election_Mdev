'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { authUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!authUser) {
      router.push('/');
      return;
    }

    // Rediriger selon le role
    if (authUser.role === 'super_admin') {
      router.push('/super-admin');
    } else if (authUser.instance_id) {
      // admin, observer, voter -> vers leur instance
      router.push(`/instance/${authUser.instance_id}`);
    } else if (authUser.role === 'admin') {
      // Admin sans instance -> page de creation d'instance
      router.push('/admin-setup');
    } else {
      // Observer ou voter sans instance -> retour a la page d'accueil
      router.push('/');
    }
  }, [authUser, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirection en cours...</p>
      </div>
    </div>
  );
}
