'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Target, 
  Trophy, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Clock,
  Loader2
} from 'lucide-react';
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useOrders } from '@/hooks/use-orders';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';

export default function WeeklyGoalsPage() {
  const router = useRouter();
  const { orders, isLoading, updateOrder } = useOrders();

  // 1. Calcular datas da semana atual (Domingo a Sábado)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  // 2. Filtrar pedidos da semana
  const weeklyOrders = useMemo(() => {
    return orders.filter(order => {
      if (!order.deliveryDate) return false;
      try {
        const deliveryDate = parseISO(order.deliveryDate);
        return isWithinInterval(deliveryDate, { start: weekStart, end: weekEnd });
      } catch (e) {
        return false;
      }
    });
  }, [orders, weekStart, weekEnd]);

  // 3. Estatísticas da semana
  const stats = useMemo(() => {
    const total = weeklyOrders.length;
    const completed = weeklyOrders.filter(o => o.status === 'Concluído' || o.status === 'Entregue').length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, progress };
  }, [weeklyOrders]);

  const dateRangeLabel = `${format(weekStart, "dd 'de' MMM", { locale: ptBR })} a ${format(weekEnd, "dd 'de' MMM", { locale: ptBR })}`;

  const handleQuickConclude = async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
    } catch (err) {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-cyan-500 selection:text-black">
      <DashboardSidebar />
      
      {/* Background Glows (Cyberpunk Style) */}
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-600 opacity-[0.05] blur-[150px] pointer-events-none rounded-full z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-cyan-600 opacity-[0.05] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-6 md:p-12 space-y-12 mt-16 md:mt-0 z-10 pb-32">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')}
              className="text-zinc-500 hover:text-cyan-400 p-0 h-auto gap-2 uppercase text-[10px] font-black tracking-widest transition-colors"
            >
              <ChevronLeft size={14} /> Voltar ao Dashboard
            </Button>
            <div className="flex items-center gap-3 text-cyan-400">
              <Target size={18} className="animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.6em]">Objetivos Estratégicos</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase leading-none">
              Meta da <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">Semana</span>
            </h1>
            <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px] tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <CalendarIcon size={12} /> {dateRangeLabel}
            </div>
          </div>

          {/* Stats Summary Widget */}
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] flex items-center gap-8 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Total</p>
              <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="text-center">
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Concluídos</p>
              <p className="text-2xl font-black text-cyan-400">{stats.completed}</p>
            </div>
          </div>
        </header>

        {/* Progress Bar Section */}
        <section className="space-y-6 bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden group">
          <div className="flex justify-between items-end mb-2 relative z-10">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Progresso da Meta</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ritmo de entrega semanal</p>
            </div>
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-400">
              {Math.round(stats.progress)}%
            </span>
          </div>
          
          <div className="relative h-4 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-white/5 p-1 z-10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 2, ease: "circOut" }}
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.5)]"
            />
          </div>

          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <TrendingUp size={120} strokeWidth={1} className="text-cyan-400" />
          </div>
        </section>

        {/* Orders List Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 px-2 border-b border-white/5 pb-4">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Clock className="text-purple-400 w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Fila Semanal</h3>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Pedidos agendados para este período</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {weeklyOrders.length > 0 ? (
              weeklyOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={{
                    id: order.id,
                    client: order.client,
                    description: order.items?.[0]?.desc || 'Sem descrição técnica',
                    status: order.status,
                    deliveryDate: order.deliveryDate
                  }} 
                  onClick={() => router.push(`/orders`)}
                  onQuickConclude={handleQuickConclude}
                />
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[3rem]"
              >
                <div className="p-8 bg-cyan-500/10 rounded-full border border-cyan-500/20 shadow-[0_0_40px_rgba(34,211,238,0.1)]">
                  <Trophy className="text-cyan-400 w-20 h-20" />
                </div>
                <div className="space-y-3 px-6">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Sem Metas Pendentes</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold max-w-xs leading-relaxed mx-auto">
                    Excelente trabalho! Todos os pedidos da semana foram concluídos ou não há agendamentos para este período.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
