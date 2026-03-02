
'use client';

import React, { useState } from 'react';
import { 
  collection, 
  query, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  where,
  orderBy
} from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Calendar, 
  Check, 
  Trash2, 
  X, 
  Printer, 
  Hammer, 
  Layers, 
  Truck,
  Loader2,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    category: 'Impressão'
  });

  // Query Memoizada com proteção robusta contra Race Condition
  // A query só é gerada se o usuário estiver autenticado e o estado de carregamento finalizado
  const materialsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    
    // Proteção adicional: garante que temos um UID válido antes de tentar a listagem
    if (!user.uid) return null;

    return query(
      collection(firestore, 'materials'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, isUserLoading]);

  // Hook padronizado useCollection - Desativa automaticamente se materialsQuery for null
  const { data: itemsData, isLoading: isCollectionLoading } = useCollection(materialsQuery);
  const items = itemsData || [];

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;

    setIsSubmitting(true);
    const payload = {
      ...formData,
      status: 'pending',
      userId: user.uid,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'materials'), payload);
      toast({ title: "Solicitação Enviada", description: "O item foi adicionado à fila de compras." });
      setIsModalOpen(false);
      setFormData({ name: '', quantity: '', category: 'Impressão' });
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'materials',
        operation: 'create',
        requestResourceData: payload
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'materials', id), { 
        status: 'completed',
        completedAt: serverTimestamp()
      });
      toast({ title: "Item Adquirido", description: "O material foi movido para o histórico." });
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `materials/${id}`,
        operation: 'update'
      }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (!confirm("Remover esta solicitação?")) return;
    try {
      await deleteDoc(doc(firestore, 'materials', id));
      toast({ title: "Solicitação Removida" });
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `materials/${id}`,
        operation: 'delete'
      }));
    }
  };

  // --- EARLY RETURN: BLOQUEIO DE ACESSO GLOBAL PREMATURO ---
  // Impede que qualquer parte do componente que dependa do Firestore seja renderizada
  // até que o Auth esteja resolvido.
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Sincronizando Terminal</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Verificando credenciais de acesso...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="w-12 h-12 text-destructive mx-auto opacity-50" />
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em]">Acesso Restrito ao Terminal</p>
        </div>
      </div>
    );
  }

  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative z-10">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Package size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Inventory Control</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Suprimentos</span>
            </h1>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all"
          >
            <Plus size={16} strokeWidth={3} /> Solicitar Material
          </button>
        </header>

        {/* BANNER DE AVISO */}
        <section className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 rounded-xl">
            <Calendar className="text-orange-500" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-orange-500 uppercase tracking-tight">Fechamento de Pedidos</h3>
            <p className="text-[10px] text-orange-500/60 uppercase font-bold tracking-widest leading-relaxed">As solicitações devem ser enviadas até Segunda à noite. <br/> Os pedidos aos fornecedores são realizados toda Terça-feira.</p>
          </div>
        </section>

        {/* GRID DE CATEGORIAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isCollectionLoading ? (
            <div className="col-span-full flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : CATEGORIES.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const categoryItems = items.filter(i => i.category === cat);

            return (
              <div key={cat} className="flex flex-col gap-4">
                <div className={cn("flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-zinc-900/30", config.bg)}>
                  <Icon className={config.color} size={18} />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">{cat}</h3>
                  <span className="ml-auto bg-black/40 text-[9px] font-bold px-2 py-0.5 rounded-full text-zinc-500">{categoryItems.length}</span>
                </div>

                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {categoryItems.map(item => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={item.id} 
                        className="group bg-[#09090b] border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-all shadow-xl"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white uppercase truncate">{item.name}</h4>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">QTD: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-white/5">
                          <button 
                            onClick={() => handleComplete(item.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-lg transition-all text-[9px] font-black uppercase tracking-widest border border-emerald-500/20"
                          >
                            <Check size={12} strokeWidth={3} /> Comprado
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-zinc-900 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all border border-zinc-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {categoryItems.length === 0 && !isCollectionLoading && (
                    <div className="py-10 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center opacity-20">
                      <Package size={24} className="mb-2" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-center px-4">Sem solicitações pendentes</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE SOLICITAÇÃO */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl"><Package size={20} className="text-primary" /></div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Solicitar Material</h3>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button>
                </div>
                <form onSubmit={handleAddRequest} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className={labelClass}>Nome do Material</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="Ex: Lona Brilho 440g" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={labelClass}>Quantidade</label>
                      <input required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className={inputClass} placeholder="Ex: 2 rolos" />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Setor / Categoria</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <button disabled={isSubmitting} className="w-full py-5 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_5px_25px_-5px_rgba(255,95,31,0.5)] flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> Enviar Solicitação</>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
