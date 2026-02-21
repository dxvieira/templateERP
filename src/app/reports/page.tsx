
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Wallet, CreditCard, 
  Banknote, TrendingUp, FileText, Plus, Trash2, Loader2, DollarSign, 
  Briefcase, AlertCircle, X, RefreshCw, Filter
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * REPORTS MANAGER: O Cérebro Financeiro (NEXUS/FLUX)
 * Refatorado para Sincronização de Hidratação e Performance Máxima.
 */
export default function ReportsManagerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });
  const [appliedDateRange, setAppliedDateRange] = useState({ start: '', end: '' });

  // Garantir que datas dependentes do fuso horário/momento da renderização só ocorram no cliente
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
      title: "Filtro Aplicado", 
      description: `Período sincronizado com o servidor.` 
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
      const dateStr = o.emissionDate || (o.createdAt?.seconds ? format(new Date(o.createdAt.seconds * 1000), 'yyyy-MM-dd') : null);
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

    const accounts = { caixa: 0, sicoobLindoia: 0, sicoobSerraNegra: 0, pagbank: 0, sipag: 0 };
    const ops = { abertos: 0, finalizados: 0, totalValue: 0 };

    filteredOrders.forEach(o => {
      const val = Number(o.totalValue) || 0;
      const method = o.paymentMethod || '';
      const acc = o.destinationAccount || '';
      const mach = o.machine || '';

      if (['Concluído', 'Entregue'].includes(o.status)) {
        ops.finalizados++;
        if (method === 'Dinheiro') accounts.caixa += val;
        else if (method === 'PIX' || method === 'Boleto') {
          if (acc === 'Serra Negra') accounts.sicoobSerraNegra += val;
          else accounts.sicoobLindoia += val;
        } else if (mach === 'PAGBANK') accounts.pagbank += val;
        else if (mach === 'SIPAG/SICOOB') accounts.sipag += val;
      } else {
        ops.abertos++;
        ops.totalValue += val;
      }
    });

    const income = Object.values(accounts).reduce((a, b) => a + b, 0);
    const outcome = filteredExpenses.reduce((acc, e) => acc + (Number(e.value) || 0), 0);

    return { 
      ops, accounts, income, outcome, net: income - outcome, 
      filteredOrders, filteredExpenses 
    };
  }, [orders, expenses, appliedDateRange]);

  const stagesSummary = useMemo(() => {
    if (!financialData?.filteredOrders) return [];

    const summary: Record<string, any> = {
      'Arte': { label: 'ARTE FINAL', count: 0, value: 0, color: '#d946ef' },
      'Impressão': { label: 'IMPRESSÃO', count: 0, value: 0, color: '#3B82F6' },
      'Serralheria': { label: 'SERRALHERIA', count: 0, value: 0, color: '#EAB308' },
      'Acabamento': { label: 'ACABAMENTO', count: 0, value: 0, color: '#FF5F1F' },
      'Instalação': { label: 'INSTALAÇÃO', count: 0, value: 0, color: '#8B5CF6' },
      'Finalizado': { label: 'FINALIZADO', count: 0, value: 0, color: '#4ade80' } 
    };

    let maxCount = 0;

    financialData.filteredOrders.forEach(order => {
      const statusKey = (order.status === 'Concluído' || order.status === 'Entregue') 
        ? 'Finalizado' 
        : order.status;

      if (summary[statusKey]) {
        summary[statusKey].count += 1;
        summary[statusKey].value += Number(order.totalValue) || 0;
        if (summary[statusKey].count > maxCount) {
          maxCount = summary[statusKey].count;
        }
      }
    });

    return Object.values(summary).map(stage => ({
      ...stage,
      percentage: maxCount === 0 ? 0 : (stage.count / maxCount) * 100 
    }));
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

  const statusData = [
    { name: 'Abertos', value: financialData?.ops.abertos || 0, color: '#FF5F1F' },
    { name: 'Finalizados', value: financialData?.ops.finalizados || 0, color: '#4ade80' }
  ];

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
          <KPICard title="Entradas" value={financialData?.income || 0} icon={ArrowUpRight} color="text-green-500" />
          <KPICard title="Saídas" value={financialData?.outcome || 0} icon={ArrowDownRight} color="text-red-500" />
          <KPICard title="Lucro Líquido" value={financialData?.net || 0} icon={DollarSign} color="text-primary" />
          <KPICard title="Em Produção" value={financialData?.ops.totalValue || 0} icon={Briefcase} color="text-blue-400" />
        </div>

        <Tabs defaultValue="operacional" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 mb-6">
            <TabsTrigger value="operacional" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Operacional</TabsTrigger>
            <TabsTrigger value="financeiro" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="despesas" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6">Despesas</TabsTrigger>
          </TabsList>

          <TabsContent value="operacional" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-zinc-900/30 border-zinc-800">
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Distribuição por Etapa (No Período)</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  {stagesSummary.map((stage) => (
                    <div key={stage.label} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-zinc-400 uppercase">
                          {stage.label} <span className="text-zinc-600">({stage.count})</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                          {stage.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${stage.percentage}%` }} 
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/30 border-zinc-800 h-fit">
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Mix de Produção</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={statusData} 
                          innerRadius={50} 
                          outerRadius={70} 
                          paddingAngle={5} 
                          dataKey="value"
                          animationDuration={1000}
                        >
                          {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-2">
                    {statusData.map(s => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[9px] font-black text-zinc-500 uppercase">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/30 border-zinc-800">
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Concentração por Conta</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <AccountRow label="Caixa Interno" value={financialData?.accounts.caixa || 0} icon={Wallet} />
                  <AccountRow label="SICOOB - Lindóia" value={financialData?.accounts.sicoobLindoia || 0} icon={Banknote} />
                  <AccountRow label="SICOOB - Serra Negra" value={financialData?.accounts.sicoobSerraNegra || 0} icon={Banknote} />
                  <AccountRow label="Máquina PAGBANK" value={financialData?.accounts.pagbank || 0} icon={CreditCard} />
                  <AccountRow label="Máquina SIPAG" value={financialData?.accounts.sipag || 0} icon={CreditCard} />
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/30 border-zinc-800 p-6 flex flex-col justify-center gap-4">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex gap-4">
                  <AlertCircle className="text-primary shrink-0" size={20} />
                  <p className="text-[10px] text-zinc-400 uppercase leading-relaxed font-bold">O potencial de faturamento é baseado apenas em pedidos com valor total preenchido. Lembre-se de dar baixa total nos pedidos finalizados.</p>
                </div>
                <div className="text-center py-4">
                  <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Receitas em Cartão</span>
                  <h3 className="text-3xl font-black text-white mt-1">{( (financialData?.accounts.pagbank || 0) + (financialData?.accounts.sipag || 0) ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
                </div>
              </Card>
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
                  {financialData?.filteredExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-zinc-600 uppercase font-bold">Nenhuma despesa no período</td></tr>
                  ) : (
                    financialData?.filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-zinc-400 font-mono">{format(parseISO(e.date), 'dd/MM/yy')}</td>
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
                  <Button type="submit" className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_5px_25px_-5px_rgba(255,95,31,0.4)] mt-4">Confirmar Lançamento</Button>
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

function AccountRow({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-zinc-600 group-hover:text-primary transition-colors" />
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-black text-white font-mono">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </div>
  );
}
