'use client';

import { query, collection, orderBy, onSnapshot, doc, serverTimestamp, setDoc, updateDoc, runTransaction, deleteDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useState, useEffect, useCallback } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook centralizador de Ordens de Serviço.
 * Gerencia a sincronização em tempo real (onSnapshot) e mutações via transações para IDs sequenciais.
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
      console.error("Erro no Snapshot:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [ordersQuery]);

  /**
   * Cria uma nova Ordem de Serviço com ID Sequencial (#000001) usando transação atômica.
   */
  const createOrder = useCallback(async (data: any) => {
    if (!firestore) throw new Error("Firestore não inicializado");
    
    const counterRef = doc(firestore, 'counters', 'orders_counter');
    
    try {
      return await runTransaction(firestore, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let nextCount = 1;
        if (counterDoc.exists()) {
          nextCount = (counterDoc.data().count || 0) + 1;
        }
        
        // Formata o ID como 000001
        const formattedId = nextCount.toString().padStart(6, '0');
        const orderRef = doc(firestore, 'orders', formattedId);
        
        const payload = {
          ...data,
          id: formattedId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Remove campos undefined para evitar erro do Firestore
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        // Grava a OS e atualiza o contador na mesma transação
        transaction.set(orderRef, payload);
        transaction.set(counterRef, { count: nextCount }, { merge: true });
        
        return payload;
      });
    } catch (err: any) {
      console.error('Erro na transação de criação:', err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'orders/transaction',
        operation: 'create',
        requestResourceData: data
      }));
      throw err;
    }
  }, [firestore]);

  const updateOrder = useCallback(async (orderId: string, data: any) => {
    if (!firestore) throw new Error("Firestore não inicializado");
    
    const orderRef = doc(firestore, 'orders', orderId);
    const payload = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    try {
      await updateDoc(orderRef, payload);
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: orderRef.path,
        operation: 'update',
        requestResourceData: payload
      }));
      throw err;
    }
  }, [firestore]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!firestore) throw new Error("Firestore não inicializado");
    
    const orderRef = doc(firestore, 'orders', orderId);
    try {
      await deleteDoc(orderRef);
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: orderRef.path,
        operation: 'delete'
      }));
      throw err;
    }
  }, [firestore]);

  const stats = {
    total: orders.length,
    arte: orders.filter(o => o.status === 'Arte').length,
    impressao: orders.filter(o => o.status === 'Impressão').length,
    acabamento: orders.filter(o => o.status === 'Acabamento').length,
    concluido: orders.filter(o => o.status === 'Entregue' || o.status === 'Concluído').length,
  };

  return { orders, stats, isLoading, createOrder, updateOrder, deleteOrder };
}
