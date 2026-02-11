'use client';

import React, { useState, useMemo } from 'react';
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
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const { orders, isLoading } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
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
          <Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} className="bg-primary text-black font-black h-10 px-6 rounded-full uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,95,31,0.3)] hover:bg-white"><Plus size={16} strokeWidth={3} className="mr-2" /> Criar OS</Button>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode='popLayout'>
            {processedOrders.map((order) => (
              <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={order.id}>
                <OrderCard order={order} onClick={setEditingOrder} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <OrderFormModal 
          isOpen={isModalOpen || !!editingOrder} 
          order={editingOrder} 
          onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} 
        />
      </main>
    </div>
  );
}
