'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  X, Save, Plus, Trash2, Box, 
  User, CreditCard, DollarSign, 
  Calculator, Loader2,
  History, Calendar as CalendarIcon, Wallet, Receipt,
  CheckCircle2, AlertTriangle, RefreshCw, FileText,
  ArrowDownLeft, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { addMonths, format, parseISO } from 'date-fns';

const PAYMENT_METHODS = [
  "Caixa Interno",
  "SICOOB - Lindóia",
  "SICOOB - Serra Negra",
  "Máquina PAGBANK",
  "Máquina SIPAG"
];

const INSTALLMENT_TYPES = ["Boleto", "Cartão", "Dinheiro/Pix"];

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
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<any[]>([]);
  
  // FINANCIAL STATES (INSTALLMENTS)
  const [installments, setInstallments] = useState<any[]>([]);
  const [genConfig, setInstallmentGenConfig] = useState({
    total: 0,
    count: 1,
    type: "Boleto",
    startDate: new Date().toISOString().split('T')[0]
  });

  // BAIVA INLINE STATE
  const [baixaInstallmentUid, setBaixaInstallmentUid] = useState<string | null>(null);
  const [baixaData, setBaixaData] = useState({ method: PAYMENT_METHODS[0], date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (order) {
      setClient(order.client || '');
      setSeller(order.seller || '');
      setStatus(order.status || 'Arte');
      setEmissionDate(order.emissionDate || new Date().toISOString().split('T')[0]);
      setDeliveryDate(order.deliveryDate || '');
      setObservations(order.observations || '');
      setItems(order.items?.map((item: any) => ({ ...item })) || [{ productCode: '', desc: '', quantity: 1, unitValue: 0 }]);
      setInstallments(Array.isArray(order.installments) ? order.installments : []);
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
    setItems([{ productCode: '', desc: '', quantity: 1, unitValue: 0 }]);
    setInstallments([]);
  };

  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitValue || 0)), 0);
  }, [items]);

  useEffect(() => {
    setInstallmentGenConfig(prev => ({ ...prev, total: totalValue }));
  }, [totalValue]);

  const amountPaid = useMemo(() => {
    return installments
      .filter(i => i.status === 'paid')
      .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [installments]);

  const balanceDue = totalValue - amountPaid;

  const handleGenerateInstallments = () => {
    if (genConfig.count <= 0) return;
    
    const valuePerInstallment = Number((genConfig.total / genConfig.count).toFixed(2));
    const newInstallments = [];
    const start = parseISO(genConfig.startDate);

    for (let i = 0; i < genConfig.count; i++) {
      const dueDate = format(addMonths(start, i), 'yyyy-MM-dd');
      newInstallments.push({
        id: `${i + 1}/${genConfig.count}`,
        uid: crypto.randomUUID(),
        amount: i === genConfig.count - 1 ? (genConfig.total - (valuePerInstallment * (genConfig.count - 1))) : valuePerInstallment,
        dueDate,
        status: parseISO(dueDate) < new Date() ? 'overdue' : 'pending',
        type: genConfig.type,
        paymentMethod: '',
        paidDate: ''
      });
    }

    setInstallments(newInstallments);
    toast({ title: "Faturas Geradas", description: "O cronograma de pagamentos foi atualizado." });
  };

  const handleToggleBaixa = (uid: string) => {
    const inst = installments.find(i => i.uid === uid);
    if (!inst) return;

    if (inst.status === 'paid') {
      // Reverter Baixa
      setInstallments(installments.map(i => i.uid === uid ? { ...i, status: parseISO(i.dueDate) < new Date() ? 'overdue' : 'pending', paymentMethod: '', paidDate: '' } : i));
      toast({ title: "Pagamento Estornado", description: "A parcela voltou ao estado pendente." });
    } else {
      // Inteligência de UI: Pré-selecionar conta baseada no tipo
      let suggestedMethod = PAYMENT_METHODS[0]; // Caixa Interno
      if (inst.type === 'Cartão') suggestedMethod = "Máquina PAGBANK";
      else if (inst.type === 'Boleto') suggestedMethod = "SICOOB - Lindóia";

      setBaixaData({ method: suggestedMethod, date: new Date().toISOString().split('T')[0] });
      setBaixaInstallmentUid(uid);
    }
  };

  const confirmBaixa = () => {
    if (!baixaInstallmentUid) return;
    setInstallments(installments.map(i => i.uid === baixaInstallmentUid ? { 
      ...i, 
      status: 'paid', 
      paymentMethod: baixaData.method, 
      paidDate: baixaData.date 
    } : i));
    setBaixaInstallmentUid(null);
    toast({ title: "Recebimento Registrado", description: "Lembre-se de salvar a OS para efetivar no sistema." });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);

    const docRef = order ? doc(firestore, 'orders', order.id) : doc(collection(firestore, 'orders'));
    const payload = {
      client, seller, status, emissionDate, deliveryDate, observations, items, totalValue,
      amountPaid, balanceDue, installments,
      updatedAt: serverTimestamp(),
      ...(order ? {} : { createdAt: serverTimestamp(), id: docRef.id })
    };

    setDoc(docRef, payload, { merge: true })
      .then(() => {
        toast({ title: "Protocolo Atualizado" });
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
           <button onClick={() => setActiveTab('financeiro')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'financeiro' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500 hover:text-zinc-300")}>Financeiro e Cobrança</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050505]">
          <form id="adminOrderForm" onSubmit={handleSave} className="space-y-8">
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
                      <button type="button" onClick={() => setItems([...items, { productCode: '', desc: '', quantity: 1, unitValue: 0 }])} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-3 py-1.5 text-[9px] font-black uppercase transition-all flex items-center gap-1"><Plus size={12}/> Adicionar Item</button>
                   </div>
                   <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                           <input placeholder="CÓD" value={item.productCode || ''} onChange={e => { const n = [...items]; n[index].productCode = e.target.value; setItems(n); }} className={`${inputClass} md:col-span-1 p-2 text-center text-xs font-mono`} />
                           <input placeholder="Descrição..." value={item.desc || ''} onChange={e => { const n = [...items]; n[index].desc = e.target.value; setItems(n); }} className={`${inputClass} md:col-span-5 p-2 text-xs`} />
                           <input type="number" value={item.quantity || 0} onChange={e => { const n = [...items]; n[index].quantity = Number(e.target.value); setItems(n); }} className={`${inputClass} md:col-span-1 p-2 text-center text-xs`} />
                           <div className="md:col-span-2 relative">
                             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">R$</span>
                             <input type="number" step="0.01" value={item.unitValue || 0} onChange={e => { const n = [...items]; n[index].unitValue = Number(e.target.value); setItems(n); }} className={`${inputClass} pl-7 p-2 text-right text-xs`} />
                           </div>
                           <div className="md:col-span-2 text-right font-mono text-xs font-black text-zinc-400 bg-black/20 p-2 rounded-lg border border-zinc-800">
                             {((item.quantity || 0) * (item.unitValue || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </div>
                           <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="md:col-span-1 p-2 text-zinc-700 hover:text-red-500 ml-auto"><Trash2 size={14}/></button>
                        </div>
                      ))}
                   </div>
                </section>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* GERADOR DE PARCELAS */}
                <section className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary/10 rounded-xl"><RefreshCw size={18} className="text-primary"/></div>
                      <div>
                         <h3 className="text-sm font-black text-white uppercase tracking-tight">Gerador de Cobranças</h3>
                         <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Crie o cronograma de pagamentos automaticamente</p>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                         <label className={labelClass}>Valor Total</label>
                         <input type="number" step="0.01" value={genConfig.total} onChange={e => setInstallmentGenConfig({...genConfig, total: Number(e.target.value)})} className={inputClass} />
                      </div>
                      <div>
                         <label className={labelClass}>Tipo de Fatura</label>
                         <select value={genConfig.type} onChange={e => setInstallmentGenConfig({...genConfig, type: e.target.value})} className={inputClass}>
                            {INSTALLMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className={labelClass}>Nº Parcelas</label>
                         <input type="number" value={genConfig.count} onChange={e => setInstallmentGenConfig({...genConfig, count: Number(e.target.value)})} className={inputClass} min={1} />
                      </div>
                      <button type="button" onClick={handleGenerateInstallments} className="bg-white text-black h-12 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary transition-all shadow-lg active:scale-95">Gerar Parcelas</button>
                   </div>
                </section>

                {/* LISTA DE PARCELAS */}
                <section className="space-y-4">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><History size={14}/> Cronograma de Recebíveis</h3>
                   
                   <div className="grid grid-cols-1 gap-2">
                      {installments.length === 0 ? (
                        <div className="py-12 border-2 border-dashed border-zinc-800 rounded-3xl text-center">
                           <Receipt className="mx-auto mb-3 text-zinc-700 opacity-20" size={40} />
                           <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Nenhuma parcela gerada para este projeto</p>
                        </div>
                      ) : (
                        installments.map((inst) => {
                          const isOverdue = inst.status === 'overdue';
                          const isPaid = inst.status === 'paid';
                          const isConfirming = baixaInstallmentUid === inst.uid;

                          return (
                            <div key={inst.uid} className={cn(
                              "flex flex-col rounded-2xl border transition-all overflow-hidden",
                              isPaid ? "bg-emerald-500/5 border-emerald-500/20" : 
                              isOverdue ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700",
                              isConfirming && "border-primary/50 ring-1 ring-primary/20"
                            )}>
                               <div className="flex items-center justify-between p-4">
                                  <div className="flex items-center gap-4">
                                     <button 
                                       type="button" 
                                       onClick={() => handleToggleBaixa(inst.uid)}
                                       className={cn(
                                         "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                         isPaid ? "bg-emerald-500 border-emerald-500 text-black" : "border-zinc-700 hover:border-primary"
                                       )}
                                     >
                                       {isPaid && <CheckCircle2 size={14} strokeWidth={3} />}
                                     </button>
                                     <div>
                                        <div className="flex items-center gap-2">
                                           <span className="text-xs font-black text-white">{inst.id}</span>
                                           <span className={cn(
                                             "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
                                             isPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                             isOverdue ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                           )}>
                                             {isPaid ? 'Liquidado' : isOverdue ? 'Atrasado' : 'Pendente'}
                                           </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{inst.type} • Vencimento: {format(parseISO(inst.dueDate), 'dd/MM/yy')}</p>
                                     </div>
                                  </div>

                                  <div className="flex items-center gap-6">
                                     <div className="text-right">
                                        <p className="text-sm font-black text-white font-mono">{inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        {isPaid && <p className="text-[8px] text-emerald-500 uppercase font-black">{inst.paymentMethod}</p>}
                                     </div>
                                     <button type="button" onClick={() => setInstallments(installments.filter(i => i.uid !== inst.uid))} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                  </div>
                               </div>

                               {/* ÁREA DE CONFIRMAÇÃO DE BAIXA INLINE */}
                               <AnimatePresence>
                                 {isConfirming && (
                                   <motion.div 
                                     initial={{ height: 0, opacity: 0 }} 
                                     animate={{ height: 'auto', opacity: 1 }} 
                                     exit={{ height: 0, opacity: 0 }}
                                     className="bg-zinc-900 border-t border-primary/20 p-4"
                                   >
                                      <div className="flex flex-col md:flex-row gap-4 items-end">
                                         <div className="flex-1 w-full">
                                            <label className={labelClass}>Conta de Destino</label>
                                            <select 
                                              value={baixaData.method} 
                                              onChange={e => setBaixaData({...baixaData, method: e.target.value})} 
                                              className={inputClass}
                                            >
                                               {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                         </div>
                                         <div className="w-full md:w-48">
                                            <label className={labelClass}>Data do Recebimento</label>
                                            <input 
                                              type="date" 
                                              value={baixaData.date} 
                                              onChange={e => setBaixaData({...baixaData, date: e.target.value})} 
                                              className={inputClass} 
                                            />
                                         </div>
                                         <div className="flex gap-2 w-full md:w-auto">
                                            <button 
                                              type="button" 
                                              onClick={() => setBaixaInstallmentUid(null)} 
                                              className="flex-1 md:px-4 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest transition-colors"
                                            >
                                              Cancelar
                                            </button>
                                            <button 
                                              type="button" 
                                              onClick={confirmBaixa} 
                                              className="flex-1 md:px-6 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(255,95,31,0.3)] hover:bg-white transition-all flex items-center justify-center gap-2"
                                            >
                                              <ArrowDownLeft size={14} /> Confirmar Baixa
                                            </button>
                                         </div>
                                      </div>
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                            </div>
                          );
                        })
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