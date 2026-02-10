
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
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
import { 
  Plus, 
  Loader2, 
  Search, 
  Filter, 
  X, 
  PackageOpen, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/hooks/use-orders';

const PRODUCTION_STAGES = [
  'Todos',
  'Arte',
  'Impressão',
  'Serralheria',
  'Acabamento',
  'Instalação',
  'Concluído'
];

const orderSchema = z.object({
  client: z.string().min(1, 'Nome do cliente é obrigatório'),
  clientId: z.string().optional(),
  deliveryDate: z.string().default(''),
  seller: z.string().default('Vendedor Geral'),
  status: z.enum(['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído']).default('Arte'),
  paymentMethod: z.string().default('Pix'),
  items: z.array(z.object({
    desc: z.string().default('Novo Item'),
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const firestore = useFirestore();
  const { toast } = useToast();
  const { orders, createOrder, updateOrder, deleteOrder, isLoading } = useOrders();

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

  const totalValue = useMemo(() => {
    return watchedItems?.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const v = Number(item.unitValue) || 0;
      return acc + (q * v);
    }, 0) || 0;
  }, [watchedItems]);

  const processedOrders = useMemo(() => {
    let filtered = [...orders];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.client?.toLowerCase().includes(term) || 
        o.id?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      if (!a.deliveryDate) return 1;
      if (!b.deliveryDate) return -1;
      return a.deliveryDate.localeCompare(b.deliveryDate);
    });
  }, [orders, searchTerm, statusFilter]);

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    const payload = { ...data, totalValue };
    
    try {
      if (editingOrder) {
        await updateOrder(editingOrder.id, payload);
        toast({ title: "Pedido Atualizado", description: `Pedido #${editingOrder.id} salvo.` });
      } else {
        await createOrder(payload);
        toast({ title: "Pedido Criado", description: "Novo pedido registrado no terminal." });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (error: any) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickConclude = useCallback(async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
      toast({ title: "Finalizado", description: "Pedido movido para concluídos." });
    } catch (error) {}
  }, [updateOrder, toast]);

  const openEditModal = (order: any) => {
    setEditingOrder(order);
    reset({
      client: order.client,
      deliveryDate: order.deliveryDate || '',
      seller: order.seller || 'Vendedor Geral',
      status: order.status,
      items: order.items || [{ desc: 'Novo Item', quantity: 1, unitValue: 0 }]
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-primary selection:text-black">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-6 md:p-12 space-y-10 mt-16 md:mt-0 z-10 pb-32">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,95,31,1)]" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Gestão Total VisComm</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none">
              Pedidos em <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Pauta</span>
            </h1>
          </div>

          <Button 
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary text-black font-black py-8 px-12 rounded-full transition-all duration-300 flex items-center gap-4 uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(255,95,31,0.3)] hover:bg-white hover:scale-105 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            Criar OS
          </Button>
        </div>

        {/* COMMAND CENTER (BUSCA E FILTROS HÍBRIDOS) */}
        <div className="sticky top-20 md:top-4 z-40 bg-[#09090b]/90 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-4 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            
            {/* BUSCA */}
            <div className="relative w-full lg:w-1/3 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={20} />
              <input 
                type="text"
                placeholder="Buscar Cliente ou Nº da OS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl py-3 pl-12 pr-4 text-white placeholder-zinc-600 outline-none transition-all focus:border-primary/50"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="hidden lg:block w-px h-8 bg-zinc-800" />

            {/* SELETOR DE ETAPAS RESPONSIVO */}
            <div className="w-full lg:flex-1">
              {/* MOBILE: Select nativo estilizado */}
              <div className="md:hidden relative w-full">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none bg-zinc-900/50 border border-zinc-700/50 rounded-xl py-3 pl-12 pr-10 text-white outline-none focus:border-primary"
                >
                  {PRODUCTION_STAGES.map(stage => (
                    <option key={stage} value={stage} className="bg-zinc-900 text-white">{stage}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

              {/* DESKTOP: Chips (botões) */}
              <div className="hidden md:flex flex-wrap items-center gap-2">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mr-2 flex items-center gap-1">
                  <Filter size={12} /> Etapas:
                </span>
                {PRODUCTION_STAGES.map((stage) => {
                  const isActive = statusFilter === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => setStatusFilter(stage)}
                      className={`
                        px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all border
                        ${isActive 
                          ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(255,95,31,0.4)] scale-105' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
                        }
                      `}
                    >
                      {stage}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* LISTAGEM DE RESULTADOS */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              {processedOrders.length} {processedOrders.length === 1 ? 'Pedido Localizado' : 'Pedidos Localizados'}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase font-bold bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
              <SlidersHorizontal size={12} className="text-primary" /> Ordenado por Urgência
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode='popLayout'>
              {processedOrders.length > 0 ? (
                processedOrders.map((order) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={order.id}
                  >
                    <OrderCard 
                      order={{
                        id: order.id,
                        client: order.client,
                        description: order.items?.[0]?.desc || 'Sem descrição técnica',
                        status: order.status,
                        deliveryDate: order.deliveryDate || '',
                      }} 
                      onClick={() => openEditModal(order)}
                      onQuickConclude={handleQuickConclude}
                      onDelete={(id) => { setOrderIdToDelete(id); setIsDeleteModalOpen(true); }}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-32 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-[3rem] bg-zinc-900/20"
                >
                  <PackageOpen size={64} className="mb-6 text-zinc-800" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Nenhum resultado</h3>
                  <button 
                    onClick={() => { setSearchTerm(''); setStatusFilter('Todos'); }}
                    className="mt-10 px-8 py-4 text-[10px] font-black text-primary border border-primary/30 rounded-full hover:bg-primary/10 transition-all uppercase tracking-widest"
                  >
                    Limpar Busca
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* MODAIS */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          orderId={orderIdToDelete}
          onClose={() => { setIsDeleteModalOpen(false); setOrderIdToDelete(null); }}
          onConfirm={async () => {
            if (!orderIdToDelete) return;
            await deleteOrder(orderIdToDelete);
            toast({ title: "Removido", description: "Pedido excluído com sucesso." });
            setIsDeleteModalOpen(false);
          }}
        />

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-[2.5rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between bg-zinc-900/30">
              <DialogTitle className="text-3xl font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar Pedido' : 'Novo Registro'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-10 md:p-14 space-y-12 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label>
                  <Input {...register('client')} list="client-suggestions" className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50 transition-all" />
                  <datalist id="client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-primary/50 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Vendedor</Label>
                  <Input {...register('seller')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Status de Fluxo</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white">
                          {PRODUCTION_STAGES.filter(s => s !== 'Todos').map(s => (
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
                  <button type="button" onClick={() => append({ desc: 'Novo Item', quantity: 1, unitValue: 0 })} className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
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
                    <button type="button" onClick={() => remove(index)} className="absolute -right-3 -top-3 bg-destructive text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110">
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-12 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-72 h-16 bg-primary text-black font-black uppercase tracking-widest rounded-full text-xs hover:shadow-[0_0_25px_rgba(255,95,31,0.5)] transition-all">
                  {isSubmitting ? <Loader2 className="w-6 animate-spin" /> : 'Confirmar Lançamento'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
