
'use client';

import { query, collection, orderBy, onSnapshot } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useState, useEffect } from 'react';

export function useOrders() {
  const { firestore } = useFirestore();
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);

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
    });

    return () => unsubscribe();
  }, [ordersQuery]);

  const stats = {
    arte: orders.filter(o => o.status === 'Arte').length,
    impressao: orders.filter(o => o.status === 'Impressão').length,
    acabamento: orders.filter(o => o.status === 'Acabamento').length,
    concluido: orders.filter(o => o.status === 'Entregue').length,
  };

  return { orders, stats };
}
