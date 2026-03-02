'use client';

import { 
  Firestore, 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  QuerySnapshot, 
  DocumentData 
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * @fileOverview dbService - Gerenciador de conexão em tempo real com Firestore.
 * Implementa o padrão Observer para escutar mudanças na base de dados.
 */

export const dbService = {
  /**
   * Escuta a coleção de pedidos em tempo real.
   * @param db Instância do Firestore.
   * @param callback Função executada a cada atualização.
   * @returns Função de unsubscribe para cleanup.
   */
  subscribeToOrders: (db: Firestore, callback: (snapshot: QuerySnapshot<DocumentData>) => void) => {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    // O onSnapshot retorna automaticamente a função de cancelamento (unsubscribe)
    return onSnapshot(q, (snapshot) => {
      callback(snapshot);
    }, async (error) => {
      const permissionError = new FirestorePermissionError({
        path: ordersRef.path,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  }
};
