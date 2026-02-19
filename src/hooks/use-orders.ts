
'use client';

import { query, collection, orderBy, onSnapshot, doc, serverTimestamp, runTransaction, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook centralizador de Ordens de Serviço com Performance Optimizada.
 * Utiliza memoização profunda para evitar re-renders em cascata.
 */
export function useOrders() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  useEffect(() => {
    if (!ordersQuery) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(docs);
      setIsLoading(false);
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'orders',
        operation: 'list'
      }));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [ordersQuery]);

  // --- CRUD OPERATIONS (MEMOIZADAS) ---
  const createOrder = useCallback(async (data: any) => {
    if (!firestore) return;
    const counterRef = doc(firestore, 'counters', 'orders_counter');
    try {
      return await runTransaction(firestore, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextCount = 1;
        if (counterDoc.exists()) {
          nextCount = (counterDoc.data().count || 0) + 1;
        }
        const formattedId = nextCount.toString().padStart(6, '0');
        const orderRef = doc(firestore, 'orders', formattedId);
        const payload = { ...data, id: formattedId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        transaction.set(orderRef, payload);
        transaction.set(counterRef, { count: nextCount }, { merge: true });
        return payload;
      });
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'orders/transaction', operation: 'create', requestResourceData: data }));
    }
  }, [firestore]);

  const updateOrder = useCallback(async (orderId: string, data: any) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const payload = { ...data, updatedAt: serverTimestamp() };
    try {
      await updateDoc(orderRef, payload);
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: payload }));
    }
  }, [firestore]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    try {
      await deleteDoc(orderRef);
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'delete' }));
    }
  }, [firestore]);

  // --- STATS ENGINE (CRÍTICO PARA PERFORMANCE) ---
  // Memoização profunda para evitar que o ProductionHub re-renderize se os números não mudarem.
  const stats = useMemo(() => {
    const s = { total: orders.length, arte: 0, impressao: 0, serralheria: 0, acabamento: 0, instalacao: 0, concluido: 0 };
    orders.forEach(o => {
      const status = o.status;
      if (status === 'Arte') s.arte++;
      else if (status === 'Impressão') s.impressao++;
      else if (status === 'Serralheria') s.serralheria++;
      else if (status === 'Acabamento') s.acabamento++;
      else if (status === 'Instalação') s.instalacao++;
      if (status === 'Entregue' || status === 'Concluído') s.concluido++;
    });
    return s;
  }, [orders]);

  return { orders, stats, isLoading, createOrder, updateOrder, deleteOrder };
}
