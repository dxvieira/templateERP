
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { collection, query, orderBy, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Wallet, Target, AlertCircle, 
  Download, Plus, Search, Trash2, Calendar, 
  Filter, ArrowRight, Loader2, X, Check, MoreVertical
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ReportsManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // --- ESTADOS DE CONTROLE ---
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'income',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // --- BUSCA DE DADOS (TRI-COLEÇÃO) ---
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
    return query(collection(firestore, 'accounts_payable'));
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
      // Cálculo Global de Recebíveis
      globalReceivable += Number(order.balance_due || order.balanceDue || 0);

      // Extrair parcelas pagas no mês selecionado
      const installments = order.installments || [];
      installments.forEach((inst: any) => {
        if (inst.status === 'paid' && inst.paid_date) {
          const paidDate = parseISO(inst.paid_date);
          if (isWithinInterval(paidDate, { start: startDate, end: endDate })) {
            const amount = Number(inst.amount) || 0;
            monthIncomes += amount;
            fusion.push({
              id: `${order.id}-${inst.uid}`,
              date: inst.paid_date,
              description: `Recebimento OS #${order.id.slice(-6)} - ${order.client}`,
              type: 'income',
              amount: amount,
              origin: 'SISTEMA (OS)',
              originalId: order.id
            });
          }
        }
      });
    });

    // 2. Processar Fluxo Manual
    cashflowManual?.forEach(entry => {
      const entryDate = parseISO(entry.date);
      const amount = Number(entry.amount) || 0;

      if (isWithinInterval(entryDate, { start: startDate, end: endDate })) {
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
    });

    // 3. Processar Contas a Pagar (Apenas KPI)
    payables?.forEach(payable => {
      if (payable.status !== 'paid') {
        totalPayables += Number(payable.amount) || 0;
      }
    });

    // Ordenação Final
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

  // --- AÇÕES ---
  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'cashflow_manual'), {
        ...formData,
        amount: Number(formData.amount),
        createdAt: serverTimestamp(),
        userId: user.uid
      });
      toast({ title: "Lançamento Registrado" });
      setIsModalOpen(false);
      setFormData({ ...formData, description: '', amount: '' });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao salvar" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (item: any) => {
    if (item.origin === 'SISTEMA (OS)') {
      alert("⚠️ Esta entrada é automática de um pedido. Para removê-la, vá na página de Pedidos e desfaça o pagamento lá.");
      return;
    }

    if (!window.confirm("Confirmar exclusão deste lançamento manual?")) return;

    try {
      await deleteDoc(doc(firestore, 'cashflow_manual', item.id));
      toast({ title: "Lançamento Removido" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  const exportCSV = () => {
    if (transactions.length === 0) return;
    const headers = "DATA;DESCRIÇÃO;ORIGEM;TIPO;VALOR\n";
    const csvContent = transactions.map(t => 
      `${t.date};${t.description};${t.origin};${t.type === 'income' ? 'ENTRADA' : 'SAÍDA'};${t.amount.toFixed(2)}`
    ).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fluxo_caixa_${selectedMonth}.csv`);
    link.click();
  };

  if (ordersLoading || cashflowLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-10 mt-16 md:mt-0 pb-24 relative z-10">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Cérebro Financeiro VisComm</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Fluxo & Resultados</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative group flex-1 md:flex-initial">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-black uppercase outline-none focus:border-primary transition-all group-hover:bg-zinc-900"
                />
             </div>
             <button onClick={exportCSV} className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-xl transition-all shadow-xl group">
               <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
             </button>
             <button 
               onClick={() => setIsModalOpen(true)}
               className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white hover:scale-105 transition-all"
             >
               <Plus size={16} strokeWidth={3} /> Lançar Movimentação
             </button>
          </div>
        </header>

        {/* KPI GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard label="Entradas (Mês)" value={kpis.incomes} color="text-emerald-500" icon={TrendingUp} />
          <KPICard label="Saídas (Mês)" value={kpis.expenses} color="text-red-500" icon={TrendingDown} />
          <KPICard label="Líquido (Mês)" value={kpis.net} color="text-primary" icon={Wallet} glow />
          <KPICard label="A Receber (Total)" value={kpis.receivables} color="text-yellow-500" icon={Target} />
          <KPICard label="Contas a Pagar" value={kpis.payables} color="text-rose-500" icon={AlertCircle} />
        </section>

        {/* HISTÓRICO CONSOLIDADO */}
        <section className="bg-[#09090b] border border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-zinc-900/20 flex justify-between items-center">
             <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
               <TrendingUp size={16} className="text-primary" /> Histórico Consolidado
             </h2>
             <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Sincronizado com Nuvem</span>
          </div>

          <div className="divide-y divide-white/5">
            {transactions.length > 0 ? transactions.map((t) => (
              <div key={t.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-zinc-900/40 transition-all gap-4">
                <div className="flex items-center gap-4 flex-1">
                   <div className="flex flex-col items-center justify-center min-w-[50px] bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                     <span className="text-[8px] font-black text-zinc-600 uppercase">{format(parseISO(t.date), 'MMM', { locale: ptBR })}</span>
                     <span className="text-lg font-black text-white leading-none">{format(parseISO(t.date), 'dd')}</span>
                   </div>
                   <div className="min-w-0">
                      <p className="text-sm font-bold text-white uppercase truncate tracking-tight">{t.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                         <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                           {t.origin}
                         </span>
                         <span className={cn(
                           "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                           t.type === 'income' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                         )}>
                           {t.type === 'income' ? 'Entrada' : 'Saída'}
                         </span>
                      </div>
                   </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8 pl-16 md:pl-0">
                   <div className="text-right">
                      <p className={cn("text-lg font-black font-mono tracking-tighter", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>
                        {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                   </div>
                   <button 
                     onClick={() => handleDeleteTransaction(t)}
                     className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-500 hover:border-red-500/50 transition-all group-hover:opacity-100"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            )) : (
              <div className="py-24 text-center opacity-20">
                 <Wallet size={48} className="mx-auto mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-[0.4em]">Fila Nominal Sem Movimentos</p>
              </div>
            )}
          </div>
        </section>

        {/* MODAL DE LANÇAMENTO */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Novo Lançamento</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20}/></button>
                </div>

                <form onSubmit={handleSaveManualEntry} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Descrição</label>
                    <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all" placeholder="Ex: Pagamento Energia" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Valor (R$)</label>
                      <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Data</label>
                      <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Fluxo</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setFormData({...formData, type: 'income'})} className={cn("py-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all", formData.type === 'income' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-zinc-800 text-zinc-500")}>Entrada</button>
                      <button type="button" onClick={() => setFormData({...formData, type: 'expense'})} className={cn("py-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all", formData.type === 'expense' ? "border-red-500 bg-red-500/10 text-red-500" : "border-zinc-800 text-zinc-500")}>Saída</button>
                    </div>
                  </div>

                  <button 
                    disabled={isSubmitting}
                    className="w-full py-5 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_5px_25px_-5px_rgba(255,95,31,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Efetivar Lançamento"}
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

function KPICard({ label, value, color, icon: Icon, glow }: any) {
  return (
    <div className={cn(
      "relative bg-[#09090b] border border-zinc-800/80 p-5 rounded-2xl overflow-hidden transition-all duration-500 hover:border-zinc-700 group",
      glow && "border-primary/30 shadow-[0_0_30px_-10px_rgba(255,95,31,0.15)]"
    )}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <Icon size={14} className={cn(color, "opacity-40 group-hover:opacity-100 transition-opacity")} />
      </div>
      <p className={cn("text-xl font-black font-mono tracking-tighter truncate", color)}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
      {glow && (
        <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary/20 blur-2xl rounded-full" />
      )}
    </div>
  );
}
