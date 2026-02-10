
'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Layers, 
  ArrowUpRight, 
  Clock, 
  Calendar, 
  Search, 
  Activity, 
  LayoutDashboard,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { useOrders } from '@/hooks/use-orders';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// --- COMPONENTE: CONTADOR ANIMADO ---
const AnimatedNumber = ({ value }: { value: number }) => {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 2000, bounce: 0 });
  const rounded = useTransform(springValue, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return () => unsubscribe();
  }, [rounded]);

  return <span>{displayValue}</span>;
};

// --- COMPONENTE: CARD DE VIDRO ANIMADO (Bento Style) ---
const GlassCard = ({ children, className = "", isCritical = false }: { children: React.ReactNode, className?: string, isCritical?: boolean }) => (
  <motion.div 
    variants={{
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 }
    }}
    whileHover={{ y: -5, scale: 1.01 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    className={cn(
      "relative overflow-hidden rounded-3xl border transition-colors",
      isCritical 
        ? "border-destructive/30 bg-destructive/5" 
        : "border-white/5 bg-[#121212]/40 backdrop-blur-xl",
      "group cursor-default",
      !isCritical && "hover:border-primary/40 hover:bg-[#121212]/60",
      isCritical && "hover:border-destructive/60 hover:bg-destructive/10",
      className
    )}
  >
    <div className={cn(
      "absolute -inset-1 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700",
      isCritical ? "bg-gradient-to-tr from-destructive/0 via-destructive/10 to-destructive/0" : "bg-gradient-to-tr from-primary/0 via-primary/5 to-primary/0"
    )} />
    <div className="relative z-10 h-full p-6 flex flex-col justify-between">
      {children}
    </div>
  </motion.div>
);

// --- COMPONENTE: ROW DE PEDIDO (Lista Otimizada) ---
const OrderRow = ({ order, index, isDelayed = false }: { order: any, index: number, isDelayed?: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ x: 5, backgroundColor: isDelayed ? "rgba(255, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.03)" }}
    className={cn(
      "group flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border border-transparent",
      isDelayed ? "hover:border-destructive/20" : "hover:border-white/5"
    )}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all shrink-0",
        isDelayed 
          ? "bg-destructive/10 text-destructive border-destructive/20 group-hover:shadow-[0_0_10px_rgba(255,0,0,0.3)]" 
          : "bg-[#1A1A1A] text-primary border-white/5 group-hover:border-primary group-hover:shadow-[0_0_10px_rgba(255,95,31,0.3)]"
      )}>
        #{order.id.slice(-3)}
      </div>
      <div className="truncate">
        <h4 className={cn(
          "font-bold text-xs truncate transition-colors",
          isDelayed ? "text-white group-hover:text-destructive" : "text-white group-hover:text-primary"
        )}>{order.client}</h4>
        <p className="text-zinc-500 text-[10px] truncate">{order.items?.[0]?.desc || 'Sem descrição'}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      {isDelayed && (
        <div className="flex items-center gap-1.5 bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
          <AlertTriangle size={10} className="text-destructive animate-pulse" />
          <span className="text-[8px] uppercase font-black text-destructive tracking-widest">Atrasado</span>
        </div>
      )}
      <div className="hidden md:flex items-center gap-2 bg-black/40 px-2 py-0.5 rounded-full border border-white/5 shrink-0">
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }} 
          transition={{ duration: 2, repeat: Infinity }}
          className={cn("w-1 h-1 rounded-full", isDelayed ? "bg-destructive shadow-[0_0_8px_rgba(255,0,0,0.8)]" : "bg-primary shadow-[0_0_8px_rgba(255,95,31,0.8)]")} 
        />
        <span className="text-[8px] uppercase font-black text-zinc-400 tracking-widest">{order.status}</span>
      </div>
    </div>

    <div className="text-right shrink-0 ml-4">
      <p className="text-white font-mono font-bold text-[11px]">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue || 0)}
      </p>
      <p className="text-zinc-600 text-[9px] uppercase tracking-tighter">OS #{order.id}</p>
    </div>
  </motion.div>
);

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { orders, stats, isLoading } = useOrders();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(255,95,31,0.5)]" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const deliveriesToday = orders.filter(o => o.deliveryDate === todayStr).length;
  const totalRevenue = orders.reduce((acc, o) => acc + (o.totalValue || 0), 0);

  // Filtro de Ordens Atrasadas
  const delayedOrders = orders.filter(o => 
    o.deliveryDate && 
    o.deliveryDate < todayStr && 
    o.status !== 'Concluído' && 
    o.status !== 'Entregue'
  );

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black relative">
      <DashboardSidebar />
      
      {/* --- AMBIENT LIGHTING --- */}
      <motion.div 
        animate={{ 
          x: [0, 30, 0], 
          y: [0, -30, 0],
          opacity: [0.02, 0.05, 0.02] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-0 left-0 w-[600px] h-[600px] bg-primary blur-[150px] rounded-full pointer-events-none z-0" 
      />

      <main className="flex-1 md:ml-64 p-6 md:p-10 space-y-8 mt-16 md:mt-0 z-10">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
              <Activity size={12} className="text-primary animate-pulse" />
              Terminal de Comando Ativo
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
              Visão <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-200">Geral</span>
            </h1>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/orders')}
            className="bg-primary text-black font-black uppercase tracking-widest text-[10px] py-4 px-8 rounded-full shadow-[0_0_20px_-5px_rgba(255,95,31,0.5)] flex items-center gap-2"
          >
            <Zap size={16} fill="black" />
            Nova OS
          </motion.button>
        </motion.header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {/* KPI PRINCIPAL */}
          <GlassCard className="col-span-1 md:col-span-2 row-span-2 min-h-[300px]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <Layers className="text-primary" size={24} />
              </div>
              <ArrowUpRight className="text-zinc-700" size={20} />
            </div>
            <div className="mt-8">
              <h2 className="text-7xl md:text-8xl font-black text-white tracking-tighter mb-2">
                <AnimatedNumber value={stats.total - stats.concluido} />
              </h2>
              <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Produção Ativa</p>
            </div>
            <div className="flex items-end gap-1 h-16 mt-6 opacity-40">
              {[40, 65, 45, 80, 50, 95, 70, 90, 60, 85].map((h, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 1, delay: 0.5 + (i * 0.05), type: "spring" }}
                  className="flex-1 bg-zinc-800 rounded-t-sm hover:bg-primary" 
                />
              ))}
            </div>
          </GlassCard>

          {/* FATURAMENTO */}
          <GlassCard className="col-span-1 min-h-[160px]">
            <div className="flex justify-between mb-4">
              <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Receita</span>
              <TrendingUp size={14} className="text-green-500" />
            </div>
            <h3 className="text-3xl font-black text-white">
              R$ <AnimatedNumber value={Math.floor(totalRevenue / 1000)} />.{Math.floor((totalRevenue % 1000) / 100)}k
            </h3>
            <div className="w-full bg-zinc-900 h-1 rounded-full mt-4 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "70%" }}
                transition={{ duration: 2, delay: 0.8, type: "spring" }}
                className="bg-gradient-to-r from-primary to-orange-400 h-full rounded-full" 
              />
            </div>
          </GlassCard>

          {/* ENTREGAS */}
          <GlassCard className="col-span-1 min-h-[160px]">
            <div className="flex justify-between mb-4">
              <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Hoje</span>
              <Calendar size={14} className="text-zinc-700" />
            </div>
            <h3 className="text-4xl font-black text-white">
              <AnimatedNumber value={deliveriesToday} />
            </h3>
            <p className="text-[9px] text-zinc-600 mt-2 font-bold uppercase tracking-tight">Protocolos para Entrega</p>
          </GlassCard>

          {/* --- WAR ROOM (ORDENS ATRASADAS) --- */}
          <AnimatePresence>
            {delayedOrders.length > 0 && (
              <GlassCard isCritical className="col-span-1 md:col-span-2 lg:col-span-4 min-h-[150px] !p-0">
                <div className="p-4 border-b border-destructive/10 flex justify-between items-center bg-destructive/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-destructive animate-bounce" />
                    <h3 className="text-[10px] font-black text-destructive uppercase tracking-[0.3em]">Protocolos Críticos (Atrasados)</h3>
                  </div>
                  <span className="bg-destructive text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{delayedOrders.length} OS</span>
                </div>
                <div className="p-2 space-y-1">
                  {delayedOrders.map((order, idx) => (
                    <OrderRow key={order.id} order={order} index={idx} isDelayed />
                  ))}
                </div>
              </GlassCard>
            )}
          </AnimatePresence>

          {/* ATIVIDADE RECENTE */}
          <GlassCard className="col-span-1 md:col-span-2 lg:col-span-4 min-h-[250px] !p-0">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-primary" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Fluxo de Atividade Cloud</h3>
              </div>
              <button onClick={() => router.push('/orders')} className="text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors">Ver Todos</button>
            </div>
            <div className="p-2 space-y-1">
              {orders.slice(0, 5).map((order, idx) => (
                <OrderRow key={order.id} order={order} index={idx} />
              ))}
              {orders.length === 0 && (
                <div className="py-20 text-center opacity-20 uppercase font-black text-[10px] tracking-widest">Aguardando Lançamentos</div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </main>
    </div>
  );
}
