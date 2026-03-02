'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Calendar, Check, Trash2, X, Printer, Layers, Truck, Hammer, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Impressão', 'Serralheria', 'Acabamento', 'Instalação'];
const CATEGORY_CONFIG: Record<string, { icon: any, color: string, bg: string }> = {
  'Impressão': { icon: Printer, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Serralheria': { icon: Truck, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  'Acabamento': { icon: Layers, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  'Instalação': { icon: Hammer, color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

export default function MaterialsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', quantity: '', category: 'Impressão' });

  const materialsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, 'materials'), orderBy('createdAt', 'desc'));
  }, [firestore, user, isUserLoading]);

  const { data: itemsData, isLoading: isCollectionLoading } = useCollection(materialsQuery);
  const items = itemsData || [];

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSubmitting(true);
    const payload = { ...formData, status: 'pendente', userId: user.uid, createdAt: serverTimestamp() };
    try { await addDoc(collection(firestore, 'materials'), payload); toast({ title: "Enviado" }); setIsModalOpen(false); setFormData({ name: '', quantity: '', category: 'Impressão' }); }
    catch (error) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'materials', operation: 'create', requestResourceData: payload })); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmOrder = async (id: string) => {
    if (!firestore) return;
    try { await updateDoc(doc(firestore, 'materials', id), { status: 'pedido', completedAt: serverTimestamp() }); toast({ title: "Confirmado" }); }
    catch (error) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `materials/${id}`, operation: 'update' })); }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Remover?")) return;
    try { await deleteDoc(doc(firestore, 'materials', id)); toast({ title: "Removido" }); }
    catch (error) { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `materials/${id}`, operation: 'delete' })); }
  };

  if (!user && !isUserLoading) return <div className="h-full flex items-center justify-center"><Lock className="w-12 h-12 text-destructive opacity-50" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary"><Package size={14} /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Inventory</span></div>
          <h1 className="text-4xl font-black text-white uppercase leading-none">Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Suprimentos</span></h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black text-[10px] uppercase rounded-xl shadow-[0_0_20px_rgba(255,95,31,0.4)]"><Plus size={16} /> Solicitar</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isCollectionLoading ? <Loader2 className="animate-spin mx-auto col-span-full" /> : CATEGORIES.map(cat => {
          const config = CATEGORY_CONFIG[cat]; const Icon = config.icon; const categoryItems = items.filter(i => i.category === cat);
          return (
            <div key={cat} className="flex flex-col gap-4">
              <div className={cn("flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-zinc-900/30", config.bg)}><Icon className={config.color} size={18} /><h3 className="text-xs font-black text-white uppercase">{cat}</h3></div>
              <div className="flex flex-col gap-3">
                {categoryItems.map(item => (
                  <div key={item.id} className={cn("bg-[#09090b] border rounded-2xl p-4 shadow-xl", item.status === 'pedido' ? "opacity-50" : "border-zinc-800")}>
                    <h4 className="text-sm font-bold text-white uppercase">{item.name}</h4>
                    <p className="text-[10px] font-black text-primary mt-1">QTD: {item.quantity}</p>
                    <div className="flex gap-2 pt-3 mt-3 border-t border-white/5">
                      {item.status !== 'pedido' && <button onClick={() => handleConfirmOrder(item.id)} className="flex-1 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-black uppercase">Confirmar</button>}
                      <button onClick={() => handleDelete(item.id)} className="p-2 bg-zinc-900 text-zinc-600 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-8">
              <h3 className="text-xl font-black text-white uppercase mb-6">Solicitar Material</h3>
              <form onSubmit={handleAddRequest} className="space-y-6">
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white" placeholder="Nome do Material" />
                <div className="grid grid-cols-2 gap-4">
                  <input required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white" placeholder="Qtd" />
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <button disabled={isSubmitting} className="w-full py-5 bg-primary text-black font-black uppercase rounded-2xl">Registrar</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}