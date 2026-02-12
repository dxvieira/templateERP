'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  X, Save, Plus, Trash2, Box, FileText, 
  User, CreditCard, DollarSign, 
  Calculator, Briefcase, Percent, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const PAYMENT_METHODS = ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Faturado'];
const CARD_MACHINES = ['PAGBANK', 'SIPAG/SICOOB'];

interface AdminOrderModalProps {
  order?: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminOrderModal({ order, isOpen, onClose }: AdminOrderModalProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [client, setClient] = useState('');
  const [seller, setSeller] = useState('');
  const [status, setStatus] = useState('Arte');
  const [emissionDate, setEmissionDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [installments, setInstallments] = useState(1);
  const [machine, setMachine] = useState('');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (order) {
      setClient(order.client || '');
      setSeller(order.seller || '');
      setStatus(order.status || 'Arte');
      setEmissionDate(order.emissionDate || new Date().toISOString().split('T')[0]);
      setDeliveryDate(order.deliveryDate || '');
      setPaymentMethod(order.paymentMethod || 'PIX');
      setInstallments(order.installments || 1);
      setMachine(order.machine || '');
      setObservations(order.observations || '');
      setItems(order.items?.map((item: any) => ({ ...item })) || [{ productCode: '', desc: '', quantity: 1, unitValue: 0 }]);
    } else {
      setClient('');
      setSeller('');
      setStatus('Arte');
      setEmissionDate(new Date().toISOString().split('T')[0]);
      setDeliveryDate('');
      setPaymentMethod('PIX');
      setInstallments(1);
      setMachine('');
      setObservations('');
      setItems([{ productCode: '', desc: '', quantity: 1, unitValue: 0 }]);
    }
  }, [order, isOpen]);

  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitValue || 0)), 0);
  }, [items]);

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
      installments: paymentMethod === 'Cartão de Crédito' ? installments : 1,
      machine: paymentMethod === 'Cartão de Crédito' ? machine : '',
      observations, items, totalValue,
      updatedAt: serverTimestamp(),
      ...(order ? {} : { createdAt: serverTimestamp(), id: docRef.id })
    };

    setDoc(docRef, payload, { merge: true })
      .then(() => {
        toast({ title: "Registro Administrativo Salvo" });
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
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-[#09090b] w-full max-w-5xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl border border-emerald-500/20"><Calculator size={20} /></div>
            <div>
              <span className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.3em]">Painel de Controle Financeiro</span>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Gestão de Protocolo <span className="text-zinc-600">#{order?.id || 'NOVO'}</span></h2>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end">
             <p className="text-[9px] text-zinc-500 uppercase font-black">Total Contratado</p>
             <p className="text-3xl font-black text-emerald-400">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050505] space-y-8">
          <form id="adminOrderForm" onSubmit={handleSave} className="space-y-8">
            <section className="space-y-4">
               <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><User size={14}/> Identificação</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label className={labelClass}>Cliente / Parceiro</label>
                    <input required value={client} onChange={e => setClient(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Responsável Venda</label>
                    <input value={seller} onChange={e => setSeller(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Status Produção</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
                       {['Arte', 'Serralheria', 'Impressão', 'Acabamento', 'Instalação', 'Concluído'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Data Emissão</label>
                    <input type="date" value={emissionDate} onChange={e => setEmissionDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Prazo Entrega</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass} />
                  </div>
               </div>
            </section>

            <section className="space-y-4">
               <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] flex items-center gap-2"><Box size={14}/> Itens e Valores</h3>
                  <button type="button" onClick={handleAddItem} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-3 py-1.5 text-[9px] font-black uppercase transition-all flex items-center gap-1"><Plus size={12}/> Adicionar</button>
               </div>
               <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                       <input placeholder="CÓD" value={item.productCode} onChange={e => handleItemChange(index, 'productCode', e.target.value)} className={`${inputClass} md:col-span-1 p-2 text-center text-xs font-mono`} />
                       <input placeholder="Descrição..." value={item.desc} onChange={e => handleItemChange(index, 'desc', e.target.value)} className={`${inputClass} md:col-span-5 p-2 text-xs`} />
                       <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className={`${inputClass} md:col-span-1 p-2 text-center text-xs`} />
                       <div className="md:col-span-2 relative">
                         <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">R$</span>
                         <input type="number" step="0.01" value={item.unitValue} onChange={e => handleItemChange(index, 'unitValue', e.target.value)} className={`${inputClass} pl-7 p-2 text-right text-xs text-emerald-400`} />
                       </div>
                       <div className="md:col-span-2 text-right font-mono text-xs font-black text-zinc-400 bg-black/20 p-2 rounded-lg border border-zinc-800">
                         {(item.quantity * item.unitValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                       </div>
                       <button type="button" onClick={() => handleRemoveItem(index)} className="md:col-span-1 p-2 text-zinc-700 hover:text-red-500 ml-auto"><Trash2 size={14}/></button>
                    </div>
                  ))}
               </div>
            </section>

            <section className="bg-zinc-900/20 border border-zinc-800 rounded-2xl p-5 space-y-6">
               <h3 className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><DollarSign size={14}/> Financeiro</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Método</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputClass}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {paymentMethod === 'Cartão de Crédito' && (
                    <>
                      <div>
                        <label className={labelClass}>Parcelas</label>
                        <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className={inputClass}>
                          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}x</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Terminal</label>
                        <select value={machine} onChange={e => setMachine(e.target.value)} className={inputClass}>
                          <option value="">Selecione...</option>
                          {CARD_MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </>
                  )}
               </div>
            </section>
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800">Cancelar</button>
           <button form="adminOrderForm" type="submit" disabled={loading} className="px-10 py-3 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(16,185,129,0.5)] disabled:opacity-50 flex items-center gap-2">
             {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Efetivar Protocolo</>}
           </button>
        </div>
      </motion.div>
    </div>
  );
}