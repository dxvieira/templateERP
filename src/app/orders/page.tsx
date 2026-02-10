
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
import { Plus, Trash2, Save, Loader2, Zap, LayoutList } from 'lucide-react';
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
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-6 md:p-16 space-y-12 mt-16 md:mt-0 z-10 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-10">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <LayoutList className="text-primary w-8 h-8" /> Gestão de Protocolos
            </h2>
            <p className="text-zinc-500 text-xs uppercase tracking-[0.5em] font-bold">Base de Dados Industrial</p>
          </div>

          <Button 
            onClick={() => { setEditingOrder(null); setIsModalOpen(true); }}
            className="bg-primary text-black font-black uppercase tracking-widest px-10 h-16 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.3)] transition-all gap-3 text-xs"
          >
            <Plus className="w-5 h-5" strokeWidth={3} /> Nova Ordem
          </Button>
        </div>

        <div className="space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-2 h-6 bg-primary rounded-full" />
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em]">Fluxo Ativo ({activeOrders.length})</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimatePresence mode="popLayout">
              {activeOrders.map(order => (
                <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <OrderCard 
                    order={{
                      id: order.id,
                      client: order.client,
                      description: order.items?.[0]?.desc || 'Sem descrição técnica',
                      status: order.status,
                      deliveryDate: order.deliveryDate || '',
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

        <div className="space-y-10 pt-16">
          <div className="flex items-center gap-4">
            <div className="w-2 h-6 bg-zinc-800 rounded-full" />
            <h3 className="text-xs font-black text-zinc-600 uppercase tracking-[0.4em]">Histórico Concluído ({completedOrders.length})</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-60">
            <AnimatePresence mode="popLayout">
              {completedOrders.map(order => (
                <motion.div key={order.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <OrderCard 
                    order={{
                      id: order.id,
                      client: order.client,
                      description: order.items?.[0]?.desc || 'Sem descrição técnica',
                      status: order.status,
                      deliveryDate: order.deliveryDate || '',
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

        {/* Modal de Cadastro/Edição reaproveitado */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-[2.5rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
              <DialogTitle className="text-3xl font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar OS' : 'Nova OS'}
              </DialogTitle>
              {editingOrder && (
                <Button 
                  variant="ghost" 
                  onClick={() => openDeleteModal(editingOrder.id)}
                  className="text-destructive hover:bg-destructive/10 font-black uppercase text-[10px] tracking-widest gap-2 h-10 px-6 rounded-xl border border-destructive/10"
                >
                  <Trash2 className="w-4 h-4" /> Excluir Protocolo
                </Button>
              )}
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-10 md:p-14 space-y-12 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Nome do Cliente*</Label>
                  <Input {...register('client')} list="client-suggestions" className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50 transition-all" />
                  <datalist id="client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Data de Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Responsável</Label>
                  <Input {...register('seller')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50 transition-all" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Status de Fluxo</Label>
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
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.5em]">Detalhamento Técnico</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', size: '', quantity: 1, unitValue: 0 })} className="text-primary text-[10px] font-black tracking-widest flex items-center gap-3 hover:opacity-80 transition-all bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                    <Plus className="w-4 h-4" /> Adicionar Item
                  </button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-8 bg-white/[0.02] rounded-3xl border border-white/5 relative group">
                    <div className="md:col-span-10">
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-14 text-base" placeholder="Especificação do Item" />
                    </div>
                    <div className="md:col-span-2 text-right">
                       <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-14 text-center text-base" placeholder="Qtd" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-3 -top-3 bg-destructive text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-12 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-72 h-16 bg-primary text-black font-black uppercase tracking-widest rounded-2xl text-sm hover:shadow-[0_0_50px_rgba(255,95,31,0.5)] transition-all">
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar Protocolo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
