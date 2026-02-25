'use client';

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  AlertCircle, 
  Download, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  X, 
  Save, 
  Loader2, 
  Calendar,
  ArrowRightLeft,
  Receipt,
  Search,
  ChevronRight,
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// --- COMPONENTES AUXILIARES ---

const KPICard = ({ title, value, icon: Icon, color, subtext }: any) => (
  <div className="bg-[#0c0c0e] border border-zinc-800/50 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity`} style={{ color }}>
      <Icon size={64} />
    </div>
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}10`, color }}>
        <Icon size={18} />
      </div>
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</span>
    </div>
    <h3 className="text-2xl font-black text-white tracking-tighter">
      {Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
    </h3>
    {subtext && <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold tracking-wider">{subtext}</p>}
  </div>
);

function ReportsContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  // --- ESTADOS ---
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeTab, setActiveTab] = useState<'cashflow' | 'payable'>('cashflow');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Evitar erro de hidratação definindo a data inicial após a montagem
  useEffect(() => {
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
  }, []);

  // Form states
  const [entryForm, setEntryForm] = useState({ description: '', amount: 0, type: 'income', date: format(new Date(), 'yyyy-MM-dd'), method: 'Caixa Interno' });
  const [payableForm, setPayableForm] = useState({ description: '', supplier: '', amount: 0, category: 'Suprimentos', dueDate: format(new Date(), 'yyyy-MM-dd') });

  // --- QUERIES ---
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

  const { data: orders } = useCollection(ordersQuery);
  const { data: cashflowManual } = useCollection(cashflowQuery);
  const { data: payables } = useCollection(payablesQuery);

  // --- CÁLCULOS DINÂMICOS ---
  const metrics = useMemo(() => {
    if (!selectedMonth) return { entradas: 0, saidas: 0, saldo: 0, aReceberGlobal: 0, contasPagarGlobal: 0 };
    const start = startOfMonth(parseISO(`${selectedMonth}-01`));
    const end = endOfMonth(start);

    let entradas = 0;
    let saidas = 0;
    let aReceberGlobal = 0;
    let contasPagarGlobal = 0;

    // 1. Processar Pedidos (Entradas Automáticas)
    orders?.forEach(order => {
      const installments = Array.isArray(order.installments) ? order.installments : [];
      
      installments.forEach((inst: any) => {
        if (inst.status === 'paid' && inst.paid_date) {
          try {
            const pDate = parseISO(inst.paid_date);
            if (isWithinInterval(pDate, { start, end })) {
              entradas += Number(inst.amount) || 0;
            }
          } catch (e) {}
        }
      });

      const total = Number(order.total_value || order.totalValue) || 0;
      const paid = Number(order.amount_paid || order.amountPaid) || 0;
      if (total > paid) {
        aReceberGlobal += (total - paid);
      }
    });

    // 2. Processar Fluxo Manual
    cashflowManual?.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start, end })) {
          if (entry.type === 'income') entradas += Number(entry.amount) || 0;
          else saidas += Number(entry.amount) || 0;
        }
      } catch (e) {}
    });

    // 3. Processar Contas a Pagar
    payables?.forEach(p => {
      if (p.status !== 'paid') {
        contasPagarGlobal += Number(p.amount) || 0;
      }
    });

    return { entradas, saidas, saldo: entradas - saidas, aReceberGlobal, contasPagarGlobal };
  }, [orders, cashflowManual, payables, selectedMonth]);

  const unifiedTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    const start = startOfMonth(parseISO(`${selectedMonth}-01`));
    const end = endOfMonth(start);
    const list: any[] = [];

    orders?.forEach(order => {
      const insts = Array.isArray(order.installments) ? order.installments : [];
      insts.forEach((inst: any) => {
        if (inst.status === 'paid' && inst.paid_date) {
          try {
            const pDate = parseISO(inst.paid_date);
            if (isWithinInterval(pDate, { start, end })) {
              list.push({
                id: `order-${order.id}-${inst.uid}`,
                date: inst.paid_date,
                description: `Pedido #${order.id.slice(-6)} - ${order.client} (${inst.id})`,
                amount: inst.amount,
                type: 'income',
                origin: 'Sistema (OS)',
                method: inst.payment_method || 'N/A',
                isAutomatic: true
              });
            }
          } catch (e) {}
        }
      });
    });

    cashflowManual?.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start, end })) {
          list.push({
            ...entry,
            origin: 'Manual',
            isAutomatic: false
          });
        }
      } catch (e) {}
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, cashflowManual, selectedMonth]);

  // --- AÇÕES DE EXCLUSÃO (BLINDADAS) ---

  const handleDeleteCashflowItem = async (id: string, origin: string) => {
    // Trava de segurança para não corromper pedidos
    if (origin === 'Sistema (OS)' || origin === 'orders') {
      alert("⚠️ Esta entrada é automática de um pedido. Para removê-la, vá na página de Pedidos e desfaça o pagamento lá.");
      return;
    }
    
    // Exclusão livre para lançamentos manuais / saídas
    if (window.confirm("Tem certeza que deseja apagar definitivamente este lançamento do caixa?")) {
      try {
        if (!firestore) return;
        await deleteDoc(doc(firestore, 'cashflow_manual', id));
        toast({ title: "Lançamento Removido" });
      } catch (error: any) {
        console.error("Erro ao excluir do fluxo de caixa:", error);
        alert("Erro ao excluir do banco de dados: " + (error.message || "Erro desconhecido"));
        
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `cashflow_manual/${id}`,
          operation: 'delete'
        }));
      }
    }
  };

  const handleDeletePayable = async (id: string) => {
    const confirmacao = window.confirm("⚠️ Tem certeza que deseja excluir esta conta da pauta de pagamentos? Esta ação não pode ser desfeita.");
    
    if (!confirmacao) return;

    try {
      if (!firestore) return;
      await deleteDoc(doc(firestore, 'accounts_payable', id));
      toast({ title: "Conta Removida" });
    } catch (error: any) {
      console.error("Erro ao excluir a conta:", error);
      alert("Ocorreu um erro ao tentar excluir: " + (error.message || "Erro desconhecido"));
      
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `accounts_payable/${id}`,
        operation: 'delete'
      }));
    }
  };

  // --- OUTRAS AÇÕES DE MUTATION ---

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);
    const payload = { ...entryForm, createdAt: serverTimestamp() };
    addDoc(collection(firestore, 'cashflow_manual'), payload)
      .then(() => {
        toast({ title: "Lançamento Concluído" });
        setIsEntryModalOpen(false);
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'cashflow_manual',
          operation: 'create',
          requestResourceData: payload
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleSavePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);
    const payload = { ...payableForm, status: 'pending', createdAt: serverTimestamp() };
    addDoc(collection(firestore, 'accounts_payable'), payload)
      .then(() => {
        toast({ title: "Conta Registrada" });
        setIsPayableModalOpen(false);
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'accounts_payable',
          operation: 'create',
          requestResourceData: payload
        }));
      })
      .finally(() => setLoading(false));
  };

  const handlePayAccount = async (account: any) => {
    if (!firestore || !window.confirm(`Confirmar pagamento de ${account.amount.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}?`)) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const accountRef = doc(firestore, 'accounts_payable', account.id);
    
    updateDoc(accountRef, { status: 'paid', paidDate: today })
      .then(() => {
        // Criar saída automática
        addDoc(collection(firestore, 'cashflow_manual'), {
          description: `Pagamento: ${account.supplier} - ${account.description}`,
          amount: account.amount,
          type: 'expense',
          date: today,
          method: 'Saída Bancária',
          origin: 'Pagamento de Conta',
          createdAt: serverTimestamp()
        });
        toast({ title: "Conta Liquidada" });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: accountRef.path,
          operation: 'update'
        }));
      })
      .finally(() => setLoading(false));
  };

  const exportCSV = () => {
    const headers = ['DATA', 'DESCRIÇÃO', 'ORIGEM', 'TIPO', 'VALOR'];
    const rows = unifiedTransactions.map(t => [
      t.date,
      t.description,
      t.origin,
      t.type === 'income' ? 'ENTRADA' : 'SAÍDA',
      t.amount.toString().replace('.', ',')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(';')).join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fluxo_caixa_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-8 relative z-10">
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-2">
               <ArrowRightLeft size={16} className="text-primary" />
               <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Finance Terminal</span>
             </div>
             <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
               Relatórios e <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Fluxo de Caixa</span>
             </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
             <div className="relative group flex-1 lg:flex-none">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary" size={18} />
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-primary transition-all uppercase font-bold"
                />
             </div>
             <button 
              onClick={exportCSV}
              className="px-6 h-[46px] rounded-2xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
             >
               <Download size={16} /> Exportar CSV
             </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
          <KPICard title="Entradas" value={metrics.entradas} icon={TrendingUp} color="#4ade80" subtext="No mês selecionado" />
          <KPICard title="Saídas" value={metrics.saidas} icon={TrendingDown} color="#ef4444" subtext="No mês selecionado" />
          <KPICard title="Saldo do Mês" value={metrics.saldo} icon={Wallet} color="#FF5F1F" subtext="Resultado líquido" />
          <KPICard title="A Receber OS" value={metrics.aReceberGlobal} icon={Target} color="#eab308" subtext="Global pendente" />
          <KPICard title="Contas a Pagar" value={metrics.contasPagarGlobal} icon={AlertCircle} color="#f43f5e" subtext="Dívida aberta" />
        </section>

        <nav className="flex items-center gap-1 p-1 bg-[#0c0c0e] border border-zinc-800 w-fit rounded-2xl relative z-10">
          <button 
            onClick={() => setActiveTab('cashflow')}
            className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'cashflow' ? "bg-primary text-black shadow-lg" : "text-zinc-500 hover:text-white")}
          >
            Fluxo de Caixa
          </button>
          <button 
            onClick={() => setActiveTab('payable')}
            className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'payable' ? "bg-primary text-black shadow-lg" : "text-zinc-500 hover:text-white")}
          >
            Contas a Pagar
          </button>
        </nav>

        <div className="relative z-10">
          <AnimatePresence mode='wait'>
            {activeTab === 'cashflow' ? (
              <motion.section key="cashflow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] flex items-center gap-2">
                     <ArrowRightLeft size={14} /> Histórico Consolidado
                   </h3>
                   <button 
                    onClick={() => setIsEntryModalOpen(true)}
                    className="bg-zinc-900 border border-zinc-800 text-white hover:text-primary hover:border-primary/50 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                   >
                     <Plus size={16} /> Novo Lançamento
                   </button>
                </div>

                <div className="bg-[#0c0c0e] border border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl">
                   {unifiedTransactions.length === 0 ? (
                     <div className="py-24 text-center space-y-4">
                        <ArrowRightLeft size={48} className="mx-auto text-zinc-800 opacity-20" />
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Sem movimentações para este período</p>
                     </div>
                   ) : (
                     <div className="flex flex-col">
                        {unifiedTransactions.map((item) => (
                          <div key={item.id} className="group flex flex-col md:flex-row items-center justify-between p-5 border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-all gap-4">
                             <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className="text-center min-w-[60px] p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                                   <span className="text-[10px] font-black text-zinc-500 uppercase block">{format(parseISO(item.date), 'MMM', { locale: ptBR })}</span>
                                   <span className="text-xl font-black text-white">{format(parseISO(item.date), 'dd')}</span>
                                </div>
                                <div className="space-y-1">
                                   <h4 className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.description}</h4>
                                   <div className="flex items-center gap-3">
                                      <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{item.origin}</span>
                                      <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">• {item.method}</span>
                                   </div>
                                </div>
                             </div>

                             <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
                                <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", item.type === 'income' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                                  {item.type === 'income' ? 'Entrada' : 'Saída'}
                                </div>
                                <span className={cn("text-lg font-black tracking-tighter", item.type === 'income' ? "text-white" : "text-zinc-400")}>
                                  {item.type === 'income' ? '+' : '-'} {Number(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <button 
                                  onClick={() => handleDeleteCashflowItem(item.id, item.origin)}
                                  className="p-2 text-zinc-600 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-lg"
                                  title="Remover Registro"
                                >
                                  <Trash2 size={18} />
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </motion.section>
            ) : (
              <motion.section key="payable" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] flex items-center gap-2">
                     <Receipt size={14} /> Pauta de Pagamentos
                   </h3>
                   <button 
                    onClick={() => setIsPayableModalOpen(true)}
                    className="bg-zinc-900 border border-zinc-800 text-white hover:text-primary hover:border-primary/50 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                   >
                     <Plus size={16} /> Nova Conta
                   </button>
                </div>

                <div className="bg-[#0c0c0e] border border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl">
                   {payables?.length === 0 ? (
                     <div className="py-24 text-center space-y-4">
                        <Receipt size={48} className="mx-auto text-zinc-800 opacity-20" />
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Nenhuma conta cadastrada</p>
                     </div>
                   ) : (
                     <div className="flex flex-col">
                        {payables?.map((p) => {
                          const isPaid = p.status === 'paid';
                          const isLate = !isPaid && parseISO(p.dueDate) < new Date();

                          return (
                            <div key={p.id} className="group flex flex-col md:flex-row items-center justify-between p-5 border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-all gap-4">
                               <div className="flex items-center gap-6 w-full md:w-auto">
                                  <div className={cn("text-center min-w-[60px] p-2 rounded-xl border transition-colors", isPaid ? "bg-emerald-500/10 border-emerald-500/20" : isLate ? "bg-red-500/10 border-red-500/20" : "bg-zinc-900 border-zinc-800")}>
                                     <span className="text-[10px] font-black text-zinc-500 uppercase block">{format(parseISO(p.dueDate), 'MMM', { locale: ptBR })}</span>
                                     <span className={cn("text-xl font-black", isPaid ? "text-emerald-500" : isLate ? "text-red-500" : "text-white")}>{format(parseISO(p.dueDate), 'dd')}</span>
                                  </div>
                                  <div className="space-y-1">
                                     <h4 className="text-sm font-bold text-white uppercase tracking-tight">{p.supplier}</h4>
                                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{p.description} • {p.category}</p>
                                  </div>
                               </div>

                               <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                  <span className="text-lg font-black tracking-tighter text-white">
                                    {Number(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                  <div className="flex items-center gap-2">
                                     {!isPaid && (
                                       <button 
                                        onClick={() => handlePayAccount(p)}
                                        className="p-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary hover:text-black transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                                       >
                                         <CheckCircle2 size={16} /> Baixar
                                       </button>
                                     )}
                                     <button 
                                      onClick={() => handleDeletePayable(p.id)}
                                      className="p-2 text-zinc-600 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-lg"
                                      title="Excluir Conta"
                                     >
                                       <Trash2 size={18} />
                                     </button>
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                   )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* MODAIS */}
        <AnimatePresence>
           {isEntryModalOpen && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsEntryModalOpen(false)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#0c0c0e] w-full max-w-lg border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-8">
                   <div className="flex justify-between items-center">
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Novo Lançamento Manual</h2>
                      <button onClick={() => setIsEntryModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                   </div>
                   <form onSubmit={handleSaveEntry} className="space-y-6">
                      <div className="grid grid-cols-2 gap-2 p-1 bg-black rounded-xl border border-zinc-900">
                         <button type="button" onClick={() => setEntryForm({...entryForm, type: 'income'})} className={cn("py-2 rounded-lg text-[10px] font-black uppercase transition-all", entryForm.type === 'income' ? "bg-emerald-500 text-black" : "text-zinc-600 hover:text-white")}>Entrada</button>
                         <button type="button" onClick={() => setEntryForm({...entryForm, type: 'expense'})} className={cn("py-2 rounded-lg text-[10px] font-black uppercase transition-all", entryForm.type === 'expense' ? "bg-red-500 text-black" : "text-zinc-600 hover:text-white")}>Saída</button>
                      </div>
                      <div className="space-y-4">
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Descrição</label>
                            <input required value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Valor</label>
                               <input type="number" step="0.01" required value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: Number(e.target.value)})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Data</label>
                               <input type="date" required value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary" />
                            </div>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Modalidade / Conta</label>
                            <select value={entryForm.method} onChange={e => setEntryForm({...entryForm, method: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary">
                               {["Caixa Interno", "SICOOB - Lindóia", "SICOOB - Serra Negra", "PagBank", "Pix / Transferência"].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                         </div>
                      </div>
                      <button disabled={loading} className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all">
                         {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Gravar no Fluxo"}
                      </button>
                   </form>
                </motion.div>
             </div>
           )}
        </AnimatePresence>

        <AnimatePresence>
           {isPayableModalOpen && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsPayableModalOpen(false)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#0c0c0e] w-full max-w-lg border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-8">
                   <div className="flex justify-between items-center">
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Novo Compromisso (Boleto)</h2>
                      <button onClick={() => setIsPayableModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                   </div>
                   <form onSubmit={handleSavePayable} className="space-y-6">
                      <div className="space-y-4">
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Fornecedor / Credor</label>
                            <input required value={payableForm.supplier} onChange={e => setPayableForm({...payableForm, supplier: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Descrição do Item</label>
                            <input required value={payableForm.description} onChange={e => setPayableForm({...payableForm, description: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Valor</label>
                               <input type="number" step="0.01" required value={payableForm.amount} onChange={e => setPayableForm({...payableForm, amount: Number(e.target.value)})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Vencimento</label>
                               <input type="date" required value={payableForm.dueDate} onChange={e => setPayableForm({...payableForm, dueDate: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary" />
                            </div>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Categoria</label>
                            <select value={payableForm.category} onChange={e => setPayableForm({...payableForm, category: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary">
                               {["Suprimentos", "Impostos", "Salários", "Energia / Água", "Aluguel", "Infraestrutura", "Outros"].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                      </div>
                      <button disabled={loading} className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all">
                         {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Agendar Pagamento"}
                      </button>
                   </form>
                </motion.div>
             </div>
           )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function ReportsManagerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <ReportsContent />
    </Suspense>
  );
}
