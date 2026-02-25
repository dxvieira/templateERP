'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Loader2, 
  ArrowLeft, ArrowRight,
  Package, Clock, Calendar as CalendarIcon,
  DollarSign
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, isWithinInterval, parseISO, addMonths, subMonths, isBefore, isValid } from 'date-fns';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';

export default function ReportsManagerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(''); 
  
  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setSelectedMonth(format(now, 'yyyy-MM'));
  }, []);

  // --- QUERIES ---
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);

  // --- LÓGICA DE DATAS ---
  const dateRange = useMemo(() => {
    if (!selectedMonth) return { start: new Date(), end: new Date() };
    const [year, month] = selectedMonth.split('-').map(Number);
    return {
      start: startOfMonth(new Date(year, month - 1)),
      end: endOfMonth(new Date(year, month - 1))
    };
  }, [selectedMonth]);

  // --- MOTOR OPERACIONAL COM CÁLCULO DINÂMICO ---
  const sortedOrders = useMemo(() => {
    if (!orders || !selectedMonth) return [];
    
    const filtered = orders.filter(order => {
      const dDate = order.delivery_date || order.deliveryDate;
      if (!dDate) return false;
      try {
        return isWithinInterval(parseISO(dDate), { start: dateRange.start, end: dateRange.end });
      } catch (e) { return false; }
    });

    return [...filtered].map(order => {
      // CÁLCULO DINÂMICO DE VALORES (À prova de falhas)
      const totalOS = Number(order.total_value || order.totalValue) || 0;
      let liquidado = 0;
      
      if (order.installments && Array.isArray(order.installments) && order.installments.length > 0) {
        liquidado = order.installments
          .filter((inst: any) => inst.status === 'paid')
          .reduce((acc: number, inst: any) => acc + (Number(inst.amount) || 0), 0);
      } else {
        liquidado = Number(order.amount_paid || order.amountPaid) || 0;
      }

      const aReceber = Math.max(0, totalOS - liquidado);

      return {
        ...order,
        calculated_total: totalOS,
        calculated_paid: liquidado,
        calculated_balance: aReceber
      };
    }).sort((a, b) => {
      // Prioriza ordens com saldo devedor
      if (a.calculated_balance > 0 && b.calculated_balance === 0) return -1;
      if (a.calculated_balance === 0 && b.calculated_balance > 0) return 1;
      
      const dateA = a.delivery_date || a.deliveryDate || '9999-99-99';
      const dateB = b.delivery_date || b.deliveryDate || '9999-99-99';
      return dateA.localeCompare(dateB);
    });
  }, [orders, dateRange, selectedMonth]);

  // --- CÁLCULO DOS KPIs (Sincronizado com o motor dinâmico) ---
  const kpiMetrics = useMemo(() => {
    const incomeFromOrders = sortedOrders.reduce((acc, o) => acc + o.calculated_paid, 0);
    const pendingFromOrders = sortedOrders.reduce((acc, o) => acc + o.calculated_balance, 0);

    return { incomeFromOrders, pendingFromOrders };
  }, [sortedOrders]);

  const handleMonthNav = (direction: 'prev' | 'next') => {
    if (!selectedMonth) return;
    const current = parseISO(`${selectedMonth}-01`);
    const next = direction === 'next' ? addMonths(current, 1) : subMonths(current, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  if (!isMounted || loadingOrders) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative z-10">
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <BarChart3 size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Terminal de Inteligência VisComm</span>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
              REPORTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">FLUX</span>
            </h1>
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <button onClick={() => handleMonthNav('prev')} className="p-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border-r border-zinc-800"><ArrowLeft size={16}/></button>
            <span className="px-6 py-2 text-xs font-black uppercase text-white tracking-widest min-w-[140px] text-center">
              {selectedMonth ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy') : '--'}
            </span>
            <button onClick={() => handleMonthNav('next')} className="p-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border-l border-zinc-800"><ArrowRight size={16}/></button>
          </div>
        </header>

        {/* --- KPI GRID REDUZIDO --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[
            { label: 'Recebido (OS)', val: kpiMetrics.incomeFromOrders, color: '#4ade80', icon: TrendingUp },
            { label: 'A Receber (OS)', val: kpiMetrics.pendingFromOrders, color: '#eab308', icon: Clock }
          ].map((kpi, i) => (
            <motion.div key={i} whileHover={{ y: -4 }} className="group relative bg-[#09090b] border border-zinc-800 rounded-3xl p-6 transition-all duration-300" style={{ borderBottomColor: `${kpi.color}40` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-2xl bg-white/5" style={{ color: kpi.color }}><kpi.icon size={20} /></div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{kpi.label}</span>
              </div>
              <span className="text-2xl font-black text-white">{kpi.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </motion.div>
          ))}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-xl font-black text-white uppercase tracking-tight">Monitor Operacional</h2>
             <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
               {sortedOrders.length} Protocolos
             </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
            {sortedOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl opacity-20">
                <Package size={48} className="mx-auto mb-4" />
                <p className="text-[10px] uppercase font-black tracking-widest">Nenhuma OS para este período</p>
              </div>
            ) : (
              sortedOrders.map((order) => {
                const isDone = order.calculated_balance === 0;
                const deadline = order.delivery_date || order.deliveryDate ? parseISO(order.delivery_date || order.deliveryDate) : null;
                const isLate = deadline && isBefore(deadline, new Date()) && !isDone;
                
                return (
                  <motion.div 
                    key={order.id} 
                    layout 
                    onClick={() => router.push(`/orders?edit=${order.id}`)} 
                    className="group bg-[#09090b] border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-primary/40 hover:scale-[1.01] transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-white uppercase truncate group-hover:text-primary transition-colors">{order.client}</h3>
                        <p className="text-[9px] font-mono text-zinc-500 mt-0.5">#{order.id.slice(-6)}</p>
                      </div>
                      {isLate ? (
                        <div className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded text-[8px] font-black uppercase animate-pulse">Atrasado</div>
                      ) : isDone ? (
                        <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-[8px] font-black uppercase">Finalizado</div>
                      ) : (
                        <div className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-[8px] font-black uppercase">Prazo: {deadline && isValid(deadline) ? format(deadline, 'dd/MM') : '--/--'}</div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1 block">Total</span>
                        <span className="text-base font-bold text-white">{order.calculated_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 opacity-60 mb-1 block">Liquidado</span>
                        <span className="text-base font-bold text-emerald-500">{order.calculated_paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-primary opacity-60 mb-1 block">A Receber</span>
                        <span className="text-base font-bold text-primary">{order.calculated_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
