
"use client"

import React, { useMemo, memo } from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { ProductionChart } from '@/components/dashboard/ProductionChart';
import { WarRoom } from '@/components/dashboard/WarRoom';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Printer, Hammer, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

// Memoized Header to prevent re-renders on data sync
const DashboardHeader = memo(({ onNewOrder }: { onNewOrder: () => void }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="text-3xl font-black tracking-tighter text-white uppercase">Central de Comando</h2>
      <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em] font-medium">Operação em Tempo Real</p>
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Button 
        onClick={onNewOrder}
        className="bg-primary text-black font-black uppercase tracking-widest px-8 h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] hover:bg-primary transition-all gap-3"
      >
        <Plus className="w-5 h-5" />
        Nova Ordem de Serviço
      </Button>
    </motion.div>
  </div>
));
DashboardHeader.displayName = 'DashboardHeader';

export default function DashboardPage() {
  const router = useRouter();
  const db = useFirestore();

  // Memoized Query Reference - Preventing effect re-runs
  const ordersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: orders, loading: ordersLoading } = useCollection(ordersQuery);

  // Memoized Stats - Recalculated only when orders data changes
  const stats = useMemo(() => ({
    arte: orders?.filter(o => o.status === 'Arte').length || 0,
    impressao: orders?.filter(o => o.status === 'Impressão').length || 0,
    acabamento: orders?.filter(o => o.status === 'Acabamento').length || 0,
    concluido: orders?.filter(o => o.status === 'Entregue').length || 0,
  }), [orders]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8">
        <DashboardHeader onNewOrder={() => router.push('/orders/new')} />

        {/* KPIs Section - Memoized data access */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardStatCard label="Arte Final" value={stats.arte.toString()} icon={Palette} />
          <DashboardStatCard label="Impressão" value={stats.impressao.toString()} icon={Printer} />
          <DashboardStatCard label="Acabamento" value={stats.acabamento.toString()} icon={Hammer} />
          <DashboardStatCard label="Concluído" value={stats.concluido.toString()} icon={CheckCircle2} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Card className="glass-card border-none bg-black/20">
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-6">
                <CardTitle className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Monitor de Protocolos</CardTitle>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#FF5F1F]" />
                   <span className="text-[9px] text-primary font-black uppercase tracking-widest">
                     {ordersLoading ? 'Sincronizando...' : 'Live Sync'}
                   </span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {ordersLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Carregando dados da rede...</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {orders && orders.length > 0 ? (
                      <div className="space-y-4">
                        {orders.map((order, idx) => (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.02 }} // Optimized stagger
                          >
                            <OrderCard order={{
                              id: order.id,
                              client: order.client || 'Cliente não identificado',
                              description: order.items?.[0]?.desc || order.items?.[0]?.code || 'Sem descrição',
                              status: order.status,
                              deliveryDate: order.deliveryDate,
                              value: order.totalValue || 0,
                              isDelayed: order.isDelayed || false
                            }} />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState />
                    )}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <ProductionChart />
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <WarRoom />
            </motion.div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5">
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.5em] text-center">
            SISTEMA VISCOMM COMMAND CENTER • OPERAÇÃO SEGURA 2025
          </p>
        </div>
      </main>
    </div>
  );
}
