
'use client';

import { query, collection, orderBy, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';

/**
 * Hook central de dados para Ordens de Serviço.
 * Fonte única de verdade para Dashboard, Histórico e Monitoramento.
 */
export function useOrders() {
  const { firestore } = useFirestore();
  const { user } = useUser();

  // Memoização da query para evitar loops e garantir reatividade real-time
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'orders'), 
      orderBy('createdAt', 'desc')
    ) as Query<DocumentData>;
  }, [firestore, user]);

  const { data: orders, isLoading, error } = useCollection<any>(ordersQuery);

  return {
    orders: orders || [],
    isLoading,
    error,
    totalCount: orders?.length || 0,
    // KPIs calculados em tempo real a partir da fonte de dados
    stats: {
      arte: (orders || []).filter(o => o.status === 'Arte').length,
      impressao: (orders || []).filter(o => o.status === 'Impressão').length,
      acabamento: (orders || []).filter(o => o.status === 'Acabamento' || o.status === 'Serralheria').length,
      concluido: (orders || []).filter(o => o.status === 'Entregue').length,
    }
  };
}
