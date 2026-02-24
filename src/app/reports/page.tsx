
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Wallet, CreditCard, 
  Banknote, TrendingUp, FileText, Plus, Trash2, Loader2, DollarSign, 
  Briefcase, AlertCircle, X, RefreshCw, Filter, Clock, CheckCircle2,
  Package, ChevronRight, AlertTriangle, Download, ArrowLeft, ArrowRight
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, isWithinInterval, parseISO, startOfDay, endOfDay, addMonths, subMonths } from 'date-fns';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ReportsManagerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    description: '', amount: '', type: 'income' as 'income' | 'expense', date: format(new Date(), 'yyyy-MM-dd'), account: 'Caixa Interno', method: 'Dinheiro/Pix'
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenses'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const manualCashflowQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'cashflow_manual'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);
  const { data: expenses, isLoading: loadingExpenses } = useCollection(expensesQuery);
  const { data: manualEntries, isLoading: loadingManual } = useCollection(manualCashflowQuery);

  const transactions = useMemo(() => {
    if (!orders || !manualEntries) return [];

    const result: any[] = [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // 1. Entradas Automáticas (Parcelas Pagas)
    orders.forEach(order => {
      const installments = Array.isArray(order.installments) ? order.installments : [];
      installments.forEach(inst => {
        if (inst.status === 'paid' && inst.paid_date) {
          const paidDate = parseISO(inst.paid_date);
          if (isWithinInterval(paidDate, { start: startDate, end: endDate })) {
            result.push({
              id: inst.uid || `${order.id}-${inst.id}`,
              date: inst.paid_date,
              description: `Recebimento OS #${order.id.slice(-6)} - ${order.client}`,
              type: 'income',
              method: inst.type || 'Cartão',
              account: inst.payment_method || 'Indefinido',
              amount: Number(inst.amount) || 0,
              isAuto: true
            });
          }
        }
      });
    });

    // 2. Entradas/Saídas Manuais
    manualEntries.forEach(entry => {
      if (entry.date) {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: startDate, end: endDate })) {
          result.push({
            ...entry,
            isAuto: false
          });
        }
      }
    });

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, manualEntries, selectedMonth]);

  const accountsSummary = useMemo(() => {
    const accounts: Record<string, any> = {
      'CAIXA INTERNO': { label: 'CAIXA INTERNO', value: 0, color: '#10b981', type: 'Dinheiro', icon: '💵' },
      'SICOOB LINDOIA': { label: 'SICOOB LINDÓIA', value: 0, color: '#0ea5e9', type: 'Banco', icon: '🏦' },
      'SICOOB SERRA NEGRA': { label: 'SICOOB SERRA NEGRA', value: 0, color: '#3b82f6', type: 'Banco', icon: '🏦' },
      'PAGBANK': { label: 'PAGBANK', value: 0, color: '#eab308', type: 'Máquina', icon: '💳' },
      'SIPAG': { label: 'SIPAG / SICOOB', value: 0, color: '#f97316', type: 'Máquina', icon: '💳' },
    };

    let totalEmCaixa = 0;
    
    transactions.forEach(tx => {
      if (tx.type === 'income') {
        const method = String(tx.account || '').toUpperCase();
        let targetKey = 'CAIXA INTERNO';

        if (method.includes('PAGBANK')) targetKey = 'PAGBANK';
        else if (method.includes('SIPAG')) targetKey = 'SIPAG';
        else if (method.includes('LINDÓIA') || method.includes('LINDOIA')) targetKey = 'SICOOB LINDOIA';
        else if (method.includes('SERRA NEGRA')) targetKey = 'SICOOB SERRA NEGRA';

        accounts[targetKey].value += tx.amount;
        totalEmCaixa += tx.amount;
      }
    });

    return { 
      items: Object.values(accounts).sort((a, b) => b.value - a.value),
      total: totalEmCaixa 
    };
  }, [transactions]);

  const exportToCSV = useCallback(() => {
    const headers = ["DATA", "DESCRIÇÃO", "MODALIDADE", "CONTA", "TIPO", "VALOR"];
    const rows = transactions.map(tx => [
      format(parseISO(tx.date), 'dd/MM/yyyy'),
      tx.description,
      tx.method,
      tx.account,
      tx.type === 'income' ? 'ENTRADA' : 'SAÍDA',
      tx.amount.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fluxo_de_caixa_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [transactions, selectedMonth]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;

    const payload = {
      ...entryForm,
      amount: Number(entryForm.amount),
      createdAt: serverTimestamp()
    };

    const docRef = doc(collection(firestore, 'cashflow_manual'));
    setDoc(docRef, { ...payload, id: docRef.id })
      .then(() => {
        toast({ title: "Lançamento Registrado" });
        setIsEntryModalOpen(false);
        setEntryForm({
          description: '', amount: '', type: 'income', date: format(new Date(), 'yyyy-MM-dd'), account: 'Caixa Interno', method: 'Dinheiro/Pix'
        });
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'cashflow_manual', operation: 'create', requestResourceData: payload
        }));
      });
  };

  const handleMonthNav = (direction: 'prev' | 'next') => {
    const current = parseISO(`${selectedMonth}-01`);
    const next = direction === 'next' ? addMonths(current, 1) : subMonths(current, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  if (!isMounted || loadingOrders || loadingManual) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative z-10">
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <BarChart3 size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Cérebro Financeiro VisComm</span>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
              REPORTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">FLUX</span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <button onClick={() => handleMonthNav('prev')} className="p-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border-r border-zinc-800"><ArrowLeft size={16}/></button>
              <span className="px-6 py-2 text-xs font-black uppercase text-white tracking-widest min-w-[140px] text-center">
                {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </span>
              <button onClick={() => handleMonthNav('next')} className="p-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border-l border-zinc-800"><ArrowRight size={16}/></button>
            </div>
            
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-6 h-12 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </header>

        <Tabs defaultValue="financeiro" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 mb-6">
            <TabsTrigger value="financeiro" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="operacional" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Operacional</TabsTrigger>
            <TabsTrigger value="despesas" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Despesas</TabsTrigger>
          </TabsList>

          <TabsContent value="financeiro" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#09090b] border border-zinc-800 rounded-3xl p-6 lg:col-span-2">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Concentração de Capital</h3>
                  <span className="text-[10px] bg-zinc-900 text-zinc-400 px-3 py-1 rounded-full border border-zinc-800 font-black uppercase tracking-widest">Ativos Liquidados</span>
                </div>
                <div className="space-y-6">
                  {accountsSummary.items.map((acc) => (
                    <div key={acc.label} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg shadow-sm">{acc.icon}</div>
                          <div>
                            <span className="text-white text-sm font-black uppercase tracking-wider block">{acc.label}</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{acc.type} • {acc.value > 0 ? Math.round((acc.value / (accountsSummary.total || 1)) * 100) : 0}%</span>
                          </div>
                        </div>
                        <span className="text-white font-mono font-black">{acc.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${acc.value > 0 ? (acc.value / (accountsSummary.total || 1)) * 100 : 0}%` }} className="h-full rounded-full" style={{ backgroundColor: acc.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-[#09090b] to-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
                   <span className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.3em] mb-4">Total Liquidado no Mês</span>
                   <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{accountsSummary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
                   <div className="w-12 h-1 bg-primary rounded-full mt-4" />
                </div>
                <Button onClick={() => setIsEntryModalOpen(true)} className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(255,95,31,0.3)] hover:bg-white transition-all"><Plus size={18} className="mr-2" /> Novo Lançamento Manual</Button>
              </div>
            </div>

            <section className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden">
               <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Livro-Caixa Consolidado</h3>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{transactions.length} Movimentações</span>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-900/50 text-[10px] text-zinc-500 uppercase font-black border-b border-white/5">
                        <th className="p-4 pl-6">Data</th>
                        <th className="p-4">Descrição do Lançamento</th>
                        <th className="p-4 text-center">Modalidade / Conta</th>
                        <th className="p-4 text-center">Tipo</th>
                        <th className="p-4 pr-6 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-zinc-600 uppercase font-black text-[10px] tracking-[0.3em]">Nenhuma movimentação para este mês</td></tr>
                      ) : (
                        transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 pl-6 text-[10px] font-mono text-zinc-500">{format(parseISO(tx.date), 'dd/MM/yy')}</td>
                            <td className="p-4">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase group-hover:text-primary transition-colors">{tx.description}</span>
                                  {tx.isAuto && <span className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">Baixa Automática OS</span>}
                               </div>
                            </td>
                            <td className="p-4 text-center">
                               <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-zinc-900 border border-white/5">
                                  <span className="text-[9px] text-zinc-400 font-black uppercase">{tx.method}</span>
                                  <span className="text-[9px] text-primary font-black uppercase opacity-60">→ {tx.account}</span>
                               </div>
                            </td>
                            <td className="p-4 text-center">
                               <span className={cn(
                                 "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                 tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                               )}>
                                 {tx.type === 'income' ? 'ENTRADA' : 'SAÍDA'}
                               </span>
                            </td>
                            <td className={cn(
                              "p-4 pr-6 text-right font-mono font-black text-sm",
                              tx.type === 'income' ? 'text-[#4ade80]' : 'text-[#FF5F1F]'
                            )}>
                              {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </section>
          </TabsContent>
          
          {/* Outros conteúdos mantidos (Operacional e Despesas) */}
        </Tabs>

        {/* MODAL DE LANÇAMENTO MANUAL */}
        <AnimatePresence>
          {isEntryModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsEntryModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#09090b] w-full max-w-md border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Novo Lançamento Manual</h2>
                <form onSubmit={handleSaveEntry} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-4">
                     <button type="button" onClick={() => setEntryForm({...entryForm, type: 'income'})} className={cn("py-2 rounded-lg text-[10px] font-black uppercase transition-all", entryForm.type === 'income' ? "bg-emerald-500 text-black shadow-lg" : "text-zinc-500")}>Entrada</button>
                     <button type="button" onClick={() => setEntryForm({...entryForm, type: 'expense'})} className={cn("py-2 rounded-lg text-[10px] font-black uppercase transition-all", entryForm.type === 'expense' ? "bg-red-500 text-white shadow-lg" : "text-zinc-500")}>Saída</button>
                  </div>
                  
                  <input required placeholder="Descrição (Ex: Venda Balcão, Retirada Sócios...)" value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="0.01" placeholder="Valor R$" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                    <input required type="date" value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <select value={entryForm.method} onChange={e => setEntryForm({...entryForm, method: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none">
                      {['Dinheiro/Pix', 'Cartão', 'Boleto', 'Outros'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={entryForm.account} onChange={e => setEntryForm({...entryForm, account: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none">
                      {['Caixa Interno', 'SICOOB - Lindóia', 'SICOOB - Serra Negra', 'Máquina PAGBANK', 'Máquina SIPAG'].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <Button type="submit" className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(255,95,31,0.4)] mt-4">Confirmar Lançamento</Button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
