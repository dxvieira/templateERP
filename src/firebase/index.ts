
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

export { FirebaseProvider } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
export { useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';

// Configuração oficial do projeto VisComm Command Center
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD-placeholder-key",
  authDomain: "viscomm-cc.firebaseapp.com",
  projectId: "viscomm-cc",
  storageBucket: "viscomm-cc.appspot.com",
  messagingSenderId: "1770637200745",
  appId: "1:1770637200745:web:9f8e7d6c5b4a3210"
};

export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  const firebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}
