
'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, Plus, PackageOpen, Loader2
} from 'lucide-react';
import { useOrders } from '@/hooks/use-orders';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';
import { AdminOrderModal } from '@/components/dashboard/AdminOrderModal';
import { useToast } from '@/hooks/use-toast';
import { AdminGate } from '@/components/auth/AdminGate';
import { cn } from '@/lib/utils';

const PRODUCTION_STAGES = ['Todos', 'Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído'];

function OrdersManagerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const editId = searchParams.get('edit');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const { orders, isLoading, deleteOrder } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (editId && orders.length > 0) {
      const orderToEdit = orders.find(o => o.id === editId);
      if (orderToEdit) {
        setEditingOrder(orderToEdit);
        setIsModalOpen(true);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('edit');
        router.replace(`/orders${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
      }
    }
  }, [editId, orders, router, searchParams]);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try { 
      await deleteOrder(orderToDelete.id); 
      toast({ title: "OS Removida" }); 
      setOrderToDelete(null); 
    } catch (error) { 
      toast({ variant: 'destructive', title: "Falha na exclusão" }); 
    } finally { 
      setIsDeleting(false); 
    }
  };

  const activeOrders = useMemo(() => {
    let filtered = orders.filter(o => o.status !== 'Concluído');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => o.client?.toLowerCase().includes(term) || o.id?.toLowerCase().includes(term));
    }
    if (statusFilter !== 'Todos' && statusFilter !== 'Concluído') filtered = filtered.filter(o => o.status === statusFilter);
    return filtered.sort((a, b) => (a.delivery_date || '9999').localeCompare(b.delivery_date || '9999'));
  }, [orders, searchTerm, statusFilter]);

  const concludedOrders = useMemo(() => {
    let filtered = orders.filter(o => o.status === 'Concluído');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => o.client?.toLowerCase().includes(term) || o.id?.toLowerCase().includes(term));
    }
    return filtered.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [orders, searchTerm]);

  return (
    <AdminGate>
      <div className="p-4 md:p-6 space-y-6 mt-14 md:mt-0 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pauta Industrial Impacto</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">Custos e Pauta</span></h1>
          </div>
          <Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} className="bg-emerald-500 text-black font-black h-10 px-6 rounded-full uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-white"><Plus size={16} strokeWidth={3} className="mr-2" /> Nova OS</Button>
        </div>

        <div className="sticky top-2 z-40 bg-[#09090b]/95 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-3 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            <div className="relative w-full lg:w-1/3 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input type="text" placeholder="Buscar Cliente ou OS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg py-2 pl-10 pr-3 text-white text-sm focus:border-emerald-500/50" />
            </div>
            <div className="hidden lg:block w-px h-6 bg-zinc-800" />
            <div className="w-full lg:flex-1">
              <div className="hidden md:flex flex-wrap items-center gap-1.5">
                {PRODUCTION_STAGES.map((stage) => (
                  <button 
                    key={stage} 
                    onClick={() => setStatusFilter(stage)} 
                    className={cn(
                      "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all border",
                      statusFilter === stage ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
                    )}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Operações Ativas ({activeOrders.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode='popLayout'>
              {activeOrders.length > 0 ? activeOrders.map((order) => (
                <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={order.id}>
                  <OrderCard order={order} onClick={(o) => { setEditingOrder(o); setIsModalOpen(true); }} onDelete={(o) => setOrderToDelete(o)} />
                </motion.div>
              )) : (
                <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Nenhuma operação pendente</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {concludedOrders.length > 0 && (
          <section className="space-y-4 pt-8">
            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2">Mural de Conclusão ({concludedOrders.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {concludedOrders.map((order) => (
                <div key={order.id} className="opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                  <OrderCard order={order} onClick={(o) => { setEditingOrder(o); setIsModalOpen(true); }} onDelete={(o) => setOrderToDelete(o)} />
                </div>
              ))}
            </div>
          </section>
        )}

        <AdminOrderModal isOpen={isModalOpen || !!editingOrder} order={editingOrder} onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} />

        <AnimatePresence>
          {orderToDelete && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#121212] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h2 className="text-xl font-black text-white text-center mb-2 uppercase">Excluir OS?</h2>
                <p className="text-zinc-400 text-sm text-center mb-6">Apagar permanentemente a OS do cliente <strong>{orderToDelete.client}</strong>?</p>
                <div className="flex gap-3">
                  <button onClick={() => setOrderToDelete(null)} className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl uppercase text-sm">Cancelar</button>
                  <button onClick={handleDeleteOrder} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl uppercase text-sm">{isDeleting ? <Loader2 className="animate-spin mx-auto" /> : 'Sim, Excluir'}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminGate>
  );
}

export default function OrdersManagerPage() {
  return <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}><OrdersManagerContent /></Suspense>;
}
