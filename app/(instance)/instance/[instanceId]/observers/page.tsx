'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ObserversRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const instanceId = params.instanceId as string;

  useEffect(() => {
    if (instanceId) {
      router.replace(`/instance/${instanceId}/team`);
    }
  }, [instanceId, router]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
      <p className="text-sm text-gray-500">Redirection vers la gestion de l&apos;équipe...</p>
    </div>
  );
}
