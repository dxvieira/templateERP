
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, TrendingDown, Wallet, Target, AlertCircle, Download, Plus, Trash2, Calendar, 
  Loader2, X, CheckCircle2, Receipt, ArrowDownLeft, Box, Factory, BarChart3, PieChart as PieChartIcon, 
  ShoppingBag, Users as UsersIcon, ChevronDown, ChevronUp, Layers, Pencil, ChevronRight, Check, Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Label } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// MAPEAMENTO DE CORES INDUSTRIAIS
const PRODUCTION_COLORS: Record<string, string> = { 
  'ARTE': '#d946ef', 
  'IMPRESSÃO': '#3b82f6', 
  'SERRALHERIA': '#eab308', 
  'ACABAMENTO': '#f97316', 
  'INSTALAÇÃO': '#a855f7', 
  'CONCLUÍDO': '#10b981', 
  'ENTREGUE': '#10b981', 
  'OUTROS': '#64748b' 
};

// UTILITÁRIO DE LIMPEZA FINANCEIRA
const cleanCurrency = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const cleaned = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
};

export default function ReportsManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'FLUXO' | 'CONTAS' | 'PEDIDOS'>('FLUXO');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [itemToPay, setItemToPay] = useState<any>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [isCashflowModalOpen, setIsCashflowModalOpen] = useState(false);
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);

  useEffect(() => {
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
  }, []);

  // CONSULTAS FIREBASE (REAL-TIME)
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

  // MOTOR DE INTELIGÊNCIA DE DADOS (BI)
  const reportData = useMemo(() => {
    if (!selectedMonth) return null;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // KPIs Financeiros
    let incomes = 0, expenses = 0, receivables = 0, totalPayables = 0;
    const transactions: any[] = [];

    // Processar Ordens para Receita e Recebíveis
    orders?.forEach(order => {
      const orderDate = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : parseISO(order.emission_date || order.delivery_date || '');
      
      if (isWithinInterval(orderDate, { start: startDate, end: endDate })) {
        const balance = cleanCurrency(order.balance_due ?? order.balanceDue);
        if (balance > 0) receivables += balance;
      }

      const installments = Array.isArray(order.installments) ? order.installments : [];
      installments.forEach((inst: any) => {
        if ((inst?.status === 'paid' || inst?.status === 'pago') && inst.paid_date) {
          try {
            const paidDate = parseISO(inst.paid_date);
            if (isWithinInterval(paidDate, { start: startDate, end: endDate })) {
              const amount = cleanCurrency(inst.amount);
              incomes += amount;
              transactions.push({ 
                id: `${order.id}-${inst.uid || Math.random()}`, 
                date: inst.paid_date, 
                description: `PGTO OS #${order.id.slice(-6)} - ${order.client}`, 
                type: 'income', amount, method: inst.payment_method || 'Sistema', 
                origin: 'SISTEMA (OS)', originalId: order.id 
              });
            }
          } catch (e) {}
        }
      });
    });

    // Processar Contas a Pagar
    const groups: Record<string, any> = {};
    payables?.forEach(payable => {
      if (payable.status !== 'paid') totalPayables += cleanCurrency(payable.amount);
      const gid = payable.groupId || payable.id;
      if (!groups[gid]) groups[gid] = { groupId: gid, supplier: payable.supplier, description: payable.description, installments: [], totalAmount: 0, allPaid: true };
      groups[gid].installments.push(payable); 
      groups[gid].totalAmount += cleanCurrency(payable.amount);
      if (payable.status !== 'paid') groups[gid].allPaid = false;
    });

    // Processar Fluxo Manual
    cashflowManual?.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: startDate, end: endDate })) {
          const amount = cleanCurrency(entry.amount);
          if (entry.type === 'income') incomes += amount; else expenses += amount;
          transactions.push({ id: entry.id, date: entry.date, description: entry.description, type: entry.type, amount, method: entry.method || 'Manual', origin: entry.origin || 'MANUAL' });
        }
      } catch (e) {}
    });

    // Processar BI de Pedidos
    const biStatus: Record<string, number> = {};
    const biClients: Record<string, number> = {};
    let biTotalValue = 0;
    
    const filteredOrders = orders?.filter(o => {
      const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : parseISO(o.emission_date || o.delivery_date || '');
      return isWithinInterval(d, { start: startDate, end: endDate });
    }) || [];

    filteredOrders.forEach(o => {
      const val = cleanCurrency(o.total_value ?? o.totalValue);
      biTotalValue += val;
      const statusName = String(o.status || 'Outros').toUpperCase();
      biStatus[statusName] = (biStatus[statusName] || 0) + 1;
      biClients[o.client] = (biClients[o.client] || 0) + val;
    });

    const statusChart = Object.entries(biStatus).map(([name, value]) => ({ 
      name, 
      value, 
      color: PRODUCTION_COLORS[name] || PRODUCTION_COLORS['OUTROS'] 
    }));

    const clientChart = Object.entries(biClients)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return {
      transactions,
      groupedPayables: Object.values(groups).sort((a: any, b: any) => a.installments[0]?.dueDate?.localeCompare(b.installments[0]?.dueDate)),
      kpis: { incomes, expenses, net: incomes - expenses, receivables, payables: totalPayables },
      ordersBI: { 
        totalCount: filteredOrders.length, 
        inProduction: filteredOrders.filter(o => !['Concluído', 'Entregue'].includes(o.status)).length,
        finalized: filteredOrders.filter(o => ['Concluído', 'Entregue'].includes(o.status)).length,
        totalValue: biTotalValue,
        ticketMedio: filteredOrders.length > 0 ? biTotalValue / filteredOrders.length : 0,
        statusChart,
        clientChart,
        filteredOrders
      }
    };
  }, [orders, cashflowManual, payables, selectedMonth]);

  const handleConfirmPayment = async () => {
    if (!itemToPay || !firestore || !user) return;
    const payableRef = doc(firestore, 'accounts_payable', itemToPay.id);
    const updateData = { status: 'paid', paidAt: serverTimestamp(), paymentDate: new Date().toISOString() };
    updateDoc(payableRef, updateData).then(async () => {
      const cashflowData = { description: `PGTO: ${itemToPay.supplier || itemToPay.description}`, amount: cleanCurrency(itemToPay.amount), type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), method: itemToPay.method || 'Boleto', origin: 'CONTAS A PAGAR', createdAt: serverTimestamp(), userId: user.uid };
      await addDoc(collection(firestore, 'cashflow_manual'), cashflowData); 
      toast({ title: "Baixa Confirmada" }); 
      setItemToPay(null);
    });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !firestore) return;
    const coll = (itemToDelete.supplier || itemToDelete.status === 'pending') ? 'accounts_payable' : 'cashflow_manual';
    deleteDoc(doc(firestore, coll, itemToDelete.id)).then(() => { toast({ title: "Removido" }); setItemToDelete(null); });
  };

  /**
   * FUNÇÃO DE EXPORTAÇÃO CSV OTIMIZADA PARA EXCEL (PT-BR)
   */
  const exportToCSV = () => {
    if (!reportData) return;

    // Helper para escapar strings no CSV (Aspas duplas e substituição de aspas internas)
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/\n/g, ' ').replace(/\r/g, '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    let csvContent = "";
    const delimiter = ";"; // Obrigatório para Excel pt-BR separar colunas automaticamente
    let filename = `impacto-relatorio-${activeTab.toLowerCase()}-${selectedMonth}.csv`;

    if (activeTab === 'FLUXO') {
      csvContent += `Data${delimiter}Descrição${delimiter}Método${delimiter}Tipo${delimiter}Valor\n`;
      reportData.transactions.forEach(t => {
        const date = format(parseISO(t.date), 'dd/MM/yyyy');
        const desc = escapeCSV(t.description);
        const method = escapeCSV(t.method);
        const type = t.type === 'income' ? 'Entrada' : 'Saída';
        const amount = t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        csvContent += `${date}${delimiter}${desc}${delimiter}${method}${delimiter}${type}${delimiter}${amount}\n`;
      });
    } else if (activeTab === 'CONTAS') {
      csvContent += `Fornecedor${delimiter}Descrição${delimiter}Vencimento${delimiter}Valor${delimiter}Status\n`;
      reportData.groupedPayables.forEach((g: any) => {
        g.installments.forEach((p: any) => {
          const supplier = escapeCSV(g.supplier);
          const desc = escapeCSV(g.description || p.description);
          const dueDate = format(parseISO(p.dueDate), 'dd/MM/yyyy');
          const amount = cleanCurrency(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const status = p.status === 'paid' ? 'Pago' : 'Pendente';
          csvContent += `${supplier}${delimiter}${desc}${delimiter}${dueDate}${delimiter}${amount}${delimiter}${status}\n`;
        });
      });
    } else if (activeTab === 'PEDIDOS') {
      csvContent += `OS${delimiter}Cliente${delimiter}Valor Total${delimiter}Status${delimiter}Entrega\n`;
      reportData.ordersBI.filteredOrders.forEach((o: any) => {
        const os = escapeCSV(o.id);
        const client = escapeCSV(o.client);
        const total = cleanCurrency(o.total_value || o.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const status = escapeCSV(o.status);
        const delivery = o.delivery_date || o.deliveryDate || '--';
        csvContent += `${os}${delimiter}${client}${delimiter}${total}${delimiter}${status}${delimiter}${delivery}\n`;
      });
    }

    // Adiciona o BOM (Byte Order Mark) para UTF-8 para que o Excel reconheça acentuação pt-BR
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ 
      title: "Exportação Concluída", 
      description: "O arquivo CSV foi otimizado para o Microsoft Excel." 
    });
  };

  if (!reportData) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24">
      {/* HEADER PREMIUM */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary"><Sparkles size={14} className="animate-pulse" /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Intelligence Dashboard</span></div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Resultados</span></h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <button 
             onClick={exportToCSV}
             className="flex items-center gap-2 px-5 py-3 bg-zinc-800 text-zinc-300 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-all border border-white/5"
           >
             <FileSpreadsheet size={16} /> Exportar
           </button>
           <div className="relative group"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} /><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-black uppercase outline-none focus:border-primary transition-all" /></div>
           {activeTab !== 'PEDIDOS' && (
             <button onClick={() => activeTab === 'FLUXO' ? setIsCashflowModalOpen(true) : setIsPayableModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all"><Plus size={16} strokeWidth={3} /> {activeTab === 'FLUXO' ? 'Lançamento' : 'Nova Conta'}</button>
           )}
        </div>
      </header>

      {/* KPI CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {activeTab === 'PEDIDOS' ? (
          <>
            <KPICard label="Total Pedidos" value={reportData.ordersBI.totalCount} isCurrency={false} color="text-white" icon={ShoppingBag} />
            <KPICard label="Em Produção" value={reportData.ordersBI.inProduction} isCurrency={false} color="text-yellow-500" icon={Factory} />
            <KPICard label="Finalizados" value={reportData.ordersBI.finalized} isCurrency={false} color="text-emerald-500" icon={CheckCircle2} />
            <KPICard label="Valor Total" value={reportData.ordersBI.totalValue} color="text-primary" icon={Wallet} glow />
            <KPICard label="Ticket Médio" value={reportData.ordersBI.ticketMedio} color="text-cyan-400" icon={TrendingUp} />
          </>
        ) : (
          <>
            <KPICard label="Entradas" value={reportData.kpis.incomes} color="text-emerald-500" icon={TrendingUp} />
            <KPICard label="Saídas" value={reportData.kpis.expenses} color="text-red-500" icon={TrendingDown} />
            <KPICard label="Líquido" value={reportData.kpis.net} color="text-primary" icon={Wallet} glow />
            <KPICard label="A Receber" value={reportData.kpis.receivables} color="text-yellow-500" icon={Target} />
            <KPICard label="A Pagar" value={reportData.kpis.payables} color="text-rose-500" icon={AlertCircle} />
          </>
        )}
      </section>

      {/* TABS SELECTOR */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800">
         {['FLUXO', 'CONTAS', 'PEDIDOS'].map((tab) => (
           <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-primary text-black shadow-lg" : "text-zinc-500 hover:text-white")}>{tab}</button>
         ))}
      </div>

      {/* CONTENT AREA - OVERFLOW AUTO PROTEGIDO */}
      <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        {activeTab === 'FLUXO' && (
          <div className="overflow-x-auto custom-scrollbar">
            <div className="divide-y divide-white/5 min-w-max">
              {reportData.transactions.length > 0 ? reportData.transactions.map((t) => (
                <div key={t.id} onClick={() => t.origin === 'SISTEMA (OS)' && router.push(`/orders?edit=${t.originalId}`)} className="group flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-all gap-8 cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                     <div className="flex flex-col items-center justify-center min-w-[50px] bg-zinc-950 p-2 rounded-xl border border-zinc-900"><span className="text-[8px] font-black text-zinc-600 uppercase">{format(parseISO(t.date), 'MMM', { locale: ptBR })}</span><span className="text-lg font-black text-white leading-none">{format(parseISO(t.date), 'dd')}</span></div>
                     <div className="min-w-0 flex-1">
                       <p className="text-sm font-bold text-white uppercase group-hover:text-primary transition-colors whitespace-nowrap">
                         {t.description}
                       </p>
                       <div className="flex items-center gap-3 mt-1">
                         <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 whitespace-nowrap">{t.method}</span>
                         <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border whitespace-nowrap", t.type === 'income' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>{t.type === 'income' ? 'Entrada' : 'Saída'}</span>
                       </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-8 shrink-0">
                    <p className={cn("text-lg font-black font-mono tracking-tighter", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>{t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button onClick={(e) => { e.stopPropagation(); setItemToDelete(t); }} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"><Trash2 size={16}/></button>
                  </div>
                </div>
              )) : <EmptyState icon={Target} text="Sem movimentos no período" />}
            </div>
          </div>
        )}

        {activeTab === 'PEDIDOS' && (
          <div className="p-8 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* DONUT CHART INDUSTRIAL */}
              <div className="lg:col-span-7 bg-zinc-950/30 border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 right-0 p-6 opacity-10"><PieChartIcon size={80} strokeWidth={1} /></div>
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-8 flex items-center gap-2 self-start"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Distribuição de Produção</h3>
                
                <div className="flex flex-col md:flex-row items-center gap-12 w-full">
                  <div className="relative w-[320px] h-[320px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={reportData.ordersBI.statusChart} 
                          cx="50%" cy="50%" 
                          innerRadius={90} outerRadius={120} 
                          paddingAngle={6} cornerRadius={12} 
                          dataKey="value" stroke="none"
                          onMouseEnter={(_, index) => setActivePieIndex(index)}
                          onMouseLeave={() => setActivePieIndex(null)}
                        >
                          {reportData.ordersBI.statusChart.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              className="transition-all duration-300"
                              style={{ 
                                filter: activePieIndex === index ? `drop-shadow(0 0 15px ${entry.color})` : 'none',
                                opacity: activePieIndex === null || activePieIndex === index ? 1 : 0.3,
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                          <Label 
                            content={({ viewBox }) => { 
                              if (viewBox && "cx" in viewBox && "cy" in viewBox) return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy - 10} fill="#fff" className="text-5xl font-black">{reportData.ordersBI.totalCount}</tspan>
                                  <tspan x={viewBox.cx} y={viewBox.cy + 25} fill="#71717a" className="text-[10px] font-black uppercase tracking-widest">Protocolos</tspan>
                                </text>
                              )
                            }} 
                          />
                        </Pie>
                        <Tooltip content={() => null} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* LEGENDA DINÂMICA COM NEON HOVER */}
                  <div className="flex-1 w-full space-y-2">
                    {reportData.ordersBI.statusChart.map((entry, index) => (
                      <div 
                        key={index}
                        onMouseEnter={() => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border border-transparent transition-all duration-300 cursor-pointer",
                          activePieIndex === index ? "bg-white/5 border-white/10 translate-x-2" : "opacity-60"
                        )}
                        style={{ 
                          boxShadow: activePieIndex === index ? `0 0 20px -5px ${entry.color}40` : 'none'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}` }} />
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">{entry.name}</span>
                        </div>
                        <span className="text-sm font-mono font-black text-zinc-400">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TOP CLIENTES */}
              <div className="lg:col-span-5 bg-zinc-950/30 border border-zinc-800 p-8 rounded-[2.5rem]">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-8 flex items-center gap-2"><UsersIcon size={14}/> Top 5 Clientes (Faturamento)</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.ordersBI.clientChart} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120} 
                        style={{ fontSize: '9px', fill: '#71717a', fontWeight: 'bold' }} 
                        tickFormatter={(val) => val.length > 15 ? `${val.substring(0, 15)}...` : val}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) return (
                            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl">
                              <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">{payload[0].payload.name}</p>
                              <p className="text-sm font-black text-primary">{payload[0].value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                          )
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#FF5F1F" 
                        radius={[0, 8, 8, 0]} 
                        barSize={30}
                      >
                        {reportData.ordersBI.clientChart.map((_, index) => (
                          <Cell key={`bar-${index}`} fillOpacity={0.8} className="hover:fill-opacity-100 transition-opacity" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CONTAS' && (
          <div className="overflow-x-auto custom-scrollbar">
            <div className="divide-y divide-white/5 min-w-[600px]">
              {reportData.groupedPayables.length > 0 ? reportData.groupedPayables.map((group: any) => (
                <div key={group.groupId} className="flex flex-col">
                  <div className="flex items-center justify-between p-5 border-l-2 border-transparent">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn("p-2.5 rounded-xl border flex items-center justify-center shrink-0", group.allPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-900 border-zinc-800 text-zinc-500")}><Layers size={20} /></div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white uppercase whitespace-nowrap">{group.supplier}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">{group.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 shrink-0">
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-600 uppercase font-black">Total Contrato</p>
                        <p className="text-lg font-black font-mono text-white">{group.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/20 border-t border-white/5 pl-16">
                    {group.installments.map((p: any) => (
                      <div key={p.id} className={cn("flex items-center justify-between p-4 transition-all gap-8 border-l-4", p.status === 'paid' ? "bg-emerald-500/5 border-emerald-500" : "bg-zinc-900/30 border-transparent")}>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-400 uppercase">Vencimento:</span>
                            <span className="text-[10px] font-bold text-white whitespace-nowrap">{format(parseISO(p.dueDate), 'dd/MM/yyyy')}</span>
                            {p.status === 'paid' && <span className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-500 text-black rounded">PAGO</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                          <p className="text-sm font-black text-white font-mono">{cleanCurrency(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          {p.status !== 'paid' && <button onClick={() => setItemToPay(p)} className="p-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg"><Check size={16}/></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : <EmptyState icon={Receipt} text="Sem contas pendentes" />}
            </div>
          </div>
        )}
      </div>

      {/* MODAIS DE CONFIRMAÇÃO */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#0c0c0e] border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto text-2xl">⚠️</div>
              <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Confirmar Exclusão?</h3>
              <p className="text-zinc-500 text-sm mb-8 uppercase tracking-widest font-bold">Esta ação é irreversível no terminal.</p>
              <div className="flex gap-4">
                <button onClick={() => setItemToDelete(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px]">Cancelar</button>
                <button onClick={handleConfirmDelete} className="flex-1 py-4 rounded-xl bg-red-500 text-white font-black uppercase text-[10px] shadow-[0_0_20px_rgba(239,68,68,0.3)]">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon, glow, isCurrency = true }: any) {
  return (
    <div className={cn(
      "relative bg-[#09090b] border border-zinc-800 p-5 rounded-2xl overflow-hidden group transition-all duration-500", 
      glow && "border-primary/30 shadow-[0_0_40px_-10px_rgba(255,95,31,0.2)]"
    )}>
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-primary/5 transition-colors" />
      <div className="flex justify-between items-start mb-2 relative z-10">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <div className={cn("p-2 rounded-lg bg-zinc-950 border border-zinc-800", color)}>
          <Icon size={14} className="opacity-80" />
        </div>
      </div>
      <p className={cn("text-2xl font-black font-mono tracking-tighter truncate relative z-10", color)}>
        {isCurrency ? (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : (value || 0)}
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: any) {
  return (
    <div className="py-24 text-center opacity-20 group">
      <Icon size={48} className="mx-auto mb-4 group-hover:scale-110 transition-transform" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em]">{text}</p>
    </div>
  );
}
