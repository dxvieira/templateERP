'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, ChevronLeft, Trophy, Search, X, Loader2, Plus, 
  CheckCircle2, AlertTriangle, LayoutGrid
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { query, collection, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Utilitário para calcular a janela da semana atual (Segunda a Domingo)
 */
const getWeekRange = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  // Ajuste para garantir que o fim da semana seja o domingo
  const sunday = new Date(end);
  sunday.setDate(sunday.getDate() + 6);
  
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(sunday, 'yyyy-MM-dd')
  };
};

export default function WeeklyGoalsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // ESTADO DE ORDENS CONSOLIDADO (DEDUP)
  const [ordersMap, setOrdersMap] = useState<Record<string, any>>({});

  /**
   * ESTRATÉGIA FAN-OUT / MERGE
   * Executa duas queries simples e mescla os resultados no Front-end para evitar erros de índice composto.
   */
  useEffect(() => {
    if (!firestore || !user) return;

    setIsLoading(true);
    const { start, end } = getWeekRange();
    const ordersRef = collection(firestore, 'orders');

    // 1. QUERY DE PRIORIDADE MANUAL
    const qManual = query(ordersRef, where('weekly_priority', '==', true));
    
    // 2. QUERY DE JANELA TEMPORAL
    const qTemporal = query(
      ordersRef, 
      where('delivery_date', '>=', start),
      where('delivery_date', '<=', end)
    );

    const results: Record<string, any> = {};

    const handleSnapshot = (snapshot: any) => {
      snapshot.docs.forEach((doc: any) => {
        results[doc.id] = { id: doc.id, ...doc.data() };
      });
      // Atualiza o estado consolidado (O React lida com a desduplicação ao sobrescrever chaves iguais)
      setOrdersMap({ ...results });
      setIsLoading(false);
    };

    const unsubManual = onSnapshot(qManual, handleSnapshot);
    const unsubTemporal = onSnapshot(qTemporal, handleSnapshot);

    return () => {
      unsubManual();
      unsubTemporal();
    };
  }, [firestore, user]);

  // 2. FILTRAGEM E BI (Client-side)
  const { pendingOrders, completedOrders, progress } = useMemo(() => {
    const allOrders = Object.values(ordersMap);
    
    // Filtra apenas o que não está entregue para a pauta ativa
    // E remove itens que não deveriam estar aqui (segurança de filtragem local)
    const active = allOrders.filter(o => !['Entregue'].includes(o.status));
    
    const completed = active.filter(o => o.status === 'Concluído');
    const pending = active.filter(o => o.status !== 'Concluído');
    
    const percentage = active.length > 0 ? Math.round((completed.length / active.length) * 100) : 0;
    
    return { pendingOrders: pending, completedOrders: completed, progress: percentage };
  }, [ordersMap]);

  const handleRemoveFromGoal = useCallback(async (e: any, orderId: string) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!firestore) return;
    
    updateDoc(doc(firestore, 'orders', orderId), { 
      weekly_priority: false 
    }).then(() => {
      toast({ title: "Prioridade Removida", description: "O item saiu da lista manual." });
    });
  }, [firestore, toast]);

  if (isLoading && Object.keys(ordersMap).length === 0) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24 relative">
      <header className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/')} 
          className="text-zinc-500 uppercase text-[9px] font-black hover:text-white p-0 h-auto"
        >
          <ChevronLeft size={12} /> Voltar ao Terminal
        </Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-primary" />
              <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Missão Semanal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">
              Meta da <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Semana</span>
            </h1>
          </div>
          <Button 
            onClick={() => setIsManageModalOpen(true)} 
            className="bg-primary text-black font-black px-8 h-14 rounded-2xl uppercase text-[10px] tracking-widest shadow-[0_0_25px_rgba(255,95,31,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <LayoutGrid size={16} className="mr-2" /> Gerenciar Lista
          </Button>
        </div>
      </header>

      {/* PAINEL DE PROGRESSO */}
      <section className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Trophy size={120} strokeWidth={1} />
        </div>
        
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-1">Status da Expedição</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-white tracking-tighter">{completedOrders.length}</span>
              <span className="text-2xl text-zinc-600 font-black">/ {pendingOrders.length + completedOrders.length}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-primary font-mono">{progress}%</span>
            <p className="text-[9px] text-zinc-500 font-bold uppercase">Eficiência</p>
          </div>
        </div>
        
        <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-zinc-800 p-0.5 relative z-10">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progress}%` }} 
            className="h-full bg-gradient-to-r from-orange-600 to-primary rounded-full shadow-[0_0_15px_rgba(255,95,31,0.5)]" 
          />
        </div>
      </section>

      {/* LISTA DE PEDIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode='popLayout'>
          {pendingOrders.length > 0 ? pendingOrders.map(order => (
            <motion.div 
              layout 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              key={order.id} 
              className="relative group/card"
            >
              <OrderCard order={order} onClick={setEditingOrder} />
              <button 
                onClick={(e) => handleRemoveFromGoal(e, order.id)} 
                className="absolute -top-2 -right-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-all hover:scale-110 shadow-xl"
                title="Remover da lista manual"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-[2.5rem] bg-zinc-900/10">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500/20" />
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Fila da Semana Concluída</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <OrderFormModal 
        isOpen={!!editingOrder} 
        order={editingOrder} 
        onClose={() => setEditingOrder(null)} 
      />

      <ManageGoalsModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
      />
    </div>
  );
}

/**
 * COMPONENTE: MODAL DE GERENCIAMENTO DE LISTA
 */
function ManageGoalsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca todos os pedidos ativos para seleção
  useEffect(() => {
    if (!firestore || !user || !isOpen) return;
    
    setLoading(true);
    const q = query(collection(firestore, 'orders'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtra apenas o que não está entregue
      setAllOrders(docs.filter(o => o.status !== 'Entregue'));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user, isOpen]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return allOrders.filter(o => 
      o.client?.toLowerCase().includes(term) || 
      o.id?.toLowerCase().includes(term)
    ).sort((a, b) => (a.client || '').localeCompare(b.client || ''));
  }, [allOrders, search]);

  const togglePriority = async (order: any) => {
    if (!firestore) return;
    const newState = !order.weekly_priority;
    updateDoc(doc(firestore, 'orders', order.id), { 
      weekly_priority: newState 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#09090b] w-full max-w-2xl border border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Gerenciar Produção</h2>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Selecione pedidos para prioridade semanal</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-hidden flex flex-col">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar Cliente ou OS..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:border-primary/50 outline-none transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {loading ? (
              <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-zinc-700" /></div>
            ) : filtered.length > 0 ? filtered.map(order => {
              const isPriority = order.weekly_priority === true;
              return (
                <div 
                  key={order.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all group",
                    isPriority ? "bg-primary/5 border-primary/20" : "bg-zinc-900/30 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-500">#{order.id.slice(-6)}</span>
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{order.status}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white uppercase truncate mt-0.5">{order.client}</h4>
                  </div>
                  
                  <button 
                    onClick={() => togglePriority(order)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      isPriority 
                        ? "bg-primary text-black shadow-[0_0_15px_rgba(255,95,31,0.3)]" 
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    )}
                  >
                    {isPriority ? 'Prioridade' : 'Adicionar'}
                  </button>
                </div>
              );
            }) : (
              <div className="py-20 text-center text-zinc-600">
                <AlertTriangle size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pedido ativo encontrado</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 text-center">
          <button 
            onClick={onClose} 
            className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-primary transition-all active:scale-95"
          >
            Concluir Ajustes
          </button>
        </div>
      </motion.div>
    </div>
  );
}