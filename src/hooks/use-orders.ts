
'use client';

import { query, collection, orderBy, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';

/**
 * Hook unificado para gestão de fluxo de dados de Ordens de Serviço.
 * Garante sincronização em tempo real entre Dashboard e Monitor de Ordens.
 */
export function useOrders() {
  const { firestore } = useFirestore();
  const { user, isUserLoading } = useUser();

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(
      collection(firestore, 'orders'), 
      orderBy('createdAt', 'desc')
    ) as Query<DocumentData>;
  }, [firestore, user, isUserLoading]);

  const { data: orders, isLoading, error } = useCollection<any>(ordersQuery);

  return {
    orders: orders || [],
    isLoading,
    error,
    totalCount: orders?.length || 0
  };
}
