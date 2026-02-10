
'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Layers, 
  ArrowUpRight, 
  Clock, 
  Calendar, 
  Activity, 
  AlertTriangle,
  TrendingUp,
  ChevronRight
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

// --- COMPONENTE: CARD DE ALTO IMPACTO (High Voltage) ---
const ImpactCard = ({ 
  children, 
  className = "", 
  isCritical = false,
  delay = 0 
}: { 
  children: React.ReactNode, 
  className?: string, 
  isCritical?: boolean,
  delay?: number
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ 
      y: -8, 
      scale: 1.01,
      transition: { type: "spring", stiffness: 400, damping: 15 }
    }}
    className={cn(
      "relative overflow-hidden rounded-3xl border cursor-default transition-all duration-300",
      isCritical 
        ? "border-destructive/30 bg-destructive/5 hover:border-destructive hover:bg-destructive/10 hover:shadow-[0_0_40px_-10px_rgba(255,0,0,0.4)]" 
        : "border-zinc-800 bg-[#0F0F0F] hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_50px_-10px_rgba(255,95,31,0.4)]",
      "group",
      className
    )}
  >
    {/* Spotlight Effect */}
    <div className={cn(
      "absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 blur-[8px] opacity-0 group-hover:opacity-100 transition-opacity duration-500",
      isCritical ? "bg-destructive" : "bg-primary"
    )} />
    
    <div className="relative z-10 h-full p-6 flex flex-col justify-between">
      {children}
    </div>
  </motion.div>
);

// --- COMPONENTE: ROW DE PEDIDO (Estilo Cyberpunk) ---
const ImpactRow = ({ order, index, isDelayed = false }: { order: any, index: number, isDelayed?: boolean }) => {
  const themeColor = isDelayed ? "text-destructive" : "text-primary";
  const bgColor = isDelayed ? "from-destructive/20" : "from-primary/20";

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.005, x: 5 }}
      className="group relative flex items-center justify-between p-4 rounded-2xl border border-transparent bg-white/5 mb-2 cursor-pointer overflow-hidden"
    >
      {/* Background que desliza no hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 ease-out",
        bgColor
      )} />

      <div className="relative z-10 flex items-center gap-4 min-w-0">
        <div className={cn(
          "h-12 w-12 rounded-xl bg-black flex items-center justify-center border border-zinc-800 transition-all duration-300 group-hover:scale-110",
          isDelayed ? "group-hover:border-destructive group-hover:shadow-[0_0_15px_rgba(255,0,0,0.5)]" : "group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(255,95,31,0.5)]"
        )}>
          <span className={cn(
            "font-mono font-bold text-zinc-500 transition-colors",
            isDelayed ? "group-hover:text-destructive" : "group-hover:text-primary"
          )}>
            #{order.id.slice(-3)}
          </span>
        </div>
        <div className="truncate">
          <h4 className={cn(
            "text-white font-bold text-base transition-colors",
            isDelayed ? "group-hover:text-destructive" : "group-hover:text-primary"
          )}>
            {order.client}
          </h4>
          <p className="text-zinc-500 text-xs font-medium truncate">
            {order.items?.[0]?.desc || 'Sem descrição'}
          </p>
        </div>
      </div>
      
      <div className="relative z-10 flex items-center gap-6 shrink-0">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-black/40 group-hover:border-white/10 transition-colors">
          <div className={cn(
            "w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] animate-pulse",
            isDelayed ? "bg-destructive text-destructive" : "bg-primary text-primary"
          )} />
          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-300">{order.status}</span>
        </div>

        <div className="text-right min-w-[100px]">
          <p className="text-white font-mono font-bold text-lg group-hover:scale-105 transition-transform">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue || 0)}
          </p>
          <div className="flex items-center justify-end gap-1 text-zinc-600 text-[10px] group-hover:text-zinc-400">
             <Clock size={10} /> {order.deliveryDate || 'Sem data'}
          </div>
        </div>
        
        <ChevronRight className={cn(
          "text-zinc-700 transition-all group-hover:translate-x-1",
          isDelayed ? "group-hover:text-destructive" : "group-hover:text-primary"
        )} size={20} />
      </div>
    </motion.div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { orders, stats, isLoading } = useOrders();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(255,95,31,0.5)]" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const delayedOrders = orders.filter(o => 
    o.deliveryDate && 
    o.deliveryDate < todayStr && 
    o.status !== 'Concluído' && 
    o.status !== 'Entregue'
  );

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black relative font-body">
      <DashboardSidebar />
      
      {/* Background Lighting Sutil */}
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.05] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-6 md:p-10 space-y-12 mt-16 md:mt-0 z-10">
        <header className="flex flex-col md:flex-row justify-between items-end relative z-10 gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-primary mb-1"
            >
              <Activity size={16} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Protocolo Terminal VisComm</span>
            </motion.div>
            <h1 className="text-6xl font-black tracking-tighter text-white leading-none">
              VISÃO <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">GERAL</span>
            </h1>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px -5px rgba(255, 95, 31, 0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/orders')}
            className="bg-primary hover:bg-white hover:text-black text-black font-black py-4 px-8 rounded-2xl transition-all duration-300 flex items-center gap-3"
          >
              <Zap size={20} fill="currentColor" />
              NOVA ORDEM
          </motion.button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10">
          {/* KPI PRINCIPAL: PRODUÇÃO ATIVA */}
          <ImpactCard className="col-span-1 md:col-span-2 row-span-2 min-h-[340px] !bg-zinc-900/40">
            <div className="flex justify-between items-start">
               <div className="p-4 bg-black rounded-2xl border border-zinc-800 group-hover:border-primary group-hover:bg-primary group-hover:text-black transition-all duration-300">
                  <Layers size={28} />
               </div>
               <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 flex items-center gap-2">
                  <TrendingUp size={14} /> Atividade Cloud
               </div>
            </div>
            
            <div className="mt-auto">
               <h2 className="text-9xl font-black text-white tracking-tighter group-hover:text-primary transition-colors duration-300 leading-none">
                 <AnimatedNumber value={stats.total - stats.concluido} />
               </h2>
               <p className="text-zinc-500 text-lg font-black uppercase tracking-widest mt-2 group-hover:text-white transition-colors">Ordens em Produção</p>
               
               <div className="w-full h-2 bg-zinc-800 rounded-full mt-8 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "65%" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="h-full bg-primary shadow-[0_0_15px_rgba(255,95,31,0.8)]"
                  />
               </div>
            </div>
          </ImpactCard>

          {/* KPI 2: FATURAMENTO */}
          <ImpactCard className="col-span-1 min-h-[200px]" delay={0.1}>
             <div className="flex justify-between mb-2">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Faturamento Total</span>
             </div>
             <h3 className="text-4xl font-black text-white mb-2 group-hover:text-primary transition-colors">
               R$ <AnimatedNumber value={Math.floor(orders.reduce((acc, o) => acc + (o.totalValue || 0), 0) / 1000)} />k
             </h3>
             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Protocolos Processados: <span className="text-white">{stats.total}</span></p>
             
             <div className="mt-auto pt-4 flex gap-1 items-end h-16 opacity-30 group-hover:opacity-100 transition-opacity">
                {[30, 50, 40, 70, 90, 60, 85, 45].map((h, i) => (
                  <div key={i} style={{height: `${h}%`}} className="flex-1 bg-zinc-800 rounded-sm group-hover:bg-primary transition-colors duration-500" />
                ))}
             </div>
          </ImpactCard>

          {/* KPI 3: ENTREGAS HOJE */}
          <ImpactCard className="col-span-1 min-h-[200px]" delay={0.2}>
             <div className="flex justify-between items-center mb-4">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Entregas Hoje</span>
                <Calendar size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
             </div>
             <h3 className="text-6xl font-black text-white mb-1 group-hover:scale-110 origin-left transition-transform duration-300">
               <AnimatedNumber value={orders.filter(o => o.deliveryDate === todayStr).length} />
             </h3>
             <div className="mt-auto px-4 py-3 bg-black/60 rounded-xl border border-white/5 flex items-center gap-2 group-hover:border-primary/30 transition-colors">
                <Clock size={14} className="text-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Terminal Sincronizado</span>
             </div>
          </ImpactCard>

          {/* WAR ROOM (ORDENS ATRASADAS) */}
          <AnimatePresence>
            {delayedOrders.length > 0 && (
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                    <span className="w-2 h-8 bg-destructive rounded-full shadow-[0_0_15px_rgba(255,0,0,0.8)] animate-pulse" />
                    WAR ROOM: PROTOCOLOS CRÍTICOS
                  </h3>
                  <span className="bg-destructive text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {delayedOrders.length} ATRASADOS
                  </span>
                </div>
                <div className="flex flex-col">
                  {delayedOrders.map((order, idx) => (
                    <ImpactRow key={order.id} order={order} index={idx} isDelayed />
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* ATIVIDADE RECENTE */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                   <span className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(255,95,31,0.8)]" />
                   PRODUÇÃO RECENTE
                </h3>
                <button 
                  onClick={() => router.push('/orders')}
                  className="text-[10px] font-black text-zinc-500 hover:text-primary uppercase tracking-[0.2em] transition-colors"
                >
                  Ver Fluxo Completo
                </button>
             </div>
             
             <div className="flex flex-col">
                {orders.slice(0, 5).map((order, idx) => (
                  <ImpactRow key={order.id} order={order} index={idx} />
                ))}
                {orders.length === 0 && (
                  <div className="py-20 text-center opacity-20 uppercase font-black text-[10px] tracking-widest">
                    Aguardando Lançamentos
                  </div>
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
