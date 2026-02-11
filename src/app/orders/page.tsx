'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { useOrders } from '@/hooks/use-orders';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Etapas de Produção Padronizadas
const PRODUCTION_STAGES = [
  'Todos',
  'Arte',
  'Impressão',
  'Serralheria',
  'Acabamento',
  'Instalação',
  'Concluído'
];

export default function OrdersManagerPage() {
  // --- 1. ESTADOS DE AUTENTICAÇÃO (Sempre bloqueado ao iniciar - Segurança Volátil) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);

  // --- 2. ESTADOS DE GESTÃO ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const { orders, isLoading, updateOrder, deleteOrder } = useOrders();
  const { toast } = useToast();

  // --- 3. LÓGICA DE DESBLOQUEIO ---
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

  // --- 4. FILTRAGEM E ORDENAÇÃO INTELIGENTE ---
  const processedOrders = useMemo(() => {
    if (!isAuthenticated) return [];

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
  }, [orders, searchTerm, statusFilter, isAuthenticated]);

  const handleQuickConclude = useCallback(async (orderId: string) => {
    try {
      await updateOrder(orderId, { status: 'Concluído' });
      toast({ title: "Sucesso", description: "Pedido finalizado." });
    } catch (error) {}
  }, [updateOrder, toast]);

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
        
        {/* HEADER COMPACTO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,95,31,1)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gestão Total VisComm</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">
              Pedidos em <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Pauta</span>
            </h1>
          </div>

          <Button 
            className="bg-primary text-black font-black h-10 px-6 rounded-full transition-all duration-300 flex items-center gap-2 uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,95,31,0.3)] hover:bg-white"
          >
            <Plus size={16} strokeWidth={3} />
            Criar OS
          </Button>
        </div>

        {/* COMMAND CENTER COMPACTO (Sticky) */}
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
              {/* MOBILE SELECT */}
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

              {/* DESKTOP BUTTONS */}
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

        {/* LISTAGEM */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              {processedOrders.length} {processedOrders.length === 1 ? 'Pedido' : 'Pedidos'}
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
                        description: order.items?.[0]?.desc || 'Sem descrição',
                        status: order.status,
                        deliveryDate: order.deliveryDate || '',
                      }} 
                      onQuickConclude={handleQuickConclude}
                      onDelete={deleteOrder}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                  <PackageOpen size={32} className="mb-4 text-zinc-800" />
                  <h3 className="text-sm font-black text-white uppercase tracking-tighter">Nenhum resultado</h3>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
