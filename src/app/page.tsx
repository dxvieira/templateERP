
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Loader2,
  AlertTriangle,
  Layers,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

import { useOrders } from '@/hooks/use-orders';
import { useUser } from '@/firebase';

import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { ProductionHub } from '@/components/dashboard/ProductionHub';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { WeeklyTargetCard } from '@/components/dashboard/WeeklyTargetCard';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';

// --- UTILITÁRIOS DE DATA (Puras e Estáveis) ---
const getTodayStr = () => new Date().toISOString().split('T')[0];

const isCompleted = (status: string) => ['Concluído', 'Entregue'].includes(status);

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { orders, stats, isLoading } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // --- MEMOIZAÇÃO DE DATAS ---
  const dateBounds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      todayStr: today.toISOString().split('T')[0],
      weekStart: startOfWeek(today, { weekStartsOn: 0 }),
      weekEnd: endOfWeek(today, { weekStartsOn: 0 })
    };
  }, []);

  // --- SEPARAÇÃO DE LISTAS (OTIMIZAÇÃO EXTREMA) ---
  const categorizedOrders = useMemo(() => {
    const warRoom: any[] = [];
    const productionQueue: any[] = [];
    const completedList: any[] = [];
    let weeklyPendingCount = 0;

    orders.forEach(order => {
      const status = order.status || 'Aguardando';
      const deliveryDate = order.deliveryDate || '';
      const done = isCompleted(status);

      // Contador de Metas
      if (!done && deliveryDate) {
        try {
          const d = parseISO(deliveryDate);
          if (isWithinInterval(d, { start: dateBounds.weekStart, end: dateBounds.weekEnd })) {
            weeklyPendingCount++;
          }
        } catch (e) { /* ignore invalid dates */ }
      }

      if (done) {
        completedList.push(order);
      } else if (deliveryDate && deliveryDate <= dateBounds.todayStr) {
        warRoom.push(order);
      } else {
        productionQueue.push(order);
      }
    });

    // Ordenação Estável
    warRoom.sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
    productionQueue.sort((a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999'));
    completedList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

    return { warRoom, productionQueue, completedList, weeklyPendingCount };
  }, [orders, dateBounds]);

  const { warRoom, productionQueue, completedList, weeklyPendingCount } = categorizedOrders;

  // --- HANDLERS MEMOIZADOS ---
  const handleEditOrder = useCallback((order: any) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-8 mt-16 md:mt-0 z-10 pb-24">
        {/* --- HEADER: UPPERCASE & MINIMAL --- */}
        <header className="flex flex-col justify-end items-start mb-8 pt-4">
          
          {/* 1. Título Principal (AGORA EM MAIÚSCULO) */}
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-snug">
            CENTRAL DE COMANDO
            <span className="text-[#FF5F1F]">.</span>
          </h1>

          {/* 2. Subtítulo (Laranja Fixo + Animação de Expansão) */}
          <div className="flex items-center gap-3 mt-2 group cursor-default">
             {/* Linha: Cresce e fica laranja no hover */}
             <div className="h-[1px] w-6 bg-zinc-800 group-hover:w-12 group-hover:bg-[#FF5F1F] transition-all duration-300 ease-out"></div>
             
             {/* Texto: Laranja fixo. No hover, ele expande (tracking) e fica branco para contraste */}
             <span className="text-[#FF5F1F] text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 group-hover:tracking-[0.35em] group-hover:text-white">
               IMPACTO COMUNICAÇÃO VISUAL
             </span>
          </div>
        </header>

        {/* --- HUB DE INTELIGÊNCIA --- */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          <div className="lg:col-span-2">
            <ProductionHub stats={stats} />
          </div>
          <div className="lg:col-span-1">
            <WeeklyTargetCard pendingCount={weeklyPendingCount} />
          </div>
        </section>

        {/* --- WAR ROOM (CARROSSEL MOBILE / GRID DESKTOP) --- */}
        {warRoom.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2 border-b border-destructive/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-destructive/10 rounded-lg animate-pulse">
                  <AlertTriangle className="text-destructive w-4 h-4" />
                </div>
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Pedidos Críticos ({warRoom.length})</h3>
              </div>
              <span className="md:hidden text-[8px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1">Deslize <ChevronRight size={10}/></span>
            </div>
            
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 md:grid md:grid-cols-2 md:overflow-visible neon-scrollbar">
              {warRoom.map((order) => (
                <div key={order.id} className="min-w-[85vw] sm:min-w-[400px] snap-center md:min-w-0">
                  <OrderCard order={order} onClick={handleEditOrder} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- FILA DE PRODUÇÃO --- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded-lg"><Layers className="text-primary w-4 h-4" /></div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fila de Produção ({productionQueue.length})</h3>
            </div>
            <span className="md:hidden text-[8px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1">Deslize <ChevronRight size={10}/></span>
          </div>
          
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 md:grid md:grid-cols-2 md:overflow-visible neon-scrollbar">
            {productionQueue.length > 0 ? productionQueue.map((order) => (
              <div key={order.id} className="min-w-[85vw] sm:min-w-[400px] snap-center md:min-w-0">
                <OrderCard order={order} onClick={handleEditOrder} />
              </div>
            )) : (
              <div className="w-full py-10 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-rawer">Fila Nominal Limpa</p>
              </div>
            )}
          </div>
        </section>

        {/* --- HISTÓRICO RECENTE --- */}
        {completedList.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2 border-b border-green-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="text-emerald-500 w-4 h-4" /></div>
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Concluídos Recentemente</h3>
              </div>
              <span className="md:hidden text-[8px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1">Deslize <ChevronRight size={10}/></span>
            </div>
            
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 md:grid md:grid-cols-2 md:overflow-visible neon-scrollbar">
              {completedList.slice(0, 10).map((order) => (
                <div key={order.id} className="min-w-[85vw] sm:min-w-[400px] snap-center md:min-w-0">
                  <OrderCard order={order} onClick={handleEditOrder} />
                </div>
              ))}
            </div>
          </section>
        )}

        <OrderFormModal 
          isOpen={isModalOpen} 
          order={editingOrder} 
          onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} 
        />
      </main>
    </div>
  );
}
