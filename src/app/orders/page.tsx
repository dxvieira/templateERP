'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { Plus, Trash2, FileText, Save, Calculator, Loader2, PackageCheck, Zap } from 'lucide-react';
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
    
    const cleanedData = Object.fromEntries(
      Object.entries({ ...data, totalValue }).filter(([_, v]) => v !== undefined)
    );
    
    try {
      if (editingOrder) {
        await updateOrder(editingOrder.id, cleanedData);
        toast({ title: "Protocolo Atualizado", description: `OS #${editingOrder.id.slice(-4)} salva com sucesso.` });
      } else {
        await createOrder(cleanedData);
        toast({ title: "OS Protocolada", description: `Novo protocolo para ${data.client} criado.` });
      }
      
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Falha na comunicação com o banco."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrder(orderId, { status: newStatus });
      toast({ title: "Status Atualizado", description: `Protocolo movido para ${newStatus}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível mudar o status." });
    }
  };

  const handleQuickConclude = async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
      toast({ title: "OS Concluída!", description: "Protocolo finalizado com sucesso." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível concluir." });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente a OS #${orderId}? Essa ação não pode ser desfeita.`)) {
      try {
        await deleteOrder(orderId);
        toast({ title: "OS Removida", description: "Protocolo excluído com sucesso." });
      } catch (error) {
        toast({ variant: "destructive", title: "Erro ao excluir", description: "Não foi possível remover a OS." });
      }
    }
  };

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'Concluído' && o.status !== 'Entregue'), [orders]);
  const completedOrders = useMemo(() => orders.filter(o => o.status === 'Concluído' || o.status === 'Entregue'), [orders]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden relative">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-12 mt-16 md:mt-0 z-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Zap className="text-primary w-8 h-8 animate-pulse" /> Gestão de Protocolos
            </h2>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em] font-medium">Terminal Kanban v2.0 • Sincronia Real</p>
          </div>

          <Button 
            onClick={() => { setEditingOrder(null); setIsModalOpen(true); }}
            className="bg-primary text-black font-black uppercase tracking-widest px-8 h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] active:scale-95 transition-all gap-2 z-20"
          >
            <Plus className="w-5 h-5" /> Nova Ordem de Serviço
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.5em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              Fila de Produção Ativa
            </h3>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground font-mono">
              {activeOrders.length} Protocolos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {activeOrders.map(order => (
                <motion.div 
                  key={order.id} 
                  layout 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                >
                  <OrderCard 
                    order={{
                      id: order.id,
                      client: order.client,
                      description: order.items?.[0]?.desc || 'Sem descrição',
                      status: order.status,
                      deliveryDate: order.deliveryDate || 'N/A',
                      value: order.totalValue || 0
                    }} 
                    onClick={(o) => setEditingOrder(order)}
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

        <div className="space-y-6 pt-8">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <h3 className="text-xs font-black text-[#00FF00] uppercase tracking-[0.5em] flex items-center gap-2">
              <PackageCheck className="w-4 h-4" />
              Protocolos Concluídos
            </h3>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground font-mono">
              {completedOrders.length} Finalizados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      deliveryDate: order.deliveryDate || 'N/A',
                      value: order.totalValue || 0
                    }} 
                    onClick={(o) => setEditingOrder(order)}
                    onStatusChange={handleQuickStatusChange}
                    onDelete={handleDeleteOrder}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 text-white rounded-3xl overflow-hidden p-0 shadow-2xl z-[9999]">
            <DialogHeader className="p-6 bg-white/[0.02] border-b border-white/5">
              <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar Protocolo' : 'Entrada de Produção'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Cliente*</Label>
                  <Input 
                    {...register('client')} 
                    list="client-suggestions"
                    className={cn("bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary", errors.client && "border-destructive")} 
                    placeholder="Nome da Empresa ou Cliente"
                  />
                  <datalist id="client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                  {errors.client && <p className="text-[10px] text-destructive uppercase font-bold">{errors.client.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Prazo Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Vendedor</Label>
                  <Input {...register('seller')} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white z-[100]">
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
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                    <Calculator className="w-3 h-3" /> Itens do Projeto
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => append({ desc: 'Novo Item', size: '', quantity: 1, unitValue: 0 })} 
                    className="text-primary hover:text-primary/80 text-[10px] uppercase font-black tracking-widest flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Item
                  </button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 relative group">
                    <div className="md:col-span-5">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block font-bold">Descrição</Label>
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/10 h-10" />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block font-bold">Medidas</Label>
                      <Input {...register(`items.${index}.size`)} className="bg-transparent border-white/10 h-10" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block font-bold">Qtd</Label>
                      <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/10 h-10" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block font-bold">R$ Unit.</Label>
                      <Input type="number" step="0.01" {...register(`items.${index}.unitValue`, { valueAsNumber: true })} className="bg-transparent border-white/10 h-10" />
                    </div>
                    {fields.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => remove(index)} 
                        className="absolute -right-2 -top-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Pagamento</Label>
                  <Controller
                    name="paymentMethod"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                          <SelectValue placeholder="Forma" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white z-[100]">
                          {['Dinheiro', 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'].map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {watchedPayment?.toLowerCase().includes('cartão') && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Maquininha</Label>
                      <Controller
                        name="machine"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white z-[100]">
                              {['SICOOB/SIPAG', 'PagBank'].map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Parcelas</Label>
                      <Controller
                        name="installments"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                              <SelectValue placeholder="1x" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white z-[100]">
                              {Array.from({ length: 12 }, (_, i) => `${i + 1}x`).map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Observações</Label>
                <Textarea {...register('observations')} className="bg-black/40 border-white/10 rounded-2xl min-h-[100px]" placeholder="Instruções adicionais de produção..." />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-black mb-1 tracking-widest">Total do Protocolo</p>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full md:w-64 h-16 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:shadow-[0_0_40px_rgba(255,95,31,0.6)] transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> {editingOrder ? 'Salvar Alterações' : 'Finalizar OS'}</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
