import { collection, query, where, getDocs, limit, orderBy, Firestore } from 'firebase/firestore';
import { Client } from '../types/client';

export const searchClients = async (firestore: Firestore | null, searchTerm: string): Promise<Client[]> => {
  if (!firestore || !searchTerm || searchTerm.trim().length < 2) return [];

  try {
    const clientsRef = collection(firestore, 'clients');
    const searchUpper = searchTerm.toUpperCase();
    const searchAsIs = searchTerm;
    const searchCapitalized = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
    
    // Como Firestore não suporta Case-Insensitive natively para busca de prefixo,
    // realizaremos queries em paralelo para as variações mais comuns.
    const queries = [
      query(clientsRef, where('name', '>=', searchUpper), where('name', '<=', searchUpper + '\uf8ff'), limit(5)),
      query(clientsRef, where('name', '>=', searchAsIs), where('name', '<=', searchAsIs + '\uf8ff'), limit(5)),
      query(clientsRef, where('name', '>=', searchCapitalized), where('name', '<=', searchCapitalized + '\uf8ff'), limit(5))
    ];

    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    
    // Merge de resultados únicos
    const allDocs = new Map();
    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        allDocs.set(doc.id, { id: doc.id, ...doc.data() } as Client);
      });
    });

    return Array.from(allDocs.values()).slice(0, 7);
  } catch (error) {
    console.error("Erro na busca de clientes Firebase:", error);
    return [];
  }
};
