'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Wallet, CreditCard, 
  Banknote, TrendingUp, FileText, Plus, Trash2, Loader2, DollarSign, 
  Briefcase, AlertCircle, X, RefreshCw, Filter, Clock, CheckCircle2,
  Package, ChevronRight, AlertTriangle
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

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

/**
 * REPORTS MANAGER: O Cérebro Financeiro (NEXUS/FLUX)
 * Refatorado para Listagem Operacional Individualizada e Radar de Liquidez.
 */
export default function ReportsManagerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });
  const [appliedDateRange, setAppliedDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    setTempDateRange({ start, end });
    setAppliedDateRange({ start, end });
    setIsMounted(true);
  }, []);

  const handleApplyFilter = useCallback(() => {
    setAppliedDateRange({ ...tempDateRange });
    toast({ 
      title: "Cérebro Sincronizado", 
      description: `Relatórios atualizados com sucesso.` 
    });
  }, [tempDateRange, toast]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenses'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);
  const { data: expenses, isLoading: loadingExpenses } = useCollection(expensesQuery);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '', value: '', category: 'Material', date: format(new Date(), 'yyyy-MM-dd')
  });

  const financialData = useMemo(() => {
    if (!orders || !expenses || !appliedDateRange.start) return null;

    const intervalStart = startOfDay(parseISO(appliedDateRange.start));
    const intervalEnd = endOfDay(parseISO(appliedDateRange.end));

    const filteredOrders = orders.filter(o => {
      const dateStr = o.emission_date || o.emissionDate || (o.createdAt?.seconds ? format(new Date(o.createdAt.seconds * 1000), 'yyyy-MM-dd') : null);
      if (!dateStr) return false;
      try {
        const orderDate = parseISO(dateStr);
        return isWithinInterval(orderDate, { start: intervalStart, end: intervalEnd });
      } catch (e) { return false; }
    });

    const filteredExpenses = expenses.filter(e => {
      if (!e.date) return false;
      try {
        const expenseDate = parseISO(e.date);
        return isWithinInterval(expenseDate, { start: intervalStart, end: intervalEnd });
      } catch (e) { return false; }
    });

    let income = 0;
    let aReceber = 0;

    filteredOrders.forEach(o => {
      const total = Number(o.total_value || o.totalValue) || 0;
      const pago = Number(o.amount_paid || o.amountPaid) || 0;
      const devido = total - pago;

      income += pago;
      if (devido > 0) aReceber += devido;
    });

    const outcome = filteredExpenses.reduce((acc, e) => acc + (Number(e.value) || 0), 0);

    return { 
      income, outcome, net: income - outcome, aReceber,
      filteredOrders, filteredExpenses 
    };
  }, [orders, expenses, appliedDateRange]);

  // NOVO: Ordenação por Prioridade Financeira e Prazo
  const sortedOrders = useMemo(() => {
    if (!financialData?.filteredOrders) return [];
    
    return [...financialData.filteredOrders].sort((a, b) => {
      const totalA = Number(a.total_value || a.totalValue) || 0;
      const paidA = Number(a.amount_paid || a.amountPaid) || 0;
      const balanceA = totalA - paidA;

      const totalB = Number(b.total_value || b.totalValue) || 0;
      const paidB = Number(b.amount_paid || b.amountPaid) || 0;
      const balanceB = totalB - paidB;

      const hasBalanceA = balanceA > 0;
      const hasBalanceB = balanceB > 0;

      // 1º: Quem tem saldo devedor vai pro topo
      if (hasBalanceA && !hasBalanceB) return -1;
      if (!hasBalanceA && hasBalanceB) return 1;

      const dateA = a.delivery_date || a.deliveryDate || '9999-99-99';
      const dateB = b.delivery_date || b.deliveryDate || '9999-99-99';

      // 2º: Entre devedores, os mais urgentes/atrasados primeiro
      if (hasBalanceA && hasBalanceB) {
        return dateA.localeCompare(dateB);
      }

      // 3º: Os liquidados vão pro final, ordenados por data decrescente
      return dateB.localeCompare(dateA);
    });
  }, [financialData?.filteredOrders]);

  const accountsSummary = useMemo(() => {
    const accounts: Record<string, any> = {
      'CAIXA INTERNO': { label: 'CAIXA INTERNO', value: 0, color: '#10b981', type: 'Dinheiro', icon: '💵' },
      'SICOOB LINDOIA': { label: 'SICOOB LINDÓIA', value: 0, color: '#0ea5e9', type: 'Banco', icon: '🏦' },
      'SICOOB SERRA NEGRA': { label: 'SICOOB SERRA NEGRA', value: 0, color: '#3b82f6', type: 'Banco', icon: '🏦' },
      'PAGBANK': { label: 'PAGBANK', value: 0, color: '#eab308', type: 'Máquina', icon: '💳' },
      'SIPAG': { label: 'SIPAG / SICOOB', value: 0, color: '#f97316', type: 'Máquina', icon: '💳' },
    };

    let totalEmCaixa = 0;
    const ordersData = financialData?.filteredOrders || [];

    ordersData.forEach(order => {
      if (order.installments && Array.isArray(order.installments)) {
        order.installments.forEach(inst => {
          if (inst.status === 'paid') {
            const amount = Number(inst.amount) || 0;
            const method = String(inst.payment_method || inst.paymentMethod || '').toUpperCase();

            if (method.includes('PAGBANK')) accounts['PAGBANK'].value += amount;
            else if (method.includes('SIPAG')) accounts['SIPAG'].value += amount;
            else if (method.includes('LINDÓIA') || method.includes('LINDOIA')) accounts['SICOOB LINDOIA'].value += amount;
            else if (method.includes('SERRA NEGRA')) accounts['SICOOB SERRA NEGRA'].value += amount;
            else accounts['CAIXA INTERNO'].value += amount;

            totalEmCaixa += amount;
          }
        });
      } 
      else if (order.amount_paid || order.amountPaid) {
        const amount = Number(order.amount_paid || order.amountPaid) || 0;
        const method = String(order.payment_method || order.paymentMethod || '').toUpperCase();

        if (method.includes('PAGBANK')) accounts['PAGBANK'].value += amount;
        else if (method.includes('SIPAG')) accounts['SIPAG'].value += amount;
        else if (method.includes('LINDÓIA') || method.includes('LINDOIA')) accounts['SICOOB LINDOIA'].value += amount;
        else if (method.includes('SERRA NEGRA')) accounts['SICOOB SERRA NEGRA'].value += amount;
        else accounts['CAIXA INTERNO'].value += amount;

        totalEmCaixa += amount;
      }
    });

    const items = Object.values(accounts)
      .map(acc => ({
        ...acc,
        percentage: totalEmCaixa === 0 ? 0 : (acc.value / totalEmCaixa) * 100
      }))
      .sort((a, b) => b.value - a.value);

    return { items, total: totalEmCaixa };
  }, [financialData?.filteredOrders]);

  const handleSaveExpense = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;

    const payload = {
      ...expenseForm,
      value: Number(expenseForm.value),
      createdAt: serverTimestamp()
    };

    const docRef = doc(collection(firestore, 'expenses'));
    setDoc(docRef, { ...payload, id: docRef.id })
      .then(() => {
        toast({ title: "Despesa Lançada" });
        setIsExpenseModalOpen(false);
        setExpenseForm({ description: '', value: '', category: 'Material', date: format(new Date(), 'yyyy-MM-dd') });
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path, operation: 'create', requestResourceData: payload
        }));
      });
  }, [firestore, user, expenseForm, toast]);

  const handleDeleteExpense = useCallback((id: string) => {
    if (!firestore || !confirm("Deseja remover este registro permanentemente?")) return;
    deleteDoc(doc(firestore, 'expenses', id)).catch(() => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `expenses/${id}`, operation: 'delete' }));
    });
  }, [firestore]);

  if (!isMounted || loadingOrders || loadingExpenses) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const kpis = financialData || { 
    income: 0, outcome: 0, net: 0, aReceber: 0,
    filteredOrders: [], filteredExpenses: []
  };

  const getStatusColor = (currentStatus: string) => {
    switch(currentStatus) {
      case 'Arte': return '#d946ef';
      case 'Serralheria': return '#EAB308';
      case 'Impressão': return '#3B82F6';
      case 'Acabamento': return '#FF5F1F';
      case 'Instalação': return '#8B5CF6';
      case 'Concluído':
      case 'Entregue': return '#4ade80';
      default: return '#71717A';
    }
  };

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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800 flex-1 sm:flex-none">
              <Calendar size={14} className="text-zinc-500 ml-2" />
              <input 
                type="date" 
                value={tempDateRange.start} 
                onChange={e => setTempDateRange(p => ({ ...p, start: e.target.value }))} 
                className="bg-transparent border-none text-xs text-white focus:ring-0 outline-none cursor-pointer" 
              />
              <span className="text-zinc-700 font-bold">/</span>
              <input 
                type="date" 
                value={tempDateRange.end} 
                onChange={e => setTempDateRange(p => ({ ...p, end: e.target.value }))} 
                className="bg-transparent border-none text-xs text-white focus:ring-0 outline-none cursor-pointer" 
              />
            </div>
            
            <button 
              onClick={handleApplyFilter}
              className="flex items-center justify-center gap-2 bg-primary text-black font-black uppercase text-[10px] tracking-widest px-6 h-12 rounded-2xl hover:bg-white transition-all shadow-[0_0_20px_rgba(255,95,31,0.3)] active:scale-95 group"
            >
              <RefreshCw size={14} className="group-active:rotate-180 transition-transform duration-500" />
              Atualizar Dados
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Entradas" value={kpis.income} icon={ArrowUpRight} color="text-green-500" />
          <KPICard title="Saídas" value={kpis.outcome} icon={ArrowDownRight} color="text-red-500" />
          <KPICard title="Lucro Líquido" value={kpis.net} icon={DollarSign} color="text-primary" />
          
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between group hover:border-primary/40 transition-colors relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary opacity-5 blur-[60px] rounded-full" />
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Clock className="text-primary w-5 h-5" /> 
              </div>
              <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mt-1">
                A Receber
              </span>
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-white font-mono">
                {kpis.aReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="text-[10px] text-primary mt-1 font-bold uppercase tracking-widest">
                Saldo devedor pendente
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="operacional" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 mb-6">
            <TabsTrigger value="operacional" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Operacional</TabsTrigger>
            <TabsTrigger value="financeiro" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="despesas" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Despesas</TabsTrigger>
          </TabsList>

          <TabsContent value="operacional" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LISTAGEM DE PEDIDOS ORDENADOS (COLUNA ESQUERDA) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Monitor de Entregas e Liquidação</h3>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">{kpis.filteredOrders.length} Pedidos no período</span>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedOrders.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                       <Package size={40} className="mx-auto mb-4 text-zinc-800 opacity-20" />
                       <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Nenhuma atividade no período filtrado</p>
                    </div>
                  ) : (
                    sortedOrders.map(order => {
                      const today = new Date().toISOString().split('T')[0];
                      const delivery = order.delivery_date || order.deliveryDate;
                      const isFinished = ['Concluído', 'Entregue'].includes(order.status);
                      const isLate = !isFinished && delivery && delivery < today;
                      
                      const total = Number(order.total_value || order.totalValue) || 0;
                      const paid = Number(order.amount_paid || order.amountPaid) || 0;
                      const balance = total - paid;

                      return (
                        <div 
                          key={order.id} 
                          onClick={() => router.push(`/orders?edit=${order.id}`)}
                          className={cn(
                            "bg-[#09090b] border border-zinc-800 rounded-2xl p-5 group hover:border-primary/30 transition-all cursor-pointer hover:scale-[1.01]",
                            balance > 0 && "border-primary/10 shadow-[inset_0_0_20px_rgba(255,95,31,0.02)]"
                          )}
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[8px] font-mono font-bold text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 uppercase tracking-tighter">#{order.id.slice(-6)}</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(order.status) }} />
                                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: getStatusColor(order.status) }}>{order.status}</span>
                                </div>
                              </div>
                              <h4 className="text-base font-black text-white uppercase truncate group-hover:text-primary transition-colors tracking-tight">{order.client}</h4>
                            </div>

                            <div className="text-right shrink-0">
                              {isFinished ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                                  <CheckCircle2 size={10} /> FINALIZADO
                                </span>
                              ) : isLate ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                  <AlertTriangle size={10} /> ATRASADO
                                </span>
                              ) : (
                                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                  Prazo: <span className="text-white font-mono">{delivery ? format(parseISO(delivery), 'dd/MM') : '--/--'}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/5">
                            <div className="flex flex-col">
                              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest opacity-80 mb-1">Total OS</p>
                              <p className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
                                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                            </div>
                            <div className="flex flex-col">
                              <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest opacity-80 mb-1">Liquidado</p>
                              <p className="text-xl md:text-2xl font-black text-emerald-500 tracking-tight leading-none">
                                {paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                            </div>
                            <div className="flex flex-col">
                              <p className="text-[10px] text-primary uppercase font-bold tracking-widest opacity-80 mb-1">A Receber</p>
                              <p className={cn("text-xl md:text-2xl font-black tracking-tight leading-none", balance > 0 ? "text-primary" : "text-zinc-700")}>
                                {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* PANORAMA FINANCEIRO (COLUNA DIREITA) */}
              <Card className="bg-zinc-900/30 border-zinc-800 p-6 flex flex-col h-fit lg:sticky lg:top-8">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-8">
                  Panorama Financeiro
                </h3>
                
                <div className="flex-1 flex flex-col items-center justify-center relative">
                  <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#FF5F1F15" strokeWidth="10" fill="none" />
                      <motion.circle 
                        cx="50" cy="50" r="40" 
                        stroke="#4ade80" 
                        strokeWidth="10" 
                        fill="none" 
                        strokeLinecap="round"
                        strokeDasharray="251"
                        initial={{ strokeDashoffset: 251 }}
                        animate={{ strokeDashoffset: 251 - ( (kpis.income / (kpis.income + kpis.aReceber || 1)) * 251 ) }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                      />
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white font-mono">
                        {Math.round((kpis.income / (kpis.income + kpis.aReceber || 1)) * 100)}%
                      </span>
                      <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mt-1">
                        Recebido
                      </span>
                    </div>
                  </div>

                  <div className="w-full space-y-2">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-zinc-800/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                        <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Recebido</span>
                      </div>
                      <span className="text-[10px] text-white font-mono font-bold">
                        {kpis.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-zinc-800/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full border border-primary" />
                        <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">A Receber</span>
                      </div>
                      <span className="text-[10px] text-white font-mono font-bold">
                        {kpis.aReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* COLUNA ESQUERDA: Mapa de Concentração de Capital */}
              <div className="bg-[#09090b] border border-zinc-800 rounded-3xl p-6 lg:col-span-2">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                    Concentração de Capital
                  </h3>
                  <span className="text-[10px] bg-zinc-900 text-zinc-400 px-3 py-1 rounded-full border border-zinc-800 font-black uppercase tracking-widest">
                    Distribuição de Ativos
                  </span>
                </div>

                <div className="space-y-6">
                  {accountsSummary.items.map((acc) => (
                    <div key={acc.label} className="relative group">
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg shadow-sm">
                            {acc.icon}
                          </div>
                          <div>
                            <span className="text-white text-sm font-black uppercase tracking-wider block group-hover:text-primary transition-colors">
                              {acc.label}
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                              {acc.type} • {Math.round(acc.percentage)}% do Capital
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-mono font-black tracking-tight">
                            {acc.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${acc.percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full opacity-90 group-hover:opacity-100 transition-opacity"
                          style={{ 
                            backgroundColor: acc.color,
                            boxShadow: `0 0 10px ${acc.color}80` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLUNA DIREITA: Total e Alertas */}
              <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-[#09090b] to-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/50 transition-all duration-500 shadow-2xl">
                   <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                   
                   <span className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.3em] mb-4 text-center">
                     Total Líquido em Caixa
                   </span>
                   
                   <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2">
                     {accountsSummary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                   </h2>
                   
                   <div className="w-12 h-1 bg-primary rounded-full mt-4 group-hover:w-24 transition-all duration-500" />
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex gap-4 items-start">
                   <div className="mt-1 text-primary animate-pulse">
                     ⚠️
                   </div>
                   <div>
                     <h4 className="text-primary text-xs font-black uppercase tracking-widest mb-1">Aviso de Conciliação</h4>
                     <p className="text-zinc-400 text-[10px] leading-relaxed uppercase tracking-wide font-bold">
                       Os valores refletem estritamente as baixas manuais realizadas nos pedidos. Não incluem taxas de cartão descontadas na fonte ou despesas não lançadas.
                     </p>
                   </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="despesas" className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Registro de Saídas</h3>
              <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-primary text-black font-black uppercase text-[10px] rounded-full h-10 px-6"><Plus size={16} className="mr-2" /> Novo Lançamento</Button>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-500 uppercase font-black">
                  <tr><th className="p-4">Data</th><th className="p-4">Descrição</th><th className="p-4">Categoria</th><th className="p-4 text-right">Valor</th><th className="p-4 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {kpis.filteredExpenses?.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-zinc-600 uppercase font-bold">Nenhuma despesa no período</td></tr>
                  ) : (
                    kpis.filteredExpenses?.map(e => (
                      <tr key={e.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-zinc-400 font-mono">{e.date ? format(parseISO(e.date), 'dd/MM/yy') : '--/--/--'}</td>
                        <td className="p-4 text-white font-bold uppercase">{e.description}</td>
                        <td className="p-4"><span className="px-2 py-1 bg-zinc-800 rounded text-zinc-500 uppercase font-black">{e.category}</span></td>
                        <td className="p-4 text-right text-red-400 font-mono font-bold">{(Number(e.value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-4 text-right"><button onClick={() => handleDeleteExpense(e.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={14}/></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        <AnimatePresence>
          {isExpenseModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsExpenseModalOpen(false)}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                onClick={e => e.stopPropagation()} 
                className="bg-[#09090b] w-full max-w-md border border-zinc-800 rounded-3xl p-8 shadow-2xl"
              >
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Lançar Saída</h2>
                <form onSubmit={handleSaveExpense} className="space-y-4">
                  <input required placeholder="Descrição" value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="0.01" placeholder="Valor R$" value={expenseForm.value} onChange={e => setExpenseForm(p => ({ ...p, value: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                    <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                  </div>
                  <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none">
                    {['Material', 'Mão de Obra', 'Aluguel', 'Energia/Água', 'Impostos', 'Marketing', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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

function KPICard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-zinc-900/30 border-zinc-800 p-5 hover:border-primary/30 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 group-hover:border-primary/20 transition-colors"><Icon size={18} className={color} /></div>
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{title}</span>
      </div>
      <h3 className="text-2xl font-black text-white font-mono">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
    </Card>
  );
}
