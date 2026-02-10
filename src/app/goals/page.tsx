'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  ChevronLeft, 
  CalendarDays, 
  Trophy, 
  Zap,
  CheckCircle2,
  ListTodo,
  Loader2,
  Rocket,
  Trash2,
  Save
} from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useOrders } from '@/hooks/use-orders';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

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

export default function WeeklyGoalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { orders, isLoading, updateOrder, deleteOrder } = useOrders();

  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, reset } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema)
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  const { pendingOrders, completedOrders, totalWeekly, progress } = useMemo(() => {
    const weekly = orders.filter(order => {
      if (!order.deliveryDate) return false;
      try {
        const d = parseISO(order.deliveryDate);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch (e) {
        return false;
      }
    });

    const pending = weekly.filter(o => !['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));

    const completed = weekly.filter(o => ['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

    const percentage = weekly.length > 0 ? Math.round((completed.length / weekly.length) * 100) : 0;

    return { pendingOrders: pending, completedOrders: completed, totalWeekly: weekly.length, progress: percentage };
  }, [orders, weekStart, weekEnd]);

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

  const onUpdateSubmit = async (data: OrderFormValues) => {
    if (!editingOrder) return;
    setIsSubmitting(true);
    try {
      const totalValue = data.items.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);
      await updateOrder(editingOrder.id, { ...data, totalValue });
      toast({ title: "Pedido Atualizado" });
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickConclude = async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
      toast({ title: "Objetivo Conquistado" });
    } catch (err) {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-green-500 selection:text-black">
      <DashboardSidebar />
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-green-600 opacity-[0.05] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 z-10 pb-24">
        
        <header className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="text-zinc-500 hover:text-green-400 p-0 h-auto gap-2 uppercase text-[9px] font-black tracking-widest transition-colors"
          >
            <ChevronLeft size={12} /> Voltar ao Terminal
          </Button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[9px] tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5 w-fit">
                <CalendarDays size={10} className="text-green-500" /> 
                {format(weekStart, "dd 'de' MMM", { locale: ptBR })} a {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-600 uppercase tracking-tighter leading-none">
                Meta da Semana
              </h1>
            </div>
          </div>
        </header>

        <section className="group relative bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 transition-all duration-500 hover:border-green-500/50 overflow-hidden">
          <div className="flex justify-between items-end mb-5 relative z-10">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl md:text-6xl font-black text-white tracking-tighter transition-colors group-hover:text-green-400">
                  {completedOrders.length}
                </span>
                <span className="text-xl md:text-2xl text-zinc-600 font-black">
                  / {totalWeekly} PEDIDOS
                </span>
              </div>
              <p className="text-green-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                 <Zap size={10} fill="currentColor" /> Status da Missão
              </p>
            </div>
            
            <motion.div 
               animate={progress === 100 ? { rotate: [0, -10, 10, 0], scale: 1.1 } : {}}
               transition={{ duration: 0.5, repeat: progress === 100 ? Infinity : 0, repeatDelay: 2 }}
               className={`p-4 rounded-xl border transition-all duration-500 ${progress === 100 ? 'bg-green-500 text-black border-green-400' : 'bg-black/40 border-zinc-800 text-zinc-600 group-hover:text-green-500'}`}
            >
               {progress === 100 ? <Trophy size={24} fill="currentColor" /> : <Target size={24} />}
            </motion.div>
          </div>

          <div className="h-6 w-full bg-[#050505] rounded-lg relative overflow-hidden border border-zinc-800 shadow-inner z-10">
            <div className="absolute inset-0 flex justify-between px-2 z-0 opacity-20">
               {[...Array(15)].map((_, i) => <div key={i} className="w-[1px] h-full bg-zinc-600" />)}
            </div>
            <motion.div 
               initial={{ width: 0 }} animate={{ width: `${progress}%` }}
               transition={{ duration: 1.5, ease: "circOut" }} 
               className="h-full relative z-10 rounded-r-md overflow-hidden"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-green-900 via-green-600 to-emerald-400" />
               <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,1)]" />
            </motion.div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
              <ListTodo className="text-green-400 w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                Fila da Semana <span className="bg-white/5 text-zinc-500 text-[9px] px-2 py-0.5 rounded-full border border-white/10 font-bold uppercase">{pendingOrders.length} RESTANTES</span>
              </h3>
              <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest mt-0.5">Pedidos agendados para este período</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pendingOrders.length > 0 ? (
              pendingOrders.map((order) => (
                <OrderCard 
                  key={order.id} order={{ id: order.id, client: order.client, description: order.items?.[0]?.desc || 'Sem descrição técnica', status: order.status, deliveryDate: order.deliveryDate }} 
                  onClick={() => setEditingOrder(order)} onQuickConclude={handleQuickConclude} onDelete={deleteOrder}
                />
              ))
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                <Rocket className="text-green-400 w-12 h-12" />
                <p className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] font-bold">Fila Zerada. Sistema Pronto.</p>
              </div>
            )}
          </div>
        </section>

        {completedOrders.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2 border-b border-green-500/20 pb-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Objetivos Conquistados <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-2 py-0.5 rounded-full font-bold">{completedOrders.length} FEITOS</span></h3>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 opacity-80">
              {completedOrders.map((order) => (
                <OrderCard 
                  key={order.id} order={{ id: order.id, client: order.client, description: order.items?.[0]?.desc || 'Sem descrição técnica', status: order.status, deliveryDate: order.deliveryDate }} 
                  onClick={() => setEditingOrder(order)} onDelete={deleteOrder}
                />
              ))}
            </div>
          </section>
        )}

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-xl overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
              <DialogTitle className="text-2xl font-black text-green-500 uppercase tracking-tighter">Ajustar Pedido</DialogTitle>
              <Button variant="ghost" onClick={() => { if (editingOrder) { deleteOrder(editingOrder.id); setIsModalOpen(false); } }} className="text-destructive font-black uppercase text-[9px] tracking-widest gap-2 h-9 px-4 rounded-lg border border-destructive/10">
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </Button>
            </DialogHeader>
            <form onSubmit={handleSubmit(onUpdateSubmit)} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label>
                  <Input {...register('client')} className="bg-white/5 border-white/5 h-12 rounded-xl text-base" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-12 rounded-xl text-base" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between"><h3 className="text-[10px] font-black text-green-500 uppercase tracking-[0.4em]">Itens da Produção</h3></div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className="md:col-span-10"><Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-10 text-sm" /></div>
                    <div className="md:col-span-2"><Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-10 text-center text-sm" /></div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end pt-8 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-56 h-12 bg-green-600 text-black font-black uppercase tracking-widest rounded-xl text-xs">Confirmar Alterações</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}