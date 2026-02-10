
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
  X,
  Save,
  Trash2
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

  // Estados para Edição
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, reset } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema)
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // 1. Calcular intervalo da semana (Domingo a Sábado)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  // 2. Filtrar e Separar Pedidos da Semana
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

    return { 
      pendingOrders: pending, 
      completedOrders: completed, 
      totalWeekly: weekly.length,
      progress: percentage
    };
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
      await updateOrder(editingOrder.id, data);
      toast({ title: "Pedido Atualizado", description: "As alterações foram salvas com sucesso." });
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickConclude = async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
      toast({ title: "Objetivo Conquistado", description: "O pedido foi movido para o histórico da semana." });
    } catch (err) {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin shadow-[0_0_20px_rgba(34,197,94,0.3)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-green-500 selection:text-black">
      <DashboardSidebar />
      
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-green-600 opacity-[0.05] blur-[150px] pointer-events-none rounded-full z-0" />

      <main className="flex-1 md:ml-64 p-6 md:p-12 space-y-12 mt-16 md:mt-0 z-10 pb-32">
        
        {/* HEADER DE NAVEGAÇÃO */}
        <header className="space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="text-zinc-500 hover:text-green-400 p-0 h-auto gap-2 uppercase text-[10px] font-black tracking-widest transition-colors"
          >
            <ChevronLeft size={14} /> Voltar ao Terminal
          </Button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px] tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5 w-fit">
                <CalendarDays size={12} className="text-green-500" /> 
                {format(weekStart, "dd 'de' MMM", { locale: ptBR })} a {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-600 uppercase tracking-tighter leading-none">
                Meta da Semana
              </h1>
            </div>
          </div>
        </header>

        {/* --- CARD DA BARRA DE PROGRESSO (HUD PROGRESS INTERACTIVE) --- */}
        <section 
          className="
            group relative 
            bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10
            transition-all duration-500 ease-out
            hover:border-green-500/50 
            hover:shadow-[0_0_60px_-10px_rgba(34,197,94,0.25)]
            hover:-translate-y-1
            overflow-hidden
          "
        >
          {/* Cabeçalho da Barra */}
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl md:text-7xl font-black text-white tracking-tighter transition-colors group-hover:text-green-400">
                  {completedOrders.length}
                </span>
                <span className="text-2xl md:text-3xl text-zinc-600 font-black group-hover:text-zinc-500 transition-colors">
                  / {totalWeekly} PEDIDOS
                </span>
              </div>
              <p className="text-green-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2 group-hover:text-green-400 transition-colors">
                 <Zap size={12} fill="currentColor" /> Status da Missão
              </p>
            </div>
            
            <motion.div 
               animate={progress === 100 ? { rotate: [0, -10, 10, 0], scale: 1.1 } : {}}
               transition={{ duration: 0.5, repeat: progress === 100 ? Infinity : 0, repeatDelay: 2 }}
               className={`
                  p-5 rounded-2xl border transition-all duration-500
                  ${progress === 100 
                    ? 'bg-green-500 text-black border-green-400 shadow-[0_0_30px_#22c55e]' 
                    : 'bg-black/40 border-zinc-800 text-zinc-600 group-hover:text-green-500 group-hover:border-green-500/30'
                  }
               `}
            >
               {progress === 100 ? <Trophy size={32} fill="currentColor" /> : <Target size={32} />}
            </motion.div>
          </div>

          {/* CONTAINER DA BARRA (TRILHO HUD) */}
          <div className="h-8 w-full bg-[#050505] rounded-lg relative overflow-hidden border border-zinc-800 shadow-inner group-hover:border-green-900/50 transition-colors z-10">
            
            {/* Grid de Fundo (Ticks) */}
            <div className="absolute inset-0 flex justify-between px-2 z-0 opacity-20">
               {[...Array(15)].map((_, i) => (
                  <div key={i} className="w-[1px] h-full bg-zinc-600" />
               ))}
            </div>

            {/* BARRA LÍQUIDA (FÍSICA DE INÉRCIA) */}
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${progress}%` }}
               transition={{ duration: 1.5, ease: "circOut" }} 
               className="h-full relative z-10 rounded-r-md overflow-hidden"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-green-900 via-green-600 to-emerald-400" />
               
               {/* Shimmer Animado */}
               <motion.div 
                 animate={{ x: ['-100%', '100%'] }}
                 transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" 
               />
               
               {/* Ponta de Energia */}
               <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_20px_rgba(255,255,255,1)]" />
            </motion.div>
          </div>
          
          <div className="flex justify-end mt-4">
             <p className="text-[9px] text-zinc-600 font-mono group-hover:text-green-400/80 transition-colors uppercase tracking-widest">
                {progress === 0 && "SISTEMA PRONTO. INICIE A PRODUÇÃO PARA ATIVAR."}
                {progress > 0 && progress < 50 && "FREQUÊNCIA ESTÁVEL. MANTENHA O RITMO."}
                {progress >= 50 && progress < 100 && "META PRÓXIMA. SISTEMA EM ALTO RENDIMENTO."}
                {progress === 100 && "META ATINGIDA. SISTEMA OPERANDO EM EFICIÊNCIA MÁXIMA."}
             </p>
          </div>
        </section>

        {/* SEÇÃO 1: FILA DA SEMANA (PENDENTES) */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 px-2 border-b border-white/5 pb-4">
            <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
              <ListTodo className="text-green-400 w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                Fila da Semana
                <span className="bg-white/5 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full border border-white/10 font-bold uppercase">
                  {pendingOrders.length} RESTANTES
                </span>
              </h3>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Pedidos agendados para este período</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pendingOrders.length > 0 ? (
              pendingOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={{
                    id: order.id,
                    client: order.client,
                    description: order.items?.[0]?.desc || 'Sem descrição técnica',
                    status: order.status,
                    deliveryDate: order.deliveryDate
                  }} 
                  onClick={() => setEditingOrder(order)}
                  onQuickConclude={handleQuickConclude}
                  onDelete={deleteOrder}
                />
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-24 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[3rem]"
              >
                <div className="p-8 bg-green-500/10 rounded-full border border-green-500/20">
                  <Rocket className="text-green-400 w-16 h-16" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Fila Zerada</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold max-w-xs leading-relaxed mx-auto">
                    Nenhuma pendência para esta semana. Sistema em prontidão para novos pedidos.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* SEÇÃO 2: OBJETIVOS CONQUISTADOS (CONCLUÍDOS) */}
        {completedOrders.length > 0 && (
          <section className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center gap-4 px-2 border-b border-green-500/20 pb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-green-500/20">
                <CheckCircle2 className="text-emerald-500 w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                  Objetivos Conquistados
                  <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase">
                    {completedOrders.length} FEITOS
                  </span>
                </h3>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Troféus de produção da semana</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 opacity-80 hover:opacity-100 transition-opacity">
              {completedOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={{
                    id: order.id,
                    client: order.client,
                    description: order.items?.[0]?.desc || 'Sem descrição técnica',
                    status: order.status,
                    deliveryDate: order.deliveryDate
                  }} 
                  onClick={() => setEditingOrder(order)}
                  onDelete={deleteOrder}
                />
              ))}
            </div>
          </section>
        )}

        {/* MODAL DE EDIÇÃO INTEGRADO */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingOrder(null); }}>
          <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/5 text-white rounded-[2.5rem] overflow-hidden p-0 shadow-2xl">
            <DialogHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
              <DialogTitle className="text-3xl font-black text-green-500 uppercase tracking-tighter">
                Ajustar Pedido
              </DialogTitle>
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (editingOrder) {
                    deleteOrder(editingOrder.id);
                    setIsModalOpen(false);
                  }
                }}
                className="text-destructive hover:bg-destructive/10 font-black uppercase text-[10px] tracking-widest gap-2 h-10 px-6 rounded-xl border border-destructive/10"
              >
                <Trash2 className="w-4 h-4" /> Remover
              </Button>
            </DialogHeader>

            <form onSubmit={handleSubmit(onUpdateSubmit)} className="p-10 md:p-14 space-y-12 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Cliente*</Label>
                  <Input {...register('client')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-green-500/50 transition-all" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg focus:border-green-500/50 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Vendedor</Label>
                  <Input {...register('seller')} className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-widest text-zinc-500 font-black">Etapa</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white/5 border-white/5 h-16 rounded-2xl text-lg">
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

              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-green-500 uppercase tracking-[0.5em]">Itens da Produção</h3>
                  <button type="button" onClick={() => append({ desc: 'Novo Item', quantity: 1, unitValue: 0 })} className="text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
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
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-12 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-64 h-16 bg-green-600 text-black font-black uppercase tracking-widest rounded-2xl text-sm hover:shadow-[0_0_50px_rgba(34,197,94,0.5)] transition-all">
                  {isSubmitting ? <Loader2 className="w-6 animate-spin" /> : 'Confirmar Alterações'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
