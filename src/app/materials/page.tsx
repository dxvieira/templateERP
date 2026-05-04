
'use client';

import React, { useState, useMemo } from 'react';
import { 
  collection, query, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, orderBy, writeBatch 
} from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Trash2, X, Printer, Layers, Truck, 
  Hammer, Loader2, Lock, Flame, CheckCircle2, ShoppingCart, 
  History, AlertTriangle, ArrowRight, Calendar, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfWeek, 
  isToday, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';

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

  // Estados dos Novos Modais de Confirmação
  const [isApproveAllConfirmOpen, setIsApproveAllConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  /**
   * CONSULTA OTIMIZADA: 
   * Buscamos apenas por data de criação. A filtragem por status e urgência 
   * é feita em memória para evitar erros de índice composto no Firestore.
   */
  const materialsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    
    return query(
      collection(firestore, 'materials'), 
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: allItems, isLoading } = useCollection(materialsQuery);

  // MOTOR DE FILTRAGEM E ORDENAÇÃO EM MEMÓRIA
  const { itemsPendentes, itemsHistorico } = useMemo(() => {
    if (!allItems) return { itemsPendentes: [], itemsHistorico: [] };

    const pendentes = allItems
      .filter(item => item.status === 'pendente')
      .sort((a, b) => {
        if (a.urgente && !b.urgente) return -1;
        if (!a.urgente && b.urgente) return 1;
        return 0;
      });

    const itemsHistorico = allItems.filter(item => item.status === 'comprado');

    return { itemsPendentes: pendentes, itemsHistorico };
  }, [allItems]);

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

  const executeApproveAll = async () => {
    if (!firestore || !itemsPendentes || itemsPendentes.length === 0) return;

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
      toast({ title: "Missão Cumprida", description: "Toda a lista foi movida para o histórico." });
      setIsApproveAllConfirmOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: "Erro no Processamento", description: "Falha ao processar atualização em massa." });
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

  const executeDelete = async () => {
    if (!firestore || !itemToDelete) return;
    deleteDoc(doc(firestore, 'materials', itemToDelete.id)).then(() => {
      toast({ title: "Registro Removido" });
      setItemToDelete(null);
    });
  };

  const formatItemDate = (timestamp: any) => {
    if (!timestamp) return '--/--/--';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : timestamp;
    return format(date, "dd 'de' MMM, yy", { locale: ptBR });
  };

  if (!user && !isUserLoading) return <div className="h-full flex items-center justify-center"><Lock className="w-12 h-12 text-destructive opacity-50" /></div>;

  const currentItems = activeTab === 'compras' ? itemsPendentes : itemsHistorico;

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-1"
        >
          <div className="flex items-center gap-4">
            {/* Icon Container with orange halo */}
            <motion.div
              animate={{ 
                y: [0, -4, 0],
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary/50 border border-border backdrop-blur-sm overflow-hidden group"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_70%,#FF5F1F_100%)] opacity-40 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-[1px] bg-background rounded-[15px] z-10 flex items-center justify-center">
                <Package className="text-primary w-6 h-6" />
              </div>
            </motion.div>

            {/* Title with Orange Shimmering Gradient */}
            <div className="flex flex-col">
              <motion.h1 
                className="text-4xl font-black text-foreground tracking-tighter uppercase leading-none flex items-center gap-2"
              >
                <span>SUPRIMENTOS /</span>
                <motion.span 
                  animate={{ 
                    backgroundImage: [
                      'linear-gradient(90deg, #FF5F1F 0%, #FF8F5F 50%, #FF5F1F 100%)',
                      'linear-gradient(90deg, #FF8F5F 0%, #FF5F1F 50%, #FF8F5F 100%)',
                      'linear-gradient(90deg, #FF5F1F 0%, #FF8F5F 50%, #FF5F1F 100%)'
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: '200% auto' }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600"
                >
                  LOGÍSTICA
                </motion.span>
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-[2px] bg-gradient-to-r from-primary/50 to-transparent mt-1"
              />
            </div>
          </div>
        </motion.div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center h-14 gap-2 px-8 bg-secondary text-foreground font-black text-[10px] uppercase rounded-2xl hover:bg-secondary transition-all border border-border hover:border-border active:scale-95"
          >
            <Plus size={16} /> Solicitar
          </button>
          {activeTab === 'compras' && itemsPendentes.length > 0 && (
            <button 
              onClick={() => setIsApproveAllConfirmOpen(true)}
              disabled={isSubmitting}
              className="flex items-center h-14 gap-2 px-8 bg-primary text-primary-foreground font-black text-[10px] uppercase rounded-2xl shadow-[0_0_25px_rgba(255,95,31,0.4)] hover:bg-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><ShoppingCart size={16} /> Aprovar Tudo</>}
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-2 p-1 bg-secondary/50 rounded-2xl w-fit border border-border">
         <button 
           onClick={() => setActiveTab('compras')} 
           className={cn(
             "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
             activeTab === 'compras' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
           )}
         >
           <ShoppingCart size={14} /> Lista de Compras ({itemsPendentes.length})
         </button>
         <button 
           onClick={() => setActiveTab('historico')} 
           className={cn(
             "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
             activeTab === 'historico' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
           )}
         >
           <History size={14} /> Histórico ({itemsHistorico.length})
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
              <div className={cn("flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30", config.bg)}>
                <config.icon className={config.color} size={18} />
                <h3 className="text-xs font-black text-foreground uppercase">{cat}</h3>
              </div>
              <div className="flex flex-col gap-3">
                {categoryItems.map(item => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={item.id} 
                    className={cn(
                      "group relative bg-card border rounded-2xl p-4 shadow-xl transition-all",
                      item.urgente && activeTab === 'compras' 
                        ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-500/[0.02]" 
                        : "border-border"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={cn("text-sm font-bold uppercase truncate pr-2", item.urgente && activeTab === 'compras' ? "text-red-400" : "text-foreground")}>
                        {item.name}
                      </h4>
                      {item.urgente && activeTab === 'compras' && (
                        <div className="flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20 shrink-0">
                          <Flame size={10} className="animate-pulse" />
                          <span className="text-[8px] font-black uppercase">Crítico</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Quantidade: <span className="text-foreground">{item.quantity}</span>
                      </p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Calendar size={10} /> {formatItemDate(item.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-3 mt-3 border-t border-border">
                      {activeTab === 'compras' ? (
                        <button 
                          onClick={() => handleIndividualAction(item.id, 'comprado')} 
                          className="flex-1 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-primary-foreground rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 border border-emerald-500/20"
                        >
                          <CheckCircle2 size={12} /> Baixar
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleIndividualAction(item.id, 'pendente')} 
                          className="flex-1 py-2 bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-[9px] font-black uppercase transition-all border border-border"
                        >
                          Restaurar
                        </button>
                      )}
                      <button 
                        onClick={() => setItemToDelete(item)} 
                        className="p-2 bg-background text-muted-foreground hover:text-red-500 rounded-lg border border-border transition-colors"
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
          <div className="col-span-full py-32 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-secondary/10">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <CheckCircle2 size={32} className="text-emerald-500/20" />
            </div>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em]">Nada para processar neste módulo</p>
          </div>
        )}
      </div>

      {/* MODAL DE SOLICITAÇÃO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/95 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-secondary border border-border rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">Solicitar Material</h3>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Protocolo de Necessidade Industrial</p>
                </div>
              </div>

              <form onSubmit={handleAddRequest} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Descrição</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground text-sm focus:border-primary outline-none transition-all" placeholder="Ex: Lona 440g Fosca" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Qtd</label>
                    <input required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground text-sm focus:border-primary outline-none transition-all" placeholder="50m" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Setor</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground text-sm focus:border-primary outline-none transition-all">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-background border border-border rounded-2xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className={formData.urgente ? "text-red-500" : "text-muted-foreground"} />
                    <div>
                      <p className="text-[10px] font-black text-foreground uppercase leading-none">Urgência Crítica</p>
                      <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Colocar no topo da lista</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, urgente: !formData.urgente})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                      formData.urgente ? "bg-red-600" : "bg-secondary"
                    )}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full transition-all", formData.urgente ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>

                <button disabled={isSubmitting} className="w-full py-5 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><ArrowRight size={16} /> Registrar Protocolo</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALERT MODAL: APROVAR TUDO */}
      <AlertDialog open={isApproveAllConfirmOpen} onOpenChange={setIsApproveAllConfirmOpen}>
        <AlertDialogContent className="bg-secondary border border-border rounded-[2.5rem] p-8 max-w-md">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl">
              <ShoppingCart className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-black text-foreground uppercase tracking-tighter">Aprovação em Lote</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">
                Deseja confirmar a compra de todos os <span className="text-foreground font-bold">{itemsPendentes.length} itens</span> da pauta atual? Esta ação moverá os registros para o histórico.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-8">
            <AlertDialogAction 
              onClick={executeApproveAll}
              className="w-full h-14 bg-primary text-primary-foreground hover:bg-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_20px_rgba(255,95,31,0.3)] transition-all"
            >
              Confirmar Recebimento
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 bg-secondary border border-border text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl">
              Cancelar Operação
            </AlertDialogCancel>
          </AlertDialogFooter>
          
          {/* ASSINATURA DE MARCA DISCRETA */}
          <div className="flex justify-center mt-8 opacity-20 hover:opacity-40 transition-opacity grayscale brightness-200">
            <div className="relative w-24 h-6 flex items-center justify-center border border-border bg-secondary rounded">
              <span className="text-muted-foreground text-[8px] font-black tracking-widest">LOGO</span>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT MODAL: EXCLUSÃO */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="bg-secondary border border-red-500/20 rounded-[2.5rem] p-8 max-w-md">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-2xl">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-black text-foreground uppercase tracking-tighter">Excluir Solicitação?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">
                Você está prestes a remover permanentemente o registro de <br/>
                <span className="text-red-400 font-bold">"{itemToDelete?.name}"</span>. 
                <br />Esta ação é irreversível.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-8">
            <AlertDialogAction 
              onClick={executeDelete}
              className="w-full h-14 bg-red-600 text-foreground hover:bg-red-500 font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            >
              Confirmar Exclusão
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 bg-secondary border border-border text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl">
              Manter Registro
            </AlertDialogCancel>
          </AlertDialogFooter>

          {/* ASSINATURA DE MARCA DISCRETA */}
          <div className="flex justify-center mt-8 opacity-20 hover:opacity-40 transition-opacity grayscale brightness-200">
            <div className="relative w-24 h-6 flex items-center justify-center border border-border bg-secondary rounded">
              <span className="text-muted-foreground text-[8px] font-black tracking-widest">LOGO</span>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
