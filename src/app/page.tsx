'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Plus,
  Loader2,
  AlertTriangle,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

import { useOrders } from '@/hooks/use-orders';
import { useUser } from '@/firebase';

import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { ProductionHub } from '@/components/dashboard/ProductionHub';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { WeeklyTargetCard } from '@/components/dashboard/WeeklyTargetCard';
import { Button } from '@/components/ui/button';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { orders, stats, isLoading } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // Lógica de Datas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  const weeklyPendingCount = useMemo(() => {
    return orders.filter(o => {
      if (!o.deliveryDate || ['Concluído', 'Entregue'].includes(o.status)) return false;
      try {
        const d = parseISO(o.deliveryDate);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch (e) { return false; }
    }).length;
  }, [orders, weekStart, weekEnd]);

  const warRoom = useMemo(() => {
    return orders.filter(o => 
      !['Concluído', 'Entregue'].includes(o.status) && 
      o.deliveryDate && 
      o.deliveryDate <= todayStr
    ).sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
  }, [orders, todayStr]);

  const productionQueue = useMemo(() => {
    return orders.filter(o => 
      !['Concluído', 'Entregue'].includes(o.status) && 
      (!o.deliveryDate || o.deliveryDate > todayStr)
    ).sort((a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999'));
  }, [orders, todayStr]);

  const completedList = useMemo(() => {
    return orders.filter(o => ['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [orders]);

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

      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 z-10 pb-24">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Activity size={14} className="animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">Terminal Operacional VisComm</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Fluxo</span>
            </h1>
          </div>
          
          <Button 
            onClick={() => { setEditingOrder(null); setIsModalOpen(true); }}
            className="bg-primary text-black font-black h-10 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 uppercase tracking-widest text-[10px] shadow-[0_5px_20px_-5px_rgba(255,95,31,0.3)] hover:bg-white active:scale-95"
          >
              <Plus size={16} strokeWidth={3} />
              Lançar Pedido
          </Button>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          <div className="lg:col-span-2">
            <ProductionHub stats={stats} />
          </div>
          <div className="lg:col-span-1">
            <WeeklyTargetCard pendingCount={weeklyPendingCount} />
          </div>
        </section>

        {warRoom.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2 border-b border-destructive/20 pb-3">
              <div className="p-1.5 bg-destructive/10 rounded-lg animate-pulse">
                <AlertTriangle className="text-destructive w-4 h-4" />
              </div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Pedidos Críticos ({warRoom.length})</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {warRoom.map((order) => (
                <OrderCard key={order.id} order={order} onClick={setEditingOrder} />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-primary/10 rounded-lg"><Layers className="text-primary w-4 h-4" /></div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fila de Pedidos ({productionQueue.length})</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {productionQueue.map((order) => (
              <OrderCard key={order.id} order={order} onClick={setEditingOrder} />
            ))}
          </div>
        </section>

        {completedList.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2 border-b border-green-500/20 pb-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="text-emerald-500 w-4 h-4" /></div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Concluídos ({completedList.length})</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {completedList.map((order) => (
                <OrderCard key={order.id} order={order} onClick={setEditingOrder} />
              ))}
            </div>
          </section>
        )}

        <OrderFormModal 
          isOpen={isModalOpen || !!editingOrder} 
          order={editingOrder} 
          onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} 
        />
      </main>
    </div>
  );
}
