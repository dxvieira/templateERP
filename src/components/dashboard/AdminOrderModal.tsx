
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
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
  const [fullCustomerData, setFullCustomerData] = useState<any>(null);
  
  // Nível 2 de Segurança Local
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
      } catch (error) {
        console.error("Erro ao carregar lista de clientes:", error);
      }
    };
    fetchClients();
  }, [firestore, isOpen]);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!order || !firestore) return;
      
      try {
        const clientsRef = collection(firestore, 'clients');
        const clientName = order.client || order.customerName || order.cliente;
        if (clientName) {
          const qName = query(clientsRef, where('name', '==', clientName));
          const snapName = await getDocs(qName);
          if (!snapName.empty) {
            setFullCustomerData(snapName.docs[0].data());
            return;
          }
          const qCompany = query(clientsRef, where('company', '==', clientName));
          const snapCompany = await getDocs(qCompany);
          if (!snapCompany.empty) {
            setFullCustomerData(snapCompany.docs[0].data());
          }
        }
      } catch (error) {
        console.error("Erro ao buscar dados completos do cliente:", error);
      }
    };
    
    if (isOpen && order) {
      fetchCustomerData();
    } else {
      setFullCustomerData(null);
    }
  }, [order, isOpen, firestore]);

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

  useEffect(() => {
    setInstallmentGenConfig(prev => ({ ...prev, total: totalValue }));
  }, [totalValue]);

  const amountPaid = useMemo(() => {
    return installments
      .filter(i => i.status === 'paid' || i.status === 'pago')
      .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [installments]);

  const balanceDue = totalValue - amountPaid;

  const filteredClients = useMemo(() => {
    if (!client) return [];
    const term = client.toLowerCase();
    return clientsList.filter(c => 
      (c.name || '').toLowerCase().includes(term) || 
      (c.company || '').toLowerCase().includes(term)
    ).slice(0, 5);
  }, [client, clientsList]);

  const handleGenerateInstallments = () => {
    if (genConfig.count <= 0) return;
    
    const total = Number(genConfig.total) || 0;
    const entrada = Number(genConfig.downPayment) || 0;
    const count = Number(genConfig.count) || 1;

    const saldoDevedor = total - entrada;
    const valuePerInstallment = Number((saldoDevedor / count).toFixed(2));
    
    const newInstallments = [];
    const hoje = new Date().toISOString().split('T')[0];
    const todayNormalized = startOfDay(new Date());

    if (entrada > 0) {
      newInstallments.push({
        id: "Entrada",
        uid: generateUid(),
        amount: entrada,
        due_date: hoje,
        status: 'paid',
        type: genConfig.type === 'Dinheiro/Pix' ? 'Dinheiro/Pix' : 'Pix',
        payment_method: "Caixa Interno",
        paid_date: hoje
      });
    }

    const start = parseISO(genConfig.startDate);

    for (let i = 0; i < count; i++) {
      const dueDateStr = format(addMonths(start, i), 'yyyy-MM-dd');
      const dueDateNormalized = startOfDay(parseISO(dueDateStr));
      
      newInstallments.push({
        id: `${i + 1}/${count}`,
        uid: generateUid(),
        amount: i === count - 1 ? (saldoDevedor - (valuePerInstallment * (count - 1))) : valuePerInstallment,
        due_date: dueDateStr,
        status: isBefore(dueDateNormalized, todayNormalized) ? 'overdue' : 'pending',
        type: genConfig.type,
        payment_method: genConfig.type === 'Cartão' ? genConfig.machine : '',
        paid_date: ''
      });
    }

    setInstallments(newInstallments);
    toast({ title: "Faturas Geradas" });
  };

  const handleToggleBaixa = (uid: string) => {
    const inst = installments.find(i => i.uid === uid);
    if (!inst) return;

    if (inst.status === 'paid') {
      setInstallments(installments.map(i => {
        if (i.uid !== uid) return i;
        const dDate = i.due_date || i.dueDate;
        let newStatus = 'pending';
        if (dDate) {
          try {
            const todayNormalized = startOfDay(new Date());
            const dueDateNormalized = startOfDay(parseISO(dDate));
            newStatus = isBefore(dueDateNormalized, todayNormalized) ? 'overdue' : 'pending';
          } catch (e) {}
        }
        return { ...i, status: newStatus, payment_method: '', paid_date: '' };
      }));
    } else {
      setBaixaData({ method: PAYMENT_METHODS[0], date: new Date().toISOString().split('T')[0] });
      setBaixaInstallmentUid(uid);
    }
  };

  const confirmBaixa = () => {
    if (!baixaInstallmentUid) return;
    setInstallments(installments.map(i => i.uid === baixaInstallmentUid ? { 
      ...i, 
      status: 'paid', 
      payment_method: baixaData.method, 
      paid_date: baixaData.date 
    } : i));
    setBaixaInstallmentUid(null);
  };

  const handleEmitNFe = async () => {
    if (!order?.id || !firestore) return;
    toast({ title: "Processando NFe", description: "Enviando para o SEFAZ..." });
    
    const orderRef = doc(firestore, 'orders', order.id);
    setDoc(orderRef, { nfe_status: 'processing' }, { merge: true }).then(() => {
      setTimeout(() => {
        setDoc(orderRef, {
          nfe_status: 'issued',
          nfe_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          nfe_xml_url: 'https://www.w3schools.com/xml/note.xml' 
        }, { merge: true });
        toast({ title: "Nota Emitida" });
      }, 2000);
    });
  };

  const handlePrintOP = () => {
    window.print();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);

    try {
      let finalId = order?.id;
      const isNewOrder = !order;

      if (isNewOrder) {
        const ordersRef = collection(firestore, 'orders');
        const q = query(ordersRef, orderBy('id', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let nextIdNumber = 1;
        if (!querySnapshot.empty) {
          const lastIdString = querySnapshot.docs[0].id;
          const lastIdInt = parseInt(lastIdString, 10);
          if (!isNaN(lastIdInt)) nextIdNumber = lastIdInt + 1;
        }
        finalId = String(nextIdNumber).padStart(6, '0');
      }

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

      setDoc(docRef, payload, { merge: true })
        .then(() => {
          toast({ title: "Registro Efetivado" });
          onClose();
        })
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: isNewOrder ? 'create' : 'update',
            requestResourceData: payload
          }));
        });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-[#09090b] w-full max-w-5xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden print:hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50 print:hidden">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20"><Calculator size={20} /></div>
            <div className="flex flex-col">
              <h2 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] leading-none mb-1.5">Terminal de Gestão</h2>
              <div className="relative w-32 h-8">
                <Image src="https://firebasestorage.googleapis.com/v0/b/studio-8015019704-68176.firebasestorage.app/o/logo%20IMPACTO.png?alt=media&token=c481fc0a-08b9-4613-bb67-d4052b3a39dd" alt="IMPACTO" fill className="object-contain object-left" />
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex gap-4 items-center">
             <button onClick={handlePrintOP} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-800 text-zinc-300 hover:bg-white hover:text-black transition-all"><Printer size={14} /> Imprimir OP</button>
             
             {/* Elementos Condicionais de Admin */}
             {isAdmin && (
               <div className="flex items-center gap-6 border-l border-zinc-800 pl-6 h-10">
                 <button onClick={handleEmitNFe} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"><FileText size={14} /><span className="text-[10px] font-black uppercase">Emitir NF-e</span></button>
                 <div className="text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-black">Saldo Devedor</p>
                    <p className={cn("text-xl font-black", balanceDue > 0 ? "text-red-500" : "text-emerald-500")}>{balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 </div>
               </div>
             )}
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full ml-4"><X size={20}/></button>
        </div>

        <div className="flex bg-zinc-900/30 border-b border-zinc-800">
           <button onClick={() => setActiveTab('operacional')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'operacional' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500 hover:text-zinc-300")}>Operacional</button>
           <button onClick={() => setActiveTab('financeiro')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'financeiro' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500 hover:text-zinc-300")}>Financeiro</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050505]">
          <form id="adminOrderForm" onSubmit={handleSave} className="space-y-8">
            {activeTab === 'operacional' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section className="space-y-4">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><User size={14}/> Identificação</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2 relative">
                        <label className={labelClass}>Cliente / Projeto</label>
                        <div className="relative group">
                          <input required autoComplete="off" placeholder="Digite ou busque um cliente..." value={client} onChange={e => { setClient(e.target.value); setShowClientDropdown(true); }} onFocus={() => setShowClientDropdown(true)} onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)} className={inputClass} />
                          <Search className="absolute right-3 top-[38px] text-zinc-700" size={16} />
                          <AnimatePresence>
                            {showClientDropdown && filteredClients.length > 0 && (
                              <motion.ul initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                                {filteredClients.map((c: any) => (
                                  <li key={c.id} onMouseDown={() => { setClient(c.name || c.company); setShowClientDropdown(false); }} className="px-4 py-3 hover:bg-primary hover:text-black cursor-pointer transition-colors border-b border-white/5 last:border-0">
                                    <p className="text-sm font-bold uppercase">{c.name}</p>
                                    {c.company && <p className="text-[10px] opacity-60 uppercase font-black">{c.company}</p>}
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </div>
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
                      <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] flex items-center gap-2"><Box size={14}/> Itens da Ordem</h3>
                      <button type="button" onClick={() => setItems([...items, { productCode: '', desc: '', quantity: 1, unitValue: 0, observation: '' }])} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-3 py-1.5 text-[9px] font-black uppercase transition-all flex items-center gap-1"><Plus size={12}/> Adicionar Item</button>
                   </div>
                   <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 group transition-all hover:border-zinc-700">
                           <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                              <div className="md:col-span-1"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Cód</label><input value={item.productCode || ''} onChange={e => { const n = [...items]; n[index].productCode = e.target.value; setItems(n); }} className={`${inputClass} p-2 text-center text-xs font-mono`} /></div>
                              <div className="md:col-span-5"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Descrição</label><input value={item.desc || ''} onChange={e => { const n = [...items]; n[index].desc = e.target.value; setItems(n); }} className={`${inputClass} p-2 text-xs`} /></div>
                              <div className="md:col-span-1"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Qtd</label><input type="number" value={item.quantity || 0} onChange={e => { const n = [...items]; n[index].quantity = Number(e.target.value); setItems(n); }} className={`${inputClass} p-2 text-center text-xs`} /></div>
                              <div className="md:col-span-2"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Unitário</label><input type="number" step="0.01" value={item.unitValue || 0} onChange={e => { const n = [...items]; n[index].unitValue = Number(e.target.value); setItems(n); }} className={`${inputClass} p-2 text-right text-xs`} /></div>
                              <div className="md:col-span-2"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Subtotal</label><div className="text-right font-mono text-xs font-black text-zinc-400 bg-black/20 p-2 rounded-lg border border-zinc-800">{((item.quantity || 0) * (item.unitValue || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div></div>
                              <div className="md:col-span-1 flex justify-end items-end h-full"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>
                           </div>
                           <textarea placeholder="Observações de produção..." value={item.observation || ''} onChange={e => { const n = [...items]; n[index].observation = e.target.value; setItems(n); }} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-400 text-[11px] rounded-xl p-3 focus:border-primary/50 outline-none transition-all resize-none" rows={2} />
                        </div>
                      ))}
                   </div>
                </section>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
                   <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-primary/10 rounded-xl"><RefreshCw size={18} className="text-primary"/></div><div><h3 className="text-sm font-black text-white uppercase tracking-tight">Cronograma Industrial</h3><p className="text-[9px] text-zinc-500 uppercase tracking-widest">Geração automática de faturas para o financeiro</p></div></div>
                   <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div><label className={labelClass}>Valor Total</label><div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-400 font-mono">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div></div>
                      <div><label className={labelClass}>Entrada (R$)</label><input type="number" step="0.01" value={genConfig.downPayment} onChange={e => setInstallmentGenConfig({...genConfig, downPayment: Number(e.target.value)})} className={inputClass} /></div>
                      <div><label className={labelClass}>Tipo</label><select value={genConfig.type} onChange={e => setInstallmentGenConfig({...genConfig, type: e.target.value})} className={inputClass}>{INSTALLMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className={labelClass}>Parcelas</label><input type="number" value={genConfig.count} onChange={e => setInstallmentGenConfig({...genConfig, count: Number(e.target.value)})} className={inputClass} min={1} /></div>
                      <button type="button" onClick={handleGenerateInstallments} className="bg-white text-black h-12 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary transition-all active:scale-95">Gerar</button>
                   </div>
                </section>
                <section className="space-y-4">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><History size={14}/> Recebíveis e Baixas</h3>
                   <div className="grid grid-cols-1 gap-2">
                      {installments.map((inst) => {
                        const isPaid = inst.status === 'paid' || inst.status === 'pago';
                        const isConfirming = baixaInstallmentUid === inst.uid;
                        return (
                          <div key={inst.uid} className={cn("flex flex-col rounded-2xl border transition-all overflow-hidden", isPaid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/40 border-zinc-800")}>
                             <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                   <button type="button" onClick={() => handleToggleBaixa(inst.uid)} className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", isPaid ? "bg-emerald-500 border-emerald-500 text-black" : "border-zinc-700 hover:border-primary")}>{isPaid && <CheckCircle2 size={14} strokeWidth={3} />}</button>
                                   <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-white">{inst.id}</span>
                                        <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded border", isPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500')}>
                                          {isPaid ? 'Liquidado' : 'Pendente'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{inst.due_date} &bull; {inst.type}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-6">
                                   <div className="text-right"><p className="text-sm font-black text-white font-mono">{inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>{isPaid && <p className="text-[8px] text-emerald-500 uppercase font-black">{inst.payment_method}</p>}</div>
                                   <button type="button" onClick={() => setInstallments(installments.filter(i => i.uid !== inst.uid))} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                </div>
                             </div>
                             <AnimatePresence>{isConfirming && (<motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-zinc-900 border-t border-white/5 p-4 flex gap-4 items-end"><div className="flex-1"><label className={labelClass}>Conta</label><select value={baixaData.method} onChange={e => setBaixaData({...baixaData, method: e.target.value})} className={inputClass}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div><button type="button" onClick={confirmBaixa} className="bg-primary text-black h-11 px-6 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-primary/20"><ArrowDownLeft size={14} className="mr-2 inline" /> Confirmar</button></motion.div>)}</AnimatePresence>
                          </div>
                        );
                      })}
                   </div>
                </section>
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row justify-end gap-3">
           <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800">Cancelar</button>
           <button form="adminOrderForm" type="submit" disabled={loading} className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)] disabled:opacity-50 flex items-center justify-center gap-2">{loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Gravar Registro</>}</button>
        </div>
      </motion.div>
    </div>
  );
}
