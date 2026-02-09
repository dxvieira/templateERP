
'use client';

import React, { useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useOrders } from '@/hooks/use-orders';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Printer, Hammer, CheckCircle2, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  
  // Consome o mesmo hook centralizador para garantir que os KPIs atualizem sozinhos
  const { orders, stats, isLoading } = useOrders();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary animate-pulse" />
              <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white uppercase">Painel de Controle</h2>
            </div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em] font-medium">Monitoramento Cloud Reativo</p>
          </div>
          
          <Button 
            onClick={() => router.push('/orders')}
            className="bg-primary text-black font-black uppercase tracking-widest px-8 h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" /> Gerenciar OS
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <DashboardStatCard label="Arte Final" value={stats.arte.toString()} icon={Palette} />
          <DashboardStatCard label="Impressão" value={stats.impressao.toString()} icon={Printer} />
          <DashboardStatCard label="Acabamento" value={stats.acabamento.toString()} icon={Hammer} />
          <DashboardStatCard label="Concluído" value={stats.concluido.toString()} icon={CheckCircle2} />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/40"></span>
              Fila de Produção Recente
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {orders.slice(0, 8).map((order) => (
                <motion.div 
                  key={order.id} 
                  layout 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <OrderCard order={{
                    id: order.id,
                    client: order.client,
                    description: order.items?.[0]?.desc || 'Sem descrição',
                    status: order.status,
                    deliveryDate: order.deliveryDate || 'N/A',
                    value: order.totalValue || 0
                  }} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {!isLoading && orders.length === 0 && <EmptyState />}
        </div>
      </main>
    </div>
  );
}
