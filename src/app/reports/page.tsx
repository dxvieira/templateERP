'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Wallet, TrendingUp, TrendingDown, Plus, Trash2, Loader2, 
  X, RefreshCw, Download, ArrowLeft, ArrowRight,
  Package, Edit, Info, Clock, CheckCircle2, AlertTriangle, Calendar as CalendarIcon, ArrowDownLeft
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, isWithinInterval, parseISO, addMonths, subMonths, isBefore, isSameDay } from 'date-fns';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
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
  
  // --- ESTADOS DE LANÇAMENTO (LIVRO-CAIXA) ---
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState({
    description: '', 
    amount: '', 
    type: 'income' as 'income' | 'expense', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    account: 'Caixa Interno', 
    method: 'Dinheiro/Pix'
  });

  // --- ESTADOS DE CONTAS A PAGAR (GERADOR DE PARCELAS) ---
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [editingPayableId, setEditingPayableId] = useState<string | null>(null);
  const [payableForm, setPayableForm] = useState({
    description: '',
    supplier: '',
    category: 'Material',
    totalAmount: '',
    installmentsCount: '1'
  });
  const [generatedInstallments, setGeneratedInstallments] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- QUERIES ---
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const manualCashflowQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'cashflow_manual'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const accountsPayableQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'accounts_payable'), orderBy('dueDate', 'asc'));
  }, [firestore, user]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);
  const { data: manualEntries, isLoading: loadingManual } = useCollection(manualCashflowQuery);
  const { data: payables, isLoading: loadingPayables } = useCollection(accountsPayableQuery);

  // --- LÓGICA DE DATAS ---
  const dateRange = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return {
      start: startOfMonth(new Date(year, month - 1)),
      end: endOfMonth(new Date(year, month - 1))
    };
  }, [selectedMonth]);

  // --- MOTOR OPERACIONAL ---
  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    
    const filtered = orders.filter(order => {
      const dDate = order.delivery_date || order.deliveryDate;
      if (!dDate) return false;
      return isWithinInterval(parseISO(dDate), { start: dateRange.start, end: dateRange.end });
    });

    return [...filtered].sort((a, b) => {
      const totalA = Number(a.total_value || a.totalValue || 0);
      const paidA = Number(a.amount_paid || a.amountPaid || 0);
      const balA = totalA - paidA;
      
      const totalB = Number(b.total_value || b.totalValue || 0);
      const paidB = Number(b.amount_paid || b.amountPaid || 0);
      const balB = totalB - paidB;

      const hasDebtA = balA > 0;
      const hasDebtB = balB > 0;

      if (hasDebtA && !hasDebtB) return -1;
      if (!hasDebtA && hasDebtB) return 1;

      const dateA = a.delivery_date || a.deliveryDate || '9999-99-99';
      const dateB = b.delivery_date || b.deliveryDate || '9999-99-99';
      
      if (hasDebtA) return dateA.localeCompare(dateB);
      return dateB.localeCompare(dateA);
    });
  }, [orders, dateRange]);

  // --- LIVRO-CAIXA ---
  const transactions = useMemo(() => {
    if (!orders || !manualEntries) return [];
    const result: any[] = [];

    orders.forEach(order => {
      const installments = Array.isArray(order.installments) ? order.installments : [];
      installments.forEach(inst => {
        if (inst.status === 'paid' && inst.paid_date) {
          const paidDate = parseISO(inst.paid_date);
          if (isWithinInterval(paidDate, { start: dateRange.start, end: dateRange.end })) {
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

    manualEntries.forEach(entry => {
      if (entry.date) {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: dateRange.start, end: dateRange.end })) {
          result.push({ ...entry, isAuto: false });
        }
      }
    });

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, manualEntries, dateRange]);

  // --- CÁLCULO DOS KPIs ---
  const kpiMetrics = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const pending = sortedOrders.reduce((acc, o) => {
      const total = Number(o.total_value || o.totalValue || 0);
      const paid = Number(o.amount_paid || o.amountPaid || 0);
      return acc + Math.max(0, total - paid);
    }, 0);

    const payableTotal = (payables || [])
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return {
      income,
      expense,
      balance: income - expense,
      pending,
      payableTotal
    };
  }, [transactions, sortedOrders, payables]);

  // --- CONCENTRAÇÃO DE CAPITAL ---
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

        if (accounts[targetKey]) {
          accounts[targetKey].value += tx.amount;
          totalEmCaixa += tx.amount;
        }
      }
    });

    return { 
      items: Object.values(accounts).sort((a, b) => b.value - a.value),
      total: totalEmCaixa 
    };
  }, [transactions]);

  // --- EXPORTAÇÃO ---
  const exportToCSV = useCallback(() => {
    const headers = ["DATA", "DESCRIÇÃO", "MODALIDADE", "CONTA", "TIPO", "VALOR"];
    const rows = transactions.map(tx => [
      tx.date ? format(parseISO(tx.date), 'dd/MM/yyyy') : '',
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

  // --- LÓGICA DE LANÇAMENTOS MANUAIS ---
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;

    const payload = {
      ...entryForm,
      amount: Number(entryForm.amount),
      updatedAt: serverTimestamp(),
      ...(editingEntryId ? {} : { createdAt: serverTimestamp() })
    };

    const docRef = editingEntryId 
      ? doc(firestore, 'cashflow_manual', editingEntryId) 
      : doc(collection(firestore, 'cashflow_manual'));

    setDoc(docRef, { ...payload, id: docRef.id }, { merge: true })
      .then(() => {
        toast({ title: editingEntryId ? "Lançamento Atualizado" : "Lançamento Registrado" });
        setIsEntryModalOpen(false);
        setEditingEntryId(null);
        setEntryForm({
          description: '', amount: '', type: 'income', date: format(new Date(), 'yyyy-MM-dd'), account: 'Caixa Interno', method: 'Dinheiro/Pix'
        });
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'cashflow_manual', operation: editingEntryId ? 'update' : 'create', requestResourceData: payload
        }));
      });
  };

  // EXCLUSÃO DE LANÇAMENTO MANUAL (FLUXO DE CAIXA)
  const handleDeleteTransaction = useCallback((id: string) => {
    if (!firestore || !id) return;
    if (!window.confirm("Deseja realmente excluir este lançamento manual?")) return;

    const docRef = doc(firestore, 'cashflow_manual', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Lançamento Removido" });
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        }));
      });
  }, [firestore, toast]);

  // --- LÓGICA DE CONTAS A PAGAR (GERADOR) ---
  const handleGenerateInstallments = () => {
    const total = parseFloat(payableForm.totalAmount);
    const count = parseInt(payableForm.installmentsCount);
    if (isNaN(total) || isNaN(count) || count <= 0) {
      toast({ variant: "destructive", title: "Erro na Geração", description: "Informe o valor total e a quantidade de parcelas." });
      return;
    }

    const amountPerInstallment = parseFloat((total / count).toFixed(2));
    const newInstallments = [];
    const baseDate = new Date();

    for (let i = 0; i < count; i++) {
      const dueDate = addMonths(baseDate, i);
      newInstallments.push({
        id: i + 1,
        amount: i === count - 1 ? (total - (amountPerInstallment * (count - 1))).toFixed(2) : amountPerInstallment.toFixed(2),
        dueDate: format(dueDate, 'yyyy-MM-dd')
      });
    }
    setGeneratedInstallments(newInstallments);
    toast({ title: "Parcelas Projetadas", description: "Você pode ajustar datas e valores individualmente agora." });
  };

  const handleSavePayablesBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || generatedInstallments.length === 0) return;

    try {
      if (editingPayableId) {
        // Edição de item único
        const inst = generatedInstallments[0];
        const payload = {
          description: payableForm.description,
          supplier: payableForm.supplier,
          category: payableForm.category,
          amount: Number(inst.amount),
          dueDate: inst.dueDate,
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(firestore, 'accounts_payable', editingPayableId), payload, { merge: true });
      } else {
        // Criação em lote
        for (const inst of generatedInstallments) {
          const payload = {
            description: `${payableForm.description} (${inst.id}/${payableForm.installmentsCount})`,
            supplier: payableForm.supplier,
            category: payableForm.category,
            amount: Number(inst.amount),
            dueDate: inst.dueDate,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          const docRef = doc(collection(firestore, 'accounts_payable'));
          await setDoc(docRef, { ...payload, id: docRef.id });
        }
      }

      toast({ title: editingPayableId ? "Conta Atualizada" : "Parcelas Registradas", description: "Seu cronograma de pagamentos foi atualizado." });
      setIsPayableModalOpen(false);
      setEditingPayableId(null);
      setGeneratedInstallments([]);
      setPayableForm({ description: '', supplier: '', category: 'Material', totalAmount: '', installmentsCount: '1' });
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'accounts_payable', operation: 'write'
      }));
    }
  };

  const handlePayAccount = async (payable: any) => {
    if (!firestore || !user) return;
    
    // 1. Marcar como paga na accounts_payable
    const payableRef = doc(firestore, 'accounts_payable', payable.id);
    const cashflowRef = doc(collection(firestore, 'cashflow_manual'));

    const cashflowPayload = {
      id: cashflowRef.id,
      description: `PGTO: ${payable.description} ${payable.supplier ? `(${payable.supplier})` : ''}`,
      amount: Number(payable.amount),
      type: 'expense',
      date: format(new Date(), 'yyyy-MM-dd'),
      account: 'Caixa Interno',
      method: 'Boleto',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(payableRef, { status: 'paid', updatedAt: serverTimestamp() }, { merge: true });
      await setDoc(cashflowRef, cashflowPayload);
      toast({ title: "Pagamento Confirmado", description: "A conta foi marcada como paga e registrada no fluxo de caixa." });
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'accounts_payable/pay', operation: 'update'
      }));
    }
  };

  // EXCLUSÃO DE CONTA A PAGAR (BOLETO)
  const handleDeletePayable = useCallback((id: string) => {
    if (!firestore || !id) return;
    if (!window.confirm("Deseja realmente excluir este registro de conta a pagar?")) return;

    const docRef = doc(firestore, 'accounts_payable', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Registro Removido" });
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        }));
      });
  }, [firestore, toast]);

  const handleMonthNav = (direction: 'prev' | 'next') => {
    const current = parseISO(`${selectedMonth}-01`);
    const next = direction === 'next' ? addMonths(current, 1) : subMonths(current, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  const handleOpenEditPayable = (payable: any) => {
    setEditingPayableId(payable.id);
    setPayableForm({
      description: payable.description.split(' (')[0],
      supplier: payable.supplier || '',
      category: payable.category || 'Material',
      totalAmount: String(payable.amount),
      installmentsCount: '1'
    });
    setGeneratedInstallments([{ id: 1, amount: String(payable.amount), dueDate: payable.dueDate }]);
    setIsPayableModalOpen(true);
  };

  if (!isMounted || loadingOrders || loadingManual || loadingPayables) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative z-10">
        
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

        {/* --- KPI GRID --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <motion.div whileHover={{ y: -4 }} className="group relative bg-[#09090b] border border-zinc-800 rounded-3xl p-6 transition-all duration-300 hover:border-[#4ade80]/40">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"><TrendingUp size={20} /></div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Receitas</span>
            </div>
            <span className="text-2xl font-black text-white">{kpiMetrics.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="group relative bg-[#09090b] border border-zinc-800 rounded-3xl p-6 transition-all duration-300 hover:border-[#ef4444]/40">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"><TrendingDown size={20} /></div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Despesas</span>
            </div>
            <span className="text-2xl font-black text-white">{kpiMetrics.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="group relative bg-[#09090b] border border-zinc-800 rounded-3xl p-6 transition-all duration-300 hover:border-primary/40">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20"><Wallet size={20} /></div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Saldo Caixa</span>
            </div>
            <span className="text-2xl font-black text-white">{kpiMetrics.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="group relative bg-[#09090b] border border-zinc-800 rounded-3xl p-6 transition-all duration-300 hover:border-[#eab308]/40">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20"><Clock size={20} /></div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">A Receber</span>
            </div>
            <span className="text-2xl font-black text-white">{kpiMetrics.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="group relative bg-[#09090b] border border-zinc-800 rounded-3xl p-6 transition-all duration-300 hover:border-[#ef4444]/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"><AlertTriangle size={20} /></div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Contas a Pagar</span>
            </div>
            <span className="text-2xl font-black text-white">{kpiMetrics.payableTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </motion.div>
        </section>

        <Tabs defaultValue="operacional" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 mb-8 p-1">
            <TabsTrigger value="operacional" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6 h-10">Monitor Operacional</TabsTrigger>
            <TabsTrigger value="financeiro" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6 h-10">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="payable" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6 h-10">Contas a Pagar</TabsTrigger>
          </TabsList>

          <TabsContent value="operacional" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {sortedOrders.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl opacity-20"><Package size={48} className="mx-auto mb-4" /><p className="text-[10px] uppercase font-black tracking-widest">Nenhuma OS para este período</p></div>
              ) : (
                sortedOrders.map((order) => {
                  const total = Number(order.total_value || order.totalValue || 0);
                  const paid = Number(order.amount_paid || order.amountPaid || 0);
                  const isDone = ['Concluído', 'Entregue'].includes(order.status);
                  const deadline = order.delivery_date || order.deliveryDate ? parseISO(order.delivery_date || order.deliveryDate) : null;
                  const isLate = deadline && isBefore(deadline, new Date()) && !isDone;

                  return (
                    <motion.div key={order.id} layout onClick={() => router.push(`/orders?edit=${order.id}`)} className="group bg-[#09090b] border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-primary/40 hover:scale-[1.01] transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-white uppercase truncate group-hover:text-primary transition-colors">{order.client}</h3>
                          <p className="text-[9px] font-mono text-zinc-500 mt-0.5">#{order.id.slice(-6)}</p>
                        </div>
                        {isLate ? (
                          <div className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded text-[8px] font-black uppercase animate-pulse-neon">Atrasado</div>
                        ) : isDone ? (
                          <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-[8px] font-black uppercase">Finalizado</div>
                        ) : (
                          <div className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-[8px] font-black uppercase">Prazo: {deadline ? format(deadline, 'dd/MM') : '--/--'}</div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1 block">Total OS</span>
                          <span className="text-base md:text-lg font-bold tracking-tight text-white">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 opacity-60 mb-1 block">Liquidado</span>
                          <span className="text-base md:text-lg font-bold tracking-tight text-emerald-500">{paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-primary opacity-60 mb-1 block">A Receber</span>
                          <span className="text-base md:text-lg font-bold tracking-tight text-primary">{(total - paid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>

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
                <Button onClick={() => { setEditingEntryId(null); setIsEntryModalOpen(true); }} className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(255,95,31,0.3)] hover:bg-white transition-all"><Plus size={18} className="mr-2" /> Novo Lançamento Manual</Button>
              </div>
            </div>

            <section className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden">
               <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Livro-Caixa Consolidado</h3>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{transactions.length} Movimentações</span>
               </div>
               <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-900/50 text-[10px] text-zinc-500 uppercase font-black border-b border-white/5 sticky top-0 z-10">
                        <th className="p-4 pl-6">Data</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4 text-center">Conta / Destino</th>
                        <th className="p-4 text-center">Tipo</th>
                        <th className="p-4 text-center">Valor</th>
                        <th className="p-4 pr-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.length === 0 ? (
                        <tr><td colSpan={6} className="p-12 text-center text-zinc-600 uppercase font-black text-[10px] tracking-[0.3em]">Nenhuma movimentação para este mês</td></tr>
                      ) : (
                        transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 pl-6 text-[10px] font-mono text-zinc-500">{tx.date ? format(parseISO(tx.date), 'dd/MM/yy') : '--/--/--'}</td>
                            <td className="p-4">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase group-hover:text-primary transition-colors">{tx.description}</span>
                                  {tx.isAuto && <span className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter flex items-center gap-1"><Info size={8}/> Baixa Automática OS</span>}
                               </div>
                            </td>
                            <td className="p-4 text-center">
                               <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-zinc-900 border border-white/5">
                                  <span className="text-[9px] text-zinc-400 font-black uppercase">{tx.method || 'Geral'}</span>
                                  <span className="text-[9px] text-primary font-black uppercase opacity-60">→ {tx.account}</span>
                               </div>
                            </td>
                            <td className="p-4 text-center">
                               <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border", tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20')}>{tx.type === 'income' ? 'ENTRADA' : 'SAÍDA'}</span>
                            </td>
                            <td className={cn("p-4 text-center font-mono font-black text-sm", tx.type === 'income' ? 'text-[#4ade80]' : 'text-[#FF5F1F]')}>{tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="p-4 pr-6 text-right">
                               <div className="flex justify-end gap-3">
                                  {!tx.isAuto ? (
                                    <>
                                      <button onClick={() => { setEditingEntryId(tx.id); setEntryForm({...tx, amount: String(tx.amount)}); setIsEntryModalOpen(true); }} className="p-2 rounded-lg text-zinc-500 hover:text-white transition-colors"><Edit size={16}/></button>
                                      <button onClick={() => handleDeleteTransaction(tx.id)} className="p-2 rounded-lg text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </>
                                  ) : (
                                    <button onClick={() => toast({ title: "Proteção de Dados", description: "Estorne na OS correspondente." })} className="p-2 rounded-lg opacity-20 text-zinc-500 cursor-not-allowed"><Trash2 size={16}/></button>
                                  )}
                               </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </section>
          </TabsContent>

          <TabsContent value="payable" className="space-y-6">
            <header className="flex justify-between items-center mb-4">
               <div><h2 className="text-xl font-black text-white uppercase tracking-tight">Pauta de Pagamentos</h2><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Gestão de boletos e compromissos</p></div>
               <Button onClick={() => { setEditingPayableId(null); setGeneratedInstallments([]); setIsPayableModalOpen(true); }} className="bg-primary text-black font-black uppercase text-[10px] tracking-widest px-6 h-12 rounded-2xl shadow-[0_0_20px_rgba(255,95,31,0.3)] hover:bg-white transition-all"><Plus size={16} className="mr-2" /> Nova Conta a Pagar</Button>
            </header>

            <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-900/50 text-[10px] text-zinc-500 uppercase font-black border-b border-white/5 sticky top-0 z-10">
                      <th className="p-4 pl-6">Vencimento</th>
                      <th className="p-4">Descrição / Fornecedor</th>
                      <th className="p-4 text-center">Categoria</th>
                      <th className="p-4 text-center">Valor</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 pr-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(!payables || payables.length === 0) ? (
                      <tr><td colSpan={6} className="p-12 text-center text-zinc-600 uppercase font-black text-[10px] tracking-[0.3em]">Nenhuma conta pendente registrada</td></tr>
                    ) : (
                      payables.map(payable => {
                        const isPaid = payable.status === 'paid';
                        const dueDate = parseISO(payable.dueDate);
                        const isLate = isBefore(dueDate, new Date()) && !isPaid && !isSameDay(dueDate, new Date());

                        return (
                          <tr key={payable.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 pl-6">
                               <div className={cn("flex flex-col items-start px-2 py-1 rounded border w-fit", isLate ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-zinc-900 border-zinc-800 text-zinc-400")}>
                                  <span className="text-[10px] font-mono font-bold">{format(dueDate, 'dd/MM/yy')}</span>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white uppercase group-hover:text-primary transition-colors">{payable.description}</span>
                                  {payable.supplier && <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">{payable.supplier}</span>}
                               </div>
                            </td>
                            <td className="p-4 text-center"><span className="text-[9px] text-zinc-400 font-black uppercase bg-zinc-900 border border-white/5 px-2 py-0.5 rounded">{payable.category}</span></td>
                            <td className="p-4 text-center font-mono font-black text-sm text-white">{Number(payable.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="p-4 text-center">
                               {isPaid ? (
                                 <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Pago</span>
                               ) : isLate ? (
                                 <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">Atrasado</span>
                               ) : (
                                 <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Pendente</span>
                               )}
                            </td>
                            <td className="p-4 pr-6 text-right">
                               <div className="flex justify-end gap-2">
                                  {!isPaid && (
                                    <button onClick={() => handlePayAccount(payable)} className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all" title="Dar Baixa"><CheckCircle2 size={16}/></button>
                                  )}
                                  <button onClick={() => handleOpenEditPayable(payable)} className="p-2 rounded-lg text-zinc-500 hover:text-white transition-colors" title="Editar Registro"><Edit size={16}/></button>
                                  <button onClick={() => handleDeletePayable(payable.id)} className="p-2 rounded-lg text-zinc-500 hover:text-red-500 transition-colors" title="Excluir Registro"><Trash2 size={16}/></button>
                               </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
               </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* MODAL LANÇAMENTO MANUAL */}
        <AnimatePresence>
          {isEntryModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm" onClick={() => { setIsEntryModalOpen(false); setEditingEntryId(null); }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#09090b] w-full max-w-md border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8">{editingEntryId ? 'Editar Lançamento' : 'Novo Lançamento Manual'}</h2>
                <form onSubmit={handleSaveEntry} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-4">
                     <button type="button" onClick={() => setEntryForm({...entryForm, type: 'income'})} className={cn("py-2 rounded-lg text-[10px] font-black uppercase transition-all", entryForm.type === 'income' ? "bg-emerald-500 text-black shadow-lg" : "text-zinc-500")}>Entrada</button>
                     <button type="button" onClick={() => setEntryForm({...entryForm, type: 'expense'})} className={cn("py-2 rounded-lg text-[10px] font-black uppercase transition-all", entryForm.type === 'expense' ? "bg-red-500 text-white shadow-lg" : "text-zinc-500")}>Saída</button>
                  </div>
                  <div><label className={labelClass}>Descrição</label><input required placeholder="Ex: Retirada, Venda Balcão..." value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} className={inputClass} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Valor (R$)</label><input required type="number" step="0.01" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Data</label><input required type="date" value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} className={inputClass} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Modalidade</label><select value={entryForm.method} onChange={e => setEntryForm({...entryForm, method: e.target.value})} className={inputClass}>{['Dinheiro/Pix', 'Cartão', 'Boleto', 'Outros'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                    <div><label className={labelClass}>Conta</label><select value={entryForm.account} onChange={e => setEntryForm({...entryForm, account: e.target.value})} className={inputClass}>{['Caixa Interno', 'SICOOB - Lindóia', 'SICOOB - Serra Negra', 'Máquina PAGBANK', 'Máquina SIPAG'].map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                  </div>
                  <div className="flex gap-3 pt-4"><button type="button" onClick={() => { setIsEntryModalOpen(false); setEditingEntryId(null); }} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancelar</button><Button type="submit" className="flex-[2] h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(255,95,31,0.4)]">{editingEntryId ? 'Atualizar' : 'Confirmar'}</Button></div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL CONTAS A PAGAR (GERADOR DE PARCELAS) */}
        <AnimatePresence>
          {isPayableModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm" onClick={() => { setIsPayableModalOpen(false); setEditingPayableId(null); setGeneratedInstallments([]); }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#09090b] w-full max-w-2xl border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8">{editingPayableId ? 'Editar Boleto' : 'Gerador de Contas a Pagar'}</h2>
                
                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                  <form onSubmit={handleSavePayablesBatch} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2"><label className={labelClass}>Descrição Geral / Fornecedor</label><input required placeholder="Ex: Papelaria Industrial" value={payableForm.description} onChange={e => setPayableForm({...payableForm, description: e.target.value})} className={inputClass} /></div>
                      <div><label className={labelClass}>Fornecedor (Opcional)</label><input placeholder="Ex: Acrílicos S.A." value={payableForm.supplier} onChange={e => setPayableForm({...payableForm, supplier: e.target.value})} className={inputClass} /></div>
                      <div><label className={labelClass}>Categoria</label><select value={payableForm.category} onChange={e => setPayableForm({...payableForm, category: e.target.value})} className={inputClass}>{['Material', 'Impostos/Taxas', 'Infraestrutura', 'Comissões', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>

                    {!editingPayableId && (
                      <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3 mb-2"><TrendingDown className="text-primary w-4 h-4" /><h4 className="text-[10px] font-black text-white uppercase tracking-widest">Plano de Parcelamento</h4></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          <div><label className={labelClass}>Valor Total (R$)</label><input type="number" step="0.01" value={payableForm.totalAmount} onChange={e => setPayableForm({...payableForm, totalAmount: e.target.value})} className={inputClass} /></div>
                          <div><label className={labelClass}>Qtd. Parcelas</label><input type="number" min="1" value={payableForm.installmentsCount} onChange={e => setPayableForm({...payableForm, installmentsCount: e.target.value})} className={inputClass} /></div>
                          <button type="button" onClick={handleGenerateInstallments} className="h-12 bg-white/5 border border-white/10 rounded-xl text-white font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">Gerar Parcelas</button>
                        </div>
                      </div>
                    )}

                    {generatedInstallments.length > 0 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2"><h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Configuração Individual de Boletos</h4><span className="text-[9px] text-primary font-bold uppercase">{generatedInstallments.length} Itens no Lote</span></div>
                        <div className="space-y-2">
                          {generatedInstallments.map((inst, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-3 items-center bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                              <span className="text-[10px] font-black text-zinc-600 w-8 text-center">{inst.id}/{payableForm.installmentsCount}</span>
                              <div className="flex-1 w-full"><label className="text-[8px] text-zinc-600 uppercase font-black ml-1 mb-1 block">Vencimento</label><input type="date" value={inst.dueDate} onChange={e => { const n = [...generatedInstallments]; n[index].dueDate = e.target.value; setGeneratedInstallments(n); }} className={cn(inputClass, "p-2 h-10")} /></div>
                              <div className="flex-1 w-full"><label className="text-[8px] text-zinc-600 uppercase font-black ml-1 mb-1 block">Valor da Parcela</label><input type="number" step="0.01" value={inst.amount} onChange={e => { const n = [...generatedInstallments]; n[index].amount = e.target.value; setGeneratedInstallments(n); }} className={cn(inputClass, "p-2 h-10 text-right")} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                <div className="flex gap-3 pt-6 border-t border-white/5">
                  <button type="button" onClick={() => { setIsPayableModalOpen(false); setEditingPayableId(null); setGeneratedInstallments([]); }} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancelar</button>
                  <Button onClick={handleSavePayablesBatch} disabled={generatedInstallments.length === 0} className="flex-[2] h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(255,95,31,0.4)] disabled:opacity-20">{editingPayableId ? 'Atualizar Registro' : 'Salvar Todos os Boletos'}</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
