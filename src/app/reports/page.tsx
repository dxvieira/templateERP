'use client';

import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, TrendingDown, Wallet, Target, AlertCircle, Download, Plus, Trash2, Calendar, 
  Loader2, X, CheckCircle2, Receipt, ArrowDownLeft, Box, Factory, BarChart3, PieChart as PieChartIcon, 
  ShoppingBag, Users as UsersIcon, ChevronDown, ChevronUp, Layers, Pencil, ChevronRight, Check
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Label } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const PRODUCTION_COLORS: Record<string, string> = { 'ARTE': '#d946ef', 'IMPRESSÃO': '#3b82f6', 'SERRALHERIA': '#eab308', 'ACABAMENTO': '#f97316', 'INSTALAÇÃO': '#a855f7', 'CONCLUÍDO': '#10b981', 'ENTREGUE': '#10b981', 'DEFAULT': '#64748b' };

export default function ReportsManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'FLUXO' | 'CONTAS' | 'PEDIDOS'>('FLUXO');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [itemToPay, setItemToPay] = useState<any>(null);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [installmentToEdit, setInstallmentToEdit] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const [isCashflowModalOpen, setIsCashflowModalOpen] = useState(false);
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cashflowFormData, setCashflowFormData] = useState({ description: '', amount: '', type: 'income', date: format(new Date(), 'yyyy-MM-dd'), method: 'Pix' });
  const [payableFormData, setPayableFormData] = useState({ supplier: '', description: '', category: 'Suprimentos', amountTotal: '', installments: 1, method: 'Boleto', numeroNF: '' });
  const [previewInstallments, setPreviewInstallments] = useState<any[]>([]);

  const ordersQuery = useMemoFirebase(() => { if (!firestore || !user) return null; return query(collection(firestore, 'orders')); }, [firestore, user]);
  const cashflowQuery = useMemoFirebase(() => { if (!firestore || !user) return null; return query(collection(firestore, 'cashflow_manual'), orderBy('date', 'desc')); }, [firestore, user]);
  const payablesQuery = useMemoFirebase(() => { if (!firestore || !user) return null; return query(collection(firestore, 'accounts_payable'), orderBy('dueDate', 'asc')); }, [firestore, user]);

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);
  const { data: cashflowManual, isLoading: cashflowLoading } = useCollection(cashflowQuery);
  const { data: payables, isLoading: payablesLoading } = useCollection(payablesQuery);

  const { transactions, kpis, ordersBI, groupedPayables } = useMemo(() => {
    const fusion: any[] = [];
    let monthIncomes = 0, monthExpenses = 0, globalReceivable = 0, totalPayables = 0;
    const [year, month] = (selectedMonth || '').split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1)), endDate = endOfMonth(new Date(year, month - 1));

    orders?.forEach(order => {
      const orderDate = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : parseISO(order.emission_date || '');
      if (isWithinInterval(orderDate, { start: startDate, end: endDate })) { const balance = Number(order.balance_due ?? order.balanceDue) || 0; if (balance > 0) globalReceivable += balance; }
      const installments = Array.isArray(order.installments) ? order.installments : [];
      installments.forEach((inst: any) => {
        if ((inst?.status === 'paid' || inst?.status === 'pago') && inst.paid_date) {
          try {
            const paidDate = parseISO(inst.paid_date);
            if (isWithinInterval(paidDate, { start: startDate, end: endDate })) {
              const amount = Number(inst.amount) || 0; monthIncomes += amount;
              fusion.push({ id: `${order.id}-${inst.uid || Math.random()}`, date: inst.paid_date, description: `PGTO OS #${order.id.slice(-6)} - ${order.client}`, type: 'income', amount, method: inst.payment_method || 'Sistema', origin: 'SISTEMA (OS)', originalId: order.id, parcelas: installments.map(i => ({ id: i.uid || i.id, numero: i.id, valor: i.amount, vencimento: i.due_date, status: i.status === 'paid' ? 'liquidado' : 'pendente' })) });
            }
          } catch (e) {}
        }
      });
    });

    const groups: Record<string, any> = {};
    payables?.forEach(payable => {
      if (payable.status !== 'paid') totalPayables += Number(payable.amount) || 0;
      const gid = payable.groupId || payable.id;
      if (!groups[gid]) groups[gid] = { groupId: gid, supplier: payable.supplier, description: payable.description, installments: [], totalAmount: 0, allPaid: true };
      groups[gid].installments.push(payable); groups[gid].totalAmount += Number(payable.amount) || 0;
      if (payable.status !== 'paid') groups[gid].allPaid = false;
    });

    cashflowManual?.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: startDate, end: endDate })) {
          const amount = Number(entry.amount) || 0; if (entry.type === 'income') monthIncomes += amount; else monthExpenses += amount;
          fusion.push({ id: entry.id, date: entry.date, description: entry.description, type: entry.type, amount, method: entry.method || 'Manual', origin: entry.origin || 'MANUAL' });
        }
      } catch (e) {}
    });

    const groupedArray = Object.values(groups).sort((a: any, b: any) => a.installments[0]?.dueDate?.localeCompare(b.installments[0]?.dueDate));
    const biStatus: Record<string, number> = {}, biClients: Record<string, number> = {};
    let biTotalValue = 0;
    const filteredOrders = orders?.filter(o => { const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : parseISO(o.emission_date || ''); return isWithinInterval(d, { start: startDate, end: endDate }); }) || [];
    filteredOrders.forEach(o => { const val = Number(o.total_value ?? o.totalValue) || 0; biTotalValue += val; const statusName = String(o.status || 'Outros').toUpperCase(); biStatus[statusName] = (biStatus[statusName] || 0) + 1; biClients[o.client] = (biClients[o.client] || 0) + val; });
    const totalOrdersCount = filteredOrders.length;
    const statusChart = Object.entries(biStatus).map(([name, value]) => ({ name, value, percent: totalOrdersCount > 0 ? Math.round((value / totalOrdersCount) * 100) : 0 }));
    const clientChart = Object.entries(biClients).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    fusion.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return { transactions: fusion, kpis: { incomes: monthIncomes, expenses: monthExpenses, net: monthIncomes - monthExpenses, receivables: globalReceivable, payables: totalPayables }, ordersBI: { filteredOrders, totalCount: totalOrdersCount, inProduction: filteredOrders.filter(o => !['Concluído', 'Entregue'].includes(o.status)).length, finalized: filteredOrders.filter(o => ['Concluído', 'Entregue'].includes(o.status)).length, totalValue: biTotalValue, ticketMedio: totalOrdersCount > 0 ? biTotalValue / totalOrdersCount : 0, statusChart, clientChart }, groupedPayables: groupedArray };
  }, [orders, cashflowManual, payables, selectedMonth]);

  const toggleGroup = (gid: string) => setExpandedGroups(prev => ({ ...prev, [gid]: !prev[gid] }));
  const handleRowClick = (item: any) => { if (item.origin === 'SISTEMA (OS)') router.push(`/orders?edit=${item.originalId}`); else setItemToEdit({ ...item }); };

  const handleConfirmPayment = async () => {
    if (!itemToPay || !firestore || !user) return;
    const payableRef = doc(firestore, 'accounts_payable', itemToPay.id);
    const updateData = { status: 'paid', paidAt: serverTimestamp(), paymentDate: new Date().toISOString() };
    updateDoc(payableRef, updateData).then(async () => {
      const cashflowData = { description: `PGTO: ${itemToPay.supplier || itemToPay.description}`, amount: Number(itemToPay.amount), type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), method: itemToPay.method || 'Boleto', origin: 'CONTAS A PAGAR', createdAt: serverTimestamp(), userId: user.uid };
      await addDoc(collection(firestore, 'cashflow_manual'), cashflowData); toast({ title: "Baixa Confirmada" }); setItemToPay(null);
    });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !firestore) return;
    const collectionName = (itemToDelete.hasOwnProperty('supplier') || itemToDelete.status === 'pending') ? 'accounts_payable' : 'cashflow_manual';
    deleteDoc(doc(firestore, collectionName, itemToDelete.id)).then(() => { toast({ title: "Removido" }); setItemToDelete(null); });
  };

  if (ordersLoading || cashflowLoading || payablesLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-1.5 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary"><BarChart3 size={14} className="animate-pulse" /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Intelligence Dashboard</span></div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Resultados</span></h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative group"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} /><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-black uppercase outline-none focus:border-primary transition-all" /></div>
           {activeTab !== 'PEDIDOS' && <button onClick={() => activeTab === 'FLUXO' ? setIsCashflowModalOpen(true) : setIsPayableModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all"><Plus size={16} strokeWidth={3} /> {activeTab === 'FLUXO' ? 'Lançamento' : 'Nova Conta'}</button>}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {activeTab === 'PEDIDOS' ? (
          <>
            <KPICard label="Total Pedidos" value={ordersBI.totalCount} isCurrency={false} color="text-white" icon={ShoppingBag} />
            <KPICard label="Em Produção" value={ordersBI.inProduction} isCurrency={false} color="text-yellow-500" icon={Factory} />
            <KPICard label="Finalizados" value={ordersBI.finalized} isCurrency={false} color="text-emerald-500" icon={CheckCircle2} />
            <KPICard label="Valor Total" value={ordersBI.totalValue} color="text-primary" icon={Wallet} glow />
            <KPICard label="Ticket Médio" value={ordersBI.ticketMedio} color="text-cyan-400" icon={TrendingUp} />
          </>
        ) : (
          <>
            <KPICard label="Entradas" value={kpis.incomes} color="text-emerald-500" icon={TrendingUp} />
            <KPICard label="Saídas" value={kpis.expenses} color="text-red-500" icon={TrendingDown} />
            <KPICard label="Líquido" value={kpis.net} color="text-primary" icon={Wallet} glow />
            <KPICard label="A Receber" value={kpis.receivables} color="text-yellow-500" icon={Target} />
            <KPICard label="A Pagar" value={kpis.payables} color="text-rose-500" icon={AlertCircle} />
          </>
        )}
      </section>

      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800">
         {['FLUXO', 'CONTAS', 'PEDIDOS'].map((tab) => (
           <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-primary text-black" : "text-zinc-500 hover:text-white")}>{tab}</button>
         ))}
      </div>

      <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        {activeTab === 'FLUXO' && (
          <div className="divide-y divide-white/5">
            {transactions.length > 0 ? transactions.map((t) => (
              <div key={t.id} onClick={() => handleRowClick(t)} className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-zinc-900/40 transition-all gap-4 cursor-pointer">
                <div className="flex items-center gap-4 flex-1">
                   <div className="flex flex-col items-center justify-center min-w-[50px] bg-zinc-950 p-2 rounded-xl border border-zinc-900"><span className="text-[8px] font-black text-zinc-600 uppercase">{format(parseISO(t.date), 'MMM', { locale: ptBR })}</span><span className="text-lg font-black text-white leading-none">{format(parseISO(t.date), 'dd')}</span></div>
                   <div className="min-w-0"><p className="text-sm font-bold text-white uppercase truncate group-hover:text-primary transition-colors">{t.description}</p><div className="flex items-center gap-3 mt-1"><span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{t.method}</span><span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border", t.type === 'income' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>{t.type === 'income' ? 'Entrada' : 'Saída'}</span></div></div>
                </div>
                <div className="flex items-center gap-8"><p className={cn("text-lg font-black font-mono tracking-tighter", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>{t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><button onClick={(e) => { e.stopPropagation(); setItemToDelete(t); }} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"><Trash2 size={16}/></button></div>
              </div>
            )) : <EmptyState icon={Target} text="Sem movimentos no período" />}
          </div>
        )}

        {activeTab === 'CONTAS' && (
          <div className="divide-y divide-white/5">
            {groupedPayables.length > 0 ? groupedPayables.map((group: any) => (
              <div key={group.groupId} className="flex flex-col">
                <div onClick={() => toggleGroup(group.groupId)} className={cn("flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer transition-all border-l-2", expandedGroups[group.groupId] ? "bg-zinc-900/60 border-primary" : "hover:bg-zinc-900/30 border-transparent")}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn("p-2.5 rounded-xl border flex items-center justify-center", group.allPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-900 border-zinc-800 text-zinc-500")}><Layers size={20} /></div>
                    <div className="min-w-0"><h4 className="text-sm font-black text-white uppercase truncate">{group.supplier}</h4><p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 truncate">{group.description}</p></div>
                  </div>
                  <div className="flex items-center gap-8 mt-4 md:mt-0"><div className="text-right"><p className="text-[9px] text-zinc-600 uppercase font-black">Total Contrato</p><p className="text-lg font-black font-mono text-white">{group.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>{expandedGroups[group.groupId] ? <ChevronUp className="text-zinc-700" size={20} /> : <ChevronDown className="text-zinc-700" size={20} />}</div>
                </div>
                <AnimatePresence>{expandedGroups[group.groupId] && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-black/40 border-t border-white/5"><div className="divide-y divide-white/5 pl-16">{group.installments.map((p: any) => (
                  <div key={p.id} className={cn("flex flex-col md:flex-row md:items-center justify-between p-4 transition-all gap-4 border-l-4", p.status === 'paid' ? "bg-emerald-500/10 border-emerald-500" : "bg-zinc-900/30 border-transparent")}>
                    <div className="flex items-center gap-4"><div><div className="flex items-center gap-2"><span className="text-[10px] font-black text-zinc-400 uppercase">Vencimento:</span><span className="text-[10px] font-bold text-white">{format(parseISO(p.dueDate), 'dd/MM/yyyy')}</span>{p.status === 'paid' && <span className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-500 text-black rounded">PAGO</span>}</div></div></div>
                    <div className="flex items-center gap-6"><p className="text-sm font-black text-white font-mono">{Number(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>{p.status !== 'paid' && <button onClick={() => setItemToPay(p)} className="p-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg"><Check size={16}/></button>}</div>
                  </div>
                ))}</div></motion.div>}</AnimatePresence>
              </div>
            )) : <EmptyState icon={Receipt} text="Sem contas pendentes" />}
          </div>
        )}

        {activeTab === 'PEDIDOS' && (
          <div className="p-6 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl flex flex-col items-center">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2 self-start"><PieChartIcon size={14}/> Distribuição de Produção</h3>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={ordersBI.statusChart} cx="50%" cy="50%" innerRadius={80} outerRadius={100} paddingAngle={5} cornerRadius={10} dataKey="value" strokeWidth={2} onMouseEnter={(_, index) => setActivePieIndex(index)} onMouseLeave={() => setActivePieIndex(null)}>{ordersBI.statusChart.map((entry, index) => <Cell key={`cell-${index}`} fill={PRODUCTION_COLORS[entry.name.toUpperCase()] || PRODUCTION_COLORS['DEFAULT']} fillOpacity={activePieIndex === index ? 1 : 0.8} />)}<Label content={({ viewBox }) => { if (viewBox && "cx" in viewBox && "cy" in viewBox) return <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle"><tspan x={viewBox.cx} y={viewBox.cy - 10} fill="#fff" className="text-4xl font-black">{ordersBI.totalCount}</tspan><tspan x={viewBox.cx} y={viewBox.cy + 20} fill="#71717a" className="text-[10px] font-black uppercase">Total</tspan></text> }} /></Pie><Tooltip /></PieChart></ResponsiveContainer>
                </div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><UsersIcon size={14}/> Top 5 Clientes</h3>
                <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={ordersBI.clientChart} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} style={{ fontSize: '9px', fill: '#71717a' }} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} /><Bar dataKey="value" fill="#FF5F1F" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {itemToDelete && <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4"><motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#0c0c0e] border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center"><div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto text-2xl">⚠️</div><h3 className="text-2xl font-black text-white mb-3 uppercase">Excluir?</h3><div className="flex gap-4"><button onClick={() => setItemToDelete(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px]">Cancelar</button><button onClick={handleConfirmDelete} className="flex-1 py-4 rounded-xl bg-red-500 text-white font-black uppercase text-[10px]">Confirmar</button></div></motion.div></div>}
      </AnimatePresence>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon, glow, isCurrency = true }: any) {
  return <div className={cn("relative bg-[#09090b] border border-zinc-800 p-5 rounded-2xl overflow-hidden group", glow && "border-primary/30 shadow-[0_0_30px_-10px_rgba(255,95,31,0.15)]")}><div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span><Icon size={14} className={cn(color, "opacity-40")} /></div><p className={cn("text-xl font-black font-mono tracking-tighter truncate", color)}>{isCurrency ? (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : (value || 0)}</p></div>;
}

function EmptyState({ icon: Icon, text }: any) {
  return <div className="py-24 text-center opacity-20"><Icon size={48} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.4em]">{text}</p></div>;
}