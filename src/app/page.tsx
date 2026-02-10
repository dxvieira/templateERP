
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
  Clock,
  LayoutDashboard
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

// --- COMPONENTE: IMPACT CARD (WIDE & CLEAN) ---
const ImpactRow = ({ order, index, isDelayed = false, onClick }: { order: any, index: number, isDelayed?: boolean, onClick: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col md:flex-row md:items-center justify-between p-6 md:p-10 rounded-[2rem] border border-zinc-900 bg-[#0A0A0A] cursor-pointer overflow-hidden transition-all duration-300",
        "hover:border-primary/40 hover:bg-[#0E0E0E] hover:shadow-[0_20px_50px_-20px_rgba(255,95,31,0.2)]",
        isDelayed && "border-destructive/20 hover:border-destructive/40 hover:shadow-[0_20px_50px_-20px_rgba(255,0,0,0.2)]"
      )}
    >
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
            isDelayed ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/10 text-primary border-primary/20"
          )}>
            OS #{order.id.slice(-4)}
          </div>
          {isDelayed && (
            <div className="flex items-center gap-1.5 text-destructive animate-pulse">
              <Clock size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">Atrasado</span>
            </div>
          )}
        </div>
        
        <h4 className="text-2xl md:text-3xl font-black leading-none uppercase tracking-tighter text-white group-hover:text-primary transition-colors truncate pb-1">
          {order.client}
        </h4>
        
        <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.2em] truncate max-w-md">
          {order.items?.[0]?.desc || 'Sem especificação técnica'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 mt-8 md:mt-0 pt-8 md:pt-0 border-t md:border-t-0 border-white/5">
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Etapa</p>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]",
              isDelayed ? "bg-destructive text-destructive" : "bg-primary text-primary"
            )} />
            <span className="text-sm font-black uppercase tracking-widest text-zinc-300">
              {order.status}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Prazo de Entrega</p>
          <div className="flex items-center gap-3 text-sm font-black text-white uppercase tracking-tighter bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <Calendar size={14} className="text-zinc-500" />
            {order.deliveryDate || '--/--/--'}
          </div>
        </div>

        <ChevronRight size={24} className="hidden md:block text-zinc-800 group-hover:text-primary transition-all group-hover:translate-x-1" />
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
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-6 md:p-16 space-y-20 mt-16 md:mt-0 z-10 pb-32">
        <header className="flex flex-col md:flex-row justify-between items-end relative z-10 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Activity size={18} className="animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.6em] drop-shadow-[0_0_8px_rgba(255,95,31,0.6)]">Terminal Operacional VisComm</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Fluxo</span>
            </h1>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02, boxShadow: "0 0 40px -5px rgba(255, 95, 31, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary text-black font-black py-6 px-14 rounded-2xl transition-all duration-300 flex items-center gap-4 uppercase tracking-[0.2em] text-sm shadow-[0_10px_30px_-5px_rgba(255,95,31,0.3)]"
          >
              <Plus size={22} strokeWidth={3} />
              Lançar OS
          </motion.button>
        </header>

        {/* REATOR CENTRAL (HUD) */}
        <section className="relative z-10 max-w-6xl">
          <ProductionHub stats={stats} orders={orders} />
        </section>

        <div className="space-y-32 relative z-10 max-w-7xl">
          {/* WAR ROOM: CRÍTICOS */}
          <AnimatePresence>
            {delayedOrders.length > 0 && (
              <div className="space-y-10">
                <div className="flex items-center justify-between px-6">
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-5 uppercase tracking-tighter">
                    <AlertTriangle className="text-destructive w-7 h-7 animate-bounce drop-shadow-[0_0_10px_#FF0000]" />
                    War Room: Protocolos Críticos
                  </h3>
                  <span className="bg-destructive/10 text-destructive border border-destructive/20 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(255,0,0,0.15)]">
                    {delayedOrders.length} Alarmes Ativos
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {delayedOrders.map((order, idx) => (
                    <ImpactRow key={order.id} order={order} index={idx} isDelayed onClick={() => setEditingOrder(order)} />
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* PRODUÇÃO RECENTE */}
          <div className="space-y-10">
             <div className="flex items-center justify-between px-6">
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-5 uppercase tracking-tighter">
                   <div className="w-3 h-8 bg-primary rounded-full shadow-[0_0_20px_#FF5F1F]" />
                   Fluxo de Produção Recente
                </h3>
                <button 
                  onClick={() => router.push('/orders')}
                  className="text-[11px] font-black text-zinc-600 hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  Ver Todos <ChevronRight size={14} />
                </button>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {orders.slice(0, 10).map((order, idx) => (
                  <ImpactRow key={order.id} order={order} index={idx} onClick={() => setEditingOrder(order)} />
                ))}
                {orders.length === 0 && (
                  <div className="col-span-full py-32 text-center opacity-20 uppercase font-black text-lg tracking-[1em]">
                    Aguardando Dados
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-[2.5rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
              <DialogTitle className="text-3xl font-black text-primary uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(255,95,31,0.6)]">
                {editingOrder ? 'Ajustar Protocolo' : 'Novo Protocolo'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-10 md:p-14 space-y-12 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label>
                  <Input {...register('client')} list="dashboard-client-suggestions" className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50 transition-all" />
                  <datalist id="dashboard-client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Prazo Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Vendedor</Label>
                  <Input {...register('seller')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50 transition-all" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Status Atual</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white p-2 rounded-xl">
                          {['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído'].map(s => (
                            <SelectItem key={s} value={s} className="rounded-lg">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.5em]">Itens da Produção</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', quantity: 1, unitValue: 0 })} className="text-primary text-[10px] font-black tracking-widest flex items-center gap-3 hover:opacity-80 transition-all bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-8 bg-white/[0.02] rounded-3xl border border-white/5 relative group">
                    <div className="md:col-span-8">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-14 text-base" placeholder="Descrição Técnica" />
                    </div>
                    <div className="md:col-span-4">
                      <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-14 text-base" placeholder="Qtd" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-3 -top-3 bg-destructive text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-12 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-64 h-16 bg-primary text-black font-black uppercase tracking-widest rounded-2xl text-sm hover:shadow-[0_0_50px_rgba(255,95,31,0.5)] transition-all">
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
