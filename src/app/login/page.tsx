
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Rota de login desativada. Redireciona automaticamente para a Home.
 */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
