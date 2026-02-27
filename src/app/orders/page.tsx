'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Plus, 
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
import { AdminOrderModal } from '@/components/dashboard/AdminOrderModal';
import { useToast } from '@/hooks/use-toast';

const PRODUCTION_STAGES = [
  'Todos',
  'Arte',
  'Impressão',
  'Serralheria',
  'Acabamento',
  'Instalação',
  'Concluído'
];

function OrdersManagerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const editId = searchParams.get('edit');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const { orders, isLoading, deleteOrder } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // Estados de Exclusão
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Efeito para lidar com redirecionamento de relatórios
  useEffect(() => {
    if (editId && orders.length > 0 && isAuthenticated) {
      const orderToEdit = orders.find(o => o.id === editId);
      if (orderToEdit) {
        setEditingOrder(orderToEdit);
        setIsModalOpen(true);
        
        // Limpa o parâmetro da URL para não reabrir ao atualizar
        const params = new URLSearchParams(searchParams.toString());
        params.delete('edit');
        router.replace(`/orders${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
      }
    }
  }, [editId, orders, isAuthenticated, router, searchParams]);

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

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrder(orderToDelete.id);
      toast({ title: "OS Removida", description: "O protocolo foi excluído do sistema." });
      setOrderToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      toast({ variant: 'destructive', title: "Falha na exclusão", description: "Verifique suas permissões ou tente novamente." });
    } finally {
      setIsDeleting(false);
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
      const dateA = a.delivery_date || a.deliveryDate || '9999-99-99';
      const dateB = b.delivery_date || b.deliveryDate || '9999-99-99';
      return dateA.localeCompare(dateB);
    });
  }, [orders, searchTerm, statusFilter, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1, x: isPassError ? [0, -10, 10, -10, 10, 0] : 0 }} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className={`p-4 rounded-full mb-4 border ${isPassError ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-primary/10 text-primary border-primary/30'}`}><Lock size={32} /></div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Administrativo</h2>
            <p className="text-zinc-500 text-[10px] mt-2 text-center uppercase tracking-[0.3em] font-bold">Terminal de Comando IMPACTO <br/> Identifique-se para gerenciar o financeiro</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative group">
              <input type="password" placeholder="SENHA ADMINISTRATIVA" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`w-full bg-zinc-900/50 border rounded-2xl py-4 pl-4 pr-12 text-center text-white tracking-[0.5em] outline-none transition-all duration-300 font-bold placeholder:tracking-normal placeholder:text-zinc-700 placeholder:text-[10px] ${isPassError ? 'border-destructive/50' : 'border-zinc-800 focus:border-primary/50'}`} />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">{isPassError ? <X size={20} className="text-destructive" /> : <ShieldCheck size={20} className="text-zinc-700" />}</div>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)]">Desbloquear Painel <ArrowRight size={16} className="ml-2" /></Button>
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
            <div className="flex items-center gap-2 text-emerald-500"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Console Administrativo IMPACTO</span></div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">Custos e Pauta</span></h1>
          </div>
          <Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} className="bg-emerald-500 text-black font-black h-10 px-6 rounded-full uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-white"><Plus size={16} strokeWidth={3} className="mr-2" /> Nova OS</Button>
        </div>

        <div className="sticky top-2 z-40 bg-[#09090b]/95 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-3 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            <div className="relative w-full lg:w-1/3 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input type="text" placeholder="Buscar Cliente ou OS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg py-2 pl-10 pr-3 text-white text-sm focus:border-emerald-500/50" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600"><X size={14} /></button>}
            </div>
            <div className="hidden lg:block w-px h-6 bg-zinc-800" />
            <div className="w-full lg:flex-1">
              <div className="md:hidden relative w-full">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none bg-zinc-900/50 border border-zinc-700/50 rounded-lg py-2 pl-10 pr-8 text-white text-sm focus:border-emerald-500">{PRODUCTION_STAGES.map(stage => <option key={stage} value={stage} className="bg-zinc-900 text-white">{stage}</option>)}</select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
              </div>
              <div className="hidden md:flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mr-1 flex items-center gap-1"><Filter size={10} /> Etapas:</span>
                {PRODUCTION_STAGES.map((stage) => <button key={stage} onClick={() => setStatusFilter(stage)} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all border ${statusFilter === stage ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'}`}>{stage}</button>)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode='popLayout'>
            {processedOrders.length > 0 ? processedOrders.map((order) => (
              <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={order.id}>
                <OrderCard 
                  order={order} 
                  onClick={(o) => { setEditingOrder(o); setIsModalOpen(true); }} 
                  onDelete={(o) => setOrderToDelete(o)}
                />
              </motion.div>
            )) : (
              <div className="col-span-full py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                <PackageOpen size={40} className="mx-auto mb-4 text-zinc-700 opacity-20" />
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Fila Administrativa Limpa</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <AdminOrderModal 
          isOpen={isModalOpen || !!editingOrder} 
          order={editingOrder} 
          onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} 
        />

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO CUSTOMIZADO IMPACTO */}
        <AnimatePresence>
          {orderToDelete && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#121212] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-900/20 transform transition-all"
              >
                {/* Ícone de Alerta */}
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                
                <h2 className="text-xl font-black text-white text-center tracking-tight mb-2 uppercase">
                  Excluir Ordem de Serviço?
                </h2>
                
                <p className="text-zinc-400 text-sm text-center mb-6 leading-relaxed">
                  Você está prestes a excluir permanentemente a <strong className="text-red-400">OS #{orderToDelete.id || 'N/A'}</strong> do cliente <strong className="text-white">{orderToDelete.client || 'Desconhecido'}</strong>. Todos os dados financeiros e de produção atrelados a ela serão perdidos.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setOrderToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteOrder}
                    disabled={isDeleting}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-colors disabled:opacity-50 text-sm uppercase tracking-wider flex justify-center items-center gap-2 shadow-lg shadow-red-600/20"
                  >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Sim, Excluir'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function OrdersManagerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <OrdersManagerContent />
    </Suspense>
  );
}
