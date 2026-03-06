'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  getFirestore,
  Firestore 
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Cache singleton para evitar múltiplas inicializações e conflitos de lease no IndexedDB
let firebaseInstances: {
  firebaseApp: FirebaseApp;
  auth: any;
  firestore: Firestore;
  functions: any;
} | null = null;

/**
 * Inicializa os serviços do Firebase garantindo uma única instância (Singleton).
 * Resolve o erro "Failed to obtain primary lease" ao estabilizar a inicialização do Firestore.
 */
export function initializeFirebase() {
  // Se já inicializado nesta sessão do cliente, retorna as instâncias cacheadas
  if (firebaseInstances) return firebaseInstances;

  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    try {
      // No ambiente do Studio, tentamos a inicialização padrão primeiro
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.warn('Firebase init fallback:', e);
      firebaseApp = getApp();
    }
  } else {
    firebaseApp = getApp();
  }

  firebaseInstances = getSdks(firebaseApp);
  return firebaseInstances;
}

export function getSdks(firebaseApp: FirebaseApp) {
  let firestore: Firestore;
  
  // Verificação de ambiente para evitar crash no SSR do Next.js
  const isServer = typeof window === 'undefined';

  try {
    if (isServer) {
      // No servidor, usamos o Firestore básico sem cache local persistente
      firestore = getFirestore(firebaseApp);
    } else {
      // No cliente, ativamos o Cache Local Persistente.
      // initializeFirestore deve ser chamado apenas uma vez por App.
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ 
          tabManager: persistentMultipleTabManager() 
        })
      });
    }
  } catch (e) {
    // Se já estiver inicializado ou ocorrer erro de lease, recupera a instância existente
    firestore = getFirestore(firebaseApp);
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore,
    functions: getFunctions(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
