
'use client';

import { query, collection, orderBy, onSnapshot, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useState, useEffect, useCallback } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
      console.error("Erro ao escutar ordens:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [ordersQuery]);

  const createOrder = useCallback(async (data: any) => {
    if (!firestore) return;
    
    const orderRef = doc(collection(firestore, 'orders'));
    const payload = {
      ...data,
      id: orderRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(orderRef, payload);
      return payload;
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: orderRef.path,
        operation: 'create',
        requestResourceData: payload
      }));
      throw err;
    }
  }, [firestore]);

  const stats = {
    arte: orders.filter(o => o.status === 'Arte').length,
    impressao: orders.filter(o => o.status === 'Impressão').length,
    acabamento: orders.filter(o => o.status === 'Acabamento').length,
    concluido: orders.filter(o => o.status === 'Entregue' || o.status === 'Concluído').length,
  };

  return { orders, stats, isLoading, createOrder };
}
