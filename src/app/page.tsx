
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import Image from 'next/image';

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

  /**
   * MOTOR DE ORDENAÇÃO CRONOLÓGICA (CLIENT-SIDE)
   * Prioriza prazos mais próximos e joga nulos para o final.
   */
  const activeOrders = useMemo(() => {
    return orders
      .filter(o => !['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => {
        // Normalização de Datas (String ou Timestamp)
        const dateA = a.delivery_date || a.deliveryDate || '9999-12-31';
        const dateB = b.delivery_date || b.deliveryDate || '9999-12-31';
        
        // Ordenação Ascendente (Mais antigo/próximo primeiro)
        return dateA.localeCompare(dateB);
      });
  }, [orders]);

  const handleEditOrder = useCallback((order: any) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0">
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full z-0" />

      {/* HEADER REFATORADO: ALINHAMENTO À DIREITA DO CARD */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="hidden lg:block lg:col-span-8" />
        <div className="lg:col-span-4 flex justify-end items-center">
          <div className="relative w-48 h-12">
            <Image 
              src="https://firebasestorage.googleapis.com/v0/b/studio-8015019704-68176.firebasestorage.app/o/logo%20IMPACTO.png?alt=media&token=c481fc0a-08b9-4613-bb67-d4052b3a39dd"
              alt="Logo IMPACTO"
              fill
              className="object-contain object-right"
              priority
            />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#0c0c0e] border border-zinc-800/60 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <ProductionHub stats={stats} />
        </div>
        <div className="lg:col-span-4 bg-[#0c0c0e] border border-zinc-800/60 rounded-3xl p-8 shadow-xl flex flex-col justify-between h-full relative overflow-hidden group">
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
            {activeOrders.length > 0 ? (
              activeOrders.map((order) => (
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
