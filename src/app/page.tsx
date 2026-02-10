
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Zap, 
  Layers, 
  Clock, 
  Activity, 
  TrendingUp,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { useOrders } from '@/hooks/use-orders';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProductionChart } from '@/components/dashboard/ProductionChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// --- SCHEMA ---
const orderSchema = z.object({
  client: z.string().min(1, 'Nome do cliente é obrigatório'),
  deliveryDate: z.string().default(''),
  seller: z.string().default('Vendedor Geral'),
  status: z.enum(['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído']).default('Arte'),
  items: z.array(z.object({
    desc: z.string().default('Novo Item'),
    quantity: z.coerce.number().min(0).default(1),
    unitValue: z.coerce.number().min(0).default(0),
  })).min(1),
});

type OrderFormValues = z.infer<typeof orderSchema>;

// --- COMPONENTES HIGH VOLTAGE ---

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
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }}
    className={cn(
      "relative overflow-hidden rounded-3xl border cursor-default transition-all duration-300",
      isCritical 
        ? "border-destructive/30 bg-destructive/5 hover:border-destructive hover:bg-destructive/10 hover:shadow-[0_0_50px_-10px_rgba(255,0,0,0.4)]" 
        : "border-zinc-800 bg-[#0F0F0F] hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_50px_-10px_rgba(255,95,31,0.3)]",
      "group",
      className
    )}
  >
    <div className={cn(
      "absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 blur-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-500",
      isCritical ? "bg-destructive shadow-[0_0_15px_#FF0000]" : "bg-primary shadow-[0_0_15px_#FF5F1F]"
    )} />
    
    <div className="relative z-10 h-full p-5 flex flex-col justify-between">
      {children}
    </div>
  </motion.div>
);

const ImpactRow = ({ order, index, isDelayed = false, onClick }: { order: any, index: number, isDelayed?: boolean, onClick: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col p-4 rounded-3xl border border-zinc-800 bg-[#111111] mb-2 cursor-pointer overflow-hidden transition-all duration-300",
        "min-h-[200px] hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_40px_-10px_rgba(255,95,31,0.3)]",
        isDelayed && "hover:border-destructive hover:bg-destructive/5 hover:shadow-[0_0_40px_-10px_rgba(255,0,0,0.3)]"
      )}
    >
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 blur-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        isDelayed ? "bg-destructive shadow-[0_0_10px_#FF0000]" : "bg-primary shadow-[0_0_10px_#FF5F1F]"
      )} />

      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "h-7 px-2 rounded-lg bg-black flex items-center justify-center border border-zinc-800 text-[9px] font-mono font-bold text-zinc-500 group-hover:text-white transition-colors",
          isDelayed ? "group-hover:border-destructive" : "group-hover:border-primary"
        )}>
          #{order.id.slice(-4)}
        </div>
        <ChevronRight size={14} className="text-zinc-700 group-hover:text-white transition-transform group-hover:translate-x-1" />
      </div>

      <div className="flex-1 space-y-1.5">
        <h4 className={cn(
          "text-xl font-black leading-none uppercase tracking-tighter transition-colors truncate",
          isDelayed ? "group-hover:text-destructive" : "group-hover:text-primary"
        )}>
          {order.client}
        </h4>
        <p className="text-[10px] text-zinc-600 font-medium uppercase truncate tracking-tight">
          {order.items?.[0]?.desc || 'Sem descrição'}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] animate-pulse",
            isDelayed ? "bg-destructive text-destructive" : "bg-primary text-primary"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
            {order.status}
          </span>
        </div>

        <div className="flex justify-between items-end">
          <div className="space-y-0.5">
            <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Entrega</p>
            <div className="flex items-center gap-1 text-[10px] font-bold text-white uppercase tracking-tighter">
              <Calendar size={10} className="text-zinc-500" />
              {order.deliveryDate || 'Sem data'}
            </div>
          </div>
          <p className="text-base font-black font-mono text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue || 0)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  
  // hooks de dados no topo
  const { orders, stats, isLoading, updateOrder, createOrder } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'clients'), orderBy('name', 'asc')) : null
  , [firestore]);
  const { data: clients } = useCollection(clientsQuery);

  const delayedOrders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return orders.filter(o => 
      o.deliveryDate && 
      o.deliveryDate < today && 
      !['Concluído', 'Entregue'].includes(o.status)
    );
  }, [orders]);

  // --- FORMULÁRIO ---
  const { register, control, handleSubmit, reset, watch } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      client: '',
      status: 'Arte',
      items: [{ desc: 'Novo Item', quantity: 1, unitValue: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch('items');

  const totalValue = useMemo(() => {
    return watchedItems?.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const v = Number(item.unitValue) || 0;
      return acc + (q * v);
    }, 0) || 0;
  }, [watchedItems]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (editingOrder) {
      reset({
        client: editingOrder.client,
        deliveryDate: editingOrder.deliveryDate || '',
        seller: editingOrder.seller || 'Vendedor Geral',
        status: editingOrder.status,
        items: editingOrder.items || [{ desc: 'Novo Item', quantity: 1, unitValue: 0 }]
      });
      setIsModalOpen(true);
    }
  }, [editingOrder, reset]);

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingOrder) {
        await updateOrder(editingOrder.id, { ...data, totalValue });
        toast({ title: "OS Atualizada", description: `Protocolo #${editingOrder.id} salvo.` });
      } else {
        await createOrder({ ...data, totalValue });
        toast({ title: "OS Criada", description: "Protocolo registrado." });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err) {
      // Erro emitido pelo hook useOrders
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin shadow-[0_0_20px_rgba(255,95,31,0.5)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative font-body selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-5 md:p-6 space-y-8 mt-16 md:mt-0 z-10">
        <header className="flex flex-col md:flex-row justify-between items-end relative z-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Activity size={12} className="animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">Protocolo Terminal VisComm</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase leading-none">
              Visão <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Geral</span>
            </h1>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px -5px rgba(255, 95, 31, 0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary hover:bg-white hover:text-black text-black font-black py-3 px-6 rounded-2xl transition-all duration-300 flex items-center gap-2 uppercase tracking-widest text-[10px]"
          >
              <Zap size={16} fill="currentColor" />
              Nova Ordem
          </motion.button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
          {/* KPI PRINCIPAL */}
          <ImpactCard className="col-span-1 lg:col-span-2 row-span-1 min-h-[220px]">
            <div className="flex justify-between items-start">
               <div className="p-3 bg-black rounded-xl border border-zinc-800 group-hover:border-primary transition-all duration-300">
                  <Layers size={20} className="text-primary" />
               </div>
               <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20 flex items-center gap-1">
                  <TrendingUp size={10} /> Atividade Real
               </div>
            </div>
            
            <div className="mt-4">
               <h2 className="text-7xl font-black text-white tracking-tighter group-hover:text-primary transition-colors leading-none">
                 <AnimatedNumber value={stats.total - stats.concluido} />
               </h2>
               <p className="text-zinc-500 text-sm font-black uppercase tracking-widest mt-1">Ordens Ativas</p>
               
               <div className="w-full h-1 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "65%" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="h-full bg-primary shadow-[0_0_10px_rgba(255,95,31,0.8)]"
                  />
               </div>
            </div>
          </ImpactCard>

          {/* GRÁFICO BENTO */}
          <ImpactCard className="col-span-1 lg:col-span-2 p-0 overflow-hidden" delay={0.1}>
            <div className="h-full w-full">
              <ProductionChart orders={orders} />
            </div>
          </ImpactCard>

          {/* WAR ROOM: CRÍTICOS */}
          <AnimatePresence>
            {delayedOrders.length > 0 && (
              <div className="col-span-1 lg:col-span-4">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2 uppercase tracking-tighter">
                    <AlertTriangle className="text-destructive w-4 h-4 animate-bounce" />
                    War Room: Protocolos Críticos
                  </h3>
                  <span className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                    {delayedOrders.length} em atraso
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {delayedOrders.map((order, idx) => (
                    <ImpactRow key={order.id} order={order} index={idx} isDelayed onClick={() => setEditingOrder(order)} />
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* PRODUÇÃO RECENTE */}
          <div className="col-span-1 lg:col-span-4">
             <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2 uppercase tracking-tighter">
                   <div className="w-1.5 h-4 bg-primary rounded-full shadow-[0_0_10px_#FF5F1F]" />
                   Fluxo de Produção Recente
                </h3>
                <button 
                  onClick={() => router.push('/orders')}
                  className="text-[9px] font-black text-zinc-500 hover:text-primary uppercase tracking-widest transition-colors"
                >
                  Ver Tudo
                </button>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {orders.slice(0, 12).map((order, idx) => (
                  <ImpactRow key={order.id} order={order} index={idx} onClick={() => setEditingOrder(order)} />
                ))}
                {orders.length === 0 && (
                  <div className="col-span-full py-10 text-center opacity-20 uppercase font-black text-[9px] tracking-widest">
                    Aguardando Lançamentos
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-2xl bg-[#0F0F0F] border-white/5 text-white rounded-3xl overflow-hidden p-0">
            <DialogHeader className="p-5 border-b border-white/5 flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar OS' : 'Nova OS'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Cliente*</Label>
                  <Input {...register('client')} list="dashboard-client-suggestions" className="bg-black/50 border-white/5 h-10 rounded-xl text-sm" />
                  <datalist id="dashboard-client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Prazo Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-black/50 border-white/5 h-10 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Vendedor</Label>
                  <Input {...register('seller')} className="bg-black/50 border-white/5 h-10 rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-black/50 border-white/5 h-10 rounded-xl text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white">
                          {['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Itens</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', quantity: 1, unitValue: 0 })} className="text-primary text-[9px] font-black tracking-widest flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-white/[0.01] rounded-xl border border-white/5 relative group">
                    <div className="md:col-span-6">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-8 text-xs" placeholder="Descrição" />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-8 text-xs" />
                    </div>
                    <div className="md:col-span-3">
                      <Input type="number" step="0.01" {...register(`items.${index}.unitValue`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-8 text-xs" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-end gap-6 pt-6 border-t border-white/5">
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Total Estimado</p>
                  <p className="text-xl font-black text-white font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</p>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-40 h-11 bg-primary text-black font-black uppercase tracking-widest rounded-xl text-[10px]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Ordem'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
