'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Activity, 
  Plus,
  Loader2,
  AlertTriangle,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

import { useOrders } from '@/hooks/use-orders';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { ProductionHub } from '@/components/dashboard/ProductionHub';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { WeeklyTargetCard } from '@/components/dashboard/WeeklyTargetCard';
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

export default function DashboardPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const { orders, stats, isLoading, updateOrder, createOrder, deleteOrder } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries e Hooks de Dados
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

  // Lógica de Datas e Prioridades
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  // 1. Contador de Pedidos Pendentes da Semana (Para o WeeklyTargetCard)
  const weeklyPendingCount = useMemo(() => {
    return orders.filter(o => {
      if (!o.deliveryDate || ['Concluído', 'Entregue'].includes(o.status)) return false;
      try {
        const d = parseISO(o.deliveryDate);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch (e) {
        return false;
      }
    }).length;
  }, [orders, weekStart, weekEnd]);

  // 2. Pedidos Críticos (War Room): Atrasados ou Hoje
  const warRoom = useMemo(() => {
    return orders.filter(o => 
      !['Concluído', 'Entregue'].includes(o.status) && 
      o.deliveryDate && 
      o.deliveryDate <= todayStr
    ).sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
  }, [orders, todayStr]);

  // 3. Fila de Pedidos (Fluxo Nominal): Futuro
  const productionQueue = useMemo(() => {
    return orders.filter(o => 
      !['Concluído', 'Entregue'].includes(o.status) && 
      (!o.deliveryDate || o.deliveryDate > todayStr)
    ).sort((a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999'));
  }, [orders, todayStr]);

  // 4. Pedidos Concluídos (Troféus)
  const completedList = useMemo(() => {
    return orders.filter(o => ['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [orders]);

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
        toast({ title: "Pedido Atualizado", description: `Pedido #${editingOrder.id} salvo.` });
      } else {
        await createOrder({ ...data, totalValue });
        toast({ title: "Pedido Criado", description: "Novo pedido registrado no terminal." });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickConclude = async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
      toast({ title: "Finalizado", description: "Pedido movido para concluídos." });
    } catch (err) {}
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin shadow-[0_0_20px_rgba(255,95,31,0.3)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-10 mt-16 md:mt-0 z-10 pb-24">
        <header className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Activity size={14} className="animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">Terminal Operacional VisComm</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Fluxo</span>
            </h1>
          </div>
          
          <Button 
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary text-black font-black py-6 px-10 rounded-xl transition-all duration-300 flex items-center gap-3 uppercase tracking-widest text-xs shadow-[0_5px_20px_-5px_rgba(255,95,31,0.3)] hover:bg-white active:scale-95"
          >
              <Plus size={18} strokeWidth={3} />
              Lançar Pedido
          </Button>
        </header>

        {/* HUB SUPERIOR: REATOR + META DA SEMANA */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          <div className="lg:col-span-2">
            <ProductionHub stats={stats} />
          </div>
          <div className="lg:col-span-1">
            <WeeklyTargetCard pendingCount={weeklyPendingCount} />
          </div>
        </section>

        {/* CAMADA 1: PEDIDOS CRÍTICOS (WAR ROOM) */}
        {warRoom.length > 0 && (
          <section className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 px-2 border-b border-destructive/20 pb-3">
              <div className="p-1.5 bg-destructive/10 rounded-lg animate-pulse">
                <AlertTriangle className="text-destructive w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                  Pedidos Críticos <span className="bg-destructive/20 text-destructive text-[9px] px-2 py-0.5 rounded-full border border-destructive/30 font-bold">{warRoom.length} EM ALERTA</span>
                </h3>
                <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest mt-0.5">Atrasados ou Entrega Hoje</p>
              </div>
            </div>
            
            <div className="flex overflow-x-auto pb-6 gap-3 snap-x snap-mandatory neon-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
              {warRoom.map((order) => (
                <div key={order.id} className="min-w-[85vw] sm:min-w-[320px] lg:min-w-0 snap-center">
                  <OrderCard 
                    order={{
                      id: order.id,
                      client: order.client,
                      description: order.items?.[0]?.desc || 'Sem descrição',
                      status: order.status,
                      deliveryDate: order.deliveryDate
                    }} 
                    onClick={() => setEditingOrder(order)} 
                    onQuickConclude={handleQuickConclude}
                    onDelete={deleteOrder}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CAMADA 2: FILA DE PEDIDOS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Layers className="text-primary w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Fila de Pedidos</h3>
              <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest mt-0.5">Próximas Entregas ({productionQueue.length})</p>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-6 gap-3 snap-x snap-mandatory neon-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
            {productionQueue.map((order) => (
              <div key={order.id} className="min-w-[85vw] sm:min-w-[320px] lg:min-w-0 snap-center">
                <OrderCard 
                  key={order.id} 
                  order={{
                    id: order.id,
                    client: order.client,
                    description: order.items?.[0]?.desc || 'Sem descrição',
                    status: order.status,
                    deliveryDate: order.deliveryDate
                  }} 
                  onClick={() => setEditingOrder(order)} 
                  onQuickConclude={handleQuickConclude}
                  onDelete={deleteOrder}
                />
              </div>
            ))}
            {productionQueue.length === 0 && warRoom.length === 0 && (
              <div className="col-span-full py-16 text-center opacity-20 uppercase font-black text-xs tracking-[0.4em] w-full">Sem pedidos ativos na fila</div>
            )}
          </div>
        </section>

        {/* CAMADA 3: PEDIDOS CONCLUÍDOS */}
        {completedList.length > 0 && (
          <section className="space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center gap-3 px-2 border-b border-green-500/20 pb-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-green-500/20">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Pedidos Concluídos</h3>
                <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest mt-0.5">Troféus de Produção ({completedList.length})</p>
              </div>
            </div>

            <div className="flex overflow-x-auto pb-6 gap-3 snap-x snap-mandatory neon-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
              {completedList.map((order) => (
                <div key={order.id} className="min-w-[85vw] sm:min-w-[320px] lg:min-w-0 snap-center">
                  <OrderCard 
                    key={order.id} 
                    order={{
                      id: order.id,
                      client: order.client,
                      description: order.items?.[0]?.desc || 'Sem descrição',
                      status: order.status,
                      deliveryDate: order.deliveryDate
                    }} 
                    onClick={() => setEditingOrder(order)} 
                    onDelete={deleteOrder}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MODAL DE CADASTRO/EDIÇÃO */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-2xl overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
              <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar Pedido' : 'Lançar Pedido'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label>
                  <Input {...register('client')} list="client-list" className="bg-white/5 border-white/5 h-12 rounded-xl text-base focus:border-primary/50" />
                  <datalist id="client-list">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-12 rounded-xl text-base focus:border-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Vendedor</Label>
                  <Input {...register('seller')} className="bg-white/5 border-white/5 h-12 rounded-xl text-base" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Etapa</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white/5 border-white/5 h-12 rounded-xl text-base">
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
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Itens da Produção</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', quantity: 1, unitValue: 0 })} className="text-primary text-[9px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary hover:text-black transition-all">
                    + Adicionar
                  </button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 bg-white/[0.02] rounded-xl border border-white/5 relative group">
                    <div className="md:col-span-10">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-10 text-sm" placeholder="Descrição Técnica" />
                    </div>
                    <div className="md:col-span-2">
                       <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-10 text-center text-sm" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 bg-destructive text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                      <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end pt-8 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-56 h-12 bg-primary text-black font-black uppercase tracking-widest rounded-xl text-xs hover:shadow-[0_0_30px_rgba(255,95,31,0.5)] transition-all">
                  {isSubmitting ? <Loader2 className="w-5 animate-spin" /> : 'Confirmar Pedido'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}