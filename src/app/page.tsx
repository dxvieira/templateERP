
"use client"

import React, { useMemo, memo } from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Printer, Hammer, CheckCircle2, Plus, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { ProductionChart } from '@/components/dashboard/ProductionChart';
import { WarRoom } from '@/components/dashboard/WarRoom';

const DashboardHeader = memo(({ onNewOrder }: { onNewOrder: () => void }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-1 min-w-0"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary animate-pulse shrink-0" />
        <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white uppercase whitespace-nowrap truncate">Central de Comando</h2>
      </div>
      <p className="text-muted-foreground text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-medium whitespace-nowrap">Status da Operação em Tempo Real</p>
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full md:w-auto shrink-0"
    >
      <Button 
        onClick={onNewOrder}
        className="w-full md:w-auto bg-primary text-black font-black uppercase tracking-widest px-8 h-12 md:h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] hover:bg-primary transition-all gap-3 active:scale-95 whitespace-nowrap"
      >
        <Plus className="w-5 h-5" />
        Nova OS Digital
      </Button>
    </motion.div>
  </div>
));
DashboardHeader.displayName = 'DashboardHeader';

export default function DashboardPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user || isUserLoading) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  }, [db, user, isUserLoading]);

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  const stats = useMemo(() => ({
    arte: orders?.filter(o => o.status === 'Arte').length || 0,
    impressao: orders?.filter(o => o.status === 'Impressão').length || 0,
    acabamento: orders?.filter(o => o.status === 'Acabamento').length || 0,
    concluido: orders?.filter(o => o.status === 'Entregue').length || 0,
  }), [orders]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6 md:space-y-8 mt-16 md:mt-0 max-w-full overflow-hidden">
        <DashboardHeader onNewOrder={() => router.push('/orders')} />

        <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar snap-x">
          <div className="min-w-[160px] md:min-w-0 snap-center flex-1">
            <DashboardStatCard label="Arte Final" value={stats.arte.toString()} icon={Palette} />
          </div>
          <div className="min-w-[160px] md:min-w-0 snap-center flex-1">
            <DashboardStatCard label="Impressão" value={stats.impressao.toString()} icon={Printer} />
          </div>
          <div className="min-w-[160px] md:min-w-0 snap-center flex-1">
            <DashboardStatCard label="Acabamento" value={stats.acabamento.toString()} icon={Hammer} />
          </div>
          <div className="min-w-[160px] md:min-w-0 snap-center flex-1">
            <DashboardStatCard label="Concluído" value={stats.concluido.toString()} icon={CheckCircle2} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-8 order-2 lg:order-1 space-y-6 min-w-0">
            <Card className="glass-card border-none bg-black/20 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4 md:pb-6 gap-2">
                <CardTitle className="text-[10px] font-black text-primary uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">Protocolos Ativos</CardTitle>
                <div className="flex items-center gap-3 shrink-0">
                   <div className="w-2 h-2 rounded-full bg-primary/40 shadow-[0_0_10px_#FF5F1F] animate-pulse" />
                   <span className="text-[9px] text-primary/60 font-black uppercase tracking-widest hidden sm:inline whitespace-nowrap">
                     Monitoramento Realtime
                   </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <AnimatePresence mode="popLayout">
                  {orders && orders.length > 0 ? (
                    <div className="space-y-3 md:space-y-4">
                      {orders.map((order, idx) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                        >
                          <OrderCard order={{
                            id: order.id,
                            client: order.client || 'Cliente não identificado',
                            description: order.items?.[0]?.desc || 'Sem descrição',
                            status: order.status,
                            deliveryDate: order.deliveryDate,
                            value: order.totalValue || 0,
                            isDelayed: order.isDelayed || false
                          }} />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    !ordersLoading && <EmptyState />
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 order-1 lg:order-2 space-y-6 md:gap-8 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 md:gap-8">
              <div className="min-w-0">
                <ProductionChart orders={orders} />
              </div>
              <div className="min-w-0">
                <WarRoom orders={orders} />
              </div>
            </div>
          </div>
        </div>

        <footer className="pt-8 pb-4 border-t border-white/5">
          <p className="text-[7px] md:text-[9px] text-muted-foreground/30 uppercase tracking-[0.5em] text-center whitespace-nowrap">
            VISCOMM COMMAND CENTER • SECURE TERMINAL v1.0
          </p>
        </footer>
      </main>
    </div>
  );
}
