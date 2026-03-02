'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronLeft, Trophy, Zap, CheckCircle2, ListTodo, Loader2, Plus, Search, X, ArrowRight, Box } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { query, collection, where, doc, updateDoc } from 'firebase/firestore';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { Button } from '@/components/ui/button';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';
import { useToast } from '@/hooks/use-toast';

export default function WeeklyGoalsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const weeklyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), where('weekly_priority', '==', true));
  }, [firestore, user]);

  const { data: orders, isLoading } = useCollection(weeklyQuery);
  const availableOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isImportModalOpen) return null;
    return query(collection(firestore, 'orders'), where('status', '!=', 'Entregue'));
  }, [firestore, user, isImportModalOpen]);

  const { data: availableOrders, isLoading: isLoadingAvailable } = useCollection(availableOrdersQuery);

  const handleAddToGoal = useCallback(async (orderId: string) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'orders', orderId), { weekly_priority: true }).then(() => toast({ title: "Adicionado" }));
  }, [firestore, toast]);

  const handleRemoveFromGoal = useCallback(async (e: any, orderId: string) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!firestore) return;
    updateDoc(doc(firestore, 'orders', orderId), { weekly_priority: false }).then(() => toast({ title: "Removido" }));
  }, [firestore, toast]);

  const { pendingOrders, completedOrders, progress, totalValue } = useMemo(() => {
    if (!orders) return { pendingOrders: [], completedOrders: [], progress: 0, totalValue: 0 };
    const pending = orders.filter(o => !['Concluído', 'Entregue'].includes(o.status));
    const completed = orders.filter(o => ['Concluído', 'Entregue'].includes(o.status));
    const percentage = orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 0;
    const total = orders.reduce((acc, o) => acc + (Number(o.totalValue || o.total_value) || 0), 0);
    return { pendingOrders: pending, completedOrders: completed, progress: percentage, totalValue: total };
  }, [orders]);

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 mt-14 md:mt-0 pb-24">
      <header className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/')} className="text-zinc-500 uppercase text-[9px] font-black"><ChevronLeft size={12} /> Terminal</Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600 uppercase">Meta da Semana</h1>
          <Button onClick={() => setIsImportModalOpen(true)} className="bg-primary text-black font-black px-6 h-12 rounded-full uppercase text-[10px]">Gerenciar Lista</Button>
        </div>
      </header>

      <section className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
        <div className="flex justify-between items-end mb-5">
          <div className="flex items-baseline gap-2"><span className="text-5xl font-black text-white">{completedOrders.length}</span><span className="text-xl text-zinc-600 font-black">/ {orders?.length || 0}</span></div>
          <div className="p-4 rounded-xl bg-primary text-black"><Trophy size={24} /></div>
        </div>
        <div className="h-6 w-full bg-[#050505] rounded-lg overflow-hidden border border-zinc-800"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-orange-900 to-primary" /></div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pendingOrders.map(order => (
          <div key={order.id} className="relative group/card">
            <OrderCard order={order} onClick={setEditingOrder} />
            <button onClick={(e) => handleRemoveFromGoal(e, order.id)} className="absolute -top-2 -right-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-red-500 opacity-0 group-hover/card:opacity-100"><X size={12} /></button>
          </div>
        ))}
      </div>

      <OrderFormModal isOpen={!!editingOrder} order={editingOrder} onClose={() => setEditingOrder(null)} />
    </div>
  );
}