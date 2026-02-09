
'use client';

import React, { useMemo } from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useOrders } from '@/hooks/use-orders';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Printer, Hammer, CheckCircle2, Zap, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  
  // Consome o fluxo de dados unificado
  const { orders, isLoading } = useOrders();

  // KPIs calculados dinamicamente em tempo real
  const stats = useMemo(() => ({
    arte: orders.filter(o => o.status === 'Arte').length,
    impressao: orders.filter(o => o.status === 'Impressão').length,
    acabamento: orders.filter(o => o.status === 'Acabamento').length,
    concluido: orders.filter(o => o.status === 'Entregue').length,
  }), [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary animate-pulse" />
              <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white uppercase">Central de Comando</h2>
            </div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em]">Monitoramento Live via Firebase</p>
          </div>
          
          <Button 
            onClick={() => router.push('/orders')}
            className="bg-primary text-black font-black uppercase tracking-widest px-8 h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] transition-all"
          >
            <Plus className="w-5 h-5 mr-2" /> Nova OS
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
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">Protocolos Ativos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {orders.slice(0, 8).map((order) => (
                <motion.div key={order.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <OrderCard order={{
                    id: order.id,
                    client: order.client,
                    description: order.items[0]?.desc || 'Sem descrição',
                    status: order.status,
                    deliveryDate: order.deliveryDate,
                    value: order.totalValue
                  }} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {orders.length === 0 && <EmptyState />}
        </div>
      </main>
    </div>
  );
}
