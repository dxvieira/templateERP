'use client';

import React, { useMemo, useState } from 'react';
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
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { query, collection, where, orderBy } from 'firebase/firestore';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';

export default function WeeklyGoalsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const [editingOrder, setEditingOrder] = useState<any>(null);

  const weekInterval = useMemo(() => {
    const now = new Date();
    return {
      start: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      end: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      displayStart: startOfWeek(now, { weekStartsOn: 0 }),
      displayEnd: endOfWeek(now, { weekStartsOn: 0 })
    };
  }, []);

  const weeklyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'orders'),
      where('deliveryDate', '>=', weekInterval.start),
      where('deliveryDate', '<=', weekInterval.end),
      orderBy('deliveryDate', 'asc')
    );
  }, [firestore, user, weekInterval]);

  const { data: orders, isLoading } = useCollection(weeklyQuery);

  const { pendingOrders, completedOrders, progress } = useMemo(() => {
    if (!orders) return { pendingOrders: [], completedOrders: [], progress: 0 };
    const pending = orders.filter(o => !['Concluído', 'Entregue'].includes(o.status));
    const completed = orders.filter(o => ['Concluído', 'Entregue'].includes(o.status));
    const percentage = orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 0;
    return { pendingOrders: pending, completedOrders: completed, progress: percentage };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-green-500 selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 pb-24 relative">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-green-600 opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />
        <header className="space-y-4">
          <Button variant="ghost" onClick={() => router.push('/')} className="text-zinc-500 hover:text-green-400 p-0 h-auto gap-2 uppercase text-[9px] font-black tracking-widest transition-colors"><ChevronLeft size={12} /> Voltar ao Terminal</Button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[9px] tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5 w-fit"><CalendarDays size={10} className="text-green-500" /> {format(weekInterval.displayStart, "dd 'de' MMM", { locale: ptBR })} a {format(weekInterval.displayEnd, "dd 'de' MMM", { locale: ptBR })}</div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 uppercase tracking-tighter leading-none">Meta da Semana</h1>
            </div>
          </div>
        </header>

        <section className="group relative bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 transition-all duration-500 hover:border-green-500/50">
          <div className="flex justify-between items-end mb-5">
            <div>
              <div className="flex items-baseline gap-2"><span className="text-5xl font-black text-white tracking-tighter group-hover:text-green-400">{completedOrders.length}</span><span className="text-xl text-zinc-600 font-black">/ {orders?.length || 0} PEDIDOS</span></div>
              <p className="text-green-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2"><Zap size={10} fill="currentColor" className="animate-pulse" /> Status da Missão</p>
            </div>
            <motion.div animate={progress === 100 ? { rotate: [0, -10, 10, 0], scale: 1.1 } : {}} transition={{ duration: 0.5, repeat: progress === 100 ? Infinity : 0, repeatDelay: 2 }} className={`p-4 rounded-xl border transition-all duration-500 ${progress === 100 ? 'bg-green-500 text-black border-green-400 shadow-[0_0_20px_#22c55e]' : 'bg-black/40 border-zinc-800 text-zinc-600 group-hover:text-green-500'}`}>{progress === 100 ? <Trophy size={24} fill="currentColor" /> : <Target size={24} />}</motion.div>
          </div>
          <div className="h-6 w-full bg-[#050505] rounded-lg relative overflow-hidden border border-zinc-800 shadow-inner z-10">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, ease: "circOut" }} className="h-full relative z-10 rounded-r-md overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-green-900 to-emerald-400" /><div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,1)]" /></motion.div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-green-500/10 rounded-lg"><ListTodo className="text-green-400 w-4 h-4" /></div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fila da Semana</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} onClick={setEditingOrder} />
            ))}
          </div>
        </section>

        {completedOrders.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-2 pb-3"><div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="text-emerald-500 w-4 h-4" /></div><h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Objetivos Conquistados</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} onClick={setEditingOrder} />
              ))}
            </div>
          </section>
        )}

        <OrderFormModal 
          isOpen={!!editingOrder} 
          order={editingOrder} 
          onClose={() => setEditingOrder(null)} 
        />
      </main>
    </div>
  );
}
