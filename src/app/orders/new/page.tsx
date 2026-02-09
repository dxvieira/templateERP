
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redireciona para o novo Dashboard de Gestão de Ordens.
 * O formulário agora vive dentro do Modal na página principal de orders.
 */
export default function LegacyNewOrderPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/orders');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,95,31,0.5)]" />
    </div>
  );
}
