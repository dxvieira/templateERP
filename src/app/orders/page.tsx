
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Plus, Trash2, Save, Calculator, Loader2, PackageCheck, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useOrders } from '@/hooks/use-orders';

const orderSchema = z.object({
  client: z.string().min(1, 'Nome do cliente é obrigatório'),
  clientId: z.string().optional(),
  deliveryDate: z.string().default(''),
  seller: z.string().default('Vendedor Geral'),
  status: z.enum(['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído']).default('Arte'),
  paymentMethod: z.string().default('Pix'),
  machine: z.string().optional(),
  installments: z.string().optional(),
  observations: z.string().default(''),
  items: z.array(z.object({
    desc: z.string().default('Novo Item'),
    size: z.string().default(''),
    quantity: z.coerce.number().min(0).default(1),
    unitValue: z.coerce.number().min(0).default(0),
  })).min(1),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrdersManagerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const { orders, createOrder, updateOrder, deleteOrder, isLoading } = useOrders();

  const clientsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'clients'), orderBy('name', 'asc')) : null
  , [firestore]);
  const { data: clients } = useCollection(clientsQuery);

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      client: '',
      status: 'Arte',
      paymentMethod: 'Pix',
      items: [{ desc: 'Novo Item', size: '', quantity: 1, unitValue: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedPayment = watch('paymentMethod');

  const totalValue = useMemo(() => {
    return watchedItems?.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const v = Number(item.unitValue) || 0;
      return acc + (q * v);
    }, 0) || 0;
  }, [watchedItems]);

  useEffect(() => {
    if (!watchedPayment?.toLowerCase().includes('cartão')) {
      setValue('machine', undefined);
      setValue('installments', undefined);
    }
  }, [watchedPayment, setValue]);

  useEffect(() => {
    if (editingOrder) {
      reset({
        client: editingOrder.client,
        clientId: editingOrder.clientId || '',
        deliveryDate: editingOrder.deliveryDate || '',
        seller: editingOrder.seller || 'Vendedor Geral',
        status: editingOrder.status,
        paymentMethod: editingOrder.paymentMethod || 'Pix',
        machine: editingOrder.machine,
        installments: editingOrder.installments,
        observations: editingOrder.observations || '',
        items: editingOrder.items || [{ desc: 'Novo Item', size: '', quantity: 1, unitValue: 0 }]
      });
      setIsModalOpen(true);
    } else {
      reset({
        client: '',
        status: 'Arte',
        paymentMethod: 'Pix',
        items: [{ desc: 'Novo Item', size: '', quantity: 1, unitValue: 0 }]
      });
    }
  }, [editingOrder, reset]);

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    
    // Limpeza de undefined para Firestore
    const payload = { ...data, totalValue };
    Object.keys(payload).forEach(key => payload[key as keyof typeof payload] === undefined && delete payload[key as keyof typeof payload]);

    try {
      if (editingOrder) {
        await updateOrder(editingOrder.id, payload);
        toast({ title: "Protocolo Atualizado", description: `OS #${editingOrder.id} salva com sucesso.` });
      } else {
        await createOrder(payload);
        toast({ title: "OS Protocolada", description: `Novo protocolo criado.` });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (error: any) {
      // Erro tratado pelo global listener
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    const confirmDelete = window.confirm(`Deseja excluir permanentemente a OS #${orderId}?`);
    
    if (confirmDelete) {
      try {
        await deleteOrder(orderId);
        toast({ title: "OS Removida", description: "Protocolo excluído." });
        if (editingOrder && editingOrder.id === orderId) {
          setIsModalOpen(false);
          setEditingOrder(null);
        }
      } catch (error) {
        // Erro tratado pelo global listener
      }
    }
  }, [deleteOrder, editingOrder, toast]);

  const handleQuickStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    try {
      await updateOrder(orderId, { status: newStatus });
    } catch (error) {
      // Erro tratado pelo global listener
    }
  }, [updateOrder]);

  const handleQuickConclude = useCallback(async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
      toast({ title: "OS Concluída!", description: "Protocolo finalizado." });
    } catch (error) {
      // Erro tratado pelo global listener
    }
  }, [updateOrder, toast]);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'Concluído' && o.status !== 'Entregue'), [orders]);
  const completedOrders = useMemo(() => orders.filter(o => o.status === 'Concluído' || o.status === 'Entregue'), [orders]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden relative">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 z-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Zap className="text-primary w-6 h-6" /> Gestão de OS
            </h2>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em]">Fila de Produção Ativa</p>
          </div>

          <Button 
            onClick={() => { setEditingOrder(null); setIsModalOpen(true); }}
            className="bg-primary text-black font-black uppercase tracking-widest px-8 h-12 rounded-xl hover:shadow-[0_0_20px_rgba(255,95,31,0.4)] active:scale-95 transition-all gap-2 text-xs"
          >
            <Plus className="w-4 h-4" /> Nova OS
          </Button>
        </div>

        {/* Fila Ativa */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Ativos ({activeOrders.length})</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {activeOrders.map(order => (
                <motion.div 
                  key={order.id} 
                  layout 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <OrderCard 
                    order={{
                      id: order.id,
                      client: order.client,
                      description: order.items?.[0]?.desc || 'Sem descrição',
                      status: order.status,
                      deliveryDate: order.deliveryDate || '',
                      value: order.totalValue || 0
                    }} 
                    onClick={() => setEditingOrder(order)}
                    onStatusChange={handleQuickStatusChange}
                    onQuickConclude={handleQuickConclude}
                    onDelete={handleDeleteOrder}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {activeOrders.length === 0 && !isLoading && <div className="col-span-full"><EmptyState /></div>}
          </div>
        </div>

        {/* Fila Concluída */}
        <div className="space-y-4 pt-8">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Concluídos ({completedOrders.length})</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {completedOrders.map(order => (
                <motion.div 
                  key={order.id} 
                  layout 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <OrderCard 
                    order={{
                      id: order.id,
                      client: order.client,
                      description: order.items?.[0]?.desc || 'Sem descrição',
                      status: order.status,
                      deliveryDate: order.deliveryDate || '',
                      value: order.totalValue || 0
                    }} 
                    onClick={() => setEditingOrder(order)}
                    onStatusChange={handleQuickStatusChange}
                    onDelete={handleDeleteOrder}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white rounded-3xl overflow-hidden p-0">
            <DialogHeader className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-black text-primary uppercase tracking-tighter">
                  {editingOrder ? 'Ajustar Protocolo' : 'Nova Ordem'}
                </DialogTitle>
                {editingOrder && (
                  <Button 
                    variant="ghost" 
                    type="button"
                    onClick={() => handleDeleteOrder(editingOrder.id)}
                    className="text-destructive hover:bg-destructive/10 font-bold uppercase text-[10px] tracking-widest gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </Button>
                )}
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cliente*</Label>
                  <Input 
                    {...register('client')} 
                    list="client-suggestions"
                    className={cn("bg-black/40 border-white/10 h-10 rounded-xl", errors.client && "border-destructive")} 
                  />
                  <datalist id="client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Prazo Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-black/40 border-white/10 h-10 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Vendedor</Label>
                  <Input {...register('seller')} className="bg-black/40 border-white/10 h-10 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-black/40 border-white/10 h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white z-[150]">
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
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Itens</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', size: '', quantity: 1, unitValue: 0 })} className="text-primary text-[10px] font-black tracking-widest flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/5 relative group">
                    <div className="md:col-span-6">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/10 h-8 text-xs" placeholder="Descrição" />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/10 h-8 text-xs" placeholder="Qtd" />
                    </div>
                    <div className="md:col-span-3">
                      <Input type="number" step="0.01" {...register(`items.${index}.unitValue`, { valueAsNumber: true })} className="bg-transparent border-white/10 h-8 text-xs" placeholder="R$" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-1 -top-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-end gap-6 pt-6 border-t border-white/5">
                <div className="text-right">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-widest mb-1">Total</p>
                  <p className="text-xl font-black text-white font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full md:w-48 h-12 bg-primary text-black font-black uppercase tracking-widest rounded-xl text-xs"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar OS'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
