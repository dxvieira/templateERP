
'use client';

import { query, collection, orderBy, Query, DocumentData, onSnapshot } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useState, useEffect } from 'react';

/**
 * Hook central de dados para Ordens de Serviço.
 * Sincroniza Dashboard e Lista em tempo real.
 */
export function useOrders() {
  const { firestore } = useFirestore();
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  useEffect(() => {
    if (!ordersQuery) return;

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(docs);
      setIsLoading(false);
    }, (err) => {
      console.error("Erro no Monitor de Ordens:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [ordersQuery]);

  const stats = {
    arte: orders.filter(o => o.status === 'Arte').length,
    impressao: orders.filter(o => o.status === 'Impressão').length,
    acabamento: orders.filter(o => o.status === 'Acabamento').length,
    concluido: orders.filter(o => o.status === 'Entregue').length,
  };

  return { orders, isLoading, stats };
}
