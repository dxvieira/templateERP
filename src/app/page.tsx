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

import { useOrders } from '@/hooks/use-orders';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { ProductionHub } from '@/components/dashboard/ProductionHub';
import { OrderCard } from '@/components/dashboard/OrderCard';
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

  // Cálculos de Prioridade (3 Camadas)
  const todayStr = new Date().toISOString().split('T')[0];

  const warRoom = useMemo(() => {
    return orders.filter(o => 
      !['Concluído', 'Entregue'].includes(o.status) && 
      o.deliveryDate && 
      o.deliveryDate <= todayStr
    ).sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
  }, [orders, todayStr]);

  const productionQueue = useMemo(() => {
    return orders.filter(o => 
      !['Concluído', 'Entregue'].includes(o.status) && 
      (!o.deliveryDate || o.deliveryDate > todayStr)
    ).sort((a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999'));
  }, [orders, todayStr]);

  const completedList = useMemo(() => {
    return orders.filter(o => ['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [orders]);

  // Cálculos Memoizados Secundários
  const totalValue = useMemo(() => {
    return watchedItems?.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const v = Number(item.unitValue) || 0;
      return acc + (q * v);
    }, 0) || 0;
  }, [watchedItems]);

  // Efeitos colaterais
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

  // Handlers
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
        <Loader2 className="w-12 h-12 text-primary animate-spin shadow-[0_0_20px_rgba(255,95,31,0.3)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-6 md:p-12 space-y-16 mt-16 md:mt-0 z-10 pb-32">
        <header className="flex flex-col md:flex-row justify-between items-end gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Activity size={18} className="animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.6em]">Terminal Operacional VisComm</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Fluxo</span>
            </h1>
          </div>
          
          <Button 
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary text-black font-black py-8 px-12 rounded-2xl transition-all duration-300 flex items-center gap-4 uppercase tracking-[0.2em] text-sm shadow-[0_10px_30px_-5px_rgba(255,95,31,0.3)] hover:shadow-[0_15px_40px_-5px_rgba(255,95,31,0.5)] active:scale-95"
          >
              <Plus size={22} strokeWidth={3} />
              Lançar Pedido
          </Button>
        </header>

        {/* REATOR ULTRA-FLUIDO */}
        <section className="relative z-10">
          <ProductionHub stats={stats} />
        </section>

        {/* CAMADA 1: WAR ROOM (EMERGÊNCIAS) */}
        {warRoom.length > 0 && (
          <section className="space-y-8 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4 px-2 border-b border-destructive/20 pb-4">
              <div className="p-2 bg-destructive/10 rounded-xl animate-pulse">
                <AlertTriangle className="text-destructive w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                  War Room <span className="bg-destructive/20 text-destructive text-[10px] px-2 py-0.5 rounded-full border border-destructive/30">{warRoom.length} CRÍTICOS</span>
                </h3>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Atrasados ou Entrega Hoje</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {warRoom.map((order) => (
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
              ))}
            </div>
          </section>
        )}

        {/* CAMADA 2: FILA DE PRODUÇÃO (FLUXO NOMINAL) */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 px-2 border-b border-white/5 pb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Layers className="text-primary w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Fila de Produção</h3>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Próximos Projetos ({productionQueue.length})</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {productionQueue.map((order) => (
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
            ))}
            {productionQueue.length === 0 && warRoom.length === 0 && (
              <div className="py-20 text-center opacity-20 uppercase font-black text-sm tracking-[0.5em]">Sem pedidos ativos na fila</div>
            )}
          </div>
        </section>

        {/* CAMADA 3: PEDIDOS CONCLUÍDOS (HISTÓRICO) */}
        {completedList.length > 0 && (
          <section className="space-y-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
            <div className="flex items-center gap-4 px-2 border-b border-zinc-800 pb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="text-emerald-500 w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.4em]">Pedidos Concluídos</h3>
                <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest mt-1">Histórico Recente ({completedList.length})</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 grayscale-[0.5] hover:grayscale-0 transition-all duration-300">
              {completedList.map((order) => (
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
              ))}
            </div>
          </section>
        )}

        {/* MODAL DE CADASTRO/EDIÇÃO */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-[2.5rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
              <DialogTitle className="text-3xl font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar Pedido' : 'Lançar Pedido'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="p-10 md:p-14 space-y-12 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label>
                  <Input {...register('client')} list="client-list" className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50" />
                  <datalist id="client-list">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Vendedor</Label>
                  <Input {...register('seller')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Etapa</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg">
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
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.5em]">Itens da Produção</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', quantity: 1, unitValue: 0 })} className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-full border border-primary/20 hover:bg-primary hover:text-black transition-all">
                    + Adicionar
                  </button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-8 bg-white/[0.02] rounded-3xl border border-white/5 relative group">
                    <div className="md:col-span-10">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-14 text-base" placeholder="Descrição Técnica" />
                    </div>
                    <div className="md:col-span-2">
                       <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-14 text-center text-base" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 bg-destructive text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end pt-12 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-64 h-16 bg-primary text-black font-black uppercase tracking-widest rounded-2xl text-sm hover:shadow-[0_0_50px_rgba(255,95,31,0.5)] transition-all">
                  {isSubmitting ? <Loader2 className="w-6 animate-spin" /> : 'Confirmar Pedido'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}