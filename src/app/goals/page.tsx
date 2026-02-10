'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  ChevronLeft, 
  CalendarDays, 
  Trophy, 
  Rocket,
  CheckCircle2,
  ListTodo,
  Loader2
} from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useOrders } from '@/hooks/use-orders';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';

export default function WeeklyGoalsPage() {
  const router = useRouter();
  const { orders, isLoading, updateOrder } = useOrders();

  // 1. Calcular intervalo da semana (Domingo a Sábado)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  // 2. Filtrar e Separar Pedidos da Semana
  const { pendingOrders, completedOrders, totalWeekly, progress } = useMemo(() => {
    const weekly = orders.filter(order => {
      if (!order.deliveryDate) return false;
      try {
        const d = parseISO(order.deliveryDate);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch (e) {
        return false;
      }
    });

    const pending = weekly.filter(o => !['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));

    const completed = weekly.filter(o => ['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

    const percentage = weekly.length > 0 ? Math.round((completed.length / weekly.length) * 100) : 0;

    return { 
      pendingOrders: pending, 
      completedOrders: completed, 
      totalWeekly: weekly.length,
      progress: percentage
    };
  }, [orders, weekStart, weekEnd]);

  const handleQuickConclude = async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
    } catch (err) {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-purple-500 selection:text-white">
      <DashboardSidebar />
      
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-600 opacity-[0.08] blur-[150px] pointer-events-none rounded-full z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-cyan-600 opacity-[0.08] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-6 md:p-12 space-y-12 mt-16 md:mt-0 z-10 pb-32">
        
        {/* HEADER DE NAVEGAÇÃO */}
        <header className="space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="text-zinc-500 hover:text-purple-400 p-0 h-auto gap-2 uppercase text-[10px] font-black tracking-widest transition-colors"
          >
            <ChevronLeft size={14} /> Voltar ao Terminal
          </Button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px] tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5 w-fit">
                <CalendarDays size={12} className="text-purple-400" /> 
                {format(weekStart, "dd 'de' MMM", { locale: ptBR })} a {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 uppercase tracking-tighter leading-none">
                Meta Semanal
              </h1>
            </div>

            {/* Stats Summary Widget */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] flex items-center gap-8 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Total</p>
                <p className="text-2xl font-black text-white">{totalWeekly}</p>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="text-center">
                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Concluídos</p>
                <p className="text-2xl font-black text-cyan-400">{completedOrders.length}</p>
              </div>
            </div>
          </div>
        </header>

        {/* BARRA DE PROGRESSO (Gamificação) */}
        <section className="bg-zinc-900/40 p-8 md:p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Status da Missão</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">{completedOrders.length}</span>
                <span className="text-zinc-600 font-black text-lg uppercase tracking-widest">/ {totalWeekly} Pedidos</span>
              </div>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              {progress === 100 ? (
                <Trophy className="text-yellow-400 w-8 h-8 animate-bounce" />
              ) : (
                <Target className="text-purple-400 w-8 h-8 animate-pulse" />
              )}
            </div>
          </div>

          <div className="relative h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 p-1 z-10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.4)] relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
          
          {/* Animated background element */}
          <div 
            className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none transition-all duration-1000" 
            style={{ opacity: progress / 100 + 0.1 }}
          />
        </section>

        {/* SEÇÃO 1: FILA DA SEMANA (Pendentes) */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 px-2 border-b border-white/5 pb-4">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <ListTodo className="text-purple-400 w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                Fila da Semana
                <span className="bg-white/5 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full border border-white/10 font-bold">
                  {pendingOrders.length} RESTANTES
                </span>
              </h3>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Pedidos agendados para este período</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pendingOrders.length > 0 ? (
              pendingOrders.map((order) => (
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
                className="py-24 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[3rem]"
              >
                <div className="p-8 bg-purple-500/10 rounded-full border border-purple-500/20">
                  <Rocket className="text-purple-400 w-16 h-16" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Céu Limpo</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold max-w-xs leading-relaxed mx-auto">
                    Nenhuma pendência na fila desta semana. Aproveite para planejar o próximo ciclo.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* SEÇÃO 2: OBJETIVOS CONQUISTADOS (Concluídos) */}
        {completedOrders.length > 0 && (
          <section className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center gap-4 px-2 border-b border-green-500/20 pb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-green-500/20">
                <CheckCircle2 className="text-emerald-500 w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                  Objetivos Conquistados
                  <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase">
                    {completedOrders.length} FEITOS
                  </span>
                </h3>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Troféus de produção da semana</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {completedOrders.map((order) => (
                <div key={order.id} className="opacity-80 hover:opacity-100 transition-opacity">
                  <OrderCard 
                    order={{
                      id: order.id,
                      client: order.client,
                      description: order.items?.[0]?.desc || 'Sem descrição técnica',
                      status: order.status,
                      deliveryDate: order.deliveryDate
                    }} 
                    onClick={() => router.push(`/orders`)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
