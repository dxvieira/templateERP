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
import { DeleteConfirmationModal } from '@/components/dashboard/DeleteConfirmationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2, Save, Loader2, Zap } from 'lucide-react';
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderIdToDelete, setOrderIdToDelete] = useState<string | null>(null);
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
    const payload = { ...data, totalValue };
    
    try {
      if (editingOrder) {
        await updateOrder(editingOrder.id, payload);
        toast({ title: "Protocolo Atualizado", description: `OS #${editingOrder.id} salva.` });
      } else {
        await createOrder(payload);
        toast({ title: "OS Criada", description: "Protocolo registrado." });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (error: any) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = useCallback((orderId: string) => {
    setOrderIdToDelete(orderId);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!orderIdToDelete) return;
    try {
      await deleteOrder(orderIdToDelete);
      toast({ title: "OS Removida", description: "Protocolo excluído permanentemente." });
      setIsDeleteModalOpen(false);
      setOrderIdToDelete(null);
      if (editingOrder && editingOrder.id === orderIdToDelete) {
        setIsModalOpen(false);
        setEditingOrder(null);
      }
    } catch (error) {}
  }, [deleteOrder, orderIdToDelete, editingOrder, toast]);

  const handleQuickStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    try {
      await updateOrder(orderId, { status: newStatus });
    } catch (error) {}
  }, [updateOrder]);

  const handleQuickConclude = useCallback(async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
      toast({ title: "Concluído", description: "Protocolo finalizado." });
    } catch (error) {}
  }, [updateOrder, toast]);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'Concluído' && o.status !== 'Entregue'), [orders]);
  const completedOrders = useMemo(() => orders.filter(o => o.status === 'Concluído' || o.status === 'Entregue'), [orders]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden relative">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 z-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <Zap className="text-primary w-5 h-5" /> Gestão de OS
            </h2>
            <p className="text-muted-foreground text-[9px] uppercase tracking-[0.3em]">Fluxo de Produção</p>
          </div>

          <Button 
            onClick={() => { setEditingOrder(null); setIsModalOpen(true); }}
            className="bg-primary text-black font-black uppercase tracking-widest px-6 h-11 rounded-xl hover:shadow-[0_0_15px_rgba(255,95,31,0.3)] transition-all gap-2 text-[10px]"
          >
            <Plus className="w-4 h-4" /> Nova Ordem
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="text-[9px] font-black text-primary uppercase tracking-[0.3em] border-b border-white/5 pb-2">Ativos ({activeOrders.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            <AnimatePresence mode="popLayout">
              {activeOrders.map(order => (
                <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
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
                    onDelete={openDeleteModal}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {activeOrders.length === 0 && !isLoading && <div className="col-span-full"><EmptyState /></div>}
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Concluídos ({completedOrders.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            <AnimatePresence mode="popLayout">
              {completedOrders.map(order => (
                <motion.div key={order.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                    onDelete={openDeleteModal}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Modal de Confirmação de Exclusão */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          orderId={orderIdToDelete}
          onClose={() => { setIsDeleteModalOpen(false); setOrderIdToDelete(null); }}
          onConfirm={handleConfirmDelete}
        />

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-2xl bg-[#0F0F0F] border-white/5 text-white rounded-3xl overflow-hidden p-0">
            <DialogHeader className="p-5 border-b border-white/5 flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar OS' : 'Nova OS'}
              </DialogTitle>
              {editingOrder && (
                <Button 
                  variant="ghost" 
                  onClick={() => openDeleteModal(editingOrder.id)}
                  className="text-destructive hover:bg-destructive/10 font-black uppercase text-[9px] tracking-widest gap-2 h-8"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </Button>
              )}
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Cliente*</Label>
                  <Input {...register('client')} list="client-suggestions" className="bg-black/50 border-white/5 h-10 rounded-xl text-sm" />
                  <datalist id="client-suggestions">
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
                  <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Status Inicial</Label>
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
                  <h3 className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Itens da Produção</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', size: '', quantity: 1, unitValue: 0 })} className="text-primary text-[9px] font-black tracking-widest flex items-center gap-1 hover:opacity-80 transition-opacity">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-white/[0.01] rounded-xl border border-white/5 relative group">
                    <div className="md:col-span-6">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-8 text-xs" placeholder="Descrição" />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-8 text-xs" placeholder="Qtd" />
                    </div>
                    <div className="md:col-span-3">
                      <Input type="number" step="0.01" {...register(`items.${index}.unitValue`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-8 text-xs" placeholder="Unitário" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
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
