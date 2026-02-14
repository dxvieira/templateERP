
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  ChevronLeft, 
  Trophy, 
  Zap,
  CheckCircle2,
  ListTodo,
  Loader2,
  Plus,
  Search,
  X,
  ArrowRight,
  Calendar,
  Box
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { query, collection, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';
import { useToast } from '@/hooks/use-toast';

export default function WeeklyGoalsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- 1. BUSCAR PEDIDOS DA META (MANUAL) ---
  const weeklyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'orders'),
      where('weekly_priority', '==', true)
    );
  }, [firestore, user]);

  const { data: orders, isLoading } = useCollection(weeklyQuery);

  // --- 2. BUSCAR TODOS OS PEDIDOS PENDENTES (PARA IMPORTAÇÃO) ---
  const availableOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isImportModalOpen) return null;
    return query(
      collection(firestore, 'orders'),
      where('status', '!=', 'Entregue')
    );
  }, [firestore, user, isImportModalOpen]);

  const { data: availableOrders, isLoading: isLoadingAvailable } = useCollection(availableOrdersQuery);

  // --- LOGICA DE IMPORTAÇÃO ---
  const handleAddToGoal = useCallback(async (orderId: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    try {
      await updateDoc(orderRef, { weekly_priority: true });
      toast({ title: "Pedido adicionado à meta" });
    } catch (err) {
      console.error(err);
    }
  }, [firestore, toast]);

  const handleRemoveFromGoal = useCallback(async (orderId: string) => {
    if (!firestore) return;
    if (!window.confirm("Remover este pedido da meta semanal?")) return;
    const orderRef = doc(firestore, 'orders', orderId);
    try {
      await updateDoc(orderRef, { weekly_priority: false });
      toast({ title: "Removido da meta" });
    } catch (err) {
      console.error(err);
    }
  }, [firestore, toast]);

  const filteredImportList = useMemo(() => {
    if (!availableOrders) return [];
    // Filtra localmente os que já são priority para não duplicar na lista
    const candidates = availableOrders.filter(o => !o.weekly_priority && o.status !== 'Concluído' && o.status !== 'Entregue');
    if (!searchTerm) return candidates;
    const term = searchTerm.toLowerCase();
    return candidates.filter(o => 
      o.client?.toLowerCase().includes(term) || 
      o.id?.toLowerCase().includes(term)
    );
  }, [availableOrders, searchTerm]);

  const { pendingOrders, completedOrders, progress, totalValue } = useMemo(() => {
    if (!orders) return { pendingOrders: [], completedOrders: [], progress: 0, totalValue: 0 };
    const pending = orders.filter(o => !['Concluído', 'Entregue'].includes(o.status));
    const completed = orders.filter(o => ['Concluído', 'Entregue'].includes(o.status));
    const percentage = orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 0;
    const total = orders.reduce((acc, o) => acc + (Number(o.totalValue) || 0), 0);
    return { pendingOrders: pending, completedOrders: completed, progress: percentage, totalValue: total };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 pb-24 relative">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />
        
        <header className="space-y-4">
          <Button variant="ghost" onClick={() => router.push('/')} className="text-zinc-500 hover:text-primary p-0 h-auto gap-2 uppercase text-[9px] font-black tracking-widest transition-colors">
            <ChevronLeft size={12} /> Voltar ao Terminal
          </Button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[9px] tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5 w-fit">
                <Target size={10} className="text-primary" /> Objetivo Ativo
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600 uppercase tracking-tighter leading-none">
                Meta da Semana
              </h1>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:block text-right pr-6 border-r border-zinc-800">
                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Potencial da Semana</p>
                <p className="text-2xl font-black text-white">
                  {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <Button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-primary text-black font-black px-6 h-12 rounded-full uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all"
              >
                <Plus size={16} className="mr-2" /> Importar Pedidos
              </Button>
            </div>
          </div>
        </header>

        <section className="group relative bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 transition-all duration-500 hover:border-primary/50">
          <div className="flex justify-between items-end mb-5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white tracking-tighter group-hover:text-primary transition-colors">
                  {completedOrders.length}
                </span>
                <span className="text-xl text-zinc-600 font-black">/ {orders?.length || 0} PEDIDOS</span>
              </div>
              <p className="text-primary text-[9px] font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                <Zap size={10} fill="currentColor" className="animate-pulse" /> Status da Missão
              </p>
            </div>
            <motion.div 
              animate={progress === 100 ? { rotate: [0, -10, 10, 0], scale: 1.1 } : {}} 
              transition={{ duration: 0.5, repeat: progress === 100 ? Infinity : 0, repeatDelay: 2 }} 
              className={`p-4 rounded-xl border transition-all duration-500 ${progress === 100 ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(255,95,31,0.6)]' : 'bg-black/40 border-zinc-800 text-zinc-600 group-hover:text-primary'}`}
            >
              {progress === 100 ? <Trophy size={24} fill="currentColor" /> : <Target size={24} />}
            </motion.div>
          </div>
          <div className="h-6 w-full bg-[#050505] rounded-lg relative overflow-hidden border border-zinc-800 shadow-inner z-10">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${progress}%` }} 
              transition={{ duration: 1.5, ease: "circOut" }} 
              className="h-full relative z-10 rounded-r-md overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-900 to-primary" />
              <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,1)]" />
            </motion.div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-primary/10 rounded-lg"><ListTodo className="text-primary w-4 h-4" /></div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fila da Semana</h3>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-600 gap-4 bg-zinc-900/10">
              <Target size={48} className="opacity-10" />
              <p className="uppercase tracking-[0.3em] font-black text-[10px]">Nenhuma meta ativa definida</p>
              <Button variant="link" onClick={() => setIsImportModalOpen(true)} className="text-primary font-black uppercase text-[10px] tracking-widest">Selecionar Pedidos</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="relative group/card">
                   <OrderCard order={order} onClick={setEditingOrder} />
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleRemoveFromGoal(order.id); }}
                     className="absolute -top-2 -right-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-all z-20 shadow-xl"
                   >
                     <X size={12} />
                   </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {completedOrders.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-2 pb-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="text-emerald-500 w-4 h-4" /></div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Objetivos Conquistados</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} onClick={setEditingOrder} />
              ))}
            </div>
          </section>
        )}

        {/* MODAL DE IMPORTAÇÃO */}
        <AnimatePresence>
          {isImportModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsImportModalOpen(false)}>
              <motion.div 
                initial={{ scale: 0.95, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.95, y: 20 }} 
                onClick={(e) => e.stopPropagation()} 
                className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              >
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl border border-primary/20"><Search size={20} className="text-primary" /></div>
                      <div>
                        <span className="text-primary text-[9px] font-black uppercase tracking-[0.3em]">Fila Geral de OS</span>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Buscar Pedidos</h2>
                      </div>
                    </div>
                    <button onClick={() => setIsImportModalOpen(false)} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={20} />
                    <input 
                      autoFocus
                      placeholder="Identifique o cliente ou número da OS..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl py-5 pl-14 pr-4 text-white placeholder-zinc-700 outline-none text-lg focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#050505]">
                   {isLoadingAvailable ? (
                     <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
                   ) : filteredImportList.length === 0 ? (
                     <div className="text-center py-20 text-zinc-600">
                        <Box size={40} className="mx-auto mb-4 opacity-10" />
                        <p className="text-[10px] uppercase tracking-widest font-black">Nenhum pedido disponível</p>
                     </div>
                   ) : (
                     filteredImportList.map(order => (
                       <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800 hover:border-primary/40 hover:bg-zinc-900/60 transition-all group">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary font-black text-xs">
                               {(order.client || '??').substring(0,2).toUpperCase()}
                             </div>
                             <div>
                                <h4 className="font-bold text-white text-sm uppercase truncate max-w-[200px]">{order.client}</h4>
                                <div className="flex items-center gap-3 mt-1.5">
                                   <span className="text-[9px] bg-black px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500 font-mono">#{order.id}</span>
                                   <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{order.status}</span>
                                </div>
                             </div>
                          </div>
                          <Button 
                            onClick={() => handleAddToGoal(order.id)}
                            className="bg-zinc-800 text-zinc-400 hover:bg-primary hover:text-black rounded-xl px-4 h-10 text-[10px] font-black uppercase tracking-widest transition-all group-hover:shadow-[0_0_15px_rgba(255,95,31,0.3)]"
                          >
                            Add <ArrowRight size={14} className="ml-1.5" />
                          </Button>
                       </div>
                     ))
                   )}
                </div>
                
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 text-center">
                  <p className="text-[9px] text-zinc-600 uppercase font-black tracking-[0.3em]">Terminal de Importação VisComm v1.2</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <OrderFormModal 
          isOpen={!!editingOrder} 
          order={editingOrder} 
          onClose={() => setEditingOrder(null)} 
        />
      </main>
    </div>
  );
}
