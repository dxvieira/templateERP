'use client';

import React, { useMemo, useState, useCallback } from 'react';
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
  Save,
  Box,
  Hash,
  FileText,
  X
} from 'lucide-react';
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { query, collection, where, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const orderSchema = z.object({
  client: z.string().min(1, 'Cliente obrigatório'),
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

export default function WeeklyGoalsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const weekInterval = useMemo(() => {
    const now = new Date();
    return {
      start: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      end: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      displayStart: startOfWeek(now, { weekStartsOn: 0 }),
      displayEnd: endOfWeek(now, { weekStartsOn: 0 })
    };
  }, []);

  const weeklyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'orders'),
      where('deliveryDate', '>=', weekInterval.start),
      where('deliveryDate', '<=', weekInterval.end),
      orderBy('deliveryDate', 'asc')
    );
  }, [firestore, user, weekInterval]);

  const { data: orders, isLoading } = useCollection(weeklyQuery);

  const { pendingOrders, completedOrders, progress } = useMemo(() => {
    if (!orders) return { pendingOrders: [], completedOrders: [], progress: 0 };
    const pending = orders.filter(o => !['Concluído', 'Entregue'].includes(o.status));
    const completed = orders.filter(o => ['Concluído', 'Entregue'].includes(o.status));
    const percentage = orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 0;
    return { pendingOrders: pending, completedOrders: completed, progress: percentage };
  }, [orders]);

  const { register, control, handleSubmit, reset } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema)
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const openEdit = useCallback((order: any) => {
    setEditingOrder(order);
    reset({
      client: order.client || '',
      deliveryDate: order.deliveryDate || '',
      seller: order.seller || 'Vendedor Geral',
      status: order.status || 'Arte',
      items: order.items?.length ? order.items : [{ desc: '', quantity: 1, unitValue: 0, observation: '' }]
    });
  }, [reset]);

  const handleUpdate = async (data: OrderFormValues) => {
    if (!firestore || !editingOrder) return;
    setIsSubmitting(true);
    const orderRef = doc(firestore, 'orders', editingOrder.id);
    const totalValue = data.items.reduce((acc, item) => acc + (item.quantity * (item.unitValue || 0)), 0);
    const payload = { ...data, totalValue, updatedAt: serverTimestamp() };

    updateDoc(orderRef, payload)
      .then(() => {
        toast({ title: "Meta Atualizada" });
        setEditingOrder(null);
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: orderRef.path,
          operation: 'update',
          requestResourceData: payload
        }));
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = async () => {
    if (!firestore || !editingOrder) return;
    if (window.confirm("Remover este pedido?")) {
      deleteDoc(doc(firestore, 'orders', editingOrder.id));
      setEditingOrder(null);
      toast({ title: "Removido" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Sincronizando Metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-green-500 selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 pb-24 relative">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-green-600 opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />
        <header className="space-y-4">
          <Button variant="ghost" onClick={() => router.push('/')} className="text-zinc-500 hover:text-green-400 p-0 h-auto gap-2 uppercase text-[9px] font-black tracking-widest transition-colors"><ChevronLeft size={12} /> Voltar ao Terminal</Button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[9px] tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5 w-fit"><CalendarDays size={10} className="text-green-500" /> {format(weekInterval.displayStart, "dd 'de' MMM", { locale: ptBR })} a {format(weekInterval.displayEnd, "dd 'de' MMM", { locale: ptBR })}</div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 uppercase tracking-tighter leading-none">Meta da Semana</h1>
            </div>
          </div>
        </header>

        <section className="group relative bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 transition-all duration-500 hover:border-green-500/50 hover:shadow-[0_0_50px_-10px_rgba(34,197,94,0.2)]">
          <div className="flex justify-between items-end mb-5">
            <div>
              <div className="flex items-baseline gap-2"><span className="text-5xl font-black text-white tracking-tighter group-hover:text-green-400">{completedOrders.length}</span><span className="text-xl text-zinc-600 font-black">/ {orders?.length || 0} PEDIDOS</span></div>
              <p className="text-green-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2"><Zap size={10} fill="currentColor" className="animate-pulse" /> Status da Missão</p>
            </div>
            <motion.div animate={progress === 100 ? { rotate: [0, -10, 10, 0], scale: 1.1 } : {}} transition={{ duration: 0.5, repeat: progress === 100 ? Infinity : 0, repeatDelay: 2 }} className={`p-4 rounded-xl border transition-all duration-500 ${progress === 100 ? 'bg-green-500 text-black border-green-400 shadow-[0_0_20px_#22c55e]' : 'bg-black/40 border-zinc-800 text-zinc-600 group-hover:text-green-500'}`}>{progress === 100 ? <Trophy size={24} fill="currentColor" /> : <Target size={24} />}</motion.div>
          </div>
          <div className="h-6 w-full bg-[#050505] rounded-lg relative overflow-hidden border border-zinc-800 shadow-inner z-10">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, ease: "circOut" }} className="h-full relative z-10 rounded-r-md overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-green-900 to-emerald-400" /><div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,1)]" /></motion.div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-3">
            <div className="p-1.5 bg-green-500/10 rounded-lg"><ListTodo className="text-green-400 w-4 h-4" /></div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fila da Semana <span className="bg-white/5 text-zinc-500 text-[8px] px-2 py-0.5 rounded-full border border-white/10 ml-2">{pendingOrders.length} RESTANTES</span></h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOrders.map((order) => (
              <OrderCard key={order.id} order={{ id: order.id, client: order.client, description: order.items?.[0]?.desc || 'Sem descrição', status: order.status, deliveryDate: order.deliveryDate, items: order.items }} onClick={() => openEdit(order)} />
            ))}
          </div>
        </section>

        {completedOrders.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-2 pb-3"><div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="text-emerald-500 w-4 h-4" /></div><h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Objetivos Conquistados</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedOrders.map((order) => (
                <OrderCard key={order.id} order={{ id: order.id, client: order.client, description: order.items?.[0]?.desc || 'Sem descrição', status: order.status, deliveryDate: order.deliveryDate, items: order.items }} onClick={() => openEdit(order)} />
              ))}
            </div>
          </section>
        )}

        <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-[2rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between bg-zinc-900/30">
              <DialogTitle className="text-lg font-black text-green-500 uppercase tracking-tighter">Ajustar Pedido</DialogTitle>
              <Button variant="ghost" onClick={handleDelete} className="p-2 text-zinc-500 hover:text-destructive mr-8"><Trash2 size={18} /></Button>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleUpdate)} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5"><Label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label><Input {...register('client')} className="bg-white/5 border-white/5 h-10 rounded-lg text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Entrega</Label><Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-10 rounded-lg text-sm" /></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="text-[10px] font-black text-green-500 uppercase tracking-[0.4em]">Itens da Produção</h3><button type="button" onClick={() => append({ desc: '', quantity: 1, unitValue: 0, observation: '' })} className="text-green-500 text-[8px] font-black uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">+ Item</button></div>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1 space-y-1"><Label className="text-[8px] text-zinc-500 uppercase font-black"><Box size={8} /> Material</Label><Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-9 text-xs" /></div>
                        <div className="w-16 space-y-1"><Label className="text-[8px] text-zinc-500 uppercase font-black"><Hash size={8} /> Qtd.</Label><Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-9 text-center text-xs" /></div>
                        <button type="button" onClick={() => remove(index)} className="p-2 text-zinc-600 hover:text-destructive"><Trash2 size={14} /></button>
                      </div>
                      <div className="space-y-1"><Label className="text-[8px] text-zinc-500 uppercase font-black"><FileText size={8} /> Obs. Técnica</Label><Textarea {...register(`items.${index}.observation`)} className="bg-transparent border-white/5 min-h-[50px] text-xs resize-none" /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end pt-6 border-t border-white/5"><Button type="submit" disabled={isSubmitting} className="w-full md:w-48 h-10 bg-green-600 text-black font-black uppercase tracking-widest rounded-xl text-[10px] shadow-[0_0_20px_rgba(34,197,94,0.3)]">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} className="mr-2" /> Salvar Alterações</>}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}