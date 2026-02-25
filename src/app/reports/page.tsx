'use client';

import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Wallet, Target, AlertCircle, 
  Download, Plus, Search, Trash2, Calendar, 
  Loader2, X, Wallet2, CheckCircle2, Receipt, 
  ArrowRight, CreditCard, Box, Factory
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ReportsManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // --- ESTADOS DE CONTROLE ---
  const [activeTab, setActiveTab] = useState<'FLUXO' | 'CONTAS'>('FLUXO');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  
  // Modais
  const [isCashflowModalOpen, setIsCashflowModalOpen] = useState(false);
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulário Fluxo Manual
  const [cashflowFormData, setCashflowFormData] = useState({
    description: '', amount: '', type: 'income', date: format(new Date(), 'yyyy-MM-dd')
  });

  // Formulário Contas a Pagar
  const [payableFormData, setPayableFormData] = useState({
    supplier: '', description: '', category: 'Suprimentos', amountTotal: '', installments: 1, method: 'Boleto'
  });
  const [previewInstallments, setPreviewInstallments] = useState<any[]>([]);

  // --- BUSCA DE DADOS ---
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'));
  }, [firestore, user]);

  const cashflowQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'cashflow_manual'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const payablesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'accounts_payable'), orderBy('dueDate', 'asc'));
  }, [firestore, user]);

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);
  const { data: cashflowManual, isLoading: cashflowLoading } = useCollection(cashflowQuery);
  const { data: payables, isLoading: payablesLoading } = useCollection(payablesQuery);

  // --- MOTOR DE FUSÃO: CONSOLIDAÇÃO DE DADOS ---
  const { transactions, kpis } = useMemo(() => {
    const fusion: any[] = [];
    let monthIncomes = 0;
    let monthExpenses = 0;
    let globalReceivable = 0;
    let totalPayables = 0;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // 1. Processar Pedidos (Faturamento Automático)
    orders?.forEach(order => {
      const totalVal = Number(order.total_value || order.totalValue || 0);
      const paidVal = Number(order.amount_paid || order.amountPaid || 0);
      
      // Saldo a receber global (Ignora mês)
      if (order.status !== 'Entregue') {
        globalReceivable += Math.max(0, totalVal - paidVal);
      }

      const installments = Array.isArray(order.installments) ? order.installments : [];
      installments.forEach((inst: any) => {
        if (inst?.status === 'paid' && inst.paid_date) {
          try {
            const paidDate = parseISO(inst.paid_date);
            if (isWithinInterval(paidDate, { start: startDate, end: endDate })) {
              const amount = Number(inst.amount) || 0;
              monthIncomes += amount;
              fusion.push({
                id: `${order.id}-${inst.uid || Math.random()}`,
                date: inst.paid_date,
                description: `OS #${order.id.slice(-6)} - ${order.client}`,
                type: 'income',
                amount: amount,
                origin: 'SISTEMA (OS)',
                originalId: order.id
              });
            }
          } catch (e) {}
        }
      });
    });

    // 2. Processar Fluxo Manual
    cashflowManual?.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: startDate, end: endDate })) {
          const amount = Number(entry.amount) || 0;
          if (entry.type === 'income') monthIncomes += amount;
          else monthExpenses += amount;

          fusion.push({
            id: entry.id,
            date: entry.date,
            description: entry.description,
            type: entry.type,
            amount: amount,
            origin: 'MANUAL'
          });
        }
      } catch (e) {}
    });

    // 3. Processar Contas a Pagar (KPI Pendentes)
    payables?.forEach(payable => {
      if (payable.status !== 'paid') {
        totalPayables += Number(payable.amount) || 0;
      }
    });

    fusion.sort((a, b) => b.date.localeCompare(a.date));

    return {
      transactions: fusion,
      kpis: {
        incomes: monthIncomes,
        expenses: monthExpenses,
        net: monthIncomes - monthExpenses,
        receivables: globalReceivable,
        payables: totalPayables
      }
    };
  }, [orders, cashflowManual, payables, selectedMonth]);

  // --- FUNÇÕES DE AÇÃO ---

  const handleGenerateInstallments = () => {
    const total = Number(payableFormData.amountTotal);
    const count = Number(payableFormData.installments);
    if (!total || count < 1) return;

    const valuePerInstallment = Number((total / count).toFixed(2));
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        dueDate: format(addMonths(new Date(), i), 'yyyy-MM-dd'),
        amount: i === count - 1 ? (total - (valuePerInstallment * (count - 1))) : valuePerInstallment
      });
    }
    setPreviewInstallments(list);
  };

  const handleSavePayables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || previewInstallments.length === 0) return;
    setIsSubmitting(true);

    try {
      for (const inst of previewInstallments) {
        await addDoc(collection(firestore, 'accounts_payable'), {
          supplier: payableFormData.supplier,
          description: payableFormData.description,
          category: payableFormData.category,
          amount: Number(inst.amount),
          dueDate: inst.dueDate,
          status: 'pending',
          method: payableFormData.method,
          createdAt: serverTimestamp(),
          userId: user.uid
        });
      }
      toast({ title: "Contas Registradas", description: `${previewInstallments.length} parcelas adicionadas.` });
      setIsPayableModalOpen(false);
      setPreviewInstallments([]);
    } catch (e) {
      toast({ variant: 'destructive', title: "Erro ao salvar" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayAccount = async (account: any) => {
    if (!firestore || !user) return;
    if (!window.confirm(`Confirmar pagamento de R$ ${account.amount.toFixed(2)} para ${account.supplier}?`)) return;

    try {
      // 1. Atualizar conta para paga
      await updateDoc(doc(firestore, 'accounts_payable', account.id), {
        status: 'paid',
        paidAt: serverTimestamp()
      });

      // 2. Injetar saída no fluxo de caixa manual
      await addDoc(collection(firestore, 'cashflow_manual'), {
        description: `PGTO: ${account.supplier} (${account.description})`,
        amount: account.amount,
        type: 'expense',
        date: format(new Date(), 'yyyy-MM-dd'),
        origin: 'PAGAMENTO CONTA',
        createdAt: serverTimestamp(),
        userId: user.uid
      });

      toast({ title: "Baixa Confirmada", description: "O valor foi debitado do fluxo de caixa." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erro ao dar baixa" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !firestore) return;
    const collectionName = itemToDelete.supplier ? 'accounts_payable' : 'cashflow_manual';
    
    try {
      await deleteDoc(doc(firestore, collectionName, itemToDelete.id));
      setItemToDelete(null);
      toast({ title: "Registro Removido" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erro ao excluir" });
    }
  };

  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'cashflow_manual'), {
        ...cashflowFormData,
        amount: Number(cashflowFormData.amount),
        createdAt: serverTimestamp(),
        userId: user.uid
      });
      toast({ title: "Lançamento Efetuado" });
      setIsCashflowModalOpen(false);
      setCashflowFormData({ ...cashflowFormData, description: '', amount: '' });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erro ao salvar" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (ordersLoading || cashflowLoading || payablesLoading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative z-10">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Wallet size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Command Center Finance</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Resultados</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative group flex-1 md:flex-initial">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-black uppercase outline-none focus:border-primary transition-all"
                />
             </div>
             <button 
               onClick={() => activeTab === 'FLUXO' ? setIsCashflowModalOpen(true) : setIsPayableModalOpen(true)}
               className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all"
             >
               <Plus size={16} strokeWidth={3} /> {activeTab === 'FLUXO' ? 'Novo Lançamento' : 'Nova Conta'}
             </button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard label="Entradas" value={kpis.incomes} color="text-emerald-500" icon={TrendingUp} />
          <KPICard label="Saídas" value={kpis.expenses} color="text-red-500" icon={TrendingDown} />
          <KPICard label="Líquido" value={kpis.net} color="text-primary" icon={Wallet} glow />
          <KPICard label="A Receber (OS)" value={kpis.receivables} color="text-yellow-500" icon={Target} />
          <KPICard label="Contas a Pagar" value={kpis.payables} color="text-rose-500" icon={AlertCircle} />
        </section>

        {/* TABS SELECTOR */}
        <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800">
           <button 
             onClick={() => setActiveTab('FLUXO')}
             className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'FLUXO' ? "bg-primary text-black" : "text-zinc-500 hover:text-white")}
           >
             Fluxo de Caixa
           </button>
           <button 
             onClick={() => setActiveTab('CONTAS')}
             className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'CONTAS' ? "bg-primary text-black" : "text-zinc-500 hover:text-white")}
           >
             Contas a Pagar
           </button>
        </div>

        {/* LISTA DINÂMICA */}
        <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          {activeTab === 'FLUXO' ? (
            <div className="divide-y divide-white/5">
              {transactions.length > 0 ? transactions.map((t) => (
                <div key={t.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-zinc-900/40 transition-all gap-4">
                  <div className="flex items-center gap-4 flex-1">
                     <div className="flex flex-col items-center justify-center min-w-[50px] bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                       <span className="text-[8px] font-black text-zinc-600 uppercase">{format(parseISO(t.date), 'MMM', { locale: ptBR })}</span>
                       <span className="text-lg font-black text-white leading-none">{format(parseISO(t.date), 'dd')}</span>
                     </div>
                     <div className="min-w-0">
                        <p className="text-sm font-bold text-white uppercase truncate">{t.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{t.origin}</span>
                           <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border", t.type === 'income' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>{t.type === 'income' ? 'Entrada' : 'Saída'}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-8">
                     <p className={cn("text-lg font-black font-mono tracking-tighter", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>
                       {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </p>
                     {t.origin === 'MANUAL' && (
                       <button onClick={() => setItemToDelete(t)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                     )}
                  </div>
                </div>
              )) : <EmptyState icon={Target} text="Sem movimentos no período" />}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {payables?.length > 0 ? payables.map((p) => (
                <div key={p.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-zinc-900/40 transition-all gap-4">
                  <div className="flex items-center gap-4 flex-1">
                     <div className={cn("flex flex-col items-center justify-center min-w-[50px] p-2 rounded-xl border", p.status === 'paid' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-zinc-950 border-zinc-900")}>
                       <span className="text-[8px] font-black text-zinc-600 uppercase">{format(parseISO(p.dueDate), 'MMM', { locale: ptBR })}</span>
                       <span className={cn("text-lg font-black leading-none", p.status === 'paid' ? "text-emerald-500" : "text-white")}>{format(parseISO(p.dueDate), 'dd')}</span>
                     </div>
                     <div className="min-w-0">
                        <p className="text-sm font-bold text-white uppercase truncate">{p.supplier}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{p.description} • {p.category}</p>
                     </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-8">
                     <div className="text-right">
                        <p className="text-lg font-black font-mono tracking-tighter text-white">
                          {p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border", p.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>{p.status === 'paid' ? 'Liquidado' : 'Pendente'}</span>
                     </div>
                     <div className="flex gap-2">
                        {p.status !== 'paid' && (
                          <button onClick={() => handlePayAccount(p)} className="p-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-xl transition-all border border-emerald-500/20"><CheckCircle2 size={18}/></button>
                        )}
                        <button onClick={() => setItemToDelete(p)} className="p-3 bg-zinc-900 text-zinc-600 hover:text-red-500 rounded-xl transition-all border border-zinc-800"><Trash2 size={18}/></button>
                     </div>
                  </div>
                </div>
              )) : <EmptyState icon={Receipt} text="Sem contas pendentes" />}
            </div>
          )}
        </div>

        {/* MODAL CONFIRMAR EXCLUSÃO */}
        <AnimatePresence>
          {itemToDelete && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0c0c0e] border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20 mx-auto animate-pulse"><Trash2 size={32} /></div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Confirmar Exclusão</h3>
                <p className="text-zinc-400 text-sm uppercase tracking-widest leading-relaxed mb-8">Apagar definitivamente <br /><strong className="text-white">"{itemToDelete.description || itemToDelete.supplier}"</strong>?</p>
                <div className="flex gap-4">
                  <button onClick={() => setItemToDelete(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800/50 transition-all">Cancelar</button>
                  <button onClick={handleConfirmDelete} className="flex-1 py-4 rounded-xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-red-600 shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all">Sim, Excluir</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL NOVO LANÇAMENTO (FLUXO) */}
        <AnimatePresence>
          {isCashflowModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsCashflowModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Novo Lançamento</h3>
                  <button onClick={() => setIsCashflowModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveManualEntry} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className={labelClass}>Descrição</label>
                    <input required value={cashflowFormData.description} onChange={e => setCashflowFormData({...cashflowFormData, description: e.target.value})} className={inputClass} placeholder="Ex: Material Escritório" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={labelClass}>Valor (R$)</label>
                      <input type="number" step="0.01" required value={cashflowFormData.amount} onChange={e => setCashflowFormData({...cashflowFormData, amount: e.target.value})} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Data</label>
                      <input type="date" required value={cashflowFormData.date} onChange={e => setCashflowFormData({...cashflowFormData, date: e.target.value})} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Fluxo</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setCashflowFormData({...cashflowFormData, type: 'income'})} className={cn("py-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all", cashflowFormData.type === 'income' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-zinc-800 text-zinc-500")}>Entrada</button>
                      <button type="button" onClick={() => setCashflowFormData({...cashflowFormData, type: 'expense'})} className={cn("py-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all", cashflowFormData.type === 'expense' ? "border-red-500 bg-red-500/10 text-red-500" : "border-zinc-800 text-zinc-500")}>Saída</button>
                    </div>
                  </div>
                  <button disabled={isSubmitting} className="w-full py-5 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_5px_25px_-5px_rgba(255,95,31,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Efetivar Lançamento"}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL NOVA CONTA (PAGAR) */}
        <AnimatePresence>
          {isPayableModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsPayableModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center shrink-0">
                  <div>
                    <span className="text-primary text-[9px] font-black uppercase tracking-[0.3em]">Gerador de Faturas</span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Registrar Compromissos</h3>
                  </div>
                  <button onClick={() => setIsPayableModalOpen(false)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                      <label className={labelClass}>Fornecedor / Nome</label>
                      <input required value={payableFormData.supplier} onChange={e => setPayableFormData({...payableFormData, supplier: e.target.value})} className={inputClass} placeholder="Ex: Fornecedor de Chapas" />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Descrição da Despesa</label>
                      <input value={payableFormData.description} onChange={e => setPayableFormData({...payableFormData, description: e.target.value})} className={inputClass} placeholder="Ex: Compra de Acrílicos" />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Valor Total (R$)</label>
                      <input type="number" step="0.01" value={payableFormData.amountTotal} onChange={e => setPayableFormData({...payableFormData, amountTotal: e.target.value})} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Nº de Parcelas</label>
                      <div className="flex gap-2">
                        <input type="number" min={1} value={payableFormData.installments} onChange={e => setPayableFormData({...payableFormData, installments: Number(e.target.value)})} className={inputClass} />
                        <button onClick={handleGenerateInstallments} className="bg-white text-black px-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary transition-all">Gerar</button>
                      </div>
                    </div>
                  </div>

                  {previewInstallments.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Ajuste de Cronograma</h4>
                      {previewInstallments.map((inst, idx) => (
                        <div key={idx} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                           <span className="text-[10px] font-black text-zinc-600">#{idx+1}</span>
                           <div className="flex-1 grid grid-cols-2 gap-4">
                              <input type="date" value={inst.dueDate} onChange={e => { const n = [...previewInstallments]; n[idx].dueDate = e.target.value; setPreviewInstallments(n); }} className={inputClass} />
                              <input type="number" step="0.01" value={inst.amount} onChange={e => { const n = [...previewInstallments]; n[idx].amount = e.target.value; setPreviewInstallments(n); }} className={inputClass} />
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-8 border-t border-white/5 bg-zinc-900/30 shrink-0">
                  <button onClick={handleSavePayables} disabled={isSubmitting || previewInstallments.length === 0} className="w-full py-5 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_5px_25px_-5px_rgba(255,95,31,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Receipt size={20} /> Salvar Pauta de Pagamentos</>}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon, glow }: any) {
  return (
    <div className={cn("relative bg-[#09090b] border border-zinc-800 p-5 rounded-2xl overflow-hidden transition-all duration-500 hover:border-zinc-700 group", glow && "border-primary/30 shadow-[0_0_30px_-10px_rgba(255,95,31,0.15)]")}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <Icon size={14} className={cn(color, "opacity-40 group-hover:opacity-100 transition-opacity")} />
      </div>
      <p className={cn("text-xl font-black font-mono tracking-tighter truncate", color)}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      {glow && <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary/20 blur-2xl rounded-full" />}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: any) {
  return (
    <div className="py-24 text-center opacity-20">
       <Icon size={48} className="mx-auto mb-4" />
       <p className="text-[10px] font-black uppercase tracking-[0.4em]">{text}</p>
    </div>
  );
}

const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-1.5 block";
const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";
