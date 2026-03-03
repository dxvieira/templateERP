'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { dbService } from '@/services/db-service';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

/**
 * Hook useOrders - Camada de Lógica de Negócio (Controller).
 * Gerencia o estado dos pedidos e deriva métricas para o Dashboard.
 */
export function useOrders() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * EFEITO DE SINCRONIZAÇÃO:
   * Conecta ao Firestore apenas se o usuário estiver autenticado.
   * Implementa rigorosamente o Unsubscribe para evitar memory leaks.
   */
  useEffect(() => {
    if (!firestore || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Inicia a escuta via serviço modular
    const unsubscribe = dbService.subscribeToOrders(firestore, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(docs);
      setIsLoading(false);
    });

    // CLEANUP: Executado ao desmontar o componente ou trocar de usuário
    return () => unsubscribe();
  }, [firestore, user]);

  /**
   * Operação de atualização de status (Etapa da OS).
   */
  const updateOrder = useCallback(async (orderId: string, data: any) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    try {
      await updateDoc(orderRef, { ...data, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error("Falha na mutação do documento:", err);
    }
  }, [firestore]);

  /**
   * ENGINE DE MÉTRICAS (MEMOIZADA):
   * Processa a distribuição de status e metas sem re-cálculos desnecessários.
   */
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const s = {
      total: orders.length,
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

      // Filtro de distribuição para o gráfico do Reator
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
