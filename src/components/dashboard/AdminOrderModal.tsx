'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirestore, useUser, useFunctions } from '@/firebase';
import { 
  X, Save, Plus, Trash2, Box, 
  Calculator, Loader2,
  History, FileText,
  Printer, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

interface AdminOrderModalProps {
  order?: any | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AdminOrderModal - Modal de Edição de OS (Nível Industrial).
 * Refatorado para Firebase SDK v9 Modular com Real-time Sync e Módulo Fiscal Seguro.
 */
export function AdminOrderModal({ order, isOpen, onClose }: AdminOrderModalProps) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'operacional' | 'financeiro'>('operacional');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasFiscalAccess, setHasFiscalAccess] = useState(false);

  // Estados dos Campos
  const [client, setClient] = useState('');
  const [status, setStatus] = useState('Arte');
  const [emissionDate, setEmissionDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);

  // Lógica de Desbloqueio e Claims
  useEffect(() => {
    if (isOpen) {
      const unlocked = sessionStorage.getItem('admin_authenticated') === 'true' || 
                       sessionStorage.getItem('page_unlocked') === 'true';
      setIsUnlocked(unlocked);

      if (user) {
        user.getIdTokenResult().then(result => {
          setHasFiscalAccess(!!result.claims.admin || !!result.claims.financeiro);
        }).catch(() => setHasFiscalAccess(false));
      }
    }
  }, [isOpen, user]);

  // Lógica de Recuperação e Sincronização em Tempo Real (onSnapshot)
  useEffect(() => {
    if (!isOpen || !order?.id || !firestore) return;

    const docRef = doc(firestore, 'orders', order.id);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setClient(data.client || '');
        setStatus(data.status || 'Arte');
        setEmissionDate(data.emission_date || data.emissionDate || '');
        setDeliveryDate(data.delivery_date || data.deliveryDate || '');
        setObservations(data.observations || '');
        setItems(data.items || [{ desc: '', quantity: 1, unitValue: 0 }]);
        setInstallments(data.installments || []);
      }
    }, (error) => {
      console.error("Erro no listener OS:", error);
    });

    return () => unsubscribe();
  }, [isOpen, order?.id, firestore]);

  // Reset para novas OS
  useEffect(() => {
    if (isOpen && !order) {
      setClient('');
      setStatus('Arte');
      setEmissionDate(new Date().toISOString().split('T')[0]);
      setDeliveryDate('');
      setObservations('');
      setItems([{ desc: '', quantity: 1, unitValue: 0 }]);
      setInstallments([]);
      setActiveTab('operacional');
    }
  }, [isOpen, order]);

  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitValue || 0)), 0);
  }, [items]);

  const amountPaid = useMemo(() => {
    return installments
      .filter(i => i.status === 'paid' || i.status === 'pago')
      .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [installments]);

  const balanceDue = totalValue - amountPaid;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);

    const isNew = !order;
    const finalId = order?.id || String(Date.now()).slice(-6);
    const docRef = doc(firestore, 'orders', finalId);

    const payload = {
      id: finalId,
      client, status, 
      emission_date: emissionDate, 
      delivery_date: deliveryDate, 
      observations, items, 
      total_value: totalValue,
      amount_paid: amountPaid, 
      balance_due: balanceDue, 
      installments,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {})
    };

    try {
      if (isNew) {
        await setDoc(docRef, payload);
      } else {
        await updateDoc(docRef, payload);
      }
      toast({ title: "Sincronização Industrial", description: "Protocolo atualizado no terminal central." });
      if (isNew) onClose();
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: isNew ? 'create' : 'update',
        requestResourceData: payload
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleEmitNFe = async () => {
    if (!order?.id || !functions) return;
    setLoading(true);
    
    const emitNFeFunc = httpsCallable(functions, 'emitNFe');
    try {
      await emitNFeFunc({ orderId: order.id });
      toast({ title: "NF-e Solicitada", description: "O processamento fiscal foi iniciado no backend." });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro Fiscal", 
        description: error.message || "Falha na comunicação com o servidor fiscal." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintOP = () => {
    window.print();
  };

  if (!isOpen) return null;

  const canShowAdminData = isUnlocked || hasFiscalAccess;
  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 print:p-0 print:bg-white">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#09090b] w-full max-w-5xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none">
        
        {/* Cabeçalho Original Restaurado */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50 print:hidden">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20"><Calculator size={20} /></div>
            <div>
              <h2 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">IMPACTO DIGITAL</h2>
              <p className="text-sm font-black text-white uppercase tracking-tight">OS #{order?.id?.slice(-6) || 'NOVA'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {canShowAdminData && (
               <div className="flex items-center gap-6 border-r border-zinc-800 pr-6 mr-2">
                 <button 
                   onClick={handleEmitNFe} 
                   disabled={loading}
                   className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
                 >
                   {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                   <span className="text-[10px] font-black uppercase">Emitir NF-e</span>
                 </button>
                 <div className="text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-black">Saldo de Contrato</p>
                    <p className={cn("text-lg font-black font-mono leading-none mt-1", balanceDue > 0 ? "text-red-500" : "text-emerald-500")}>
                      {balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                 </div>
               </div>
             )}
             <button onClick={handlePrintOP} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full" title="Imprimir OP"><Printer size={20}/></button>
             <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20}/></button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex bg-zinc-900/30 border-b border-zinc-800 print:hidden">
           <button onClick={() => setActiveTab('operacional')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'operacional' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500")}>Produção e Arte</button>
           <button onClick={() => setActiveTab('financeiro')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'financeiro' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500")}>Financeiro e Parcelas</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050505] print:overflow-visible print:bg-white print:text-black">
          <form id="adminOrderForm" onSubmit={handleSave} className="space-y-8">
            {activeTab === 'operacional' ? (
              <div className="space-y-8">
                <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass + " print:text-black"}>Cliente / Projeto</label>
                    <input required value={client} onChange={e => setClient(e.target.value)} className={inputClass + " print:border-none print:p-0 print:text-lg print:font-bold print:text-black"} />
                  </div>
                  <div className="print:hidden">
                    <label className={labelClass}>Status da Pauta</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
                       {['Arte', 'Serralheria', 'Impressão', 'Acabamento', 'Instalação', 'Concluído'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass + " print:text-black"}>Promessa de Entrega</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass + " print:border-none print:p-0 print:text-black"} />
                  </div>
                </section>

                <section className="space-y-4">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2 print:border-black">
                      <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] flex items-center gap-2 print:text-black"><Box size={14}/> Itens Técnicos</h3>
                      <button type="button" onClick={() => setItems([...items, { desc: '', quantity: 1, unitValue: 0 }])} className="bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-[9px] font-black uppercase transition-all flex items-center gap-1 print:hidden"><Plus size={12}/> Adicionar Material</button>
                   </div>
                   <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 print:bg-transparent print:border-black print:rounded-none">
                           <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                              <div className="md:col-span-6"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block print:text-black">Descrição do Serviço/Produto</label><input value={item.desc} onChange={e => { const n = [...items]; n[index].desc = e.target.value; setItems(n); }} className={`${inputClass} p-2 text-xs print:text-black print:border-none`} /></div>
                              <div className="md:col-span-2"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block print:text-black">Qtd</label><input type="number" value={item.quantity} onChange={e => { const n = [...items]; n[index].quantity = Number(e.target.value); setItems(n); }} className={`${inputClass} p-2 text-center text-xs print:text-black print:border-none`} /></div>
                              <div className="md:col-span-2"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block print:text-black">Unitário</label><input type="number" step="0.01" value={item.unitValue} onChange={e => { const n = [...items]; n[index].unitValue = Number(e.target.value); setItems(n); }} className={`${inputClass} p-2 text-right text-xs print:text-black print:border-none`} /></div>
                              <div className="md:col-span-2 flex justify-end items-end h-full print:hidden"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="print:block hidden mt-10 border-t border-black pt-4">
                   <p className="text-xs font-bold uppercase mb-2">Observações de Produção:</p>
                   <textarea value={observations} onChange={e => setObservations(e.target.value)} className="w-full h-32 border border-black p-4 text-sm" />
                </section>
              </div>
            ) : (
              <div className="space-y-10">
                <section className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 text-center">
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-4">Balancete do Protocolo</p>
                   <div className="flex flex-wrap justify-center gap-12">
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">Valor do Contrato</p><p className="text-3xl font-black text-white font-mono tracking-tighter">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">Montante Liquidado</p><p className="text-3xl font-black text-emerald-500 font-mono tracking-tighter">{amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">Déficit de Receita</p><p className="text-3xl font-black text-red-500 font-mono tracking-tighter">{balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                   </div>
                </section>
                <section className="space-y-4">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><History size={14}/> Cronograma de Faturamento</h3>
                   <div className="grid grid-cols-1 gap-2">
                      {installments.length > 0 ? installments.map((inst, i) => (
                        <div key={i} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all", (inst.status === 'paid' || inst.status === 'pago') ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/40 border-zinc-800")}>
                           <div className="flex items-center gap-4">
                              <div className={cn("w-2 h-2 rounded-full", (inst.status === 'paid' || inst.status === 'pago') ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-zinc-700")} />
                              <div>
                                <p className="text-xs font-black text-white uppercase">{inst.due_date || inst.dueDate}</p>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase">{inst.payment_method || 'PIX/DINHEIRO'}</p>
                              </div>
                           </div>
                           <p className="text-sm font-black text-white font-mono">{Number(inst.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                      )) : (
                        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-3xl">
                          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Nenhuma fatura lançada para este contrato</p>
                        </div>
                      )}
                   </div>
                </section>
              </div>
            )}
          </form>
        </div>

        {/* Footer de Ações */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row justify-end gap-3 print:hidden">
           <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">Cancelar</button>
           <button 
             form="adminOrderForm" 
             type="submit" 
             disabled={loading} 
             className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)] disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
           >
             {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Gravar Registro Industrial</>}
           </button>
        </div>

        {/* Assinatura de Segurança */}
        <div className="py-3 px-6 bg-black flex items-center justify-center gap-2 print:hidden border-t border-white/5 opacity-30">
           <ShieldCheck size={12} className="text-primary" />
           <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em]">Protocolo de Integridade Firestore SDK v9 Ativo</span>
        </div>
      </motion.div>
    </div>
  );
}
