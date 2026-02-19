
'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  FileText,
  Plus,
  Trash2,
  Loader2,
  Filter,
  DollarSign,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  format, 
  isWithinInterval, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export default function ReportsManagerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // --- 1. FILTROS GLOBAIS ---
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // --- 2. DATA FETCHING ---
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('emissionDate', 'desc'));
  }, [firestore, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenses'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);
  const { data: expenses, isLoading: loadingExpenses } = useCollection(expensesQuery);

  // --- 3. ESTADOS DE LANÇAMENTO (DESPESAS) ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    value: '',
    category: 'Material',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // --- 4. LÓGICA DE PROCESSAMENTO (USEMEMO) ---
  const financialData = useMemo(() => {
    if (!orders || !expenses) return null;

    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);

    // Filtrar Pedidos e Despesas no Período
    const filteredOrders = orders.filter(o => {
      if (!o.emissionDate) return false;
      const date = parseISO(o.emissionDate);
      return isWithinInterval(date, { start, end });
    });

    const filteredExpenses = expenses.filter(e => {
      if (!e.date) return false;
      const date = parseISO(e.date);
      return isWithinInterval(date, { start, end });
    });

    // Agrupamento Operacional
    const ops = {
      abertos: filteredOrders.filter(o => !['Concluído', 'Entregue'].includes(o.status)).length,
      finalizados: filteredOrders.filter(o => ['Concluído', 'Entregue'].includes(o.status)).length,
      totalValue: filteredOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0)
    };

    // Agrupamento Financeiro (Entradas por Conta/Método)
    const accounts = {
      caixa: 0,
      sicoobLindoia: 0,
      sicoobSerraNegra: 0,
      pagbank: 0,
      sipag: 0
    };

    filteredOrders.forEach(o => {
      const val = o.totalValue || 0;
      const method = o.paymentMethod || '';
      const machine = o.machine || '';
      const acc = o.destinationAccount || '';

      if (method === 'Dinheiro') {
        accounts.caixa += val;
      } else if (method === 'PIX' || method === 'Boleto') {
        // Lógica de destino: Se não informado, prioriza Lindóia por padrão
        if (acc === 'Serra Negra') accounts.sicoobSerraNegra += val;
        else accounts.sicoobLindoia += val;
      } else if (machine === 'PAGBANK') {
        accounts.pagbank += val;
      } else if (machine === 'SIPAG/SICOOB') {
        accounts.sipag += val;
      }
    });

    const totalIncome = Object.values(accounts).reduce((a, b) => a + b, 0);
    const totalOutcome = filteredExpenses.reduce((acc, e) => acc + (e.value || 0), 0);

    return { 
      ops, 
      accounts, 
      totalIncome, 
      totalOutcome, 
      netProfit: totalIncome - totalOutcome,
      filteredOrders,
      filteredExpenses
    };
  }, [orders, expenses, dateRange]);

  // --- 5. HANDLERS ---
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;

    const expenseRef = doc(collection(firestore, 'expenses'));
    const payload = {
      ...expenseForm,
      id: expenseRef.id,
      value: Number(expenseForm.value),
      createdAt: serverTimestamp()
    };

    setDoc(expenseRef, payload)
      .then(() => {
        toast({ title: "Despesa Lançada" });
        setIsExpenseModalOpen(false);
        setExpenseForm({ description: '', value: '', category: 'Material', date: format(new Date(), 'yyyy-MM-dd') });
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: expenseRef.path,
          operation: 'create',
          requestResourceData: payload
        }));
      });
  };

  const handleDeleteExpense = async (id: string) => {
    if (!firestore) return;
    if (confirm("Remover esta despesa do registro?")) {
      deleteDoc(doc(firestore, 'expenses', id))
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `expenses/${id}`,
            operation: 'delete'
          }));
        });
    }
  };

  if (loadingOrders || loadingExpenses) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const chartData = [
    { name: 'Entradas', value: financialData?.totalIncome || 0, fill: '#4ade80' },
    { name: 'Saídas', value: financialData?.totalOutcome || 0, fill: '#ef4444' }
  ];

  const statusData = [
    { name: 'Abertos', value: financialData?.ops.abertos || 0, color: '#FF5F1F' },
    { name: 'Finalizados', value: financialData?.ops.finalizados || 0, color: '#4ade80' }
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden relative selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative z-10">
        <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />

        {/* --- HEADER & FILTRO --- */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Cérebro Financeiro VisComm</span>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
              Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Flux</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 px-3">
              <Calendar size={14} className="text-zinc-500" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Período:</span>
            </div>
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
              className="bg-black/50 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-primary outline-none"
            />
            <span className="text-zinc-700">/</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
              className="bg-black/50 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-primary outline-none"
            />
          </div>
        </header>

        {/* --- KPI SUMMARY --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Entradas Totais" value={financialData?.totalIncome || 0} icon={ArrowUpRight} color="text-green-500" />
          <KPICard title="Saídas Totais" value={financialData?.totalOutcome || 0} icon={ArrowDownRight} color="text-red-500" />
          <KPICard title="Lucro Líquido" value={financialData?.netProfit || 0} icon={DollarSign} color="text-primary" />
          <KPICard title="Valor em Produção" value={financialData?.ops.totalValue || 0} icon={Briefcase} color="text-blue-400" />
        </div>

        <Tabs defaultValue="operacional" className="w-full space-y-6">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl h-12">
            <TabsTrigger value="operacional" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6 h-10 transition-all">Operacional</TabsTrigger>
            <TabsTrigger value="financeiro" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6 h-10 transition-all">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="despesas" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6 h-10 transition-all">Saídas</TabsTrigger>
            <TabsTrigger value="boletos" className="data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest px-6 h-10 transition-all">Boletos</TabsTrigger>
          </TabsList>

          {/* --- CONTEÚDO OPERACIONAL --- */}
          <TabsContent value="operacional" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-zinc-900/30 border-zinc-800 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-white/5"><CardTitle className="text-sm font-black uppercase tracking-widest">Resumo de Status</CardTitle></CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Entregue'].map(status => {
                      const count = financialData?.filteredOrders.filter(o => o.status === status).length || 0;
                      const val = financialData?.filteredOrders.filter(o => o.status === status).reduce((a, b) => a + (b.totalValue || 0), 0) || 0;
                      const percentage = financialData?.filteredOrders.length ? (count / financialData.filteredOrders.length) * 100 : 0;
                      
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{status}</span>
                              <p className="text-sm font-bold text-white">{count} Pedidos</p>
                            </div>
                            <span className="text-xs font-mono text-zinc-400">{val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-primary" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/30 border-zinc-800 rounded-2xl">
                <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Mix de Produção</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-4">
                    {statusData.map(s => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --- CONTEÚDO FINANCEIRO --- */}
          <TabsContent value="financeiro" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/30 border-zinc-800 rounded-2xl">
                <CardHeader className="border-b border-white/5"><CardTitle className="text-sm font-black uppercase tracking-widest">Distribuição por Contas</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <AccountRow label="Caixa Interno (Dinheiro)" value={financialData?.accounts.caixa || 0} icon={Wallet} />
                  <AccountRow label="SICOOB - Lindóia (Pix/Boleto)" value={financialData?.accounts.sicoobLindoia || 0} icon={Banknote} />
                  <AccountRow label="SICOOB - Serra Negra (Pix/Boleto)" value={financialData?.accounts.sicoobSerraNegra || 0} icon={Banknote} />
                  <AccountRow label="Máquina PAGBANK (Déb./Créd.)" value={financialData?.accounts.pagbank || 0} icon={CreditCard} />
                  <AccountRow label="Máquina SIPAG (Déb./Créd.)" value={financialData?.accounts.sipag || 0} icon={CreditCard} />
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/30 border-zinc-800 rounded-2xl overflow-hidden">
                <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Contas a Receber (Projeção 10x)</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-6">
                   <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-4">
                      <AlertCircle className="text-primary shrink-0" size={20} />
                      <div>
                        <h4 className="text-xs font-black text-white uppercase mb-1">Inadimplência Identificada</h4>
                        <p className="text-[10px] text-zinc-400 leading-relaxed uppercase">Existem pedidos entregues sem registro de baixa total no financeiro.</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                         <span className="text-zinc-500 font-bold uppercase tracking-widest">Potencial de Cartão (Simulado)</span>
                         <span className="text-white font-mono font-bold">{(financialData?.accounts.pagbank || 0 + (financialData?.accounts.sipag || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-tighter italic">* Cálculo bruto antes das taxas de antecipação ou MDRE.</p>
                   </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --- CONTEÚDO DESPESAS --- */}
          <TabsContent value="despesas" className="space-y-6">
            <header className="flex justify-between items-center">
               <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Registro de Saídas</h3>
               <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-primary text-black font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-full"><Plus size={16} className="mr-2" /> Novo Lançamento</Button>
            </header>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
               <table className="w-full text-left text-[10px]">
                  <thead className="bg-zinc-900/50 border-b border-zinc-800">
                     <tr className="text-zinc-500 uppercase font-black tracking-widest">
                        <th className="p-4">Data</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-right">Ação</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {financialData?.filteredExpenses.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-zinc-600 uppercase font-bold">Nenhuma saída registrada no período</td></tr>
                     ) : (
                       financialData?.filteredExpenses.map(e => (
                         <tr key={e.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 text-zinc-400 font-mono">{format(parseISO(e.date), 'dd/MM/yy')}</td>
                            <td className="p-4 text-white font-bold uppercase">{e.description}</td>
                            <td className="p-4"><span className="px-2 py-1 bg-zinc-800 rounded-md text-zinc-500 uppercase font-black">{e.category}</span></td>
                            <td className="p-4 text-right text-red-400 font-mono font-bold">{(e.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="p-4 text-right"><button onClick={() => handleDeleteExpense(e.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={14}/></button></td>
                         </tr>
                       ))
                     )}
                  </tbody>
               </table>
            </div>
          </TabsContent>

          {/* --- CONTEÚDO BOLETOS (PLACEHOLDER) --- */}
          <TabsContent value="boletos">
             <Card className="bg-zinc-900/30 border-zinc-800 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center text-center gap-4">
                <div className="p-6 bg-zinc-900 rounded-full border border-zinc-800 opacity-20"><FileText size={48} className="text-zinc-500" /></div>
                <h3 className="text-xl font-black text-zinc-700 uppercase tracking-widest">Gestão de Boletos</h3>
                <p className="text-xs text-zinc-600 max-w-sm uppercase tracking-tighter">Módulo em desenvolvimento. No futuro, você poderá digitalizar boletos e monitorar vencimentos automáticos aqui.</p>
             </Card>
          </TabsContent>
        </Tabs>

        {/* --- MODAL DE DESPESA --- */}
        <AnimatePresence>
          {isExpenseModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsExpenseModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">Lançar Saída</h2>
                  <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveExpense} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Descrição</label>
                    <input required value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Valor (R$)</label>
                      <input required type="number" step="0.01" value={expenseForm.value} onChange={e => setExpenseForm(p => ({ ...p, value: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Data</label>
                      <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Categoria</label>
                    <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none">
                      {['Material', 'Mão de Obra', 'Aluguel', 'Energia/Água', 'Impostos', 'Marketing', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <Button type="submit" className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-[0_5px_25px_-5px_rgba(255,95,31,0.4)] mt-4">Confirmar Lançamento</Button>
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
    <Card className="bg-zinc-900/30 border-zinc-800 rounded-2xl p-5 hover:border-primary/30 transition-all group">
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

function X({ size, className }: any) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
