
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  X, Save, Plus, Trash2, Box, 
  User, CreditCard, DollarSign, 
  Calculator, Loader2,
  History, Wallet, Receipt,
  CheckCircle2, AlertTriangle, RefreshCw, FileText,
  ArrowDownLeft, ArrowRight, Download, Printer,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { addMonths, format, parseISO, startOfDay, isBefore } from 'date-fns';

const PAYMENT_METHODS = [
  "Caixa Interno",
  "SICOOB - Lindóia",
  "SICOOB - Serra Negra",
  "Máquina PAGBANK",
  "Máquina SIPAG"
];

const INSTALLMENT_TYPES = ["Boleto", "Cartão", "Dinheiro/Pix"];

const generateUid = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

interface AdminOrderModalProps {
  order?: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminOrderModal({ order, isOpen, onClose }: AdminOrderModalProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'operacional' | 'financeiro'>('operacional');
  const [isAdmin, setIsAdmin] = useState(false);

  const [clientsList, setClientsList] = useState<any[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [client, setClient] = useState('');
  const [seller, setSeller] = useState('');
  const [status, setStatus] = useState('Arte');
  const [emissionDate, setEmissionDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<any[]>([]);
  
  const [installments, setInstallments] = useState<any[]>([]);
  const [genConfig, setInstallmentGenConfig] = useState({
    total: 0,
    downPayment: 0,
    count: 1,
    type: "Boleto",
    startDate: new Date().toISOString().split('T')[0],
    machine: "Máquina PAGBANK"
  });

  const [baixaInstallmentUid, setBaixaInstallmentUid] = useState<string | null>(null);
  const [baixaData, setBaixaData] = useState({ method: PAYMENT_METHODS[0], date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (isOpen) {
      setIsAdmin(sessionStorage.getItem('is_admin_unlocked') === 'true');
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchClients = async () => {
      if (!firestore || !isOpen) return;
      try {
        const querySnapshot = await getDocs(collection(firestore, 'clients'));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setClientsList(data);
      } catch (error) {}
    };
    fetchClients();
  }, [firestore, isOpen]);

  useEffect(() => {
    if (order) {
      setClient(order.client || '');
      setSeller(order.seller || '');
      setStatus(order.status || 'Arte');
      setEmissionDate(order.emission_date || order.emissionDate || new Date().toISOString().split('T')[0]);
      setDeliveryDate(order.delivery_date || order.deliveryDate || '');
      setObservations(order.observations || '');
      setItems(order.items?.map((item: any) => ({ ...item })) || [{ productCode: '', desc: '', quantity: 1, unitValue: 0, observation: '' }]);
      setInstallments(Array.isArray(order.installments) ? order.installments : []);
      setInstallmentGenConfig(prev => ({
        ...prev,
        downPayment: order.down_payment || order.downPayment || 0
      }));
    } else {
      resetForm();
    }
    setActiveTab('operacional');
  }, [order, isOpen]);

  const resetForm = () => {
    setClient('');
    setSeller('');
    setStatus('Arte');
    setEmissionDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate('');
    setObservations('');
    setItems([{ productCode: '', desc: '', quantity: 1, unitValue: 0, observation: '' }]);
    setInstallments([]);
    setInstallmentGenConfig({
      total: 0,
      downPayment: 0,
      count: 1,
      type: "Boleto",
      startDate: new Date().toISOString().split('T')[0],
      machine: "Máquina PAGBANK"
    });
  };

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

    const isNewOrder = !order;
    const finalId = order?.id || String(Date.now()).slice(-6);
    const docRef = doc(firestore, 'orders', finalId);

    const payload = {
      id: finalId,
      client, seller, status, 
      emission_date: emissionDate, 
      delivery_date: deliveryDate, 
      observations, items, 
      total_value: totalValue,
      down_payment: genConfig.downPayment,
      amount_paid: amountPaid, 
      balance_due: balanceDue, 
      installments,
      updatedAt: serverTimestamp(),
      ...(isNewOrder ? { createdAt: serverTimestamp() } : {})
    };

    const savePromise = isNewOrder ? setDoc(docRef, payload) : updateDoc(docRef, payload);

    savePromise
      .then(() => {
        toast({ title: "OS Sincronizada" });
        onClose();
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: isNewOrder ? 'create' : 'update',
          requestResourceData: payload
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleEmitNFe = () => {
    toast({ title: "Módulo Fiscal", description: "Processando transmissão para o SEFAZ..." });
  };

  if (!isOpen) return null;

  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-[#09090b] w-full max-w-5xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20"><Calculator size={20} /></div>
            <div>
              <h2 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">Impacto Digital</h2>
              <p className="text-sm font-black text-white uppercase tracking-tight">OS #{order?.id?.slice(-6) || 'NOVA'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {isAdmin && (
               <div className="flex items-center gap-6 border-r border-zinc-800 pr-6 mr-2">
                 <button onClick={handleEmitNFe} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all">
                   <FileText size={14} /><span className="text-[10px] font-black uppercase">Emitir NF-e</span>
                 </button>
                 <div className="text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-black">Saldo Devedor</p>
                    <p className={cn("text-lg font-black font-mono", balanceDue > 0 ? "text-red-500" : "text-emerald-500")}>
                      {balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                 </div>
               </div>
             )}
             <button onClick={() => window.print()} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><Printer size={20}/></button>
             <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20}/></button>
          </div>
        </div>

        <div className="flex bg-zinc-900/30 border-b border-zinc-800">
           <button onClick={() => setActiveTab('operacional')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'operacional' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500")}>Operacional</button>
           <button onClick={() => setActiveTab('financeiro')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'financeiro' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500")}>Financeiro</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050505]">
          <form id="adminOrderForm" onSubmit={handleSave} className="space-y-8">
            {activeTab === 'operacional' ? (
              <div className="space-y-8">
                <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Cliente / Projeto</label>
                    <input required value={client} onChange={e => setClient(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Status Produção</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
                       {['Arte', 'Serralheria', 'Impressão', 'Acabamento', 'Instalação', 'Concluído'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Prazo de Entrega</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass} />
                  </div>
                </section>

                <section className="space-y-4">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] flex items-center gap-2"><Box size={14}/> Itens da Ordem</h3>
                      <button type="button" onClick={() => setItems([...items, { productCode: '', desc: '', quantity: 1, unitValue: 0, observation: '' }])} className="bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-[9px] font-black uppercase transition-all flex items-center gap-1"><Plus size={12}/> Adicionar</button>
                   </div>
                   <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
                           <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                              <div className="md:col-span-6"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Descrição</label><input value={item.desc} onChange={e => { const n = [...items]; n[index].desc = e.target.value; setItems(n); }} className={`${inputClass} p-2 text-xs`} /></div>
                              <div className="md:col-span-2"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Qtd</label><input type="number" value={item.quantity} onChange={e => { const n = [...items]; n[index].quantity = Number(e.target.value); setItems(n); }} className={`${inputClass} p-2 text-center text-xs`} /></div>
                              <div className="md:col-span-2"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Unitário</label><input type="number" step="0.01" value={item.unitValue} onChange={e => { const n = [...items]; n[index].unitValue = Number(e.target.value); setItems(n); }} className={`${inputClass} p-2 text-right text-xs`} /></div>
                              <div className="md:col-span-2 flex justify-end items-end h-full"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>
              </div>
            ) : (
              <div className="space-y-10">
                <section className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 text-center">
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-4">Resumo Financeiro Industrial</p>
                   <div className="flex flex-wrap justify-center gap-8">
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">Valor Total</p><p className="text-2xl font-black text-white font-mono">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">Total Pago</p><p className="text-2xl font-black text-emerald-500 font-mono">{amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">A Receber</p><p className="text-2xl font-black text-red-500 font-mono">{balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                   </div>
                </section>
                <section className="space-y-4">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><History size={14}/> Histórico de Parcelas</h3>
                   <div className="grid grid-cols-1 gap-2">
                      {installments.map((inst) => (
                        <div key={inst.uid} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all", inst.status === 'paid' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/40 border-zinc-800")}>
                           <div className="flex items-center gap-4">
                              <div className={cn("w-2 h-2 rounded-full", inst.status === 'paid' ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-zinc-700")} />
                              <div>
                                <p className="text-xs font-black text-white uppercase">{inst.id} &bull; {inst.due_date}</p>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase">{inst.type} {inst.payment_method && ` via ${inst.payment_method}`}</p>
                              </div>
                           </div>
                           <p className="text-sm font-black text-white font-mono">{inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                      ))}
                   </div>
                </section>
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row justify-end gap-3">
           <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800">Cancelar</button>
           <button form="adminOrderForm" type="submit" disabled={loading} className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)] disabled:opacity-50 flex items-center justify-center gap-2">
             {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Gravar Registro</>}
           </button>
        </div>
      </motion.div>
    </div>
  );
}
