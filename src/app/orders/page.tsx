'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { 
  Plus, 
  Loader2, 
  Search, 
  Filter, 
  X, 
  PackageOpen, 
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  Hash,
  Box,
  FileText,
  Lock,
  ShieldCheck,
  ArrowRight
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
    observation: z.string().optional(),
  })).min(1),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrdersManagerPage() {
  // --- SEGURANÇA (LOCK SCREEN) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);

  useEffect(() => {
    const granted = sessionStorage.getItem('orders_access_granted') === 'true';
    if (granted) setIsAuthenticated(true);
    setIsCheckingAuth(false);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '@impactoADM') {
      setIsAuthenticated(true);
      sessionStorage.setItem('orders_access_granted', 'true');
      setIsPassError(false);
    } else {
      setIsPassError(true);
      setTimeout(() => setIsPassError(false), 500);
    }
  };

  // --- ESTADOS DE GESTÃO ---
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
    firestore && isAuthenticated ? query(collection(firestore, 'clients'), orderBy('name', 'asc')) : null
  , [firestore, isAuthenticated]);
  const { data: clients } = useCollection(clientsQuery);

  const { register, control, handleSubmit, reset, watch } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      client: '',
      status: 'Arte',
      items: [{ desc: 'Novo Item', quantity: 1, unitValue: 0, observation: '' }]
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
      items: order.items || [{ desc: 'Novo Item', quantity: 1, unitValue: 0, observation: '' }]
    });
    setIsModalOpen(true);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // --- VIEW: LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-zinc-800/20 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            x: isPassError ? [0, -10, 10, -10, 10, 0] : 0 
          }}
          className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative z-10"
        >
          <div className="flex flex-col items-center mb-10">
            <div className={`
              p-5 rounded-3xl mb-6 transition-all duration-300 border
              ${isPassError ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_20px_rgba(255,0,0,0.2)]' : 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_20px_rgba(255,95,31,0.2)]'}
            `}>
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Restrito</h2>
            <p className="text-zinc-500 text-[10px] mt-2 text-center uppercase tracking-[0.3em] font-bold">
              Terminal de Comando VisComm <br/> Identifique-se para gerenciar pedidos
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-5">
            <div className="relative group">
              <input 
                type="password"
                placeholder="SENHA ADMINISTRATIVA"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`
                  w-full bg-zinc-900/50 border rounded-2xl py-4 pl-4 pr-12 text-center text-white tracking-[0.5em] outline-none transition-all duration-300 font-bold
                  placeholder:tracking-normal placeholder:text-zinc-700 placeholder:text-[10px]
                  ${isPassError 
                    ? 'border-destructive/50 focus:border-destructive shadow-[0_0_30px_rgba(255,0,0,0.15)]' 
                    : 'border-zinc-800 focus:border-primary/50 focus:shadow-[0_0_30px_rgba(255,95,31,0.1)]'
                  }
                `}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                {isPassError ? <X size={20} className="text-destructive" /> : <ShieldCheck size={20} className="text-zinc-700 group-focus-within:text-primary transition-colors" />}
              </div>
            </div>

            <Button 
              type="submit"
              className="
                w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[10px]
                hover:bg-white transition-all duration-300 shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)]
                flex items-center justify-center gap-2 group
              "
            >
              Desbloquear Painel <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          {isPassError && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-[9px] font-black text-center mt-6 uppercase tracking-[0.2em]"
            >
              Credencial Inválida • Acesso Negado
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  // --- VIEW: AUTHENTICATED CONTENT ---
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-primary selection:text-black">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 z-10 pb-20">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,95,31,1)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gestão Total VisComm</span>
            </div>
            <h1 className="text-3xl md:text-3xl font-black tracking-tighter text-white uppercase leading-none">
              Pedidos em <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Pauta</span>
            </h1>
          </div>

          <Button 
            onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }}
            className="bg-primary text-black font-black h-10 px-6 rounded-full transition-all duration-300 flex items-center gap-2 uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,95,31,0.3)] hover:bg-white hover:scale-105"
          >
            <Plus size={16} strokeWidth={3} />
            Criar OS
          </Button>
        </div>

        <div className="sticky top-2 z-40 bg-[#09090b]/95 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-3 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            <div className="relative w-full lg:w-1/3 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text"
                placeholder="Buscar Cliente ou OS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg py-2 pl-10 pr-3 text-white placeholder-zinc-600 outline-none text-sm focus:border-primary/50"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="hidden lg:block w-px h-6 bg-zinc-800" />

            <div className="w-full lg:flex-1">
              <div className="md:hidden relative w-full">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none bg-zinc-900/50 border border-zinc-700/50 rounded-lg py-2 pl-10 pr-8 text-white text-sm outline-none focus:border-primary"
                >
                  {PRODUCTION_STAGES.map(stage => (
                    <option key={stage} value={stage} className="bg-zinc-900 text-white">{stage}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
              </div>

              <div className="hidden md:flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mr-1 flex items-center gap-1">
                  <Filter size={10} /> Etapas:
                </span>
                {PRODUCTION_STAGES.map((stage) => {
                  const isActive = statusFilter === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => setStatusFilter(stage)}
                      className={`
                        px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all border
                        ${isActive 
                          ? 'bg-primary text-black border-primary shadow-[0_0_10px_rgba(255,95,31,0.4)] scale-105' 
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

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              {processedOrders.length} {processedOrders.length === 1 ? 'Pedido Localizado' : 'Pedidos Localizados'}
            </p>
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 uppercase font-bold bg-zinc-900/50 px-2 py-1 rounded-full border border-zinc-800">
              <SlidersHorizontal size={10} className="text-primary" /> Ordenado por Urgência
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20"
                >
                  <PackageOpen size={32} className="mb-4 text-zinc-800" />
                  <h3 className="text-sm font-black text-white uppercase tracking-tighter">Nenhum resultado</h3>
                  <button 
                    onClick={() => { setSearchTerm(''); setStatusFilter('Todos'); }}
                    className="mt-6 px-4 py-2 text-[9px] font-black text-primary border border-primary/30 rounded-full hover:bg-primary/10 uppercase tracking-widest"
                  >
                    Limpar Busca
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

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
            <DialogHeader className="p-6 md:p-10 border-b border-white/5 flex flex-row items-center justify-between bg-zinc-900/30">
              <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter">
                {editingOrder ? 'Ajustar Pedido' : 'Novo Registro'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label>
                  <Input {...register('client')} list="client-suggestions" className="bg-white/5 border-white/5 h-12 rounded-xl text-base focus:border-primary/50" />
                  <datalist id="client-suggestions">
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
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Status de Fluxo</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white/5 border-white/5 h-12 rounded-xl text-base">
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

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">Itens da Produção</h3>
                  <button type="button" onClick={() => append({ desc: '', quantity: 1, unitValue: 0, observation: '' })} className="text-primary text-[9px] font-black uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-full border border-primary/20 hover:bg-primary hover:text-black transition-all">
                    + Adicionar Item
                  </button>
                </div>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={field.id} 
                      className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-6 relative group hover:border-white/10 transition-colors"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-4 items-end">
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                              <Box size={10} className="text-primary" /> Material / Serviço
                            </Label>
                            <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-10 text-sm focus:border-primary/50" placeholder="Ex: Lona 440g, ACM 3mm..." />
                          </div>
                          <div className="w-20 md:w-24 space-y-1.5">
                            <Label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                              <Hash size={10} className="text-primary" /> Qtd.
                            </Label>
                            <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="bg-transparent border-white/5 h-10 text-center text-sm focus:border-primary/50" />
                          </div>
                          <button type="button" onClick={() => remove(index)} className="p-2.5 text-zinc-600 hover:text-destructive transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1">
                            <FileText size={10} className="text-primary" /> Observações Técnicas
                          </Label>
                          <Textarea 
                            {...register(`items.${index}.observation`)} 
                            className="bg-transparent border-white/5 min-h-[60px] text-sm focus:border-primary/50 resize-none" 
                            placeholder="Detalhes de acabamento, ilhós, refile, tamanho exato..." 
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {fields.length === 0 && (
                  <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                    <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Nenhum item registrado para esta OS</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-8 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-64 h-12 bg-primary text-black font-black uppercase tracking-widest rounded-full text-xs hover:shadow-[0_0_25px_rgba(255,95,31,0.5)] transition-all">
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
