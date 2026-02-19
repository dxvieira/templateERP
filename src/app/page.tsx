'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Loader2,
  AlertTriangle,
  Layers,
  CheckCircle2,
  ChevronRight,
  Target
} from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

import { useOrders } from '@/hooks/use-orders';
import { useUser } from '@/firebase';

import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { ProductionHub } from '@/components/dashboard/ProductionHub';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { WeeklyTargetCard } from '@/components/dashboard/WeeklyTargetCard';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';

/**
 * DASHBOARD SUPREMO: NEXUS/FLUX
 * Refatorado para Latência Zero e 60FPS.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { orders, stats, isLoading } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // --- ESTABILIZAÇÃO DE REFERÊNCIAS ---
  const handleEditOrder = useCallback((order: any) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOrder(false);
    setEditingOrder(null);
  }, []);

  // --- MOTOR DE PROCESSAMENTO DE DADOS (MEMOIZAÇÃO AGRESSIVA) ---
  const categorizedData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    const result = {
      warRoom: [] as any[],
      productionQueue: [] as any[],
      recentHistory: [] as any[],
      weeklyPendingCount: 0
    };

    orders.forEach(order => {
      const isDone = ['Concluído', 'Entregue'].includes(order.status);
      const delivery = order.deliveryDate || '';

      // Cálculo de Meta Semanal
      if (!isDone && delivery) {
        try {
          if (isWithinInterval(parseISO(delivery), { start: weekStart, end: weekEnd })) {
            result.weeklyPendingCount++;
          }
        } catch (e) {}
      }

      if (isDone) {
        result.recentHistory.push(order);
      } else if (delivery && delivery <= todayStr) {
        result.warRoom.push(order);
      } else {
        result.productionQueue.push(order);
      }
    });

    // Ordenação atômica (Só ocorre se a lista mudar)
    result.warRoom.sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
    result.productionQueue.sort((a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999'));
    result.recentHistory.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

    return result;
  }, [orders]);

  useEffect(() => {
    if (!isUserLoading && !user) router.replace('/login');
  }, [user, isUserLoading, router]);

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      
      {/* Background Orbs (GPU Accelerated) */}
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-10 mt-16 md:mt-0 z-10 pb-24">
        {/* --- HEADER: UPPERCASE & MINIMAL --- */}
        <header className="flex flex-col justify-end items-start pt-4">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none">
            CENTRAL DE COMANDO
            <span className="text-[#FF5F1F]">.</span>
          </h1>
          <div className="flex items-center gap-3 mt-2 group cursor-default">
             <div className="h-[1px] w-6 bg-zinc-800 group-hover:w-12 group-hover:bg-[#FF5F1F] transition-all duration-500 ease-out" />
             <span className="text-[#FF5F1F] text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] transition-all duration-500 group-hover:tracking-[0.35em] group-hover:text-white">
               IMPACTO COMUNICAÇÃO VISUAL
             </span>
          </div>
        </header>

        {/* --- HUB DE INTELIGÊNCIA OPERACIONAL --- */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProductionHub stats={stats} />
          </div>
          <div className="lg:col-span-1">
            <WeeklyTargetCard pendingCount={categorizedData.weeklyPendingCount} />
          </div>
        </section>

        {/* --- WAR ROOM: PEDIDOS CRÍTICOS --- */}
        {categorizedData.warRoom.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2 border-b border-destructive/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-destructive/10 rounded-lg animate-pulse">
                  <AlertTriangle className="text-destructive w-4 h-4" />
                </div>
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Protocolos Críticos ({categorizedData.warRoom.length})</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence mode='popLayout'>
                {categorizedData.warRoom.map((order) => (
                  <motion.div 
                    layout 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }}
                    key={order.id}
                  >
                    <OrderCard order={order} onClick={handleEditOrder} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* --- FILA DE PRODUÇÃO NOMINAL --- */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-primary/10 rounded-lg"><Layers className="text-primary w-4 h-4" /></div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fluxo de Produção Ativo ({categorizedData.productionQueue.length})</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categorizedData.productionQueue.length > 0 ? (
              categorizedData.productionQueue.map((order) => (
                <OrderCard key={order.id} order={order} onClick={handleEditOrder} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Fila Nominal Desimpedida</p>
              </div>
            )}
          </div>
        </section>

        {/* --- HISTÓRICO DE ENTREGAS --- */}
        {categorizedData.recentHistory.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2 border-b border-green-500/20 pb-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="text-emerald-500 w-4 h-4" /></div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Finalizados Recentemente</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60 hover:opacity-100 transition-opacity duration-500">
              {categorizedData.recentHistory.slice(0, 6).map((order) => (
                <OrderCard key={order.id} order={order} onClick={handleEditOrder} />
              ))}
            </div>
          </section>
        )}

        <OrderFormModal 
          isOpen={isModalOpen} 
          order={editingOrder} 
          onClose={handleCloseModal} 
        />
      </main>
    </div>
  );
}
