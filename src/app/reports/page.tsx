'use client';

import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, TrendingDown, Wallet, Target, AlertCircle, 
  Download, Plus, Search, Trash2, Calendar, 
  Loader2, X, Wallet2, CheckCircle2, Receipt, 
  ArrowDownLeft, ArrowRight, CreditCard, Box, Factory, Check,
  BarChart3, PieChart as PieChartIcon, ShoppingBag, Users as UsersIcon,
  ChevronDown, ChevronUp, Layers, Pencil, ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Label
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Configuração de Cores para Gráficos (Neon VisComm)
const PRODUCTION_COLORS: Record<string, string> = {
  'ARTE': '#d946ef',         
  'IMPRESSÃO': '#3b82f6',    
  'SERRALHERIA': '#eab308',  
  'ACABAMENTO': '#f97316',   
  'INSTALAÇÃO': '#a855f7',   
  'CONCLUÍDO': '#10b981',    
  'ENTREGUE': '#10b981',     
  'DEFAULT': '#64748b'       
};

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

  const [cashflowFormData, setCashflowFormData] = useState({
    description: '', amount: '', type: 'income', date: format(new Date(), 'yyyy-MM-dd'), method: 'Pix'
  });
  const [payableFormData, setPayableFormData] = useState({
    supplier: '', description: '', category: 'Suprimentos', amountTotal: '', installments: 1, method: 'Boleto', numeroNF: ''
  });
  const [previewInstallments, setPreviewInstallments] = useState<any[]>([]);

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

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);
  const { data: cashflowManual, isLoading: cashflowLoading } = useCollection(cashflowQuery);
  const { data: payables, isLoading: payablesLoading } = useCollection(payablesQuery);

  // --- MOTOR DE FUSÃO FINANCEIRA (REFATORADO COM ACORDEÃO) ---
  const { transactions, kpis, ordersBI, groupedPayables } = useMemo(() => {
    const fusion: any[] = [];
    let monthIncomes = 0;
    let monthExpenses = 0;
    let globalReceivable = 0;
    let totalPayables = 0;

    const [year, month] = (selectedMonth || '').split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // 1. PROCESSAR PEDIDOS (FATURAMENTO E RECEBÍVEIS)
    orders?.forEach(order => {
      const orderDate = order.createdAt?.seconds 
        ? new Date(order.createdAt.seconds * 1000) 
        : parseISO(order.emission_date || order.emissionDate || '');
      
      if (isWithinInterval(orderDate, { start: startDate, end: endDate })) {
        const balance = Number(order.balance_due ?? order.balanceDue) || 0;
        if (balance > 0) globalReceivable += balance;
      }

      const installments = Array.isArray(order.installments) ? order.installments : [];
      installments.forEach((inst: any) => {
        if ((inst?.status === 'paid' || inst?.status === 'pago') && inst.paid_date) {
          try {
            const paidDate = parseISO(inst.paid_date);
            if (isWithinInterval(paidDate, { start: startDate, end: endDate })) {
              const amount = Number(inst.amount) || 0;
              monthIncomes += amount;
              fusion.push({
                id: `${order.id}-${inst.uid || Math.random()}`,
                date: inst.paid_date,
                description: `PGTO OS #${order.id.slice(-6)} - ${order.client}`,
                type: 'income',
                amount: amount,
                method: inst.payment_method || inst.paymentMethod || 'Sistema',
                origin: 'SISTEMA (OS)',
                originalId: order.id,
                // ANEXO DE PARCELAS PARA ACORDEÃO
                parcelas: installments.map(i => ({
                  id: i.uid || i.id,
                  numero: i.id,
                  valor: i.amount,
                  vencimento: i.due_date || i.dueDate,
                  status: i.status === 'paid' || i.status === 'pago' ? 'liquidado' : 'pendente'
                }))
              });
            }
          } catch (e) {}
        }
      });
    });

    // 2. PROCESSAR CONTAS A PAGAR (PRIMEIRO PARA PODER VINCULAR AO FLUXO)
    const groups: Record<string, any> = {};
    payables?.forEach(payable => {
      if (payable.status !== 'paid') totalPayables += Number(payable.amount) || 0;
      const gid = payable.groupId || payable.id;
      if (!groups[gid]) {
        groups[gid] = { groupId: gid, supplier: payable.supplier, description: payable.description, installments: [], totalAmount: 0, allPaid: true };
      }
      groups[gid].installments.push(payable);
      groups[gid].totalAmount += Number(payable.amount) || 0;
      if (payable.status !== 'paid') groups[gid].allPaid = false;
    });

    // 3. PROCESSAR FLUXO MANUAL
    cashflowManual?.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: startDate, end: endDate })) {
          const amount = Number(entry.amount) || 0;
          if (entry.type === 'income') monthIncomes += amount;
          else monthExpenses += amount;

          // Tenta encontrar parcelas se for pagamento de conta
          let associatedParcelas = [];
          if (entry.origin === 'CONTAS A PAGAR') {
             const group = Object.values(groups).find((g: any) => entry.description.includes(g.supplier) || entry.description.includes(g.description));
             if (group) {
               associatedParcelas = group.installments.map((p: any) => ({
                 id: p.id,
                 numero: `${p.installmentNumber}/${p.totalInstallments}`,
                 valor: p.amount,
                 vencimento: p.dueDate,
                 status: p.status === 'paid' ? 'liquidado' : 'pendente'
               }));
             }
          }

          fusion.push({
            id: entry.id,
            date: entry.date,
            description: entry.description,
            type: entry.type,
            amount: amount,
            method: entry.method || 'Manual',
            origin: entry.origin || 'MANUAL',
            parcelas: associatedParcelas
          });
        }
      } catch (e) {}
    });

    const groupedArray = Object.values(groups).sort((a: any, b: any) => {
      const earliestA = a.installments.reduce((min: string, inst: any) => (inst.dueDate < min ? inst.dueDate : min), '9999-99-99');
      const earliestB = b.installments.reduce((min: string, inst: any) => (inst.dueDate < min ? inst.dueDate : min), '9999-99-99');
      return earliestA.localeCompare(earliestB);
    });

    // 4. BI DE PEDIDOS (MENSAL)
    const biStatus: Record<string, number> = {};
    const biClients: Record<string, number> = {};
    let biTotalValue = 0;
    
    const filteredOrders = orders?.filter(o => {
      const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : parseISO(o.emission_date || '');
      return isWithinInterval(d, { start: startDate, end: endDate });
    }) || [];

    filteredOrders.forEach(o => {
      const val = Number(o.total_value ?? o.totalValue) || 0;
      biTotalValue += val;
      const statusName = String(o.status || 'Outros').toUpperCase();
      biStatus[statusName] = (biStatus[statusName] || 0) + 1;
      biClients[o.client] = (biClients[o.client] || 0) + val;
    });

    const totalOrdersCount = filteredOrders.length;
    const statusChart = Object.entries(biStatus).map(([name, value]) => ({ 
      name, 
      value,
      percent: totalOrdersCount > 0 ? Math.round((value / totalOrdersCount) * 100) : 0
    }));

    const clientChart = Object.entries(biClients)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    fusion.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return {
      transactions: fusion,
      kpis: { incomes: monthIncomes, expenses: monthExpenses, net: monthIncomes - monthExpenses, receivables: globalReceivable, payables: totalPayables },
      ordersBI: { filteredOrders, totalCount: totalOrdersCount, inProduction: filteredOrders.filter(o => !['Concluído', 'Entregue'].includes(o.status)).length, finalized: filteredOrders.filter(o => ['Concluído', 'Entregue'].includes(o.status)).length, totalValue: biTotalValue, ticketMedio: totalOrdersCount > 0 ? biTotalValue / totalOrdersCount : 0, statusChart, clientChart },
      groupedPayables: groupedArray
    };
  }, [orders, cashflowManual, payables, selectedMonth]);

  const toggleGroup = (gid: string) => setExpandedGroups(prev => ({ ...prev, [gid]: !prev[gid] }));
  const toggleTxExpand = (id: string) => setExpandedTxId(prev => prev === id ? null : id);

  const handleRowClick = (item: any) => {
    if (item.origin === 'SISTEMA (OS)') router.push(`/orders?edit=${item.originalId}`);
    else setItemToEdit({ ...item });
  };

  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) { alert("Não há dados para exportar."); return; }
    let csvContent = "\uFEFFDATA;DESCRIÇÃO;FORMA DE PAGAMENTO;TIPO;VALOR\n";
    transactions.forEach(t => {
      const d = (t.date || '').split('-').reverse().join('/');
      const valorStr = Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      csvContent += `${d};${(t.description || '').replace(/;/g, ',')};${t.method || '-'};${t.type === 'income' ? 'Entrada' : 'Saída'};R$ ${valorStr}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fluxo_caixa_${selectedMonth}.csv`;
    link.click();
  };

  const handleConfirmPayment = async () => {
    if (!itemToPay || !firestore || !user) return;
    
    const payableRef = doc(firestore, 'accounts_payable', itemToPay.id);
    const updateData = { status: 'paid', paidAt: serverTimestamp(), paymentDate: new Date().toISOString() };
    
    updateDoc(payableRef, updateData)
      .then(async () => {
        const cashflowData = {
          description: `PGTO: ${itemToPay.supplier || itemToPay.description}`,
          amount: Number(itemToPay.amount), type: 'expense', date: format(new Date(), 'yyyy-MM-dd'),
          method: itemToPay.method || 'Boleto', origin: 'CONTAS A PAGAR', createdAt: serverTimestamp(), userId: user.uid
        };
        await addDoc(collection(firestore, 'cashflow_manual'), cashflowData);
        toast({ title: "Baixa Confirmada" });
        setItemToPay(null);
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: payableRef.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !firestore) return;
    const collectionName = (itemToDelete.hasOwnProperty('supplier') || itemToDelete.status === 'pending') ? 'accounts_payable' : 'cashflow_manual';
    const itemRef = doc(firestore, collectionName, itemToDelete.id);
    
    deleteDoc(itemRef)
      .then(() => {
        toast({ title: "Registro Removido" });
        setItemToDelete(null);
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: itemRef.path,
          operation: 'delete'
        }));
      });
  };

  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSubmitting(true);
    const entryData = { ...cashflowFormData, amount: Number(cashflowFormData.amount), createdAt: serverTimestamp(), userId: user.uid };
    
    addDoc(collection(firestore, 'cashflow_manual'), entryData)
      .then(() => {
        toast({ title: "Lançamento Efetuado" });
        setIsCashflowModalOpen(false);
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'cashflow_manual',
          operation: 'create',
          requestResourceData: entryData
        }));
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit || !itemToEdit.id || !firestore) return;
    setIsSubmitting(true);
    const entryRef = doc(firestore, 'cashflow_manual', itemToEdit.id);
    const updateData = { description: itemToEdit.description, amount: Number(itemToEdit.amount), date: itemToEdit.date, method: itemToEdit.method };
    
    updateDoc(entryRef, updateData)
      .then(() => {
        toast({ title: "Lançamento Atualizado" });
        setItemToEdit(null);
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: entryRef.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleSaveInstallmentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installmentToEdit || !installmentToEdit.id || !firestore) return;
    setIsSubmitting(true);
    const installmentRef = doc(firestore, 'accounts_payable', installmentToEdit.id);
    const updateData = { 
      description: installmentToEdit.description || '', 
      amount: Number(installmentToEdit.amount), 
      dueDate: installmentToEdit.dueDate || installmentToEdit.date 
    };
    
    updateDoc(installmentRef, updateData)
      .then(() => {
        toast({ title: "Parcela Atualizada" });
        setInstallmentToEdit(null);
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: installmentRef.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      })
      .finally(() => setIsSubmitting(false));
  };

  if (ordersLoading || cashflowLoading || payablesLoading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-1.5 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative z-10">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <BarChart3 size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Intelligence Dashboard</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Resultados</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-3 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
               <Download size={16} /> EXPORTAR CSV
             </button>
             <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-black uppercase outline-none focus:border-primary transition-all" />
             </div>
             {activeTab !== 'PEDIDOS' && (
               <button onClick={() => activeTab === 'FLUXO' ? setIsCashflowModalOpen(true) : setIsPayableModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:bg-white transition-all">
                 <Plus size={16} strokeWidth={3} /> {activeTab === 'FLUXO' ? 'Lançamento' : 'Nova Conta'}
               </button>
             )}
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {activeTab === 'PEDIDOS' ? (
            <>
              <KPICard label="Total de Pedidos" value={ordersBI.totalCount} isCurrency={false} color="text-white" icon={ShoppingBag} />
              <KPICard label="Em Produção" value={ordersBI.inProduction} isCurrency={false} color="text-yellow-500" icon={Factory} />
              <KPICard label="Finalizados" value={ordersBI.finalized} isCurrency={false} color="text-emerald-500" icon={CheckCircle2} />
              <KPICard label="Valor em OS" value={ordersBI.totalValue} color="text-primary" icon={Wallet} glow />
              <KPICard label="Ticket Médio" value={ordersBI.ticketMedio} color="text-cyan-400" icon={TrendingUp} />
            </>
          ) : (
            <>
              <KPICard label="Entradas" value={kpis.incomes} color="text-emerald-500" icon={TrendingUp} />
              <KPICard label="Saídas" value={kpis.expenses} color="text-red-500" icon={TrendingDown} />
              <KPICard label="Líquido" value={kpis.net} color="text-primary" icon={Wallet} glow />
              <KPICard label="A Receber (OS)" value={kpis.receivables} color="text-yellow-500" icon={Target} />
              <KPICard label="Contas a Pagar" value={kpis.payables} color="text-rose-500" icon={AlertCircle} />
            </>
          )}
        </section>

        <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800">
           {['FLUXO', 'CONTAS', 'PEDIDOS'].map((tab) => (
             <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-primary text-black" : "text-zinc-500 hover:text-white")}>
               {tab === 'FLUXO' ? 'Fluxo de Caixa' : tab === 'CONTAS' ? 'Contas a Pagar' : 'Análise de Pedidos'}
             </button>
           ))}
        </div>

        <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          {activeTab === 'FLUXO' && (
            <div className="divide-y divide-white/5">
              {transactions.length > 0 ? transactions.map((t) => {
                const fulfillmentDate = t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '--/--/----';
                const isExpanded = expandedTxId === t.id;
                
                return (
                  <div key={t.id} className="flex flex-col border-l-4 border-transparent transition-all">
                    <div 
                      onClick={() => toggleTxExpand(t.id)} 
                      className={cn(
                        "group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-zinc-900/40 transition-all gap-4 cursor-pointer",
                        isExpanded && "bg-zinc-900/60 border-l-primary"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                         <div className="flex flex-col items-center justify-center min-w-[50px] bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                           <span className="text-[8px] font-black text-zinc-600 uppercase">{t.date ? format(parseISO(t.date), 'MMM', { locale: ptBR }) : '-'}</span>
                           <span className="text-lg font-black text-white leading-none">{t.date ? format(parseISO(t.date), 'dd') : '-'}</span>
                         </div>
                         <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white uppercase truncate group-hover:text-primary transition-colors">{t.description}</p>
                              <ChevronRight size={14} className={cn("text-zinc-700 transition-transform duration-300", isExpanded && "rotate-90 text-primary")} />
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                               <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{t.method}</span>
                               <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border", t.type === 'income' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>{t.type === 'income' ? 'Entrada' : 'Saída'}</span>
                               <span className="text-[9px] text-zinc-500 font-medium ml-2 border-l border-zinc-800 pl-2">Realizado em: <span className="text-zinc-400 font-bold">{fulfillmentDate}</span></span>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-8">
                         <p className={cn("text-lg font-black font-mono tracking-tighter", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>
                           {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                         </p>
                         <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleRowClick(t); }} className="p-3 bg-zinc-800 text-zinc-400 hover:bg-white hover:text-black rounded-xl transition-all border border-zinc-700"><Pencil size={16}/></button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (t.origin === 'SISTEMA (OS)') { alert("⚠️ Lançamento automático. Cancele no pedido original."); return; } setItemToDelete(t); }} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"><Trash2 size={16}/></button>
                         </div>
                      </div>
                    </div>

                    {/* ACORDEÃO DE PARCELAS */}
                    <AnimatePresence>
                      {isExpanded && t.parcelas && t.parcelas.length > 0 && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }} 
                          className="overflow-hidden bg-black/40 border-t border-white/5"
                        >
                          <div className="p-4 ml-12 space-y-3 bg-zinc-950/50 border border-zinc-800/50 rounded-bl-3xl">
                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                              <Layers size={12} /> Cronograma do documento original
                            </h4>
                            <div className="flex flex-col gap-2">
                              {t.parcelas.map((parcela: any, idx: number) => (
                                <div key={parcela.id || idx} className="flex justify-between items-center py-2 border-b border-zinc-900 last:border-0">
                                  <div className="flex items-center gap-4">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[8px] font-black uppercase border",
                                      parcela.status === 'liquidado' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                    )}>
                                      {parcela.status}
                                    </span>
                                    <span className="text-xs font-bold text-zinc-300 uppercase">Parcela {parcela.numero}</span>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <div className="text-right">
                                      <span className="text-[9px] text-zinc-600 font-bold uppercase block">Vencimento</span>
                                      <span className="text-[10px] text-zinc-400 font-mono">{parcela.vencimento ? format(parseISO(parcela.vencimento), 'dd/MM/yyyy') : '--/--/----'}</span>
                                    </div>
                                    <span className="text-sm font-black text-white font-mono min-w-[100px] text-right">
                                      {Number(parcela.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }) : <EmptyState icon={Target} text="Sem movimentos no período" />}
            </div>
          )}

          {activeTab === 'CONTAS' && (
            <div className="divide-y divide-white/5">
              {groupedPayables.length > 0 ? groupedPayables.map((group: any) => (
                <div key={group.groupId} className="flex flex-col">
                  <div onClick={() => toggleGroup(group.groupId)} className={cn("flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer transition-all border-l-2", expandedGroups[group.groupId] ? "bg-zinc-900/60 border-primary" : "hover:bg-zinc-900/30 border-transparent")}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn("p-2.5 rounded-xl border flex items-center justify-center", group.allPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-900 border-zinc-800 text-zinc-500")}><Layers size={20} /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase truncate">{group.supplier}</h4>
                          <span className="text-[8px] bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 font-black uppercase">{group.installments.length} PARCELAS</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 truncate">{group.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 mt-4 md:mt-0">
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Total do Contrato</p>
                        <p className="text-lg font-black font-mono text-white">{group.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn("px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest", group.allPaid ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>{group.allPaid ? 'Liquidado' : 'Em Aberto'}</div>
                        {expandedGroups[group.groupId] ? <ChevronUp className="text-zinc-700" size={20} /> : <ChevronDown className="text-zinc-700" size={20} />}
                      </div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedGroups[group.groupId] && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-black/40 border-t border-white/5">
                        <div className="divide-y divide-white/5 pl-8 md:pl-16">
                          {group.installments.sort((a: any, b: any) => a.installmentNumber - b.installmentNumber).map((p: any) => (
                            <div key={p.id} className={cn("flex flex-col md:flex-row md:items-center justify-between p-4 transition-all gap-4 border-l-4", p.status === 'paid' ? "bg-emerald-500/10 border-emerald-500" : "bg-zinc-900/30 hover:bg-white/5 border-transparent")}>
                              <div className="flex items-center gap-4">
                                <div className="text-[9px] font-black text-zinc-600 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800">{p.installmentNumber || 1}/{p.totalInstallments || 1}</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vencimento:</span>
                                    <span className={cn("text-[10px] font-bold", p.status === 'paid' ? "text-emerald-500" : "text-white")}>{p.dueDate ? format(parseISO(p.dueDate), 'dd/MM/yyyy') : '-'}</span>
                                    {p.status === 'paid' && <span className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-500 text-black rounded uppercase tracking-tighter shadow-[0_0_10px_rgba(16,185,129,0.3)]">PAGO</span>}
                                  </div>
                                  <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em]">{p.method} • {p.category} {p.invoiceNumber ? `• NF: ${p.invoiceNumber}` : ''}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <p className={cn("text-sm font-black font-mono", p.status === 'paid' ? "text-emerald-400" : "text-white")}>{Number(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                <div className="flex gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); setInstallmentToEdit({ ...p }); }} className="p-2.5 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white rounded-lg transition-all border border-zinc-700/50"><Pencil size={16} /></button>
                                  {p.status !== 'paid' && <button onClick={(e) => { e.stopPropagation(); setItemToPay(p); }} className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-lg transition-all border border-emerald-500/20"><Check size={16} strokeWidth={3} /></button>}
                                  <button onClick={(e) => { e.stopPropagation(); setItemToDelete(p); }} className="p-2.5 bg-zinc-900 text-zinc-600 hover:text-red-500 rounded-lg transition-all border border-zinc-800"><Trash2 size={16}/></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )) : <EmptyState icon={Receipt} text="Sem contas pendentes" />}
            </div>
          )}

          {activeTab === 'PEDIDOS' && (
            <div className="p-6 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden flex flex-col items-center">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2 self-start"><PieChartIcon size={14}/> Distribuição de Produção</h3>
                  <div className="h-[320px] w-full relative">
                    {ordersBI.statusChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={ordersBI.statusChart} cx="50%" cy="50%" innerRadius={80} outerRadius={100} paddingAngle={5} cornerRadius={10} dataKey="value" strokeWidth={2} onMouseEnter={(_, index) => setActivePieIndex(index)} onMouseLeave={() => setActivePieIndex(null)} labelLine={false} className="outline-none">
                            {ordersBI.statusChart.map((entry, index) => {
                              const statusName = entry.name ? String(entry.name).toUpperCase() : '';
                              const sliceColor = PRODUCTION_COLORS[statusName] || PRODUCTION_COLORS['DEFAULT'];
                              const isActive = activePieIndex === index;
                              return <Cell key={`cell-${index}`} fill={sliceColor} fillOpacity={activePieIndex !== null ? (isActive ? 1 : 0.4) : 0.8} stroke={sliceColor} strokeWidth={isActive ? 4 : 2} style={{ filter: isActive ? `drop-shadow(0 0 12px ${sliceColor})` : 'none', transition: 'all 0.3s ease' }} className="outline-none cursor-pointer" />;
                            })}
                            <Label content={({ viewBox }) => { if (viewBox && "cx" in viewBox && "cy" in viewBox) { const activeItem = activePieIndex !== null ? ordersBI.statusChart[activePieIndex] : null; const statusName = activeItem?.name ? String(activeItem.name).toUpperCase() : ''; const color = activeItem ? (PRODUCTION_COLORS[statusName] || PRODUCTION_COLORS['DEFAULT']) : '#fff'; return ( <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle"> <tspan x={viewBox.cx} y={viewBox.cy - 20} fill={activeItem ? color : "#71717a"} className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ transition: 'fill 0.3s ease' }}> {activeItem ? statusName : 'TOTAL GERAL'} </tspan> <tspan x={viewBox.cx} y={viewBox.cy + 15} fill="#fff" className="text-5xl font-black tracking-tighter"> {activeItem ? activeItem.value : ordersBI.totalCount} </tspan> <tspan x={viewBox.cx} y={viewBox.cy + 42} fill="#71717a" className="text-[9px] font-bold uppercase tracking-widest"> {activeItem ? `${activePieIndex !== null ? Math.round((ordersBI.statusChart[activePieIndex].value / ordersBI.totalCount) * 100) : 0}% DO FLUXO` : 'PEDIDOS REGISTRADOS'} </tspan> </text> ) } }} />
                          </Pie>
                          <Tooltip content={() => null} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyState icon={PieChartIcon} text="Dados insuficientes para gráfico" />}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-6">
                    {ordersBI.statusChart.map((item, index) => {
                      const statusName = item.name ? String(item.name).toUpperCase() : '';
                      const color = PRODUCTION_COLORS[statusName] || PRODUCTION_COLORS['DEFAULT'];
                      return ( <div key={index} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer", activePieIndex === index ? "bg-white/10 border-white/20 scale-105" : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700")} onMouseEnter={() => setActivePieIndex(index)} onMouseLeave={() => setActivePieIndex(null)}> <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} /> <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{item.name}</span> </div> )
                    })}
                  </div>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><UsersIcon size={14}/> Top 5 Clientes (Faturamento)</h3>
                  <div className="h-[250px]">
                    {ordersBI.clientChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersBI.clientChart} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#71717a', textTransform: 'uppercase' }} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                          <Bar dataKey="value" fill="#FF5F1F" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState icon={BarChart3} text="Dados insuficientes para ranking" />}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Registros de OS do Período</h3>
                <div className="divide-y divide-white/5 bg-zinc-950/20 rounded-2xl border border-zinc-800">
                  {ordersBI.filteredOrders.length > 0 ? ordersBI.filteredOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-mono text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">#{o.id.slice(-6)}</span>
                        <div>
                          <p className="text-sm font-bold text-white uppercase">{o.client}</p>
                          <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{o.seller || 'Vendedor'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={cn("text-[8px] font-black uppercase px-2 py-1 rounded-full border", o.status === 'Concluído' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : o.status === 'Arte' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-zinc-800 text-zinc-400")}>{o.status}</span>
                        <p className="text-sm font-black font-mono text-white">{(Number(o.total_value ?? o.totalValue) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </div>
                  )) : <EmptyState icon={ShoppingBag} text="Sem pedidos registrados no período" />}
                </div>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {itemToDelete && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0c0c0e] border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20 mx-auto text-2xl">⚠️</div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Excluir Lançamento</h3>
                <p className="text-zinc-400 text-sm uppercase tracking-widest mb-8">Deseja apagar <strong className="text-white">"{itemToDelete.description || itemToDelete.supplier}"</strong>?</p>
                <div className="flex gap-4">
                  <button onClick={() => setItemToDelete(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                  <button onClick={handleConfirmDelete} className="flex-1 py-4 rounded-xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest shadow-[0_0_25px_rgba(239,68,68,0.4)]">Confirmar</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {itemToPay && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0c0c0e] border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20 mx-auto text-4xl">💰</div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Liquidar Parcela</h3>
                <p className="text-zinc-400 text-sm uppercase tracking-widest mb-8">Confirmar pagamento de <strong className="text-white">R$ {Number(itemToPay.amount).toLocaleString('pt-BR')}</strong>?</p>
                <div className="flex gap-4">
                  <button onClick={() => setItemToPay(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                  <button onClick={handleConfirmPayment} className="flex-1 py-4 rounded-xl bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest shadow-[0_0_25px_rgba(16,185,129,0.4)]">Efetivar Baixa</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {itemToEdit && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setItemToEdit(null)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase tracking-tighter">Editar Lançamento</h3><button onClick={() => setItemToEdit(null)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button></div>
                <form onSubmit={handleSaveEdit} className="p-6 space-y-6 bg-[#050505]">
                  <div className="space-y-2"><label className={labelClass}>Descrição</label><input required value={itemToEdit.description || ''} onChange={e => setItemToEdit({...itemToEdit, description: e.target.value})} className={inputClass} /></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className={labelClass}>Valor (R$)</label><input type="number" step="0.01" required value={itemToEdit.amount || ''} onChange={e => setItemToEdit({...itemToEdit, amount: e.target.value})} className={inputClass} /></div><div className="space-y-2"><label className={labelClass}>Data</label><input type="date" required value={itemToEdit.date || ''} onChange={e => setItemToEdit({...itemToEdit, date: e.target.value})} className={inputClass} /></div></div>
                  <div className="space-y-2"><label className={labelClass}>Forma de Pgto</label><select value={itemToEdit.method || ''} onChange={e => setItemToEdit({...itemToEdit, method: e.target.value})} className={inputClass}>{['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                  <div className="flex gap-3 pt-2"><button type="button" onClick={() => setItemToEdit(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-xl">{isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Salvar"}</button></div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {installmentToEdit && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setInstallmentToEdit(null)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase tracking-tighter">Editar Parcela</h3><button onClick={() => setInstallmentToEdit(null)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button></div>
                <form onSubmit={handleSaveInstallmentEdit} className="p-6 space-y-6 bg-[#050505]">
                  <div className="space-y-2"><label className={labelClass}>Fornecedor/Descrição</label><input value={installmentToEdit.description || installmentToEdit.supplier || ''} onChange={e => setInstallmentToEdit({...installmentToEdit, description: e.target.value})} className={inputClass} /></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className={labelClass}>Valor (R$)</label><input type="number" step="0.01" required value={installmentToEdit.amount || ''} onChange={e => setInstallmentToEdit({...installmentToEdit, amount: e.target.value})} className={inputClass} /></div><div className="space-y-2"><label className={labelClass}>Vencimento</label><input type="date" required value={installmentToEdit.dueDate || installmentToEdit.date || ''} onChange={e => setInstallmentToEdit({...installmentToEdit, dueDate: e.target.value})} className={inputClass} /></div></div>
                  <div className="flex gap-3 pt-2"><button type="button" onClick={() => setInstallmentToEdit(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-primary text-black font-black uppercase text-[10px] rounded-xl">{isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Salvar"}</button></div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCashflowModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsCashflowModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase tracking-tighter">Novo Lançamento</h3><button onClick={() => setIsCashflowModalOpen(false)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button></div>
                <form onSubmit={handleSaveManualEntry} className="p-8 space-y-6">
                  <div className="space-y-2"><label className={labelClass}>Descrição</label><input required value={cashflowFormData.description} onChange={e => setCashflowFormData({...cashflowFormData, description: e.target.value})} className={inputClass} placeholder="Ex: Material Escritório" /></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className={labelClass}>Valor (R$)</label><input type="number" step="0.01" required value={cashflowFormData.amount} onChange={e => setCashflowFormData({...cashflowFormData, amount: e.target.value})} className={inputClass} /></div><div className="space-y-2"><label className={labelClass}>Data</label><input type="date" required value={cashflowFormData.date} onChange={e => setCashflowFormData({...cashflowFormData, date: e.target.value})} className={inputClass} /></div></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className={labelClass}>Forma de Pgto</label><select value={cashflowFormData.method} onChange={e => setCashflowFormData({...cashflowFormData, method: e.target.value})} className={inputClass}>{['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência'].map(m => <option key={m} value={m}>{m}</option>)}</select></div><div className="space-y-2"><label className={labelClass}>Fluxo</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setCashflowFormData({...cashflowFormData, type: 'income'})} className={cn("py-2.5 rounded-xl border-2 font-black uppercase text-[8px] tracking-widest transition-all", cashflowFormData.type === 'income' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-zinc-800 text-zinc-500")}>Entrada</button><button type="button" onClick={() => setCashflowFormData({...cashflowFormData, type: 'expense'})} className={cn("py-2.5 rounded-xl border-2 font-black uppercase text-[8px] tracking-widest transition-all", cashflowFormData.type === 'expense' ? "border-red-500 bg-red-500/10 text-red-500" : "border-zinc-800 text-zinc-500")}>Saída</button></div></div></div>
                  <button disabled={isSubmitting} className="w-full py-5 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_5px_25px_-5px_rgba(255,95,31,0.5)]">{isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Efetivar Lançamento"}</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isPayableModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setIsPayableModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase tracking-tighter">Registrar Compromissos</h3><button onClick={() => setIsPayableModalOpen(false)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full"><X size={20}/></button></div>
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelClass}>Fornecedor</label><input required value={payableFormData.supplier} onChange={e => setPayableFormData({...payableFormData, supplier: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Descrição</label><input value={payableFormData.description} onChange={e => setPayableFormData({...payableFormData, description: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Nº da NF</label><input value={payableFormData.numeroNF} onChange={e => setPayableFormData({...payableFormData, numeroNF: e.target.value})} className={inputClass} placeholder="Ex: 12345" /></div>
                    <div><label className={labelClass}>Valor Total</label><input type="number" value={payableFormData.amountTotal} onChange={e => setPayableFormData({...payableFormData, amountTotal: e.target.value})} className={inputClass} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Parcelas</label><div className="flex gap-2"><input type="number" min={1} value={payableFormData.installments} onChange={e => setPayableFormData({...payableFormData, installments: Number(e.target.value)})} className={inputClass} /><button onClick={() => { const total = Number(payableFormData.amountTotal); const count = Number(payableFormData.installments); const v = Number((total / count).toFixed(2)); const list = []; for(let i=0; i<count; i++) list.push({ dueDate: format(addMonths(new Date(), i), 'yyyy-MM-dd'), amount: i === count - 1 ? (total - (v * (count - 1))) : v }); setPreviewInstallments(list); }} className="bg-white text-black px-4 rounded-xl font-black uppercase text-[10px]">Gerar</button></div></div>
                  </div>
                  {previewInstallments.length > 0 && (
                    <div className="space-y-3 pt-4">
                      {previewInstallments.map((inst, idx) => (
                        <div key={idx} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl grid grid-cols-2 gap-4">
                          <input type="date" value={inst.dueDate} onChange={e => { const n = [...previewInstallments]; n[idx].dueDate = e.target.value; setPreviewInstallments(n); }} className={inputClass} />
                          <input type="number" value={inst.amount} onChange={e => { const n = [...previewInstallments]; n[idx].amount = Number(e.target.value); setPreviewInstallments(n); }} className={inputClass} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-8 border-t border-white/5">
                  <button onClick={async () => { 
                    setIsSubmitting(true); 
                    const groupId = Date.now().toString(); 
                    try { 
                      for(let i=0; i<previewInstallments.length; i++) { 
                        const inst = previewInstallments[i]; 
                        const payload = { 
                          supplier: payableFormData.supplier, 
                          description: payableFormData.description, 
                          amount: Number(inst.amount), 
                          dueDate: inst.dueDate, 
                          invoiceNumber: payableFormData.numeroNF, 
                          status: 'pending', 
                          userId: user.uid, 
                          groupId: groupId, 
                          installmentNumber: i + 1, 
                          totalInstallments: previewInstallments.length, 
                          createdAt: serverTimestamp() 
                        };
                        await addDoc(collection(firestore, 'accounts_payable'), payload); 
                      } 
                      setIsPayableModalOpen(false); 
                      setPreviewInstallments([]); 
                      setPayableFormData({ supplier: '', description: '', category: 'Suprimentos', amountTotal: '', installments: 1, method: 'Boleto', numeroNF: '' }); 
                      toast({title: "Pauta Salva"}); 
                    } catch(e) { 
                      alert(e); 
                    } finally { 
                      setIsSubmitting(false); 
                    } 
                  }} disabled={isSubmitting} className="w-full py-5 bg-primary text-black font-black uppercase tracking-widest rounded-2xl">Efetivar Compromissos</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon, glow, isCurrency = true }: any) {
  return (
    <div className={cn("relative bg-[#09090b] border border-zinc-800 p-5 rounded-2xl overflow-hidden transition-all duration-500 hover:border-zinc-700 group", glow && "border-primary/30 shadow-[0_0_30px_-10px_rgba(255,95,31,0.15)]")}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <Icon size={14} className={cn(color, "opacity-40 group-hover:opacity-100 transition-opacity")} />
      </div>
      <p className={cn("text-xl font-black font-mono tracking-tighter truncate", color)}>
        {isCurrency ? (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : (value || 0)}
      </p>
      {glow && <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary/20 blur-2xl rounded-full" />}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: any) {
  return (
    <div className="py-24 text-center opacity-20">
       <Icon size={48} className="mx-auto mb-4" />
       <p className="text-[10px] font-black uppercase tracking-[0.4em]">{text}</p>
    </div>
  );
}
