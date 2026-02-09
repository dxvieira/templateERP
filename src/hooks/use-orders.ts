
'use client';

import { query, collection, orderBy, onSnapshot, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useState, useEffect, useCallback } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook centralizador de Ordens de Serviço.
 * Gerencia a sincronização em tempo real (onSnapshot) e a criação de documentos.
 */
export function useOrders() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Memoização da query para evitar re-subscriptions desnecessárias
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  // Listener em tempo real
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
      console.error("Erro crítico no Snapshot:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [ordersQuery]);

  /**
   * Cria uma nova ordem no Firestore.
   * Garante que o ID do payload seja igual ao ID do documento para satisfazer as Security Rules.
   */
  const createOrder = useCallback(async (data: any) => {
    if (!firestore) throw new Error("Firestore não inicializado");
    
    const orderRef = doc(collection(firestore, 'orders'));
    const payload = {
      ...data,
      id: orderRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log('Tentando salvar no Firestore:', payload);

    try {
      await setDoc(orderRef, payload);
      console.log('Documento salvo com sucesso. ID:', orderRef.id);
      return payload;
    } catch (err: any) {
      console.error('Erro na gravação Firestore:', err);
      // Emite erro contextual para o listener global
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: orderRef.path,
        operation: 'create',
        requestResourceData: payload
      }));
      throw err;
    }
  }, [firestore]);

  // KPIs calculados dinamicamente com base no estado 'orders' reativo
  const stats = {
    total: orders.length,
    arte: orders.filter(o => o.status === 'Arte').length,
    impressao: orders.filter(o => o.status === 'Impressão').length,
    acabamento: orders.filter(o => o.status === 'Acabamento').length,
    concluido: orders.filter(o => o.status === 'Entregue' || o.status === 'Concluído').length,
  };

  return { orders, stats, isLoading, createOrder };
}
