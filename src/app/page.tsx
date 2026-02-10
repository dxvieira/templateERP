
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
  Plus
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
    return rounded.on('change', (v) => setDisplayValue(v));
  }, [rounded]);

  return <span>{displayValue}</span>;
};

// --- COMPONENTE: CARD DE VIDRO ANIMADO (Bento Style) ---
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.div 
    variants={{
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 }
    }}
    whileHover={{ y: -5, scale: 1.01 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    className={cn(
      "relative overflow-hidden rounded-3xl border border-white/5 bg-[#121212]/40 backdrop-blur-xl",
      "group cursor-default hover:border-primary/40 hover:bg-[#121212]/60 transition-colors",
      className
    )}
  >
    <div className="absolute -inset-1 bg-gradient-to-tr from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700" />
    <div className="relative z-10 h-full p-6 flex flex-col justify-between">
      {children}
    </div>
  </motion.div>
);

// --- COMPONENTE: ROW DE PEDIDO (Lista Otimizada) ---
const OrderRow = ({ order, index }: { order: any, index: number }) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ x: 5, backgroundColor: "rgba(255, 255, 255, 0.03)" }}
    className="group flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/5"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="h-8 w-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-primary font-bold text-[10px] border border-white/5 group-hover:border-primary group-hover:shadow-[0_0_10px_rgba(255,95,31,0.3)] transition-all shrink-0">
        #{order.id.slice(-3)}
      </div>
      <div className="truncate">
        <h4 className="text-white font-bold text-xs truncate group-hover:text-primary transition-colors">{order.client}</h4>
        <p className="text-zinc-500 text-[10px] truncate">{order.items?.[0]?.desc || 'Sem descrição'}</p>
      </div>
    </div>
    
    <div className="hidden md:flex items-center gap-2 bg-black/40 px-2 py-0.5 rounded-full border border-white/5 shrink-0">
      <motion.div 
        animate={{ opacity: [0.4, 1, 0.4] }} 
        transition={{ duration: 2, repeat: Infinity }}
        className="w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(255,95,31,0.8)]" 
      />
      <span className="text-[8px] uppercase font-black text-zinc-400 tracking-widest">{order.status}</span>
    </div>

    <div className="text-right shrink-0">
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

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black relative">
      <DashboardSidebar />
      
      {/* --- AMBIENT LIGHTING (Animado) --- */}
      <motion.div 
        animate={{ 
          x: [0, 30, 0], 
          y: [0, -30, 0],
          opacity: [0.02, 0.05, 0.02] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-0 left-0 w-[600px] h-[600px] bg-primary blur-[150px] rounded-full pointer-events-none z-0" 
      />
      <motion.div 
        animate={{ 
          x: [0, -20, 0], 
          y: [0, 20, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-600 opacity-[0.01] blur-[150px] rounded-full pointer-events-none z-0" 
      />

      <main className="flex-1 md:ml-64 p-6 md:p-10 space-y-10 mt-16 md:mt-0 z-10">
        {/* --- HEADER --- */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
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
          
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-[#121212] border border-white/5 px-4 py-2.5 rounded-full hover:border-primary/50 transition-colors group">
              <Search size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
              <input placeholder="Buscar OS..." className="bg-transparent outline-none text-xs text-white placeholder-zinc-700 w-32 focus:w-48 transition-all duration-300" />
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/orders')}
              className="bg-primary text-black font-black uppercase tracking-widest text-[10px] py-4 px-8 rounded-full shadow-[0_0_20px_-5px_rgba(255,95,31,0.5)] flex items-center gap-2 hover:bg-white transition-colors"
            >
              <Zap size={16} fill="black" />
              Nova OS
            </motion.button>
          </div>
        </motion.header>

        {/* --- BENTO GRID LAYOUT --- */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {/* CARD 1: KPI PRINCIPAL (GRANDE) */}
          <GlassCard className="col-span-1 md:col-span-2 row-span-2 min-h-[320px]">
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
              <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Ordens em Produção</p>
            </div>
            {/* Gráfico Minimalista */}
            <div className="flex items-end gap-1 h-16 mt-6 opacity-40">
              {[40, 65, 45, 80, 50, 95, 70, 90, 60, 85].map((h, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 1, delay: 0.5 + (i * 0.05), type: "spring" }}
                  className="flex-1 bg-zinc-800 rounded-t-sm hover:bg-primary transition-colors cursor-pointer" 
                />
              ))}
            </div>
          </GlassCard>

          {/* CARD 2: FATURAMENTO */}
          <GlassCard className="col-span-1 min-h-[160px]">
            <div className="flex justify-between mb-4">
              <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Receita Bruta</span>
              <span className="text-green-500 text-[9px] font-black bg-green-500/10 px-2 py-0.5 rounded-full">+12%</span>
            </div>
            <h3 className="text-3xl font-black text-white mb-1">
              R$ <AnimatedNumber value={Math.floor(totalRevenue / 1000)} />.{Math.floor((totalRevenue % 1000) / 100)}k
            </h3>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="w-full bg-zinc-900 h-1 rounded-full mt-4 overflow-hidden"
            >
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "70%" }}
                transition={{ duration: 2, delay: 0.8, type: "spring" }}
                className="bg-gradient-to-r from-primary to-orange-400 h-full rounded-full shadow-[0_0_10px_rgba(255,95,31,0.5)]" 
              />
            </motion.div>
          </GlassCard>

          {/* CARD 3: ENTREGAS */}
          <GlassCard className="col-span-1 min-h-[160px]">
            <div className="flex justify-between mb-4">
              <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Entregas Hoje</span>
              <Calendar size={14} className="text-zinc-700" />
            </div>
            <h3 className="text-4xl font-black text-white mb-1">
              <AnimatedNumber value={deliveriesToday} />
            </h3>
            <p className="text-[9px] text-zinc-600 mt-2 flex items-center gap-1 font-bold uppercase tracking-tight">
              <Clock size={10} /> {deliveriesToday > 0 ? 'Cronograma Ativo' : 'Aguardando Lançamentos'}
            </p>
          </GlassCard>

          {/* LISTA DE ATIVIDADE RECENTE (Larga) */}
          <GlassCard className="col-span-1 md:col-span-2 lg:col-span-4 min-h-[280px] !p-0">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <LayoutDashboard size={14} className="text-primary" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Fila de Atividade Recente</h3>
              </div>
              <button 
                onClick={() => router.push('/orders')}
                className="text-[9px] font-black text-primary hover:text-white transition-colors uppercase tracking-widest"
              >
                Gerenciar Todos
              </button>
            </div>
            
            <div className="p-3 space-y-1">
              <AnimatePresence>
                {orders.slice(0, 5).map((order, idx) => (
                  <OrderRow key={order.id} order={order} index={idx} />
                ))}
              </AnimatePresence>
              {orders.length === 0 && (
                <div className="py-20 text-center opacity-20">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Nenhuma Ordem Localizada</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </main>
    </div>
  );
}
