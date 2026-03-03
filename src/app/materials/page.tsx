
'use client';

import React, { useState, useMemo } from 'react';
import { 
  collection, query, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, orderBy, where, writeBatch 
} from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Trash2, X, Printer, Layers, Truck, 
  Hammer, Loader2, Lock, Flame, CheckCircle2, ShoppingCart, 
  History, AlertTriangle, ArrowRight 
} from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState<'compras' | 'historico'>('compras');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', quantity: '', category: 'Impressão', urgente: false });

  // QUERY 1: LISTA DE COMPRAS (PENDENTES)
  const pendentesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Nota: Esta query com múltiplos orderBy pode exigir criação de índice no Firebase Console
    return query(
      collection(firestore, 'materials'), 
      where('status', '==', 'pendente'),
      orderBy('urgente', 'desc'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  // QUERY 2: HISTÓRICO (COMPRADOS)
  const historicoQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'materials'), 
      where('status', '==', 'comprado'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: itemsPendentes, isLoading: loadingPendentes } = useCollection(pendentesQuery);
  const { data: itemsHistorico, isLoading: loadingHistorico } = useCollection(historicoQuery);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    const payload = { 
      ...formData, 
      status: 'pendente', 
      userId: user.uid, 
      createdAt: serverTimestamp() 
    };

    try { 
      await addDoc(collection(firestore, 'materials'), payload); 
      toast({ title: "Pedido Enviado", description: "Solicitação registrada no terminal." }); 
      setIsModalOpen(false); 
      setFormData({ name: '', quantity: '', category: 'Impressão', urgente: false }); 
    } catch (error) { 
      errorEmitter.emit('permission-error', new FirestorePermissionError({ 
        path: 'materials', operation: 'create', requestResourceData: payload 
      })); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  /**
   * AÇÃO EM MASSA: writeBatch (Otimização Industrial)
   */
  const handleApproveAll = async () => {
    if (!firestore || !itemsPendentes || itemsPendentes.length === 0) return;
    if (!confirm(`Confirmar a compra de todos os ${itemsPendentes.length} itens da lista?`)) return;

    setIsSubmitting(true);
    const batch = writeBatch(firestore);

    itemsPendentes.forEach(item => {
      const ref = doc(firestore, 'materials', item.id);
      batch.update(ref, { 
        status: 'comprado', 
        completedAt: serverTimestamp() 
      });
    });

    try {
      await batch.commit();
      toast({ 
        title: "Missão Cumprida", 
        description: "Toda a lista foi movida para o histórico de compras." 
      });
    } catch (error) {
      toast({ variant: 'destructive', title: "Erro no Batch", description: "Falha ao processar atualização em massa." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIndividualAction = async (id: string, newStatus: string) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'materials', id), { 
      status: newStatus, 
      completedAt: newStatus === 'comprado' ? serverTimestamp() : null 
    }).then(() => {
      toast({ title: newStatus === 'comprado' ? "Item Comprado" : "Item Restaurado" });
    });
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Remover solicitação permanentemente?")) return;
    deleteDoc(doc(firestore, 'materials', id)).then(() => {
      toast({ title: "Registro Removido" });
    });
  };

  if (!user && !isUserLoading) return <div className="h-full flex items-center justify-center"><Lock className="w-12 h-12 text-destructive opacity-50" /></div>;

  const currentItems = activeTab === 'compras' ? (itemsPendentes || []) : (itemsHistorico || []);
  const isLoading = activeTab === 'compras' ? loadingPendentes : loadingHistorico;

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Package size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Suprimentos / Logística</span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase leading-none">
            Terminal de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Provisão</span>
          </h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-black text-[10px] uppercase rounded-xl hover:bg-zinc-700 transition-all"
          >
            <Plus size={16} /> Solicitar
          </button>
          {activeTab === 'compras' && itemsPendentes && itemsPendentes.length > 0 && (
            <button 
              onClick={handleApproveAll}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black text-[10px] uppercase rounded-xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><ShoppingCart size={16} /> Aprovar Tudo</>}
            </button>
          )}
        </div>
      </header>

      {/* SISTEMA DE ABAS TÁTICO */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800">
         <button 
           onClick={() => setActiveTab('compras')} 
           className={cn(
             "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
             activeTab === 'compras' ? "bg-primary text-black shadow-lg" : "text-zinc-500 hover:text-white"
           )}
         >
           <ShoppingCart size={14} /> Lista de Compras
         </button>
         <button 
           onClick={() => setActiveTab('historico')} 
           className={cn(
             "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
             activeTab === 'historico' ? "bg-primary text-black shadow-lg" : "text-zinc-500 hover:text-white"
           )}
         >
           <History size={14} /> Histórico
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : CATEGORIES.map(cat => {
          const config = CATEGORY_CONFIG[cat]; 
          const categoryItems = currentItems.filter(i => i.category === cat);
          
          if (categoryItems.length === 0) return null;

          return (
            <div key={cat} className="flex flex-col gap-4">
              <div className={cn("flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-zinc-900/30", config.bg)}>
                <config.icon className={config.color} size={18} />
                <h3 className="text-xs font-black text-white uppercase">{cat}</h3>
              </div>
              <div className="flex flex-col gap-3">
                {categoryItems.map(item => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={item.id} 
                    className={cn(
                      "group relative bg-[#09090b] border rounded-2xl p-4 shadow-xl transition-all",
                      item.urgente && activeTab === 'compras' 
                        ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-500/[0.02]" 
                        : "border-zinc-800"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={cn("text-sm font-bold uppercase", item.urgente && activeTab === 'compras' ? "text-red-400" : "text-white")}>
                        {item.name}
                      </h4>
                      {item.urgente && activeTab === 'compras' && (
                        <div className="flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                          <Flame size={10} className="animate-pulse" />
                          <span className="text-[8px] font-black uppercase">Crítico</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Quantidade: <span className="text-white">{item.quantity}</span>
                    </p>

                    <div className="flex gap-2 pt-3 mt-3 border-t border-white/5">
                      {activeTab === 'compras' ? (
                        <button 
                          onClick={() => handleIndividualAction(item.id, 'comprado')} 
                          className="flex-1 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 size={12} /> Baixar
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleIndividualAction(item.id, 'pendente')} 
                          className="flex-1 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all"
                        >
                          Restaurar
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="p-2 bg-zinc-950 text-zinc-700 hover:text-red-500 rounded-lg border border-zinc-800 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}

        {!isLoading && currentItems.length === 0 && (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-zinc-800 rounded-[2.5rem] bg-zinc-900/10">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <CheckCircle2 size={32} className="text-emerald-500/20" />
            </div>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Nada para processar neste módulo</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Solicitar Material</h3>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Protocolo de Necessidade Industrial</p>
                </div>
              </div>

              <form onSubmit={handleAddRequest} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Descrição</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white text-sm focus:border-primary outline-none transition-all" placeholder="Ex: Lona 440g Fosca" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Qtd</label>
                    <input required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white text-sm focus:border-primary outline-none transition-all" placeholder="50m" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Setor</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white text-sm focus:border-primary outline-none transition-all">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className={formData.urgente ? "text-red-500" : "text-zinc-700"} />
                    <div>
                      <p className="text-[10px] font-black text-white uppercase leading-none">Urgência Crítica</p>
                      <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Colocar no topo da lista</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, urgente: !formData.urgente})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                      formData.urgente ? "bg-red-600" : "bg-zinc-800"
                    )}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full transition-all", formData.urgente ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>

                <button disabled={isSubmitting} className="w-full py-5 bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><ArrowRight size={16} /> Registrar Protocolo</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
