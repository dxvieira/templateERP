'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Wallet, TrendingUp, Plus, Trash2, Loader2, 
  X, RefreshCw, ArrowLeft, ArrowRight,
  Package, Edit, Clock, CheckCircle2, AlertTriangle, Calendar as CalendarIcon,
  DollarSign
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, isWithinInterval, parseISO, addMonths, subMonths, isBefore, isSameDay, isValid } from 'date-fns';

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
  const [selectedMonth, setSelectedMonth] = useState(''); 
  
  // --- ESTADOS DE CONTAS A PAGAR ---
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
    const now = new Date();
    setSelectedMonth(format(now, 'yyyy-MM'));
  }, []);

  // --- QUERIES ---
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const accountsPayableQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'accounts_payable'), orderBy('dueDate', 'asc'));
  }, [firestore, user]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);
  const { data: payables, isLoading: loadingPayables } = useCollection(accountsPayableQuery);

  // --- LÓGICA DE DATAS ---
  const dateRange = useMemo(() => {
    if (!selectedMonth) return { start: new Date(), end: new Date() };
    const [year, month] = selectedMonth.split('-').map(Number);
    return {
      start: startOfMonth(new Date(year, month - 1)),
      end: endOfMonth(new Date(year, month - 1))
    };
  }, [selectedMonth]);

  // --- MOTOR OPERACIONAL ---
  const sortedOrders = useMemo(() => {
    if (!orders || !selectedMonth) return [];
    
    const filtered = orders.filter(order => {
      const dDate = order.delivery_date || order.deliveryDate;
      if (!dDate) return false;
      try {
        return isWithinInterval(parseISO(dDate), { start: dateRange.start, end: dateRange.end });
      } catch (e) { return false; }
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
  }, [orders, dateRange, selectedMonth]);

  // --- CÁLCULO DOS KPIs ---
  const kpiMetrics = useMemo(() => {
    // Valor recebido apenas de ordens do período
    const incomeFromOrders = sortedOrders.reduce((acc, o) => acc + (Number(o.amount_paid || o.amountPaid || 0)), 0);
    
    // Valor pendente de ordens
    const pendingFromOrders = sortedOrders.reduce((acc, o) => {
      const total = Number(o.total_value || o.totalValue || 0);
      const paid = Number(o.amount_paid || o.amountPaid || 0);
      return acc + Math.max(0, total - paid);
    }, 0);

    // Contas a pagar pendentes (Total geral pendente)
    const payableTotal = (payables || [])
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return { incomeFromOrders, pendingFromOrders, payableTotal };
  }, [sortedOrders, payables]);

  const handleDeletePayable = useCallback(async (id: string) => {
    if (!firestore || !id) return;
    if (!window.confirm("Confirmar exclusão deste compromisso financeiro?")) return;

    try {
      const docRef = doc(firestore, 'accounts_payable', id);
      await deleteDoc(docRef);
      toast({ title: "Boleto Removido" });
    } catch (error: any) {
      console.error("Erro ao excluir conta a pagar:", error);
      alert("Erro ao excluir: " + error.message);
    }
  }, [firestore, toast]);

  const handlePayAccount = async (payable: any) => {
    if (!firestore || !user) return;
    const payableRef = doc(firestore, 'accounts_payable', payable.id);
    try {
      await setDoc(payableRef, { status: 'paid', updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "Pagamento Confirmado" });
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'accounts_payable/pay', operation: 'update' }));
    }
  };

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
    toast({ title: "Parcelas Projetadas" });
  };

  const handleSavePayablesBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || generatedInstallments.length === 0) return;
    try {
      if (editingPayableId) {
        const inst = generatedInstallments[0];
        const payload = {
          description: payableForm.description, supplier: payableForm.supplier, category: payableForm.category,
          amount: Number(inst.amount), dueDate: inst.dueDate, updatedAt: serverTimestamp(),
        };
        await setDoc(doc(firestore, 'accounts_payable', editingPayableId), payload, { merge: true });
      } else {
        for (const inst of generatedInstallments) {
          const payload = {
            description: `${payableForm.description} (${inst.id}/${payableForm.installmentsCount})`,
            supplier: payableForm.supplier, category: payableForm.category, amount: Number(inst.amount),
            dueDate: inst.dueDate, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
          };
          const docRef = doc(collection(firestore, 'accounts_payable'));
          await setDoc(docRef, { ...payload, id: docRef.id });
        }
      }
      toast({ title: editingPayableId ? "Conta Atualizada" : "Parcelas Registradas" });
      setIsPayableModalOpen(false);
      setEditingPayableId(null);
      setGeneratedInstallments([]);
      setPayableForm({ description: '', supplier: '', category: 'Material', totalAmount: '', installmentsCount: '1' });
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'accounts_payable', operation: 'write' }));
    }
  };

  const handleMonthNav = (direction: 'prev' | 'next') => {
    if (!selectedMonth) return;
    const current = parseISO(`${selectedMonth}-01`);
    const next = direction === 'next' ? addMonths(current, 1) : subMonths(current, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  if (!isMounted || loadingOrders || loadingPayables) {
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

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <button onClick={() => handleMonthNav('prev')} className="p-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border-r border-zinc-800"><ArrowLeft size={16}/></button>
            <span className="px-6 py-2 text-xs font-black uppercase text-white tracking-widest min-w-[140px] text-center">
              {selectedMonth ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy') : '--'}
            </span>
            <button onClick={() => handleMonthNav('next')} className="p-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors border-l border-zinc-800"><ArrowRight size={16}/></button>
          </div>
        </header>

        {/* --- KPI GRID --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Recebido (OS)', val: kpiMetrics.incomeFromOrders, color: '#4ade80', icon: TrendingUp },
            { label: 'A Receber (OS)', val: kpiMetrics.pendingFromOrders, color: '#eab308', icon: Clock },
            { label: 'Contas a Pagar', val: kpiMetrics.payableTotal, color: '#ef4444', icon: AlertTriangle }
          ].map((kpi, i) => (
            <motion.div key={i} whileHover={{ y: -4 }} className="group relative bg-[#09090b] border border-zinc-800 rounded-3xl p-6 transition-all duration-300" style={{ borderBottomColor: `${kpi.color}40` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-2xl bg-white/5" style={{ color: kpi.color }}><kpi.icon size={20} /></div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{kpi.label}</span>
              </div>
              <span className="text-2xl font-black text-white">{kpi.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </motion.div>
          ))}
        </section>

        <Tabs defaultValue="operacional" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 mb-8 p-1">
            <TabsTrigger value="operacional" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6 h-10">Monitor Operacional</TabsTrigger>
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
                          <div className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded text-[8px] font-black uppercase">Atrasado</div>
                        ) : isDone ? (
                          <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-[8px] font-black uppercase">Finalizado</div>
                        ) : (
                          <div className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-[8px] font-black uppercase">Prazo: {deadline && isValid(deadline) ? format(deadline, 'dd/MM') : '--/--'}</div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                        <div className="space-y-1"><span className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1 block">Total</span><span className="text-base font-bold text-white">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        <div className="space-y-1"><span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 opacity-60 mb-1 block">Liquidado</span><span className="text-base font-bold text-emerald-500">{paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        <div className="space-y-1"><span className="text-[10px] uppercase font-bold tracking-widest text-primary opacity-60 mb-1 block">A Receber</span><span className="text-base font-bold text-primary">{(total - paid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="payable" className="space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
               <div><h2 className="text-xl font-black text-white uppercase tracking-tight">Pauta de Pagamentos</h2><p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Gestão de boletos e fornecedores</p></div>
               <Button onClick={() => { setEditingPayableId(null); setGeneratedInstallments([]); setIsPayableModalOpen(true); }} className="h-12 bg-primary text-black font-black uppercase text-[10px] tracking-widest px-6 rounded-2xl shadow-lg hover:bg-white transition-all"><Plus size={16} className="mr-2" /> Nova Conta a Pagar</Button>
            </div>

            <div className="bg-[#0c0c0e] border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl">
               <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[600px]">
                  {(!payables || payables.length === 0) ? (
                    <div className="p-20 text-center text-zinc-600 uppercase font-black text-[10px] tracking-[0.3em]"><AlertTriangle size={40} className="mx-auto mb-4 opacity-10" /> Fila Limpa</div>
                  ) : (
                    payables.map((payable) => {
                      const isPaid = payable.status === 'paid';
                      const dueDate = parseISO(payable.dueDate);
                      const isLate = isBefore(dueDate, new Date()) && !isPaid && !isSameDay(dueDate, new Date());
                      
                      return (
                        <div key={payable.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors duration-200 gap-4">
                           <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : isLate ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400')}>
                                 <CalendarIcon size={18}/>
                              </div>
                              <div className="min-w-0">
                                 <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-zinc-100 font-bold text-sm uppercase truncate">{payable.description}</span>
                                    <span className="text-[9px] text-zinc-500 font-black tracking-widest">• {payable.supplier || 'Geral'}</span>
                                 </div>
                                 <div className="flex items-center gap-3 text-xs">
                                    <span className={cn("font-mono font-bold", isLate ? "text-red-500" : "text-zinc-500")}>
                                       Venc: {format(dueDate, 'dd/MM/yyyy')}
                                    </span>
                                    <span className="bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-white/5 uppercase text-[8px] font-black">{payable.category}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center gap-6 self-end sm:self-auto">
                              <div className="text-right">
                                 <span className="text-lg font-black text-white font-mono tracking-tighter">
                                    {Number(payable.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                 </span>
                                 <div>
                                    <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", 
                                       isPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                       isLate ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                       'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                    )}>
                                       {isPaid ? 'Liquidado' : isLate ? 'Atrasado' : 'Pendente'}
                                    </span>
                                 </div>
                              </div>
                              <div className="flex gap-1">
                                 {!isPaid && (
                                   <button onClick={() => handlePayAccount(payable)} className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all" title="Dar Baixa"><CheckCircle2 size={16}/></button>
                                 )}
                                 <button onClick={() => { setEditingPayableId(payable.id); setPayableForm({ ...payable, totalAmount: String(payable.amount), installmentsCount: '1' }); setGeneratedInstallments([{ id: 1, amount: String(payable.amount), dueDate: payable.dueDate }]); setIsPayableModalOpen(true); }} className="p-2 text-zinc-600 hover:text-white hover:bg-white/5 rounded-lg transition-all"><Edit size={16}/></button>
                                 <button onClick={() => handleDeletePayable(payable.id)} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all"><Trash2 size={16}/></button>
                              </div>
                           </div>
                        </div>
                      );
                    })
                  )}
               </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* MODAL CONTAS A PAGAR */}
        <AnimatePresence>
          {isPayableModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm" onClick={() => setIsPayableModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#09090b] w-full max-w-2xl border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8">{editingPayableId ? 'Editar Boleto' : 'Gerador de Contas a Pagar'}</h2>
                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                  <form onSubmit={handleSavePayablesBatch} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2"><label className={labelClass}>Descrição / Fornecedor</label><input required value={payableForm.description} onChange={e => setPayableForm({...payableForm, description: e.target.value})} className={inputClass} /></div>
                      <div><label className={labelClass}>Categoria</label><select value={payableForm.category} onChange={e => setPayableForm({...payableForm, category: e.target.value})} className={inputClass}>{['Material', 'Impostos/Taxas', 'Infraestrutura', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      {!editingPayableId && (
                        <div className="grid grid-cols-2 gap-2"><div className="w-full"><label className={labelClass}>Valor Total</label><input type="number" step="0.01" value={payableForm.totalAmount} onChange={e => setPayableForm({...payableForm, totalAmount: e.target.value})} className={inputClass} /></div><div className="w-full"><label className={labelClass}>Parcelas</label><input type="number" min="1" value={payableForm.installmentsCount} onChange={e => setPayableForm({...payableForm, installmentsCount: e.target.value})} className={inputClass} /></div></div>
                      )}
                    </div>
                    {!editingPayableId && <button type="button" onClick={handleGenerateInstallments} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-white font-black uppercase text-[10px]">Gerar Parcelas</button>}
                    {generatedInstallments.length > 0 && (
                      <div className="space-y-3">{generatedInstallments.map((inst, index) => (
                        <div key={index} className="flex gap-3 items-end bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800"><span className="text-[10px] font-black text-zinc-600">{inst.id}</span><div className="flex-1"><label className="text-[8px] text-zinc-600 font-black mb-1 block">Vencimento</label><input type="date" value={inst.dueDate} onChange={e => { const n = [...generatedInstallments]; n[index].dueDate = e.target.value; setGeneratedInstallments(n); }} className={cn(inputClass, "p-2")} /></div><div className="flex-1"><label className="text-[8px] text-zinc-600 font-black mb-1 block">Valor</label><input type="number" step="0.01" value={inst.amount} onChange={e => { const n = [...generatedInstallments]; n[index].amount = e.target.value; setGeneratedInstallments(n); }} className={cn(inputClass, "p-2")} /></div></div>
                      ))}</div>
                    )}
                  </form>
                </div>
                <div className="flex gap-3 pt-6 border-t border-white/5"><button type="button" onClick={() => setIsPayableModalOpen(false)} className="flex-1 text-[10px] font-black uppercase text-zinc-500">Cancelar</button><Button onClick={handleSavePayablesBatch} disabled={generatedInstallments.length === 0} className="flex-[2] h-14 bg-primary text-black font-black uppercase rounded-2xl shadow-lg">Confirmar Lote</Button></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
