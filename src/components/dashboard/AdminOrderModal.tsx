'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  X, Save, Plus, Trash2, Box, FileText, 
  User, CreditCard, DollarSign, 
  Calculator, Briefcase, Percent, Loader2,
  History, Calendar as CalendarIcon, Wallet, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const PAYMENT_METHODS = [
  "Dinheiro (Caixa Interno)",
  "SICOOB - Lindóia",
  "SICOOB - Serra Negra",
  "Máquina PAGBANK",
  "Máquina SIPAG/SICOOB"
];

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

  // FORM STATES
  const [client, setClient] = useState('');
  const [seller, setSeller] = useState('');
  const [status, setStatus] = useState('Arte');
  const [emissionDate, setEmissionDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [installments, setInstallments] = useState(1);
  const [machine, setMachine] = useState('');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<any[]>([]);
  
  // FINANCIAL STATES
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: PAYMENT_METHODS[0] });

  useEffect(() => {
    if (order) {
      setClient(order.client || '');
      setSeller(order.seller || '');
      setStatus(order.status || 'Arte');
      setEmissionDate(order.emissionDate || new Date().toISOString().split('T')[0]);
      setDeliveryDate(order.deliveryDate || '');
      setPaymentMethod(order.paymentMethod || PAYMENT_METHODS[0]);
      setInstallments(order.installments || 1);
      setMachine(order.machine || '');
      setObservations(order.observations || '');
      setItems(order.items?.map((item: any) => ({ ...item })) || [{ productCode: '', desc: '', quantity: 1, unitValue: 0 }]);
      setPaymentHistory(order.paymentHistory || []);
    } else {
      setClient('');
      setSeller('');
      setStatus('Arte');
      setEmissionDate(new Date().toISOString().split('T')[0]);
      setDeliveryDate('');
      setPaymentMethod(PAYMENT_METHODS[0]);
      setInstallments(1);
      setMachine('');
      setObservations('');
      setItems([{ productCode: '', desc: '', quantity: 1, unitValue: 0 }]);
      setPaymentHistory([]);
    }
    setActiveTab('operacional');
  }, [order, isOpen]);

  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitValue || 0)), 0);
  }, [items]);

  const amountPaid = useMemo(() => {
    return paymentHistory.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [paymentHistory]);

  const balanceDue = totalValue - amountPaid;

  const handleAddPayment = () => {
    if (!newPayment.amount || Number(newPayment.amount) <= 0) return;
    
    const payment = {
      id: crypto.randomUUID(),
      amount: Number(newPayment.amount),
      date: newPayment.date,
      method: newPayment.method
    };

    setPaymentHistory([...paymentHistory, payment]);
    setNewPayment({ ...newPayment, amount: '' });
    toast({ title: "Pagamento Registrado", description: "Lembre-se de salvar a OS para efetivar." });
  };

  const handleRemovePayment = (id: string) => {
    setPaymentHistory(paymentHistory.filter(p => p.id !== id));
  };

  const handleAddItem = () => {
    setItems([...items, { productCode: '', desc: '', quantity: 1, unitValue: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);

    const docRef = order ? doc(firestore, 'orders', order.id) : doc(collection(firestore, 'orders'));
    const payload = {
      client, seller, status, emissionDate, deliveryDate, paymentMethod,
      installments, machine, observations, items, totalValue,
      amountPaid, balanceDue, paymentHistory,
      updatedAt: serverTimestamp(),
      ...(order ? {} : { createdAt: serverTimestamp(), id: docRef.id })
    };

    setDoc(docRef, payload, { merge: true })
      .then(() => {
        toast({ title: "Protocolo Administrativo Atualizado" });
        onClose();
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: order ? 'update' : 'create',
          requestResourceData: payload
        }));
      })
      .finally(() => setLoading(false));
  };

  if (!isOpen) return null;

  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-[#09090b] w-full max-w-5xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20"><Calculator size={20} /></div>
            <div>
              <span className="text-primary text-[9px] font-black uppercase tracking-[0.3em]">Gestão Administrativa VisComm</span>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">OS <span className="text-zinc-600">#{order?.id || 'NOVA'}</span></h2>
            </div>
          </div>
          <div className="hidden md:flex gap-6 items-center">
             <div className="text-right">
                <p className="text-[9px] text-zinc-500 uppercase font-black">Total</p>
                <p className="text-xl font-black text-white">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
             </div>
             <div className="w-px h-8 bg-zinc-800" />
             <div className="text-right">
                <p className="text-[9px] text-zinc-500 uppercase font-black">Saldo Devedor</p>
                <p className={cn("text-xl font-black", balanceDue > 0 ? "text-red-500" : "text-green-500")}>
                  {balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex bg-zinc-900/30 border-b border-zinc-800">
           <button onClick={() => setActiveTab('operacional')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'operacional' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500 hover:text-zinc-300")}>Operacional</button>
           <button onClick={() => setActiveTab('financeiro')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'financeiro' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500 hover:text-zinc-300")}>Financeiro e Pagamentos</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050505] space-y-8">
          <form id="adminOrderForm" onSubmit={handleSave}>
            {activeTab === 'operacional' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section className="space-y-4">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><User size={14}/> Identificação</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2">
                        <label className={labelClass}>Cliente / Parceiro</label>
                        <input required value={client} onChange={e => setClient(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Status Produção</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
                           {['Arte', 'Serralheria', 'Impressão', 'Acabamento', 'Instalação', 'Concluído'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Vendedor</label>
                        <input value={seller} onChange={e => setSeller(e.target.value)} className={inputClass} />
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Emissão</label>
                        <input type="date" value={emissionDate} onChange={e => setEmissionDate(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Prazo de Entrega</label>
                        <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass} />
                      </div>
                   </div>
                </section>

                <section className="space-y-4">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] flex items-center gap-2"><Box size={14}/> Itens e Orçamento</h3>
                      <button type="button" onClick={handleAddItem} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-3 py-1.5 text-[9px] font-black uppercase transition-all flex items-center gap-1"><Plus size={12}/> Adicionar Item</button>
                   </div>
                   <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                           <input placeholder="CÓD" value={item.productCode || ''} onChange={e => handleItemChange(index, 'productCode', e.target.value)} className={`${inputClass} md:col-span-1 p-2 text-center text-xs font-mono`} />
                           <input placeholder="Descrição..." value={item.desc || ''} onChange={e => handleItemChange(index, 'desc', e.target.value)} className={`${inputClass} md:col-span-5 p-2 text-xs`} />
                           <input type="number" value={item.quantity || 0} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className={`${inputClass} md:col-span-1 p-2 text-center text-xs`} />
                           <div className="md:col-span-2 relative">
                             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">R$</span>
                             <input type="number" step="0.01" value={item.unitValue || 0} onChange={e => handleItemChange(index, 'unitValue', Number(e.target.value))} className={`${inputClass} pl-7 p-2 text-right text-xs`} />
                           </div>
                           <div className="md:col-span-2 text-right font-mono text-xs font-black text-zinc-400 bg-black/20 p-2 rounded-lg border border-zinc-800">
                             {((item.quantity || 0) * (item.unitValue || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </div>
                           <button type="button" onClick={() => handleRemoveItem(index)} className="md:col-span-1 p-2 text-zinc-700 hover:text-red-500 ml-auto"><Trash2 size={14}/></button>
                        </div>
                      ))}
                   </div>
                </section>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <div className="lg:col-span-1 space-y-6">
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
                         <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><Wallet size={14}/> Lançar Recebimento</h3>
                         <div className="space-y-4">
                            <div>
                               <label className={labelClass}>Valor Recebido</label>
                               <input type="number" step="0.01" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className={inputClass} placeholder="0,00" />
                            </div>
                            <div>
                               <label className={labelClass}>Data do Pagamento</label>
                               <input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className={inputClass} />
                            </div>
                            <div>
                               <label className={labelClass}>Método / Conta</label>
                               <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className={inputClass}>
                                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                               </select>
                            </div>
                            <button type="button" onClick={handleAddPayment} className="w-full py-3 bg-primary text-black font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-white transition-all flex items-center justify-center gap-2">
                               <Plus size={14}/> Registrar Parcela
                            </button>
                         </div>
                      </div>
                   </div>

                   <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><History size={14}/> Extrato de Quitação</h3>
                      {paymentHistory.length === 0 ? (
                        <div className="py-12 border-2 border-dashed border-zinc-800 rounded-2xl text-center">
                           <Receipt className="mx-auto mb-3 text-zinc-700 opacity-20" size={32} />
                           <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Nenhum pagamento registrado</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                           {paymentHistory.map((p) => (
                             <div key={p.id} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-700 transition-all">
                                <div className="flex items-center gap-4">
                                   <div className="p-2 bg-zinc-800 rounded-lg"><CalendarIcon size={14} className="text-zinc-500"/></div>
                                   <div>
                                      <p className="text-xs font-bold text-white uppercase">{p.method}</p>
                                      <p className="text-[9px] text-zinc-500 font-mono">{new Date(p.date).toLocaleDateString('pt-BR')}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-6">
                                   <p className="text-sm font-black text-green-500 font-mono">{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                   <button type="button" onClick={() => handleRemovePayment(p.id)} className="p-2 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </section>
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800">Cancelar</button>
           <button form="adminOrderForm" type="submit" disabled={loading} className="px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)] disabled:opacity-50 flex items-center gap-2">
             {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Efetivar Registro</>}
           </button>
        </div>
      </motion.div>
    </div>
  );
}