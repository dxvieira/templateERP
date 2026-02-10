'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Zap, 
  Activity, 
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { useOrders } from '@/hooks/use-orders';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProductionHub } from '@/components/dashboard/ProductionHub';
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

// --- COMPONENTE: IMPACT CARD (VERTICAL) ---
const ImpactRow = ({ order, index, isDelayed = false, onClick }: { order: any, index: number, isDelayed?: boolean, onClick: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between p-6 rounded-[2.5rem] border border-zinc-800 bg-[#111111] cursor-pointer overflow-hidden transition-all duration-300",
        "min-h-[280px] hover:border-primary hover:bg-primary/[0.03] hover:shadow-[0_0_50px_-15px_rgba(255,95,31,0.3)]",
        isDelayed && "border-destructive/20 hover:border-destructive hover:bg-destructive/[0.03] hover:shadow-[0_0_50px_-15px_rgba(255,0,0,0.3)]"
      )}
    >
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-1 blur-[6px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full",
        isDelayed ? "bg-destructive shadow-[0_0_15px_#FF0000]" : "bg-primary shadow-[0_0_15px_#FF5F1F]"
      )} />

      <div className="flex justify-between items-start mb-6">
        <div className={cn(
          "h-8 px-3 rounded-xl bg-black flex items-center justify-center border border-zinc-800 text-[10px] font-mono font-black text-zinc-500 group-hover:text-white transition-colors",
          isDelayed ? "group-hover:border-destructive" : "group-hover:border-primary"
        )}>
          #{order.id.slice(-4)}
        </div>
        <ChevronRight size={16} className="text-zinc-700 group-hover:text-white transition-transform group-hover:translate-x-1" />
      </div>

      <div className="flex-1 space-y-4">
        <h4 className={cn(
          "text-2xl font-black leading-[1.1] uppercase tracking-tighter transition-colors truncate pb-1",
          isDelayed ? "group-hover:text-destructive" : "group-hover:text-primary"
        )}>
          {order.client}
        </h4>
        <p className="text-[11px] text-zinc-500 font-bold uppercase truncate tracking-tight opacity-70">
          {order.items?.[0]?.desc || 'Sem descrição'}
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 space-y-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] animate-pulse",
            isDelayed ? "bg-destructive text-destructive" : "bg-primary text-primary"
          )} />
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-300">
            {order.status}
          </span>
        </div>

        <div className="flex justify-between items-end gap-2">
          <div className="space-y-1">
            <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Entrega Final</p>
            <div className="flex items-center gap-2 text-[11px] font-black text-white uppercase tracking-tighter bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              <Calendar size={12} className="text-zinc-500" />
              {order.deliveryDate || 'Sem data'}
            </div>
          </div>
          <p className="text-xl font-black font-mono text-white tracking-tighter">
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
  const { orders, stats, isLoading, updateOrder, createOrder } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'clients'), orderBy('name', 'asc')) : null
  , [firestore]);
  const { data: clients } = useCollection(clientsQuery);

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

  const delayedOrders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return orders.filter(o => 
      o.deliveryDate && 
      o.deliveryDate < today && 
      !['Concluído', 'Entregue'].includes(o.status)
    );
  }, [orders]);

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

      <main className="flex-1 md:ml-64 p-6 md:p-8 space-y-12 mt-16 md:mt-0 z-10 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-end relative z-10 gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Activity size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Terminal VisComm Online</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none">
              Visão <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Geral</span>
            </h1>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px -5px rgba(255, 95, 31, 0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary hover:bg-white hover:text-black text-black font-black py-4 px-10 rounded-2xl transition-all duration-300 flex items-center gap-3 uppercase tracking-widest text-xs"
          >
              <Zap size={20} fill="currentColor" />
              Nova Ordem
          </motion.button>
        </header>

        {/* REATOR DE PRODUÇÃO CENTRAL */}
        <section className="relative z-10">
          <ProductionHub stats={stats} orders={orders} />
        </section>

        <div className="space-y-12 relative z-10">
          {/* WAR ROOM: CRÍTICOS */}
          <AnimatePresence>
            {delayedOrders.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-base font-black text-white tracking-tight flex items-center gap-3 uppercase tracking-tighter">
                    <AlertTriangle className="text-destructive w-5 h-5 animate-bounce" />
                    War Room: Alertas Críticos
                  </h3>
                  <span className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {delayedOrders.length} em atraso
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                  {delayedOrders.map((order, idx) => (
                    <ImpactRow key={order.id} order={order} index={idx} isDelayed onClick={() => setEditingOrder(order)} />
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* PRODUÇÃO RECENTE */}
          <div className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-3 uppercase tracking-tighter">
                   <div className="w-2 h-5 bg-primary rounded-full shadow-[0_0_15px_#FF5F1F]" />
                   Fluxo de Produção Recente
                </h3>
                <button 
                  onClick={() => router.push('/orders')}
                  className="text-[10px] font-black text-zinc-500 hover:text-primary uppercase tracking-widest transition-colors"
                >
                  Ver Tudo
                </button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                {orders.slice(0, 15).map((order, idx) => (
                  <ImpactRow key={order.id} order={order} index={idx} onClick={() => setEditingOrder(order)} />
                ))}
                {orders.length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-20 uppercase font-black text-xs tracking-[0.5em]">
                    Aguardando Lançamentos
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-2xl bg-[#0F0F0F] border-white/5 text-white rounded-[2rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.02]">
              <DialogTitle className="text-xl font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar Protocolo' : 'Novo Protocolo'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cliente*</Label>
                  <Input {...register('client')} list="dashboard-client-suggestions" className="bg-black/50 border-white/5 h-12 rounded-xl text-sm" />
                  <datalist id="dashboard-client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Prazo Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-black/50 border-white/5 h-12 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Vendedor Responsável</Label>
                  <Input {...register('seller')} className="bg-black/50 border-white/5 h-12 rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status Atual</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-black/50 border-white/5 h-12 rounded-xl text-sm">
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Itens da Produção</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', quantity: 1, unitValue: 0 })} className="text-primary text-[10px] font-black tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 relative group">
                    <div className="md:col-span-6">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-10 text-xs" placeholder="Descrição" />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-10 text-xs" />
                    </div>
                    <div className="md:col-span-3">
                      <Input type="number" step="0.01" {...register(`items.${index}.unitValue`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-10 text-xs" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 bg-destructive text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-end gap-10 pt-8 border-t border-white/5">
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total Estimado</p>
                  <p className="text-2xl font-black text-white font-mono tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                  </p>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-48 h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl text-xs hover:shadow-[0_0_30px_rgba(255,95,31,0.5)] transition-all">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gravar Ordem'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
