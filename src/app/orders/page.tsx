'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  SlidersHorizontal, 
  X, 
  PackageOpen, 
  ChevronDown, 
  Lock, 
  ArrowRight, 
  ShieldCheck,
  Loader2,
  Trash2,
  Save,
  Box,
  Hash,
  FileText
} from 'lucide-react';
import { useOrders } from '@/hooks/use-orders';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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

export default function OrdersManagerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const { orders, isLoading, updateOrder, createOrder, deleteOrder } = useOrders();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '@impactoADM') {
      setIsAuthenticated(true);
      setIsPassError(false);
    } else {
      setIsPassError(true);
      setTimeout(() => setIsPassError(false), 500);
    }
  };

  const processedOrders = useMemo(() => {
    if (!isAuthenticated) return [];
    let filtered = [...orders];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => o.client?.toLowerCase().includes(term) || o.id?.toLowerCase().includes(term));
    }
    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    return filtered.sort((a, b) => {
      if (!a.deliveryDate) return 1;
      if (!b.deliveryDate) return -1;
      return a.deliveryDate.localeCompare(b.deliveryDate);
    });
  }, [orders, searchTerm, statusFilter, isAuthenticated]);

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
    const totalValue = data.items.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);
    try {
      if (editingOrder) {
        await updateOrder(editingOrder.id, { ...data, totalValue });
        toast({ title: "Pedido Atualizado" });
      } else {
        await createOrder({ ...data, totalValue });
        toast({ title: "Pedido Criado" });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err) {} finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!editingOrder) return;
    if (window.confirm("Remover este pedido permanentemente?")) {
      await deleteOrder(editingOrder.id);
      setIsModalOpen(false);
      setEditingOrder(null);
      toast({ title: "Removido" });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-zinc-800/20 blur-[120px] rounded-full pointer-events-none" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1, x: isPassError ? [0, -10, 10, -10, 10, 0] : 0 }} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className={`p-4 rounded-full mb-4 border ${isPassError ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-primary/10 text-primary border-primary/30'}`}><Lock size={32} /></div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Restrito</h2>
            <p className="text-zinc-500 text-[10px] mt-2 text-center uppercase tracking-[0.3em] font-bold">Terminal de Comando VisComm <br/> Identifique-se para continuar</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative group">
              <input type="password" placeholder="SENHA ADMINISTRATIVA" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`w-full bg-zinc-900/50 border rounded-2xl py-4 pl-4 pr-12 text-center text-white tracking-[0.5em] outline-none transition-all duration-300 font-bold placeholder:tracking-normal placeholder:text-zinc-700 placeholder:text-[10px] ${isPassError ? 'border-destructive/50' : 'border-zinc-800 focus:border-primary/50'}`} />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">{isPassError ? <X size={20} className="text-destructive" /> : <ShieldCheck size={20} className="text-zinc-700" />}</div>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)]">Acessar Painel <ArrowRight size={16} className="ml-2" /></Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 z-10 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,95,31,1)]" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Gestão Total VisComm</span></div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">Pedidos em <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Pauta</span></h1>
          </div>
          <Button onClick={() => { setEditingOrder(null); reset(); setIsModalOpen(true); }} className="bg-primary text-black font-black h-10 px-6 rounded-full uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,95,31,0.3)] hover:bg-white"><Plus size={16} strokeWidth={3} className="mr-2" /> Criar OS</Button>
        </div>

        <div className="sticky top-2 z-40 bg-[#09090b]/95 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-3 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            <div className="relative w-full lg:w-1/3 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input type="text" placeholder="Buscar Cliente ou OS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg py-2 pl-10 pr-3 text-white text-sm focus:border-primary/50" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600"><X size={14} /></button>}
            </div>
            <div className="hidden lg:block w-px h-6 bg-zinc-800" />
            <div className="w-full lg:flex-1">
              <div className="md:hidden relative w-full">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none bg-zinc-900/50 border border-zinc-700/50 rounded-lg py-2 pl-10 pr-8 text-white text-sm focus:border-primary">{PRODUCTION_STAGES.map(stage => <option key={stage} value={stage} className="bg-zinc-900 text-white">{stage}</option>)}</select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
              </div>
              <div className="hidden md:flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mr-1 flex items-center gap-1"><Filter size={10} /> Etapas:</span>
                {PRODUCTION_STAGES.map((stage) => <button key={stage} onClick={() => setStatusFilter(stage)} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all border ${statusFilter === stage ? 'bg-primary text-black border-primary' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'}`}>{stage}</button>)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1"><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{processedOrders.length} Pedidos</p><div className="flex items-center gap-1.5 text-[9px] text-zinc-600 uppercase font-bold bg-zinc-900/50 px-2 py-1 rounded-full border border-zinc-800"><SlidersHorizontal size={10} className="text-primary" /> Ordenado por Urgência</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode='popLayout'>
              {processedOrders.map((order) => (
                <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={order.id}>
                  <OrderCard order={{ id: order.id, client: order.client, description: order.items?.[0]?.desc || 'Sem descrição', status: order.status, deliveryDate: order.deliveryDate, items: order.items }} onClick={setEditingOrder} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-[2rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between bg-zinc-900/30">
              <DialogTitle className="text-lg font-black text-primary uppercase tracking-tighter">{editingOrder ? 'Ajustar Pedido' : 'Novo Lançamento'}</DialogTitle>
              {editingOrder && <button onClick={handleDeleteOrder} className="p-2 text-zinc-500 hover:text-destructive transition-colors mr-8"><Trash2 size={18} /></button>}
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5"><Label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label><Input {...register('client')} className="bg-white/5 border-white/5 h-10 rounded-lg text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Entrega</Label><Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-10 rounded-lg text-sm" /></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Itens da Produção</h3><button type="button" onClick={() => append({ desc: '', quantity: 1, unitValue: 0, observation: '' })} className="text-primary text-[8px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">+ Item</button></div>
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
              <div className="flex items-center justify-end pt-6 border-t border-white/5"><Button type="submit" disabled={isSubmitting} className="w-full md:w-48 h-10 bg-primary text-black font-black uppercase tracking-widest rounded-xl text-[10px] shadow-[0_0_30px_rgba(255,95,31,0.5)]">{isSubmitting ? <Loader2 className="w-4 animate-spin" /> : <><Save size={14} className="mr-2" /> Gravar Pedido</>}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}