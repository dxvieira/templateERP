'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Plus, Loader2, Calendar, ClipboardList } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useOrders } from '@/hooks/use-orders';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';
import { AdminOrderModal } from '@/components/dashboard/AdminOrderModal';
import { cn } from '@/lib/utils';
import { AdminGuard } from '@/components/auth/AdminGuard';

const PRODUCTION_STAGES = ['Todos', 'Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído'];

function OrdersManagerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('edit');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('');
  const { orders, isLoading } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  useEffect(() => {
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
  }, []);

  const monthFilteredOrders = useMemo(() => {
    if (!selectedMonth) return orders;
    return orders.filter(o => {
      const dateStr = o.emission_date || o.emissionDate;
      if (dateStr) {
        return dateStr.startsWith(selectedMonth);
      }
      if (o.createdAt?.seconds) {
        const d = new Date(o.createdAt.seconds * 1000);
        return format(d, 'yyyy-MM') === selectedMonth;
      }
      return true; // Se não tiver data, mantemos na lista por segurança
    });
  }, [orders, selectedMonth]);

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

  const activeOrders = useMemo(() => {
    let filtered = monthFilteredOrders.filter(o => o.status !== 'Concluído' && o.status !== 'Entregue');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => o.client?.toLowerCase().includes(term) || o.id?.toLowerCase().includes(term));
    }
    if (statusFilter !== 'Todos' && statusFilter !== 'Concluído') filtered = filtered.filter(o => o.status === statusFilter);
    return filtered.sort((a, b) => (a.delivery_date || '9999').localeCompare(b.delivery_date || '9999'));
  }, [monthFilteredOrders, searchTerm, statusFilter]);

  const concludedOrders = useMemo(() => {
    let filtered = monthFilteredOrders.filter(o => o.status === 'Concluído' || o.status === 'Entregue');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => o.client?.toLowerCase().includes(term) || o.id?.toLowerCase().includes(term));
    }
    return filtered.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [monthFilteredOrders, searchTerm]);

  return (
    <div className="p-4 md:p-6 space-y-6 mt-14 md:mt-0 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-1"
        >
          <div className="flex items-center gap-4">
            {/* Icon Container with emerald halo */}
            <motion.div
              animate={{ 
                y: [0, -4, 0],
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm overflow-hidden group"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_70%,#10B981_100%)] opacity-40 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-[1px] bg-[#0A0A0A] rounded-[15px] z-10 flex items-center justify-center">
                <ClipboardList className="text-emerald-400 w-6 h-6" />
              </div>
            </motion.div>

            {/* Title with Emerald Shimmering Gradient */}
            <div className="flex flex-col">
              <motion.h1 
                className="text-4xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-2"
              >
                <span>GESTÃO DE</span>
                <motion.span 
                  animate={{ 
                    backgroundImage: [
                      'linear-gradient(90deg, #10B981 0%, #34D399 50%, #10B981 100%)',
                      'linear-gradient(90deg, #34D399 0%, #10B981 50%, #34D399 100%)',
                      'linear-gradient(90deg, #10B981 0%, #34D399 50%, #10B981 100%)'
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: '200% auto' }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-600"
                >
                  PEDIDOS
                </motion.span>
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-[2px] bg-gradient-to-r from-emerald-400/50 to-transparent mt-1"
              />
            </div>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-black outline-none focus:border-emerald-500 transition-all cursor-pointer h-14" 
            />
          </div>
          <Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} className="bg-emerald-500 text-black font-black h-14 px-8 rounded-2xl uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-white transition-all hover:scale-105 active:scale-95"><Plus size={16} strokeWidth={3} className="mr-2" /> Nova OS</Button>
        </div>
      </header>

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
                <OrderCard order={order} onClick={(o) => { setEditingOrder(o); setIsModalOpen(true); }} />
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
          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2">Galeria de Conclusão ({concludedOrders.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {concludedOrders.map((order) => (
              <div key={order.id} className="opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                <OrderCard order={order} onClick={(o) => { setEditingOrder(o); setIsModalOpen(true); }} />
              </div>
            ))}
          </div>
        </section>
      )}

      <AdminOrderModal isOpen={isModalOpen || !!editingOrder} order={editingOrder} onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} />
    </div>
  );
}

export default function OrdersManagerPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
        <OrdersManagerContent />
      </Suspense>
    </AdminGuard>
  );
}
