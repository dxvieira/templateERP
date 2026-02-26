'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, serverTimestamp, collection, updateDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  X, Save, Plus, Trash2, Box, 
  User, CreditCard, DollarSign, 
  Calculator, Loader2,
  History, Calendar as CalendarIcon, Wallet, Receipt,
  CheckCircle2, AlertTriangle, RefreshCw, FileText,
  ArrowDownLeft, ArrowRight, Download, Printer,
  MapPin, Phone, FileBadge
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
    startDate: new Date().toISOString().split('T')[0],
    machine: "Máquina PAGBANK"
  });

  // BAIXA INLINE STATE
  const [baixaInstallmentUid, setBaixaInstallmentUid] = useState<string | null>(null);
  const [baixaData, setBaixaData] = useState({ method: PAYMENT_METHODS[0], date: new Date().toISOString().split('T')[0] });

  // BUSCA DADOS COMPLETOS DO CLIENTE PARA A OP (ALGORITMO AVANÇADO)
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!order || !firestore) return;
      
      try {
        const clientsRef = collection(firestore, 'clients');
        
        // TENTATIVA 1: Busca direta pelo ID (Mais rápido e preciso)
        const clientId = order.clientId || order.customerId || order.clienteId || order.id_cliente;
        if (clientId) {
          const clientSnap = await getDoc(doc(firestore, 'clients', clientId));
          if (clientSnap.exists()) {
            setFullCustomerData(clientSnap.data());
            return; // Encontrado via ID
          }
        }
        
        // TENTATIVA 2: Busca por nome (Caso a OS tenha apenas a string do nome salva)
        const clientName = order.client || order.customerName || order.cliente;
        if (clientName) {
          // Tenta buscar pela key 'name'
          const qName = query(clientsRef, where('name', '==', clientName));
          const snapName = await getDocs(qName);
          
          if (!snapName.empty) {
            setFullCustomerData(snapName.docs[0].data());
            return;
          }
          
          // Tenta buscar pela key 'company' (Razão Social)
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
        uid: generateUid(),
        amount: i === genConfig.count - 1 ? (genConfig.total - (valuePerInstallment * (genConfig.count - 1))) : valuePerInstallment,
        due_date: dueDate,
        status: parseISO(dueDate) < new Date() ? 'overdue' : 'pending',
        type: genConfig.type,
        payment_method: genConfig.type === 'Cartão' ? genConfig.machine : '',
        paid_date: ''
      });
    }

    setInstallments(newInstallments);
    toast({ title: "Faturas Geradas", description: "O cronograma de pagamentos foi atualizado." });
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
            newStatus = parseISO(dDate) < new Date() ? 'overdue' : 'pending';
          } catch (e) {}
        }
        return { 
          ...i, 
          status: newStatus, 
          payment_method: '', 
          paid_date: '' 
        };
      }));
      toast({ title: "Pagamento Estornado", description: "A parcela voltou ao estado pendente." });
    } else {
      let suggestedMethod = PAYMENT_METHODS[0];
      if (inst.type === 'Cartão') suggestedMethod = inst.payment_method || "Máquina PAGBANK";
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
      payment_method: baixaData.method, 
      paid_date: baixaData.date 
    } : i));
    setBaixaInstallmentUid(null);
    toast({ title: "Recebimento Registrado", description: "Lembre-se de salvar a OS para efetivar no sistema." });
  };

  const handleEmitNFe = async () => {
    if (!order || !order.id || !firestore) return;
    
    const confirmar = window.confirm("Deseja simular a emissão desta Nota Fiscal?");
    if (!confirmar) return;

    try {
      const orderRef = doc(firestore, 'orders', order.id);
      
      // 1. Muda para processando (Botão Amarelo)
      await updateDoc(orderRef, { nfe_status: 'processing' });
      
      // 2. Simula o tempo de latência da SEFAZ (3 segundos)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3. Conclui a emissão (Botão Verde e Azul) e injeta arquivos de teste
      await updateDoc(orderRef, {
        nfe_status: 'issued',
        nfe_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        nfe_xml_url: 'https://www.w3schools.com/xml/note.xml' 
      });
      
      toast({ 
        title: "Nota Emitida", 
        description: "A simulação de faturamento foi concluída com sucesso." 
      });
    } catch (error: any) {
      console.error("Erro ao simular emissão de NFe:", error);
      alert("Erro no banco de dados: " + error.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);

    const docRef = order ? doc(firestore, 'orders', order.id) : doc(collection(firestore, 'orders'));
    
    const payload = {
      client, 
      seller, 
      status, 
      emission_date: emissionDate, 
      delivery_date: deliveryDate, 
      observations, 
      items, 
      total_value: totalValue,
      amount_paid: amountPaid, 
      balance_due: balanceDue, 
      installments,
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
      {/* MODAL VISÍVEL NO SISTEMA */}
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-[#09090b] w-full max-w-5xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden print:hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20"><Calculator size={20} /></div>
            <div>
              <span className="text-primary text-[9px] font-black uppercase tracking-[0.3em]">Gestão Administrativa VisComm</span>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">OS <span className="text-zinc-600">#{order?.id || 'NOVA'}</span></h2>
            </div>
          </div>
          
          <div className="hidden md:flex gap-4 items-center">
             <button
               onClick={() => window.print()}
               className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-800 text-zinc-300 hover:bg-white hover:text-black transition-all"
             >
               <Printer size={14} /> IMPRIMIR OP
             </button>

             {order && (
               <div className="flex items-center mr-4 border-r border-zinc-800 pr-6 h-10 gap-2">
                 {(!order.nfe_status || order.nfe_status === 'pending') && (
                   <button 
                     onClick={handleEmitNFe}
                     className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700 text-zinc-400 rounded-xl hover:bg-white hover:text-black transition-all group"
                     title="Enviar para Faturamento Focus NFe"
                   >
                     <FileText size={14} className="group-hover:rotate-12 transition-transform" />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Emitir NFe</span>
                   </button>
                 )}

                 {order.nfe_status === 'processing' && (
                   <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-xl cursor-wait">
                     <Loader2 size={14} className="animate-spin" />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Processando...</span>
                   </div>
                 )}

                 {order.nfe_status === 'issued' && (
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => window.open(order.nfe_pdf_url || order.nfe_url, '_blank')}
                       className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                       title="Baixar DANFE (PDF)"
                     >
                       <Download size={14} />
                       <span className="text-[9px] font-black uppercase tracking-widest">PDF</span>
                     </button>

                     <button
                       onClick={() => window.open(order.nfe_xml_url, '_blank')}
                       className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-white transition-all"
                       title="Baixar XML"
                     >
                       <FileText size={14} />
                       <span className="text-[9px] font-black uppercase tracking-widest">XML</span>
                     </button>
                   </div>
                 )}
               </div>
             )}

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
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full ml-4"><X size={20}/></button>
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
                <section className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary/10 rounded-xl"><RefreshCw size={18} className="text-primary"/></div>
                      <div>
                         <h3 className="text-sm font-black text-white uppercase tracking-tight">Gerador de Cobranças</h3>
                         <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Crie o cronograma de pagamentos automaticamente</p>
                      </div>
                   </div>
                   
                   <div className={cn("grid gap-4 items-end", genConfig.type === 'Cartão' ? "grid-cols-1 md:grid-cols-5" : "grid-cols-1 md:grid-cols-4")}>
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
                      
                      {genConfig.type === 'Cartão' && (
                        <div>
                           <label className={labelClass}>Máquina</label>
                           <select 
                             value={genConfig.machine} 
                             onChange={e => setInstallmentGenConfig({...genConfig, machine: e.target.value})} 
                             className={inputClass}
                           >
                              <option value="Máquina PAGBANK">Máquina PAGBANK</option>
                              <option value="Máquina SIPAG">Máquina SIPAG</option>
                           </select>
                        </div>
                      )}

                      <div>
                         <label className={labelClass}>Nº Parcelas</label>
                         <input type="number" value={genConfig.count} onChange={e => setInstallmentGenConfig({...genConfig, count: Number(e.target.value)})} className={inputClass} min={1} />
                      </div>
                      <button type="button" onClick={handleGenerateInstallments} className="bg-white text-black h-12 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary transition-all shadow-lg active:scale-95">Gerar Parcelas</button>
                   </div>
                </section>

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
                          const dueDateStr = inst.due_date || inst.dueDate;

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
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                          {inst.type} • Vencimento: {dueDateStr ? format(parseISO(dueDateStr), 'dd/MM/yy') : '--/--/--'}
                                        </p>
                                     </div>
                                  </div>

                                  <div className="flex items-center gap-6">
                                     <div className="text-right">
                                        <p className="text-sm font-black text-white font-mono">{inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        {(isPaid || inst.payment_method) && <p className="text-[8px] text-emerald-500 uppercase font-black">{inst.payment_method}</p>}
                                     </div>
                                     <button type="button" onClick={() => setInstallments(installments.filter(i => i.uid !== inst.uid))} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                  </div>
                               </div>

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

      {/* ========================================== */}
      {/* LAYOUT DE IMPRESSÃO - ORDEM DE PRODUÇÃO    */}
      {/* ========================================== */}
      <div className="hidden print:block fixed inset-0 z-[99999] bg-white text-black p-8 font-sans w-full h-full overflow-y-auto">
        
        {/* CABEÇALHO COMPACTO */}
        <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
          <div className="w-32 h-12 bg-gray-100 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500 font-bold rounded text-[10px] uppercase">
            [ LOGO ]
          </div>
          <div className="text-right">
            <h1 className="text-xl font-black uppercase tracking-widest leading-none">Ordem de Produção</h1>
            <p className="text-lg font-bold mt-1">OS #{order?.id || '000000'}</p>
          </div>
        </div>

        {/* DADOS DO CLIENTE E DATAS (MAPEAMENTO INTELIGENTE) */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-3 border-2 border-black p-3 rounded-lg">
            <h2 className="font-bold text-[9px] uppercase text-gray-500 mb-1 tracking-wider">Dados do Parceiro / Cliente</h2>
            <p className="font-black text-lg uppercase leading-tight">
              {fullCustomerData?.name || fullCustomerData?.company || fullCustomerData?.nome || client || 'Nome não informado'}
            </p>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
              <p className="flex gap-1 items-center">
                <FileBadge size={10} /> 
                <strong>Doc:</strong> {
                  fullCustomerData?.cpfCnpj || fullCustomerData?.cnpj || fullCustomerData?.cpf || fullCustomerData?.documento || fullCustomerData?.document || '_________________'
                }
              </p>
              <p className="flex gap-1 items-center">
                <Phone size={10} /> 
                <strong>Tel:</strong> {
                  fullCustomerData?.mobile || fullCustomerData?.landline || fullCustomerData?.telefone || fullCustomerData?.phone || order?.customerPhone || '_________________'
                }
              </p>
              <p className="col-span-2 flex gap-1 items-start">
                <MapPin size={10} className="mt-0.5 shrink-0" /> 
                <span>
                  <strong>Endereço:</strong> {
                    (fullCustomerData?.address || fullCustomerData?.street || fullCustomerData?.endereco || fullCustomerData?.rua) ? 
                    `${fullCustomerData?.street || fullCustomerData?.address || fullCustomerData?.endereco}, ${fullCustomerData?.number || fullCustomerData?.numero || 'S/N'} ${fullCustomerData?.complemento ? '(' + fullCustomerData.complemento + ')' : ''} - ${fullCustomerData?.neighborhood || fullCustomerData?.bairro || ''} ${fullCustomerData?.city || fullCustomerData?.cidade || ''}` 
                    : (order?.customerAddress || order?.endereco || '______________________________________________________________')
                  }
                </span>
              </p>
            </div>
          </div>
          
          <div className="col-span-1 flex flex-col gap-2">
            <div className="bg-gray-100 p-2 rounded border border-gray-300 text-center">
              <label className="text-[8px] font-black text-gray-500 uppercase block">Emissão</label>
              <p className="text-sm font-bold">{emissionDate ? format(parseISO(emissionDate), 'dd/MM/yyyy') : '--/--/--'}</p>
            </div>
            <div className="bg-black text-white p-2 rounded text-center">
              <label className="text-[8px] font-black text-gray-400 uppercase block">Entrega</label>
              <p className="text-sm font-bold">{deliveryDate ? format(parseISO(deliveryDate), 'dd/MM/yyyy') : 'IMEDIATO'}</p>
            </div>
          </div>
        </div>

        {/* FICHA TÉCNICA - ITENS */}
        <div className="mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2 flex items-center gap-2">
            <Box size={12} className="text-black" /> Descrição dos Serviços e Materiais
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-2 text-left text-[9px] font-black uppercase tracking-widest rounded-tl">Qtd</th>
                <th className="p-2 text-left text-[9px] font-black uppercase tracking-widest">Cód</th>
                <th className="p-2 text-left text-[9px] font-black uppercase tracking-widest">Especificação Técnica</th>
                <th className="p-2 text-center text-[9px] font-black uppercase tracking-widest rounded-tr">Conferência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 border-x border-b border-gray-300">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-3 font-black text-lg border-r border-gray-200 w-12 text-center">{item.quantity || 0}</td>
                  <td className="p-3 font-mono text-[10px] text-gray-400 border-r border-gray-200 w-16">{item.productCode || '--'}</td>
                  <td className="p-3 text-sm font-bold uppercase leading-tight">{item.desc || 'Item de produção padrão'}</td>
                  <td className="p-3 border-l border-gray-200 w-20">
                    <div className="w-6 h-6 border-2 border-gray-200 rounded mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* OBSERVAÇÕES TÉCNICAS */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Notas de Produção</h3>
            <div className="min-h-[100px] p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-xs leading-relaxed text-gray-700 italic">
              {observations || 'Nenhuma nota técnica específica anexada a este protocolo.'}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2 text-center">Fluxo / Etapa</h3>
            <div className="space-y-1.5 px-4">
              {['Arte Final', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação'].map(stage => (
                <div key={stage} className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-gray-400 rounded" />
                  <span className="text-[9px] font-bold uppercase text-gray-600">{stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RODAPÉ E ASSINATURAS */}
        <div className="mt-auto pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-12 text-center">
            <div className="space-y-1">
              <div className="h-[1px] bg-black w-full" />
              <p className="text-[9px] font-black uppercase tracking-widest">Responsável Produção</p>
            </div>
            <div className="space-y-1">
              <div className="h-[1px] bg-black w-full" />
              <p className="text-[9px] font-black uppercase tracking-widest">Conferência de Qualidade</p>
            </div>
          </div>
          <div className="flex justify-between items-end mt-8 opacity-30 grayscale">
            <div className="text-[7px] font-bold uppercase tracking-[0.4em]">VisComm • Cloud Command Center</div>
            <div className="text-[7px] font-mono">EMISSÃO: {new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}