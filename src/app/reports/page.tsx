'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, Loader2, 
  ArrowLeft, ArrowRight,
  Package, Clock, Calendar as CalendarIcon,
  Trash2, Download, Plus, X, Save, AlertTriangle,
  Wallet, FileText
} from 'lucide-react';
import { 
  startOfMonth, endOfMonth, format, isWithinInterval, 
  parseISO, addMonths, subMonths, isBefore, isValid 
} from 'date-fns';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { 
  collection, query, orderBy, deleteDoc, doc, 
  addDoc, serverTimestamp 
} from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { useToast } from '@/hooks/use-toast';

export default function ReportsManagerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(''); 
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State para Novo Lançamento
  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'income' // income | expense
  });
  
  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setSelectedMonth(format(now, 'yyyy-MM'));
  }, []);

  // --- QUERIES ---
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const cashflowQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'cashflow_manual'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);
  const { data: cashflowEntries, isLoading: loadingCashflow } = useCollection(cashflowQuery);

  // --- LÓGICA DE DATAS ---
  const dateRange = useMemo(() => {
    if (!selectedMonth) return { start: new Date(), end: new Date() };
    const [year, month] = selectedMonth.split('-').map(Number);
    return {
      start: startOfMonth(new Date(year, month - 1)),
      end: endOfMonth(new Date(year, month - 1))
    };
  }, [selectedMonth]);

  // --- PROCESSAMENTO OPERACIONAL (OS) ---
  const sortedOrders = useMemo(() => {
    if (!orders || !selectedMonth) return [];
    
    const filtered = orders.filter(order => {
      const dDate = order.delivery_date || order.deliveryDate;
      if (!dDate) return false;
      try {
        return isWithinInterval(parseISO(dDate), { start: dateRange.start, end: dateRange.end });
      } catch (e) { return false; }
    });

    return [...filtered].map(order => {
      // CÁLCULO DINÂMICO DE VALORES (Real-time de parcelas)
      const totalOS = Number(order.total_value || order.totalValue) || 0;
      let liquidado = 0;
      
      if (order.installments && Array.isArray(order.installments) && order.installments.length > 0) {
        liquidado = order.installments
          .filter((inst: any) => inst.status === 'paid')
          .reduce((acc: number, inst: any) => acc + (Number(inst.amount) || 0), 0);
      } else {
        liquidado = Number(order.amount_paid || order.amountPaid) || 0;
      }

      const aReceber = Math.max(0, totalOS - liquidado);

      return {
        ...order,
        calculated_total: totalOS,
        calculated_paid: liquidado,
        calculated_balance: aReceber
      };
    }).sort((a, b) => {
      if (a.calculated_balance > 0 && b.calculated_balance === 0) return -1;
      if (a.calculated_balance === 0 && b.calculated_balance > 0) return 1;
      const dateA = a.delivery_date || a.deliveryDate || '9999-99-99';
      const dateB = b.delivery_date || b.deliveryDate || '9999-99-99';
      return dateA.localeCompare(dateB);
    });
  }, [orders, dateRange, selectedMonth]);

  // --- PROCESSAMENTO FLUXO DE CAIXA (Manual) ---
  const filteredCashflow = useMemo(() => {
    if (!cashflowEntries || !selectedMonth) return [];
    return cashflowEntries.filter(entry => {
      if (!entry.date) return false;
      try {
        return isWithinInterval(parseISO(entry.date), { start: dateRange.start, end: dateRange.end });
      } catch (e) { return false; }
    });
  }, [cashflowEntries, dateRange, selectedMonth]);

  // --- KPI METRICS ---
  const kpiMetrics = useMemo(() => {
    const receivedFromOrders = sortedOrders.reduce((acc, o) => acc + o.calculated_paid, 0);
    const pendingFromOrders = sortedOrders.reduce((acc, o) => acc + o.calculated_balance, 0);
    
    // Manual cashflow
    const manualIncome = filteredCashflow.filter(e => e.type === 'income').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const manualExpense = filteredCashflow.filter(e => e.type === 'expense').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    return { 
      receivedTotal: receivedFromOrders + manualIncome, 
      pendingTotal: pendingFromOrders,
      expenseTotal: manualExpense,
      netBalance: (receivedFromOrders + manualIncome) - manualExpense
    };
  }, [sortedOrders, filteredCashflow]);

  // --- FUNÇÕES DE AÇÃO ---
  const handleMonthNav = (direction: 'prev' | 'next') => {
    if (!selectedMonth) return;
    const current = parseISO(`${selectedMonth}-01`);
    const next = direction === 'next' ? addMonths(current, 1) : subMonths(current, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  const handleDeleteCashflowItem = async (id: string) => {
    if (!firestore) return;
    if (!window.confirm("Deseja realmente apagar este lançamento do fluxo de caixa?")) return;

    try {
      await deleteDoc(doc(firestore, 'cashflow_manual', id));
      toast({ title: "Lançamento Removido" });
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir: " + error.message);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSubmitting(true);

    try {
      const payload = {
        ...entryForm,
        amount: Number(entryForm.amount),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: user.uid
      };

      await addDoc(collection(firestore, 'cashflow_manual'), payload);
      toast({ title: "Lançamento Registrado" });
      setIsEntryModalOpen(false);
      setEntryForm({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        type: 'income'
      });
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCashflowCSV = () => {
    if (!filteredCashflow.length) {
      toast({ title: "Sem dados para exportar", variant: "destructive" });
      return;
    }

    let csvContent = "DATA;DESCRIÇÃO;TIPO;VALOR\n";
    filteredCashflow.forEach(item => {
      const date = item.date ? format(parseISO(item.date), 'dd/MM/yyyy') : '--';
      const type = item.type === 'income' ? 'Entrada' : 'Saída';
      const amount = item.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      csvContent += `${date};${item.description};${type};${amount}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fluxo_caixa_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isMounted || loadingOrders || loadingCashflow) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-10 mt-16 md:mt-0 pb-24 relative z-10">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <BarChart3 size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Terminal de Inteligência VisComm</span>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
              REPORTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">FLUX</span>
            </h1>
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <button onClick={() => handleMonthNav('prev')} className="p-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border-r border-zinc-800"><ArrowLeft size={16}/></button>
            <span className="px-6 py-2 text-xs font-black uppercase text-white tracking-widest min-w-[140px] text-center">
              {selectedMonth ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy') : '--'}
            </span>
            <button onClick={() => handleMonthNav('next')} className="p-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border-l border-zinc-800"><ArrowRight size={16}/></button>
          </div>
        </header>

        {/* KPI GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Entradas', val: kpiMetrics.receivedTotal, color: '#4ade80', icon: TrendingUp },
            { label: 'Total Saídas', val: kpiMetrics.expenseTotal, color: '#ef4444', icon: TrendingDown },
            { label: 'Saldo Líquido', val: kpiMetrics.netBalance, color: '#FF5F1F', icon: Wallet },
            { label: 'A Receber (OS)', val: kpiMetrics.pendingTotal, color: '#eab308', icon: Clock }
          ].map((kpi, i) => (
            <motion.div key={i} whileHover={{ y: -4 }} className="group relative bg-[#0c0c0e] border border-zinc-800 rounded-3xl p-6 transition-all duration-300" style={{ borderBottom: `2px solid ${kpi.color}20` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-2xl bg-white/5" style={{ color: kpi.color }}><kpi.icon size={20} /></div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{kpi.label}</span>
              </div>
              <span className="text-2xl font-black text-white">{kpi.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity" style={{ backgroundColor: kpi.color }} />
            </motion.div>
          ))}
        </section>

        {/* MONITOR OPERACIONAL GRID */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
               <Package size={20} className="text-primary" /> Monitor Operacional
             </h2>
             <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
               {sortedOrders.length} Protocolos no Mês
             </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-zinc-800 rounded-3xl opacity-20">
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Nenhuma Ordem de Serviço para este período</p>
              </div>
            ) : (
              sortedOrders.map((order) => {
                const isDone = order.calculated_balance === 0;
                const deadline = order.delivery_date || order.deliveryDate ? parseISO(order.delivery_date || order.deliveryDate) : null;
                const isLate = deadline && isBefore(deadline, new Date()) && !isDone;
                
                return (
                  <motion.div 
                    key={order.id} 
                    layout 
                    onClick={() => router.push(`/orders?edit=${order.id}`)} 
                    className="group bg-[#0c0c0e] border border-zinc-800 rounded-3xl p-5 cursor-pointer hover:border-primary/40 hover:scale-[1.01] transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-white uppercase truncate group-hover:text-primary transition-colors">{order.client}</h3>
                        <p className="text-[9px] font-mono text-zinc-500 mt-0.5">#{order.id.slice(-6)}</p>
                      </div>
                      {isLate ? (
                        <div className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded-lg text-[8px] font-black uppercase animate-pulse">Atrasado</div>
                      ) : isDone ? (
                        <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-lg text-[8px] font-black uppercase">Finalizado</div>
                      ) : (
                        <div className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg text-[8px] font-black uppercase">Prazo: {deadline && isValid(deadline) ? format(deadline, 'dd/MM') : '--/--'}</div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500/60 block">Liquidado</span>
                        <span className="text-base font-bold text-white">{order.calculated_paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-primary/60 block">A Receber</span>
                        <span className="text-base font-bold text-white">{order.calculated_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>

        {/* FLUXO DE CAIXA SECTION */}
        <section className="mt-12 bg-[#0c0c0e] border border-zinc-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Wallet size={20} className="text-[#FF5F1F]" /> Fluxo de Caixa
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Gestão de Entradas e Saídas Manuais</p>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={exportCashflowCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <Download size={14} /> Exportar CSV
              </button>
              <button 
                onClick={() => setIsEntryModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-black hover:bg-white transition-all text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,95,31,0.3)]"
              >
                <Plus size={14} /> Novo Lançamento
              </button>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-zinc-800/50">
            {filteredCashflow.length === 0 ? (
              <div className="py-20 text-center opacity-20">
                <FileText size={48} className="mx-auto mb-4" />
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Nenhum lançamento manual para este período</p>
              </div>
            ) : (
              filteredCashflow.map((item) => (
                <div key={item.id} className="group flex items-center justify-between py-4 hover:bg-zinc-900/40 transition-colors rounded-xl px-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {item.date ? format(parseISO(item.date), 'dd/MM/yyyy') : '--/--/--'}
                    </span>
                    <span className="text-zinc-100 font-medium text-sm uppercase tracking-tight">{item.description}</span>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className={item.type === 'income' ? 
                      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-widest" : 
                      "bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-widest"
                    }>
                      {item.type === 'income' ? 'Entrada' : 'Saída'}
                    </div>

                    <div className="flex items-center gap-4 min-w-[120px] justify-end">
                      <span className="text-sm font-black text-white">
                        {item.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <button 
                        onClick={() => handleDeleteCashflowItem(item.id)}
                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* MODAL ADICIONAR LANÇAMENTO */}
        <AnimatePresence>
          {isEntryModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setIsEntryModalOpen(false)}>
              <motion.div 
                initial={{ scale: 0.95, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.95, y: 20 }} 
                onClick={(e) => e.stopPropagation()} 
                className="w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">Novo Lançamento</h2>
                  <button onClick={() => setIsEntryModalOpen(false)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button>
                </div>

                <form onSubmit={handleSaveEntry} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block ml-1">Data da Movimentação</label>
                      <input 
                        type="date" 
                        required 
                        value={entryForm.date} 
                        onChange={e => setEntryForm({...entryForm, date: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block ml-1">Tipo de Registro</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button" 
                          onClick={() => setEntryForm({...entryForm, type: 'income'})}
                          className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${entryForm.type === 'income' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                        >
                          Entrada (+)
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setEntryForm({...entryForm, type: 'expense'})}
                          className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${entryForm.type === 'expense' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                        >
                          Saída (-)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block ml-1">Descrição do Lançamento</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: Compra de Tintas, Pagamento Aluguel..."
                        value={entryForm.description} 
                        onChange={e => setEntryForm({...entryForm, description: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block ml-1">Valor (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        placeholder="0,00"
                        value={entryForm.amount} 
                        onChange={e => setEntryForm({...entryForm, amount: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all font-mono text-xl"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-14 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Efetivar Registro</>}
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
