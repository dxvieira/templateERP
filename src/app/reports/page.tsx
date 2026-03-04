'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Wallet, Target, AlertCircle, Plus, Trash2, Calendar, 
  Loader2, X, CheckCircle2, Sparkles, Download, FileText, ChevronDown, 
  DollarSign, ArrowUpRight, ShieldCheck, Layers, FileSearch
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AdminGuard } from '@/components/auth/AdminGuard';
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Utilitário para sanitização de valores monetários.
 */
const cleanCurrency = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const cleaned = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
};

function ReportsContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'FLUXO' | 'CONTAS' | 'PEDIDOS'>('FLUXO');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [itemToPay, setItemToPay] = useState<any>(null);

  useEffect(() => {
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
  }, []);

  const ordersQuery = useMemoFirebase(() => { 
    if (!firestore || !user) return null; 
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc')); 
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

  /**
   * MOTOR DE CONSOLIDAÇÃO FINANCEIRA E ANÁLISE DE PEDIDOS
   */
  const reportData = useMemo(() => {
    if (!selectedMonth) return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    let incomes = 0, expenses = 0, receivables = 0, totalPayables = 0;
    const transactions: any[] = [];
    const monthlyOrders: any[] = [];

    // Processamento de Ordens de Serviço
    orders?.forEach(order => {
      const orderDate = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : parseISO(order.emission_date || order.delivery_date || '');
      
      const isThisMonth = isWithinInterval(orderDate, { start: startDate, end: endDate });

      const totalVal = cleanCurrency(order.total_value ?? order.totalValue);
      const paidVal = cleanCurrency(order.amount_paid ?? order.amountPaid);
      const balDue = totalVal - paidVal;

      if (isThisMonth) {
        if (balDue > 0) receivables += balDue;
        
        monthlyOrders.push({
          ...order,
          calculatedTotal: totalVal,
          calculatedPaid: paidVal,
          calculatedBalance: balDue,
          progress: totalVal > 0 ? Math.round((paidVal / totalVal) * 100) : 0
        });
      }

      // Parcelas Quitadas (Entradas)
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
                type: 'income', 
                amount, 
                method: inst.payment_method || 'Sistema', 
                origin: 'SISTEMA (OS)', 
                originalId: order.id 
              });
            }
          } catch (e) {}
        }
      });
    });

    // Contas a Pagar
    const groups: Record<string, any> = {};
    payables?.forEach(payable => {
      if (payable.status !== 'paid') totalPayables += cleanCurrency(payable.amount);
      const gid = payable.groupId || payable.id;
      if (!groups[gid]) groups[gid] = { groupId: gid, supplier: payable.supplier, description: payable.description, installments: [], totalAmount: 0, allPaid: true };
      groups[gid].installments.push(payable); 
      groups[gid].totalAmount += cleanCurrency(payable.amount);
      if (payable.status !== 'paid') groups[gid].allPaid = false;
    });

    // Lançamentos Manuais
    cashflowManual?.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: startDate, end: endDate })) {
          const amount = cleanCurrency(entry.amount);
          if (entry.type === 'income') incomes += amount; else expenses += amount;
          transactions.push({ 
            id: entry.id, 
            date: entry.date, 
            description: entry.description, 
            type: entry.type, 
            amount, 
            method: entry.method || 'Manual', 
            origin: entry.origin || 'MANUAL' 
          });
        }
      } catch (e) {}
    });

    transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const totalOrdersValue = monthlyOrders.reduce((acc, o) => acc + o.calculatedTotal, 0);

    return { 
      transactions, 
      monthlyOrders,
      groupedPayables: Object.values(groups), 
      kpis: { incomes, expenses, net: incomes - expenses, receivables, payables: totalPayables, totalOrdersValue } 
    };
  }, [orders, cashflowManual, payables, selectedMonth]);

  const handleExport = (formatType: 'xlsx' | 'csv' | 'xml') => {
    if (!reportData) return;

    const header = ['Data', 'Tipo', 'Descrição', 'Origem/Destino', 'Valor Bruto', 'Status', 'Responsável'];
    const dataToExport = reportData.transactions.map(t => ({
      'Data': format(parseISO(t.date), 'dd/MM/yyyy'),
      'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
      'Descrição': String(t.description || ''),
      'Origem/Destino': String(t.origin || ''),
      'Valor Bruto': Number(t.amount || 0),
      'Status': 'Compensado',
      'Responsável': String(t.method || 'Sistema')
    }));

    if (formatType === 'xlsx' || formatType === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header });
      worksheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 50 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fluxo de Caixa");
      
      // Adiciona aba de Pedidos se houver
      if (reportData.monthlyOrders.length > 0) {
        const orderHeader = ['ID OS', 'Cliente', 'Valor Total', 'Valor Pago', 'Saldo Devedor', 'Status'];
        const orderData = reportData.monthlyOrders.map(o => ({
          'ID OS': o.id,
          'Cliente': o.client,
          'Valor Total': o.calculatedTotal,
          'Valor Pago': o.calculatedPaid,
          'Saldo Devedor': o.calculatedBalance,
          'Status': o.status
        }));
        const orderSheet = XLSX.utils.json_to_sheet(orderData, { header: orderHeader });
        XLSX.utils.book_append_sheet(workbook, orderSheet, "Pedidos do Mês");
      }

      XLSX.writeFile(workbook, `Relatorio_Impacto_${selectedMonth}.${formatType === 'xlsx' ? 'xlsx' : 'csv'}`);
      toast({ title: "Extração Concluída" });
    } else if (formatType === 'xml') {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<RelatorioFinanceiro>\n';
      dataToExport.forEach(item => {
        xml += '  <Transacao>\n';
        Object.entries(item).forEach(([key, value]) => {
          const safeKey = key.replace(/\//g, '_').replace(/ /g, '_');
          xml += `    <${safeKey}>${value}</${safeKey}>\n`;
        });
        xml += '  </Transacao>\n';
      });
      xml += '</RelatorioFinanceiro>';
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Relatorio_Impacto_${selectedMonth}.xml`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "XML Gerado" });
    }
  };

  const handleConfirmPayment = async () => {
    if (!itemToPay || !firestore || !user) return;
    const payableRef = doc(firestore, 'accounts_payable', itemToPay.id);
    updateDoc(payableRef, { status: 'paid', paidAt: serverTimestamp(), paymentDate: new Date().toISOString() }).then(async () => {
      await addDoc(collection(firestore, 'cashflow_manual'), { 
        description: `PGTO: ${itemToPay.supplier}`, 
        amount: cleanCurrency(itemToPay.amount), 
        type: 'expense', 
        date: format(new Date(), 'yyyy-MM-dd'), 
        method: 'Boleto', 
        origin: 'CONTAS A PAGAR', 
        createdAt: serverTimestamp(), 
        userId: user.uid 
      });
      toast({ title: "Baixa Confirmada" }); 
      setItemToPay(null);
    });
  };

  if (!reportData) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary"><Sparkles size={14}/><span className="text-[10px] font-black uppercase tracking-[0.3em]">Finance Hub</span></div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Relatórios <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Industriais</span></h1>
        </div>
        <div className="flex items-center gap-4">
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <button className="flex items-center gap-2 px-5 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest group">
                 <Download size={16} className="text-primary group-hover:scale-110 transition-transform" /> 
                 <span>Exportar Relatório</span>
                 <ChevronDown size={14} className="opacity-50" />
               </button>
             </DropdownMenuTrigger>
             <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white min-w-[180px] p-2 rounded-2xl shadow-2xl z-[300]">
               <DropdownMenuItem onClick={() => handleExport('xlsx')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer text-[10px] font-black uppercase tracking-widest transition-colors">
                 <FileText size={14} className="text-emerald-500" /> Planilha Excel (XLSX)
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => handleExport('csv')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer text-[10px] font-black uppercase tracking-widest transition-colors">
                 <FileText size={14} className="text-blue-500" /> Arquivo CSV
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => handleExport('xml')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer text-[10px] font-black uppercase tracking-widest transition-colors">
                 <FileText size={14} className="text-orange-500" /> Estrutura XML
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>

           <div className="relative group">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
             <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-black outline-none focus:border-primary transition-all" />
           </div>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Entradas Realizadas" value={reportData.kpis.incomes} color="text-emerald-500" icon={TrendingUp} />
        <KPICard label="Saídas Totais" value={reportData.kpis.expenses} color="text-red-500" icon={TrendingDown} />
        <KPICard label="Resultado Líquido" value={reportData.kpis.net} color="text-white" icon={Wallet} glow />
        <KPICard label="Crédito a Receber" value={reportData.kpis.receivables} color="text-yellow-500" icon={Target} />
        <KPICard label="Débito a Pagar" value={reportData.kpis.payables} color="text-rose-500" icon={AlertCircle} />
      </section>

      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800">
         {['FLUXO', 'CONTAS', 'PEDIDOS'].map((tab) => (
           <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-primary text-black shadow-lg" : "text-zinc-500 hover:text-white")}>{tab}</button>
         ))}
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'FLUXO' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="fluxo" className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl divide-y divide-white/5">
              {reportData.transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-all">
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col items-center justify-center min-w-[50px] bg-zinc-950 p-2 rounded-xl border border-zinc-900"><span className="text-[8px] font-black text-zinc-600 uppercase">{format(parseISO(t.date), 'MMM', { locale: ptBR })}</span><span className="text-lg font-black text-white">{format(parseISO(t.date), 'dd')}</span></div>
                     <div><p className="text-sm font-bold text-white uppercase">{t.description}</p><p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">{t.method} &bull; {t.origin}</p></div>
                  </div>
                  <p className={cn("text-lg font-black font-mono", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>{t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'CONTAS' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="contas" className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl divide-y divide-white/5">
              {reportData.groupedPayables.map((group: any) => (
                <div key={group.groupId} className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div><h4 className="text-sm font-black text-white uppercase">{group.supplier}</h4><p className="text-[10px] text-zinc-500 uppercase">{group.description}</p></div>
                    <p className="text-lg font-black text-white font-mono">{group.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.installments.map((p: any) => (
                      <div key={p.id} className={cn("p-3 rounded-xl border flex items-center justify-between", p.status === 'paid' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/50 border-zinc-800")}>
                        <span className="text-[9px] font-bold text-zinc-400">VENC: {format(parseISO(p.dueDate), 'dd/MM/yy')}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black font-mono text-white">{cleanCurrency(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          {p.status !== 'paid' && <button onClick={() => setItemToPay(p)} className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-black transition-all"><CheckCircle2 size={14}/></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'PEDIDOS' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="pedidos" className="space-y-6">
              {/* Widget de Resumo Superior */}
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none"><FileSearch size={120} /></div>
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20"><Layers className="text-primary" size={24} /></div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Contratos no Período</h3>
                    <p className="text-3xl font-black text-white">{reportData.monthlyOrders.length} <span className="text-sm text-zinc-600">Protocolos Ativos</span></p>
                  </div>
                </div>
                <div className="h-12 w-px bg-zinc-800 hidden md:block" />
                <div className="text-center md:text-right">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Volume de Negócios (Bruto)</h3>
                  <p className="text-3xl font-black text-primary font-mono tracking-tighter">
                    {reportData.kpis.totalOrdersValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              {/* Grid de Cards com Stagger Animação */}
              <motion.div className="grid grid-cols-1 gap-4" variants={{ show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show">
                {reportData.monthlyOrders.length > 0 ? reportData.monthlyOrders.map((order) => (
                  <motion.div 
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                    key={order.id}
                    className="group relative bg-zinc-900/20 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-5 hover:bg-zinc-900/40 hover:border-primary/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_-10px_rgba(255,95,31,0.15)]"
                  >
                    <div className="flex flex-col lg:flex-row items-center gap-6">
                      {/* Identificação */}
                      <div className="flex items-center gap-4 min-w-[240px] w-full lg:w-auto">
                        <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-primary font-black text-xs shadow-inner">
                          #{order.id.slice(-6).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate uppercase group-hover:text-primary transition-colors">{order.client}</h4>
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{order.status}</span>
                        </div>
                      </div>

                      {/* Progresso Financeiro */}
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-2">
                            {order.calculatedBalance <= 0 ? (
                              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <CheckCircle2 size={10} /><span className="text-[8px] font-black uppercase">Liquidado</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">
                                <ShieldCheck size={10} /><span className="text-[8px] font-black uppercase">Saldo Pendente</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-black font-mono text-zinc-500">{order.progress}% Pago</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${order.progress}%` }} 
                            className={cn("h-full rounded-full transition-all duration-1000", order.calculatedBalance <= 0 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-primary")}
                          />
                        </div>
                      </div>

                      {/* Valores */}
                      <div className="flex items-center gap-8 w-full lg:w-auto justify-between lg:justify-end">
                        <div className="text-right">
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Total Contrato</p>
                          <p className="text-sm font-black text-white font-mono">{order.calculatedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Saldo Devedor</p>
                          <p className={cn("text-sm font-black font-mono", order.calculatedBalance > 0 ? "text-red-500" : "text-emerald-500")}>
                            {order.calculatedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        <button className="hidden lg:flex p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-600 group-hover:text-primary group-hover:border-primary/30 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                          <ArrowUpRight size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-24 text-center border-2 border-dashed border-zinc-800 rounded-[3rem] bg-zinc-900/5">
                    <FileSearch size={48} className="mx-auto mb-4 text-zinc-800" />
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Nenhum pedido localizado no período</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {itemToPay && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#0c0c0e] border border-emerald-500/20 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
              <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Confirmar Pagamento?</h3>
              <p className="text-zinc-500 text-sm mb-8 uppercase tracking-widest font-bold">Deseja dar baixa no valor de {cleanCurrency(itemToPay.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}?</p>
              <div className="flex gap-4">
                <button onClick={() => setItemToPay(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px]">Cancelar</button>
                <button onClick={handleConfirmPayment} className="flex-1 py-4 rounded-xl bg-emerald-600 text-black font-black uppercase text-[10px]">Confirmar Baixa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon, glow }: any) {
  return (
    <div className={cn("relative bg-[#09090b] border border-zinc-800 p-5 rounded-2xl overflow-hidden", glow && "border-primary/30 shadow-[0_0_40px_-10px_rgba(255,95,31,0.2)]")}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <p className={cn("text-2xl font-black font-mono tracking-tighter", color)}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
    </div>
  );
}

export default function ReportsPage() {
  return <AdminGuard><ReportsContent /></AdminGuard>;
}