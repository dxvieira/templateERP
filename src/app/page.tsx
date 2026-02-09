
"use client"

import React, { useMemo } from 'react';
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
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();

  // Query memorizada para o hook
  const ordersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'orders'), orderBy('created_at', 'desc'));
  }, [db]);

  const { data: orders, loading: ordersLoading } = useCollection(ordersQuery);

  // Redirecionamento se não logado
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || (user && ordersLoading)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[10px] text-primary uppercase tracking-[0.5em] animate-pulse">Sincronizando Terminal...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8">
        {/* Header Section */}
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
              onClick={() => router.push('/orders/new')}
              className="bg-primary text-black font-black uppercase tracking-widest px-8 h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] hover:bg-primary transition-all gap-3"
            >
              <Plus className="w-5 h-5" />
              Nova Ordem de Serviço
            </Button>
          </motion.div>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardStatCard label="Arte Final" value={orders.filter(o => o.status === 'Arte').length.toString()} icon={Palette} />
          <DashboardStatCard label="Impressão" value={orders.filter(o => o.status === 'Impressão').length.toString()} icon={Printer} />
          <DashboardStatCard label="Acabamento" value={orders.filter(o => o.status === 'Acabamento').length.toString()} icon={Hammer} />
          <DashboardStatCard label="Concluído" value={orders.filter(o => o.status === 'Entregue').length.toString()} icon={CheckCircle2} />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Feed */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="glass-card border-none bg-black/20">
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-6">
                <CardTitle className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Monitor de Protocolos</CardTitle>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#FF5F1F]" />
                   <span className="text-[9px] text-primary font-black uppercase tracking-widest">Live Sync</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <AnimatePresence mode="popLayout">
                  {orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order, idx) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <OrderCard order={{
                            id: order.os_number?.toString() || order.id,
                            client: order.client_name,
                            description: order.items?.[0]?.desc || 'Sem descrição',
                            status: order.status,
                            deliveryDate: order.deadline,
                            value: order.total_value,
                            isDelayed: false // Lógica pode ser adicionada comparando datas
                          }} />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Analytics & Alerts */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ProductionChart />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <WarRoom />
            </motion.div>
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-12 border-t border-white/5">
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.5em] text-center">
            SISTEMA VISCOMM COMMAND CENTER • OPERAÇÃO SEGURA 2025
          </p>
        </div>
      </main>
    </div>
  );
}
