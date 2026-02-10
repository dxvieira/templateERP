
'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Target, 
  ChevronLeft, 
  CalendarDays, 
  Trophy, 
  Zap,
  CheckCircle2,
  ListTodo,
  Loader2,
  Rocket
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
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-green-600 opacity-[0.05] blur-[150px] pointer-events-none rounded-full z-0" />

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
          </div>
        </header>

        {/* --- CARD DA BARRA DE PROGRESSO (Com Hover Neon Verde) --- */}
        <section 
          className="
            group relative 
            bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10
            transition-all duration-500 ease-out
            hover:border-green-500/50 
            hover:shadow-[0_0_60px_-10px_rgba(34,197,94,0.25)]
            hover:-translate-y-1
            overflow-hidden
          "
        >
          {/* Cabeçalho da Barra */}
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl md:text-7xl font-black text-white tracking-tighter transition-colors group-hover:text-green-400">
                  {completedOrders.length}
                </span>
                <span className="text-2xl md:text-3xl text-zinc-600 font-black group-hover:text-zinc-500 transition-colors">
                  / {totalWeekly} PEDIDOS
                </span>
              </div>
              <p className="text-green-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2 group-hover:text-green-400 transition-colors">
                 <Zap size={12} fill="currentColor" /> Status da Missão
              </p>
            </div>
            
            {/* Ícone de Conquista */}
            <motion.div 
               animate={progress === 100 ? { rotate: [0, -10, 10, 0], scale: 1.1 } : {}}
               transition={{ duration: 0.5, repeat: progress === 100 ? Infinity : 0, repeatDelay: 2 }}
               className={`
                  p-5 rounded-2xl border transition-all duration-500
                  ${progress === 100 
                    ? 'bg-green-500 text-black border-green-400 shadow-[0_0_30px_#22c55e]' 
                    : 'bg-black/40 border-zinc-800 text-zinc-600 group-hover:text-green-500 group-hover:border-green-500/30'
                  }
               `}
            >
               {progress === 100 ? <Trophy size={32} fill="currentColor" /> : <Target size={32} />}
            </motion.div>
          </div>

          {/* CONTAINER DA BARRA (Trilho HUD) */}
          <div className="h-8 w-full bg-[#050505] rounded-lg relative overflow-hidden border border-zinc-800 shadow-inner group-hover:border-green-900/50 transition-colors z-10">
            
            {/* Grid de Fundo (Ticks Decorativos) */}
            <div className="absolute inset-0 flex justify-between px-2 z-0 opacity-20">
               {[...Array(15)].map((_, i) => (
                  <div key={i} className="w-[1px] h-full bg-zinc-600" />
               ))}
            </div>

            {/* A BARRA LÍQUIDA (Física de Inércia) */}
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${progress}%` }}
               transition={{ duration: 1.5, ease: "circOut" }} 
               className="h-full relative z-10 rounded-r-md overflow-hidden"
            >
               {/* Gradiente Verde Vibrante */}
               <div className="absolute inset-0 bg-gradient-to-r from-green-900 via-green-600 to-emerald-400" />
               
               {/* Shimmer Animado */}
               <motion.div 
                 animate={{ x: ['-100%', '100%'] }}
                 transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" 
               />
               
               {/* Ponta de Energia Branca */}
               <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_20px_rgba(255,255,255,1)]" />
            </motion.div>
          </div>
          
          {/* Mensagem Motivacional Dinâmica */}
          <div className="flex justify-end mt-4">
             <p className="text-[9px] text-zinc-600 font-mono group-hover:text-green-400/80 transition-colors uppercase tracking-widest">
                {progress === 0 && "SISTEMA PRONTO. INICIE A PRODUÇÃO PARA ATIVAR."}
                {progress > 0 && progress < 50 && "FREQUÊNCIA ESTÁVEL. MANTENHA O RITMO."}
                {progress >= 50 && progress < 100 && "META PRÓXIMA. SISTEMA EM ALTO RENDIMENTO."}
                {progress === 100 && "META ATINGIDA. SISTEMA OPERANDO EM EFICIÊNCIA MÁXIMA."}
             </p>
          </div>

          {/* Glow de fundo pulsante */}
          <div 
            className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/10 blur-[80px] rounded-full pointer-events-none transition-all duration-1000" 
            style={{ opacity: progress / 100 + 0.1 }}
          />
        </section>

        {/* SEÇÃO 1: FILA ATIVA (Pendentes da Semana) */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 px-2 border-b border-white/5 pb-4">
            <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
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
                  <Rocket className="text-green-400 w-16 h-16" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Fila Zerada</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold max-w-xs leading-relaxed mx-auto">
                    Nenhuma pendência para esta semana. Sistema em prontidão para novos pedidos.
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

            <div className="grid grid-cols-1 gap-4 opacity-80 hover:opacity-100 transition-opacity">
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
