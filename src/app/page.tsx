'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';

import { useOrders } from '@/hooks/use-orders';
import { useUser } from '@/firebase';

import { ProductionHub } from '@/components/dashboard/ProductionHub';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { WeeklyTargetCard } from '@/components/dashboard/WeeklyTargetCard';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { orders, stats, isLoading } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // Redirecionamento silencioso em background
  useEffect(() => {
    if (!isUserLoading && !user) router.replace('/login');
  }, [user, isUserLoading, router]);

  const handleEditOrder = useCallback((order: any) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0">
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full z-0" />

      <header className="flex flex-col justify-end items-start">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none uppercase">
          Central de Comando<span className="text-primary">.</span>
        </h1>
        <div className="flex items-center gap-3 mt-2">
           <div className="h-[1px] w-6 bg-zinc-800" />
           <span className="text-primary text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">
             Impacto Comunicação Visual
           </span>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#0c0c0e] border border-zinc-800/60 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <ProductionHub stats={stats} />
        </div>
        <div className="lg:col-span-4 bg-[#0c0c0e] border border-zinc-800/60 rounded-3xl p-8 shadow-xl flex flex-col justify-between h-full">
          <WeeklyTargetCard pendingCount={stats.weeklyGoalCount} />
        </div>
      </section>

      <div className="space-y-10">
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-primary/10 rounded-lg"><Layers className="text-primary w-4 h-4" /></div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fluxo de Produção Real-Time ({stats.activeCount})</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {orders.filter(o => !['Concluído', 'Entregue'].includes(o.status)).length > 0 ? (
              orders.filter(o => !['Concluído', 'Entregue'].includes(o.status)).map((order) => (
                <OrderCard key={order.id} order={order} onClick={handleEditOrder} />
              ))
            ) : !isLoading && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Fila Nominal Desimpedida</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <OrderFormModal 
        isOpen={isModalOpen} 
        order={editingOrder} 
        onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} 
      />
    </div>
  );
}
