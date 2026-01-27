'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// La page register n'est plus nécessaire avec le système OTP
// Redirection automatique vers login
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <p className="text-gray-600">Redirection...</p>
    </div>
  );
}
