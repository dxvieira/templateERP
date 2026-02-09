
'use client';

import { query, collection, orderBy, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';

/**
 * Hook central de dados para Ordens de Serviço.
 * Fornece a lista de ordens em tempo real para qualquer componente.
 */
export function useOrders() {
  const { firestore } = useFirestore();
  const { user } = useUser();

  // Memoiza a query para evitar loops de renderização e garantir performance
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
    totalCount: orders?.length || 0
  };
}
