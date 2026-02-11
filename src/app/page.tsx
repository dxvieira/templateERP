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
  CheckCircle2,
  Hash,
  Box,
  FileText,
  Trash2,
  Save
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
import { Textarea } from '@/components/ui/textarea';
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
    desc: z.string().default(''),
    quantity: z.coerce.number().min(0).default(1),
    unitValue: z.coerce.number().min(0).default(0),
    observation: z.string().optional(),
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
      items: [{ desc: '', quantity: 1, unitValue: 0, observation: '' }]
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
        items: editingOrder.items || [{ desc: '', quantity: 1, unitValue: 0, observation: '' }]
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

  const handleDeleteOrder = async () => {
    if (!editingOrder) return;
    if (window.confirm("Remover este pedido permanentemente?")) {
      await deleteOrder(editingOrder.id);
      setIsModalOpen(false);
      setEditingOrder(null);
      toast({ title: "Removido", description: "Pedido excluído do sistema." });
    }
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

      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 z-10 pb-24">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Activity size={14} className="animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">Terminal Operacional VisComm</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Fluxo</span>
            </h1>
          </div>
          
          <Button 
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary text-black font-black h-10 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 uppercase tracking-widest text-[10px] shadow-[0_5px_20px_-5px_rgba(255,95,31,0.3)] hover:bg-white active:scale-95"
          >
              <Plus size={16} strokeWidth={3} />
              Lançar Pedido
          </Button>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          <div className="lg:col-span-2">
            <ProductionHub stats={stats} />
          </div>
          <div className="lg:col-span-1">
            <WeeklyTargetCard pendingCount={weeklyPendingCount} />
          </div>
        </section>

        {warRoom.length > 0 && (
          <section className="space-y-4 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 px-2 border-b border-destructive/20 pb-3">
              <div className="p-1.5 bg-destructive/10 rounded-lg animate-pulse">
                <AlertTriangle className="text-destructive w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                  Pedidos Críticos <span className="bg-destructive/20 text-destructive text-[8px] px-2 py-0.5 rounded-full border border-destructive/30 font-bold">{warRoom.length} EM ALERTA</span>
                </h3>
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
                      deliveryDate: order.deliveryDate,
                      items: order.items
                    }} 
                    onClick={() => setEditingOrder(order)} 
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Layers className="text-primary w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fila de Pedidos ({productionQueue.length})</h3>
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
                    deliveryDate: order.deliveryDate,
                    items: order.items
                  }} 
                  onClick={() => setEditingOrder(order)} 
                />
              </div>
            ))}
          </div>
        </section>

        {completedList.length > 0 && (
          <section className="space-y-4 animate-in fade-in duration-700">
            <div className="flex items-center gap-3 px-2 border-b border-green-500/20 pb-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-green-500/20">
                <CheckCircle2 className="text-emerald-500 w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Pedidos Concluídos ({completedList.length})</h3>
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
                      deliveryDate: order.deliveryDate,
                      items: order.items
                    }} 
                    onClick={() => setEditingOrder(order)} 
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-[2rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between bg-zinc-900/30">
              <DialogTitle className="text-lg font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar Pedido' : 'Novo Lançamento'}
              </DialogTitle>
              {editingOrder && (
                <button onClick={handleDeleteOrder} className="p-2 text-zinc-500 hover:text-destructive transition-colors mr-8">
                  <Trash2 size={18} />
                </button>
              )}
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label>
                  <Input {...register('client')} list="client-list" className="bg-white/5 border-white/5 h-10 rounded-lg text-sm focus:border-primary/50" />
                  <datalist id="client-list">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-10 rounded-lg text-sm focus:border-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Vendedor</Label>
                  <Input {...register('seller')} className="bg-white/5 border-white/5 h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Etapa</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white/5 border-white/5 h-10 rounded-lg text-sm">
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
                  <button type="button" onClick={() => append({ desc: '', quantity: 1, unitValue: 0, observation: '' })} className="text-primary text-[8px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20 hover:bg-primary hover:text-black transition-all">
                    + Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={field.id} 
                      className="bg-white/[0.02] border border-white/5 rounded-xl p-4 relative group"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-3 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                              <Box size={8} /> Material
                            </Label>
                            <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-9 text-xs" placeholder="Lona, ACM..." />
                          </div>
                          <div className="w-16 space-y-1">
                            <Label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                              <Hash size={8} /> Qtd.
                            </Label>
                            <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-9 text-center text-xs" />
                          </div>
                          <button type="button" onClick={() => remove(index)} className="p-2 text-zinc-600 hover:text-destructive">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                            <FileText size={8} /> Obs. Técnica
                          </Label>
                          <Textarea {...register(`items.${index}.observation`)} className="bg-transparent border-white/5 min-h-[50px] text-xs resize-none" placeholder="Detalhes de acabamento..." />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-6 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-48 h-10 bg-primary text-black font-black uppercase tracking-widest rounded-xl text-[10px] hover:shadow-[0_0_30px_rgba(255,95,31,0.5)] transition-all">
                  {isSubmitting ? <Loader2 className="w-4 animate-spin" /> : <><Save size={14} className="mr-2" /> Gravar Pedido</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}