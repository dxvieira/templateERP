'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { dbService } from '@/services/db-service';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

/**
 * Hook useOrders - Motor de métricas e CRUD do Dashboard.
 * Sincronizado em tempo real via dbService.
 */
export function useOrders() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Inicia a escuta em tempo real
    const unsubscribe = dbService.subscribeToOrders(firestore, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(docs);
      setIsLoading(false);
    });

    // Cleanup: Remove o listener quando o componente desmonta
    return () => unsubscribe();
  }, [firestore, user]);

  // --- CRUD OPERATIONS ---
  const updateOrder = useCallback(async (orderId: string, data: any) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    try {
      await updateDoc(orderRef, { ...data, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error("Erro ao atualizar OS:", err);
    }
  }, [firestore]);

  // --- ENGINE DE MÉTRICAS (MEMOIZADA) ---
  const stats = useMemo(() => {
    const now = new Date();
    // Consistência: Semana começa na Segunda-feira (weekStartsOn: 1)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const s = {
      activeCount: 0,
      weeklyGoalCount: 0,
      arte: 0,
      impressao: 0,
      serralheria: 0,
      acabamento: 0,
      instalacao: 0,
      concluido: 0
    };

    orders.forEach(o => {
      const isDone = ['Concluído', 'Entregue'].includes(o.status);
      const delivery = o.delivery_date || o.deliveryDate || '';
      const isManualPriority = o.weekly_priority === true;

      if (!isDone) {
        s.activeCount++;
        
        // Verifica se pertence à meta da semana (POR DATA OU POR TAG MANUAL)
        if (isManualPriority) {
          s.weeklyGoalCount++;
        } else if (delivery) {
          try {
            if (isWithinInterval(parseISO(delivery), { start: weekStart, end: weekEnd })) {
              s.weeklyGoalCount++;
            }
          } catch (e) {}
        }
      }

      // Distribuição por status (Alimenta o ProductionHub)
      const status = o.status;
      if (status === 'Arte') s.arte++;
      else if (status === 'Impressão') s.impressao++;
      else if (status === 'Serralheria') s.serralheria++;
      else if (status === 'Acabamento') s.acabamento++;
      else if (status === 'Instalação') s.instalacao++;
      
      if (isDone) s.concluido++;
    });

    return s;
  }, [orders]);

  return { orders, stats, isLoading, updateOrder };
}
