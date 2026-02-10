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
  AlertTriangle
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

// --- COMPONENTE: IMPACT CARD (VERTICAL HIGH VOLTAGE - VIBRANT) ---
const ImpactRow = ({ order, index, isDelayed = false, onClick }: { order: any, index: number, isDelayed?: boolean, onClick: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -12, scale: 1.02 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between p-8 rounded-[2.5rem] border border-zinc-800 bg-[#111111] cursor-pointer overflow-hidden transition-all duration-300",
        "min-h-[300px] hover:border-primary/60 hover:bg-primary/[0.04] hover:shadow-[0_25px_70px_-15px_rgba(255,95,31,0.3)]",
        isDelayed && "border-destructive/30 hover:border-destructive/60 hover:bg-destructive/[0.04] hover:shadow-[0_25px_70px_-15px_rgba(255,0,0,0.3)]"
      )}
    >
      {/* Sabre de Luz Vibrante no Topo */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1.5 blur-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full",
        isDelayed ? "bg-destructive shadow-[0_0_25px_#FF0000]" : "bg-primary shadow-[0_0_25px_#FF5F1F]"
      )} />

      <div className="flex justify-between items-start mb-8">
        <div className={cn(
          "h-10 px-4 rounded-xl bg-black flex items-center justify-center border border-zinc-800 text-[11px] font-mono font-black text-zinc-500 group-hover:text-white transition-colors",
          isDelayed ? "group-hover:border-destructive/40" : "group-hover:border-primary/40"
        )}>
          OS #{order.id.slice(-4)}
        </div>
        <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-transform group-hover:translate-x-1" />
      </div>

      <div className="flex-1 space-y-6">
        <h4 className={cn(
          "text-2xl font-black leading-tight uppercase tracking-tighter transition-colors truncate pb-1",
          isDelayed ? "group-hover:text-destructive drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]" : "group-hover:text-primary drop-shadow-[0_0_10px_rgba(255,95,31,0.5)]"
        )}>
          {order.client}
        </h4>
        <p className="text-[12px] text-zinc-500 font-bold uppercase truncate tracking-widest opacity-80 leading-relaxed">
          {order.items?.[0]?.desc || 'Sem descrição'}
        </p>
      </div>

      <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-3 h-3 rounded-full shadow-[0_0_15px_currentColor] animate-pulse",
            isDelayed ? "bg-destructive text-destructive" : "bg-primary text-primary"
          )} />
          <span className="text-[12px] font-black uppercase tracking-[0.3em] text-zinc-300">
            {order.status}
          </span>
        </div>

        <div className="flex justify-between items-end gap-4">
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Entrega Final</p>
            <div className="flex items-center gap-3 text-[12px] font-black text-white uppercase tracking-tighter bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <Calendar size={14} className="text-zinc-500" />
              {order.deliveryDate || '--/--/--'}
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-white tracking-tighter group-hover:scale-105 transition-transform origin-right">
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

  // Hooks do Firebase / Query
  const clientsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'clients'), orderBy('name', 'asc')) : null
  , [firestore]);
  const { data: clients } = useCollection(clientsQuery);

  // Form hooks
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

  // Efeitos de Proteção / Auth
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
        toast({ title: "Protocolo Atualizado", description: `OS #${editingOrder.id} salva.` });
      } else {
        await createOrder({ ...data, totalValue });
        toast({ title: "OS Criada", description: "Novo protocolo registrado no terminal." });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err) {
      // Erro tratado globalmente
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin shadow-[0_0_30px_rgba(255,95,31,0.6)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative font-body selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.05] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-6 md:p-12 space-y-16 mt-16 md:mt-0 z-10 pb-24">
        <header className="flex flex-col md:flex-row justify-between items-end relative z-10 gap-8">
          <div>
            <div className="flex items-center gap-3 text-primary mb-3">
              <Activity size={16} className="animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.5em] drop-shadow-[0_0_8px_rgba(255,95,31,0.6)]">Terminal de Comando VisComm</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white uppercase leading-none">
              Visão <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-300 to-orange-500">Total</span>
            </h1>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 50px -5px rgba(255, 95, 31, 0.8)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary hover:bg-white hover:text-black text-black font-black py-5 px-12 rounded-[2rem] transition-all duration-300 flex items-center gap-4 uppercase tracking-[0.2em] text-sm shadow-[0_0_30px_rgba(255,95,31,0.4)]"
          >
              <Zap size={22} fill="currentColor" />
              Lançar OS
          </motion.button>
        </header>

        {/* REATOR CENTRAL (HUD) */}
        <section className="relative z-10">
          <ProductionHub stats={stats} orders={orders} />
        </section>

        <div className="space-y-20 relative z-10">
          {/* WAR ROOM: CRÍTICOS */}
          <AnimatePresence>
            {delayedOrders.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-4 uppercase tracking-tighter">
                    <AlertTriangle className="text-destructive w-6 h-6 animate-bounce drop-shadow-[0_0_10px_#FF0000]" />
                    War Room: Protocolos Críticos
                  </h3>
                  <span className="bg-destructive/10 text-destructive border border-destructive/30 px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(255,0,0,0.2)]">
                    {delayedOrders.length} Alarmes Ativos
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
                  {delayedOrders.map((order, idx) => (
                    <ImpactRow key={order.id} order={order} index={idx} isDelayed onClick={() => setEditingOrder(order)} />
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* PRODUÇÃO RECENTE */}
          <div className="space-y-8">
             <div className="flex items-center justify-between px-4">
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-4 uppercase tracking-tighter">
                   <div className="w-2.5 h-6 bg-primary rounded-full shadow-[0_0_20px_#FF5F1F]" />
                   Fluxo de Produção Recente
                </h3>
                <button 
                  onClick={() => router.push('/orders')}
                  className="text-[11px] font-black text-zinc-500 hover:text-primary uppercase tracking-widest transition-colors"
                >
                  Expandir Terminal
                </button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
                {orders.slice(0, 15).map((order, idx) => (
                  <ImpactRow key={order.id} order={order} index={idx} onClick={() => setEditingOrder(order)} />
                ))}
                {orders.length === 0 && (
                  <div className="col-span-full py-24 text-center opacity-30 uppercase font-black text-sm tracking-[0.8em]">
                    Aguardando Dados do Banco
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-2xl bg-[#0F0F0F] border-white/5 text-white rounded-[2.5rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.02]">
              <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(255,95,31,0.6)]">
                {editingOrder ? 'Ajustar Protocolo' : 'Novo Protocolo'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-10 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Cliente*</Label>
                  <Input {...register('client')} list="dashboard-client-suggestions" className="bg-black/50 border-white/5 h-14 rounded-2xl text-base focus:border-primary/50" />
                  <datalist id="dashboard-client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Prazo Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-black/50 border-white/5 h-14 rounded-2xl text-base focus:border-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Vendedor Responsável</Label>
                  <Input {...register('seller')} className="bg-black/50 border-white/5 h-14 rounded-2xl text-base focus:border-primary/50" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Status Atual</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-black/50 border-white/5 h-14 rounded-2xl text-base focus:border-primary/50">
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

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.5em] drop-shadow-[0_0_8px_rgba(255,95,31,0.5)]">Itens da Produção</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', quantity: 1, unitValue: 0 })} className="text-primary text-[11px] font-black tracking-widest flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Plus className="w-5 h-5" /> Adicionar
                  </button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 bg-white/[0.02] rounded-3xl border border-white/5 relative group">
                    <div className="md:col-span-6">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-12 text-sm" placeholder="Descrição" />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-12 text-sm" />
                    </div>
                    <div className="md:col-span-3">
                      <Input type="number" step="0.01" {...register(`items.${index}.unitValue`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-12 text-sm" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-3 -top-3 bg-destructive text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-end gap-12 pt-10 border-t border-white/5">
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">Total Estimado</p>
                  <p className="text-3xl font-black text-white font-mono tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                  </p>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-56 h-16 bg-primary text-black font-black uppercase tracking-widest rounded-[1.5rem] text-sm hover:shadow-[0_0_50px_rgba(255,95,31,0.7)] transition-all">
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Gravar Protocolo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
