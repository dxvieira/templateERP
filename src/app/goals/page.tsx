
'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  ChevronLeft, 
  CalendarDays, 
  Trophy, 
  Zap,
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
        <Loader2 className="w-12 h-12 text-green-500 animate-spin shadow-[0_0_20px_rgba(34,197,94,0.3)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-green-500 selection:text-black">
      <DashboardSidebar />
      
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-green-600 opacity-[0.08] blur-[150px] pointer-events-none rounded-full z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-600 opacity-[0.08] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-6 md:p-12 space-y-12 mt-16 md:mt-0 z-10 pb-32">
        
        {/* HEADER DE NAVEGAÇÃO */}
        <header className="space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="text-zinc-500 hover:text-green-400 p-0 h-auto gap-2 uppercase text-[10px] font-black tracking-widest transition-colors"
          >
            <ChevronLeft size={14} /> Voltar ao Terminal
          </Button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px] tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5 w-fit">
                <CalendarDays size={12} className="text-green-500" /> 
                {format(weekStart, "dd 'de' MMM", { locale: ptBR })} a {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-600 uppercase tracking-tighter leading-none">
                Meta da Semana
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
                <p className="text-2xl font-black text-green-400">{completedOrders.length}</p>
              </div>
            </div>
          </div>
        </header>

        {/* BARRA DE PROGRESSO (HUD Energy Bar) */}
        <section className="bg-zinc-900/40 p-8 md:p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <p className="text-green-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                 <Zap size={12} fill="currentColor" /> Status da Missão
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white tracking-tighter">{completedOrders.length}</span>
                <span className="text-zinc-600 font-black text-2xl uppercase tracking-widest">/ {totalWeekly} Pedidos</span>
              </div>
            </div>
            
            <motion.div 
               animate={progress === 100 ? { rotate: [0, -10, 10, 0], scale: 1.1 } : {}}
               transition={{ duration: 0.5, repeat: progress === 100 ? Infinity : 0, repeatDelay: 2 }}
               className={`p-4 rounded-2xl border transition-all duration-500 ${progress === 100 ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'bg-white/5 border-white/10 text-zinc-600'}`}
            >
               {progress === 100 ? <Trophy size={32} /> : <Target size={32} />}
            </motion.div>
          </div>

          <div className="relative h-6 w-full bg-black/60 rounded-sm overflow-hidden border border-white/5 p-0.5 z-10 shadow-inner">
            {/* Grid de Fundo (Ticks) */}
            <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
               {[...Array(30)].map((_, i) => (
                  <div key={i} className="w-[1px] h-full bg-white/5" />
               ))}
            </div>

            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.8, ease: [0.2, 0, 0, 1] }} // Inércia Física
              className="h-full rounded-sm relative"
            >
              {/* Gradiente Líquido */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-900 via-green-500 to-emerald-400" />
              
              {/* Shimmer Effect */}
              <motion.div 
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" 
              />
              
              {/* Energy Head (Brilho na ponta) */}
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10" />
            </motion.div>
          </div>
          
          {/* Mensagem Motivacional Dinâmica */}
          <p className="mt-4 text-right text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
            {progress === 0 && "Inicie a produção para ativar o sistema operacional."}
            {progress > 0 && progress < 50 && "Frequência estável. Mantenha o ritmo de produção."}
            {progress >= 50 && progress < 100 && "Metade da missão concluída. Finalize o ciclo."}
            {progress === 100 && "Meta atingida. Sistema operando em eficiência máxima."}
          </p>

          {/* Animated background element */}
          <div 
            className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/10 blur-[80px] rounded-full pointer-events-none transition-all duration-1000" 
            style={{ opacity: progress / 100 + 0.1 }}
          />
        </section>

        {/* SEÇÃO 1: FILA ATIVA (Pendentes da Semana) */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 px-2 border-b border-white/5 pb-4">
            <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <ListTodo className="text-green-400 w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                Fila Ativa
                <span className="bg-white/5 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full border border-white/10 font-bold uppercase">
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
                <div className="p-8 bg-green-500/10 rounded-full border border-green-500/20">
                  <Trophy className="text-green-400 w-16 h-16" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Missão Zerada</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold max-w-xs leading-relaxed mx-auto">
                    Nenhuma pendência na fila desta semana. Sistema em prontidão para novos pedidos.
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
                <div key={order.id}>
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
