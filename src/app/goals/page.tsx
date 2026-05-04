'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, ChevronLeft, Trophy, Search, X, Loader2, Plus, 
  CheckCircle2, AlertTriangle, LayoutGrid, Calendar as CalendarIcon,
  Flag, Zap, Users
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { query, collection, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SquadSelector } from '@/components/dashboard/SquadSelector';
import { AvatarStack } from '@/components/ui/AvatarStack';

/**
 * Utilitário de Data (Segunda a Domingo)
 */
const getWeekRange = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd')
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
  
  const [manualOrders, setManualOrders] = useState<any[]>([]);
  const [temporalOrders, setTemporalOrders] = useState<any[]>([]);

  /**
   * ESCUTA REATIVA (FAN-OUT)
   */
  useEffect(() => {
    if (!firestore || !user) return;

    setIsLoading(true);
    const { start, end } = getWeekRange();
    const ordersRef = collection(firestore, 'orders');

    const qManual = query(ordersRef, where('weekly_priority', '==', true));
    const unsubManual = onSnapshot(qManual, (snap) => {
      setManualOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), _origin: 'MANUAL' })));
    });

    const qTemporal = query(
      ordersRef, 
      where('delivery_date', '>=', start),
      where('delivery_date', '<=', end)
    );
    const unsubTemporal = onSnapshot(qTemporal, (snap) => {
      setTemporalOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), _origin: 'AUTO_DATA' })));
      setIsLoading(false);
    });

    return () => {
      unsubManual();
      unsubTemporal();
    };
  }, [firestore, user]);

  /**
   * MOTOR DE MERGE E PARTICIONAMENTO (CORREÇÃO DO BUG)
   */
  const { pendingOrders, completedOrders, progress, totalOrdersCount } = useMemo(() => {
    const mergeMap = new Map<string, any>();

    temporalOrders.forEach(o => mergeMap.set(o.id, o));
    manualOrders.forEach(o => {
      if (mergeMap.has(o.id)) {
        mergeMap.set(o.id, { ...mergeMap.get(o.id), _origin: 'AMBOS' });
      } else {
        mergeMap.set(o.id, o);
      }
    });

    const allOrders = Array.from(mergeMap.values());
    
    // Particionamento Ativo vs Concluído
    const completed = allOrders.filter(o => ['Concluído', 'Entregue'].includes(o.status));
    const pending = allOrders.filter(o => !['Concluído', 'Entregue'].includes(o.status));
    
    const totalCount = allOrders.length;
    const percentage = totalCount > 0 ? Math.round((completed.length / totalCount) * 100) : 0;
    
    return { 
      pendingOrders: pending, 
      completedOrders: completed, 
      progress: percentage,
      totalOrdersCount: totalCount
    };
  }, [manualOrders, temporalOrders]);

  const handleRemoveFromGoal = useCallback(async (e: any, orderId: string) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!firestore) return;
    
    updateDoc(doc(firestore, 'orders', orderId), { 
      weekly_priority: false 
    }).then(() => {
      toast({ title: "Prioridade Removida" });
    });
  }, [firestore, toast]);

  if (isLoading && totalOrdersCount === 0) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24 relative">
      <header className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/')} 
          className="text-muted-foreground uppercase text-[9px] font-black hover:text-foreground p-0 h-auto"
        >
          <ChevronLeft size={12} /> Voltar ao Terminal
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-1"
          >
            <div className="flex items-center gap-4">
              {/* Icon Container with subtle glow trace */}
              <motion.div
                animate={{ 
                  y: [0, -4, 0],
                }}
                transition={{ 
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary/50 border border-border backdrop-blur-sm overflow-hidden group"
              >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_70%,#FF5F1F_100%)] opacity-40 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-[1px] bg-background rounded-[15px] z-10 flex items-center justify-center">
                  <Target className="text-primary w-6 h-6" />
                </div>
              </motion.div>

              {/* Title with Shimmering Gradient */}
              <div className="flex flex-col">
                <motion.h1 
                  className="text-4xl font-black text-foreground tracking-tighter uppercase leading-none flex flex-wrap items-center gap-2"
                >
                  <span>META DA</span>
                  <motion.span 
                    animate={{ 
                      backgroundImage: [
                        'linear-gradient(90deg, #FF5F1F 0%, #FF8F5F 50%, #FF5F1F 100%)',
                        'linear-gradient(90deg, #FF8F5F 0%, #FF5F1F 50%, #FF8F5F 100%)',
                        'linear-gradient(90deg, #FF5F1F 0%, #FF8F5F 50%, #FF5F1F 100%)'
                      ]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    style={{ backgroundSize: '200% auto' }}
                    className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600"
                  >
                    SEMANA
                  </motion.span>
                </motion.h1>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '40%' }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-[2px] bg-gradient-to-r from-primary/50 to-transparent mt-1"
                />
              </div>
            </div>
          </motion.div>

          <Button 
            onClick={() => setIsManageModalOpen(true)} 
            className="bg-primary text-primary-foreground font-black px-8 h-14 rounded-2xl uppercase text-[10px] tracking-widest shadow-[0_0_25px_rgba(255,95,31,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <LayoutGrid size={16} className="mr-2" /> Gerenciar Lista
          </Button>
        </div>
      </header>

      {/* PAINEL DE PROGRESSO PREMIUM — Animated Status Card */}
      {(() => {
        const isVictory = progress === 100;
        const accentColor = isVictory ? '#10B981' : '#FF5F1F';
        const accentClass = isVictory ? 'text-emerald-500' : 'text-primary';
        const accentFill = isVictory ? 'text-emerald-500 fill-emerald-500' : 'text-primary fill-primary';

        return (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-[2.5rem] p-[1px] overflow-hidden"
            style={{ background: `linear-gradient(180deg, ${accentColor}33 0%, ${accentColor}05 100%)` }}
          >
            {/* Rotating border trace */}
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: isVictory ? 6 : 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-full"
                style={{
                  background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 35%, ${accentColor} 50%, transparent 65%, transparent 100%)`,
                  opacity: isVictory ? 0.5 : 0.25,
                }}
              />
            </div>

            <div className={cn(
              "relative rounded-[2.5rem] p-8 overflow-hidden z-10",
              isVictory ? "bg-emerald-500/10" : "bg-background"
            )}>
              {/* Background watermark */}
              <div className={cn("absolute top-0 right-0 p-8", isVictory ? "opacity-[0.06]" : "opacity-[0.03]")}>
                <Trophy size={160} strokeWidth={1} className={isVictory ? "text-emerald-500" : undefined} />
              </div>

              {/* Victory: Animated Glow Pulse behind card */}
              {isVictory && (
                <motion.div
                  animate={{ opacity: [0.05, 0.12, 0.05], scale: [1, 1.02, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-emerald-500/10 rounded-[2.5rem] pointer-events-none"
                />
              )}

              {/* Shimmer sweep */}
              <motion.div
                animate={{ x: ['-200%', '200%'] }}
                transition={{ duration: isVictory ? 3 : 4, repeat: Infinity, repeatDelay: isVictory ? 4 : 8, ease: 'easeInOut' }}
                className={cn(
                  "absolute inset-0 bg-gradient-to-r from-transparent to-transparent -skew-x-12 pointer-events-none z-[5]",
                  isVictory ? "via-emerald-500/[0.06]" : "via-primary/[0.04]"
                )}
              />
              
              <div className="flex flex-col md:flex-row justify-between items-end mb-8 relative z-10 gap-6">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="w-full md:w-auto"
                >
                  {/* Victory: Special label */}
                  {isVictory ? (
                    <motion.p 
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em] mb-2 flex items-center gap-2"
                    >
                      <Trophy size={12} className="text-emerald-500 fill-emerald-500" />
                      Meta da Semana Concluída
                    </motion.p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
                      <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Zap size={12} className={accentFill} />
                      </motion.span>
                      Status da Expedição
                    </p>
                  )}

                  <div className="flex items-baseline gap-3">
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
                      className={cn("text-7xl font-black tracking-tighter", isVictory ? "text-emerald-400" : "text-foreground")}
                    >
                      {completedOrders.length}
                    </motion.span>
                    <span className="text-3xl text-muted-foreground font-black">/ {totalOrdersCount}</span>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest ml-2 mb-2", isVictory ? "text-emerald-600" : "text-muted-foreground")}>
                      {isVictory ? 'Todos os Objetivos Completos' : 'Objetivos Concluídos'}
                    </span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-right w-full md:w-auto"
                >
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <motion.span 
                      animate={{ 
                        textShadow: isVictory
                          ? ['0 0 0px #10B981', '0 0 20px #10B981', '0 0 0px #10B981']
                          : ['0 0 0px #FF5F1F', '0 0 12px #FF5F1F', '0 0 0px #FF5F1F']
                      }}
                      transition={{ duration: isVictory ? 1.5 : 3, repeat: Infinity, ease: 'easeInOut' }}
                      className={cn("text-4xl font-black font-mono tracking-tighter", isVictory ? "text-emerald-400" : "text-primary")}
                    >
                      {progress}%
                    </motion.span>
                  </div>
                  <p className={cn("text-[10px] font-black uppercase tracking-widest", isVictory ? "text-emerald-600" : "text-muted-foreground")}>
                    {isVictory ? 'Produção Máxima' : 'Eficiência de Produção'}
                  </p>
                </motion.div>
              </div>
              
              {/* Progress Bar */}
              <div className={cn(
                "relative h-5 w-full rounded-full p-1 overflow-hidden shadow-inner",
                isVictory ? "bg-emerald-950/40 border border-emerald-800/30" : "bg-background/60 border border-border"
              )}>
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${progress}%` }} 
                  transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "relative h-full rounded-full",
                    isVictory 
                      ? "bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400" 
                      : "bg-gradient-to-r from-orange-700 via-primary to-orange-400"
                  )}
                >
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: isVictory ? 1 : 3, ease: 'easeInOut' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                  />
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30 blur-sm rounded-r-full" />
                  <div className={cn(
                    "absolute inset-0 rounded-full",
                    isVictory ? "shadow-[0_0_25px_rgba(16,185,129,0.5)]" : "shadow-[0_0_20px_rgba(255,95,31,0.4)]"
                  )} />
                </motion.div>
              </div>
            </div>
          </motion.section>
        );
      })()}

      {/* GRID DE PEDIDOS ATIVOS */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Flag size={14} className="text-primary" />
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Pauta em Aberto ({pendingOrders.length})</h3>
        </div>
        
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
                
                <div className="absolute left-4 bottom-4 pointer-events-none opacity-40 group-hover/card:opacity-100 transition-opacity">
                  <span className={cn(
                    "text-[7px] font-black uppercase px-1.5 py-0.5 rounded border flex items-center gap-1",
                    order._origin === 'MANUAL' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : 
                    order._origin === 'AMBOS' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                    "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  )}>
                    {order._origin === 'MANUAL' ? <LayoutGrid size={8}/> : <CalendarIcon size={8}/>}
                    {order._origin}
                  </span>
                </div>

                <button 
                  onClick={(e) => handleRemoveFromGoal(e, order.id)} 
                  className="absolute -top-2 -right-2 p-2 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-all hover:scale-110 shadow-xl z-10"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </motion.div>
            )) : !isLoading && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-secondary/10">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500/20" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em]">Nenhuma missão ativa para o momento</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SEÇÃO DE CONCLUÍDOS (NOVO) */}
      {completedOrders.length > 0 && (
        <div className="pt-12 space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-800" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] whitespace-nowrap">Missões Concluídas</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {completedOrders.map(order => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="opacity-60 grayscale-[0.4] hover:opacity-100 hover:grayscale-0 transition-all duration-500"
              >
                <OrderCard order={order} onClick={setEditingOrder} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

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
 * MODAL DE GERENCIAMENTO
 */
function ManageGoalsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [squadTarget, setSquadTarget] = useState<any>(null);

  useEffect(() => {
    if (!firestore || !user || !isOpen) return;
    
    setLoading(true);
    const q = query(collection(firestore, 'orders'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-card w-full max-w-6xl border border-border rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="p-8 border-b border-border bg-secondary/20 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,95,31,0.15)]">
              <LayoutGrid size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-tight flex items-center gap-3">
                Gerenciar Produção
                <span className="text-[10px] bg-secondary border border-border px-3 py-1 rounded-full text-muted-foreground font-bold tracking-widest">
                  {filtered.length} Ativos
                </span>
              </h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">Status em Tempo Real • Atribuição Estratégica de Equipes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary rounded-full transition-all border border-border">
            <X size={24}/>
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1 overflow-hidden flex flex-col">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por ID, Cliente ou Especificação do Serviço..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-3xl py-5 pl-16 pr-6 text-foreground text-base focus:border-primary/40 focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin mx-auto text-primary w-12 h-12 opacity-20" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-4">Sincronizando Dados...</p>
              </div>
            ) : filtered.length > 0 ? filtered.map(order => {
              const isPriority = order.weekly_priority === true;
              const deadline = order.delivery_date || order.deliveryDate;

              return (
                <motion.div 
                  layout
                  key={order.id} 
                  className={cn(
                    "flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 group relative overflow-hidden",
                    isPriority 
                      ? "bg-primary/[0.03] border-primary/20 shadow-[0_10px_40px_rgba(255,95,31,0.05)]" 
                      : "bg-secondary border-border hover:border-border hover:bg-accent"
                  )}
                >
                  {/* Status Indicator */}
                  <div className={cn(
                    "w-1.5 h-12 rounded-full shrink-0",
                    isPriority ? "bg-primary shadow-[0_0_15px_#FF5F1F]" : "bg-secondary"
                  )} />

                  <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Primary Info */}
                    <div className="lg:col-span-4 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded uppercase tracking-tighter">
                          #{order.id.slice(-6)}
                        </span>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                          {order.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-foreground uppercase truncate tracking-tight group-hover:text-primary transition-colors">
                        {order.client}
                      </h4>
                    </div>

                    {/* Description Block */}
                    <div className="lg:col-span-4 min-w-0 border-l border-border pl-6">
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-2 opacity-50">Especificação dos Itens</p>
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-2.5">
                          {order.items.slice(0, 2).map((item: any, idx: number) => {
                            const itemName = item.desc || item.name || item.descricao || "Item sem descrição";
                            const itemDetails = item.observation || item.notes || item.observacao || item.details;
                            
                            return (
                              <div key={idx} className="min-w-0 border-l-2 border-border pl-3">
                                <p className="text-[11px] font-black text-foreground uppercase truncate flex items-center gap-1.5">
                                  {itemName}
                                  {item.quantity && <span className="bg-secondary text-muted-foreground px-1 py-0.5 rounded text-[8px]">x{item.quantity}</span>}
                                </p>
                                {itemDetails && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 italic mt-0.5 leading-relaxed">
                                    {itemDetails}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          {order.items.length > 2 && (
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">+ {order.items.length - 2} iten(s) adicionais</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic font-medium leading-relaxed">
                          Nenhum detalhamento técnico fornecido para o serviço.
                        </p>
                      )}
                    </div>

                    {/* Deadline & Team */}
                    <div className="lg:col-span-4 flex items-center justify-between pl-6 border-l border-border">
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-50">Prazo de Entrega</p>
                        <div className="flex items-center gap-2 text-foreground text-xs font-bold">
                          <CalendarIcon size={12} className="text-primary" />
                          {deadline && isValid(parseISO(deadline)) ? format(parseISO(deadline), "dd 'de' MMMM", { locale: ptBR }) : 'A Definir'}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-50">Squad</p>
                          <AvatarStack employeeIds={order.assigned_to || []} max={3} size="sm" />
                        </div>
                        
                        <button
                          onClick={() => setSquadTarget(order)}
                          className={cn(
                            "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                            (order.assigned_to?.length > 0)
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-foreground"
                              : "bg-secondary border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                          )}
                          title="Gerenciar Equipe"
                        >
                          <Users size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <button 
                      onClick={() => togglePriority(order)}
                      className={cn(
                        "px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        isPriority 
                          ? "bg-primary text-primary-foreground shadow-[0_0_30px_rgba(255,95,31,0.35)] scale-105" 
                          : "bg-secondary text-muted-foreground border border-border hover:border-white/20 hover:text-foreground"
                      )}
                    >
                      {isPriority ? 'Em Produção' : 'Adicionar'}
                    </button>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="py-20 text-center text-zinc-800 border-2 border-dashed border-border rounded-[3rem]">
                <AlertTriangle size={64} className="mx-auto mb-6 opacity-5" />
                <p className="text-xs font-black uppercase tracking-[0.5em]">Nenhum pedido encontrado no sistema</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-border bg-secondary/30 text-center">
          <button 
            onClick={onClose} 
            className="w-full py-5 bg-white text-primary-foreground font-black uppercase text-[11px] tracking-[0.5em] rounded-3xl hover:bg-primary transition-all active:scale-[0.98] shadow-2xl"
          >
            Concluir Ajustes de Pauta
          </button>
        </div>
      </motion.div>

      {/* Squad Selector Modal */}
      {squadTarget && (
        <SquadSelector
          order={squadTarget}
          isOpen={!!squadTarget}
          onClose={() => setSquadTarget(null)}
        />
      )}
    </div>
  );
}
