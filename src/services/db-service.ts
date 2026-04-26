'use client';

import { 
  Firestore, 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  QuerySnapshot, 
  DocumentData,
  runTransaction,
  doc,
  getDoc
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * @fileOverview dbService - Camada de Acesso a Dados (DAL).
 * Centraliza as interações com o Firestore utilizando a sintaxe modular v9.
 */

export const dbService = {
  /**
   * Estabelece uma conexão em tempo real com a coleção de ordens.
   * @param db Instância injetada do Firestore.
   * @param onUpdate Callback acionado a cada mudança nos documentos.
   * @returns Unsubscribe function para limpeza de memória.
   */
  subscribeToOrders: (db: Firestore, onUpdate: (snapshot: QuerySnapshot<DocumentData>) => void) => {
    const ordersRef = collection(db, 'orders');
    
    // Query otimizada por data de criação para manter o fluxo cronológico
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    // Retorno do listener em tempo real com tratamento de erro contextual
    return onSnapshot(q, 
      (snapshot) => {
        onUpdate(snapshot);
      }, 
      async (error) => {
        const permissionError = new FirestorePermissionError({
          path: ordersRef.path,
          operation: 'list',
        });
        // Emite erro para o listener global de segurança
        errorEmitter.emit('permission-error', permissionError);
      }
    );
  },

  /**
   * Obtém o próximo número sequencial para uma nova OS em formato 00001.
   * Utiliza transações para evitar duplicidade em disparos simultâneos.
   */
  getNextOrderNumber: async (db: Firestore): Promise<string> => {
    const counterRef = doc(db, 'counters', 'order_sequence');

    const nextId = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let current = 0;
      
      if (counterSnap.exists()) {
        current = counterSnap.data().current || 0;
      }
      
      const next = current + 1;
      transaction.set(counterRef, { current: next }, { merge: true });
      
      // Formata com leading zeros (ex: 00001)
      return String(next).padStart(5, '0');
    });

    return nextId;
  }
};
