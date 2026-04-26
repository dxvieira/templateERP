'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Wallet, Target, AlertCircle, Plus, Trash2,
  Loader2, X, CheckCircle2, Sparkles, Download, FileText, ChevronDown,
  ArrowUpRight, ShieldCheck, Layers, FileSearch
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
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
import { OrderPaymentModal } from '@/components/dashboard/OrderPaymentModal';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { validateReportRange, consolidateReport, sanitizeCurrency } from '@/services/reportService';
import type { ReportRangeRequest } from '@/types/finance';



function ReportsContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'FLUXO' | 'CONTAS' | 'PEDIDOS'>('FLUXO');

  /** Intervalo de datas do relatório (substitui selectedMonth) */
  const [dateRange, setDateRange] = useState<ReportRangeRequest>({ startDate: '', endDate: '' });

  const [itemToPay, setItemToPay] = useState<any>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    supplier: '',
    description: '',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    installments: 1
  });

  useEffect(() => {
    const now = new Date();
    setDateRange({
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
    });
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
   * Controller — delega consolidação para o Service Layer (reportService).
   * FMEA Gate é executado antes de qualquer processamento de dados.
   */
  const reportData = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return null;
    const validation = validateReportRange(dateRange);
    if (!validation.valid) return null;
    return consolidateReport(
      validation.startDate,
      validation.endDate,
      orders ?? [],
      cashflowManual ?? [],
      payables ?? [],
    );
  }, [orders, cashflowManual, payables, dateRange]);

  const handleExport = (formatType: 'xlsx' | 'csv' | 'xml') => {
    if (!reportData) return;
    const rangeLabel = `${dateRange.startDate}_ate_${dateRange.endDate}`;
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

      XLSX.writeFile(workbook, `Relatorio_Impacto_${rangeLabel}.${formatType === 'xlsx' ? 'xlsx' : 'csv'}`);
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
      const a = document.createElement('a'); a.href = url; a.download = `Relatorio_Impacto_${rangeLabel}.xml`; a.click();
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
        amount: sanitizeCurrency(itemToPay.amount), 
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

  const handleDeleteAccount = async () => {
    if (!groupToDelete || !firestore) return;
    setDeleting(true);
    try {
      const deletePromises = groupToDelete.installments.map((inst: any) =>
        deleteDoc(doc(firestore, 'accounts_payable', inst.id))
      );
      await Promise.all(deletePromises);
      toast({ title: "Conta Excluída", description: `${groupToDelete.supplier} foi removido com sucesso.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir a conta." });
    } finally {
      setDeleting(false);
      setGroupToDelete(null);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete || !firestore) return;
    setDeleting(true);
    try {
      if (transactionToDelete.origin === 'SISTEMA (OS)') {
        toast({ variant: "destructive", title: "Ação Inválida", description: "Pagamentos de OS devem ser estornados dentro do próprio pedido." });
        return;
      }
      await deleteDoc(doc(firestore, 'cashflow_manual', transactionToDelete.id));
      toast({ title: "Lançamento Excluído", description: "A movimentação foi removida do fluxo de caixa." });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o lançamento." });
    } finally {
      setDeleting(false);
      setTransactionToDelete(null);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setDeleting(true);

    try {
      const amount = sanitizeCurrency(newAccount.amount);
      const groupId = `group_${Date.now()}`;
      const batchPromises = [];

      for (let i = 0; i < newAccount.installments; i++) {
        const dueDate = new Date(newAccount.dueDate + 'T12:00:00');
        dueDate.setMonth(dueDate.getMonth() + i);

        batchPromises.push(
          addDoc(collection(firestore, 'accounts_payable'), {
            supplier: newAccount.supplier,
            description: `${newAccount.description} (${i + 1}/${newAccount.installments})`,
            amount: amount,
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            status: 'pending',
            groupId: newAccount.installments > 1 ? groupId : null,
            createdAt: serverTimestamp(),
            userId: user.uid
          })
        );
      }

      await Promise.all(batchPromises);
      toast({ title: "Conta Registrada", description: `${newAccount.supplier} adicionado com sucesso.` });
      setIsAccountModalOpen(false);
      setNewAccount({
        supplier: '',
        description: '',
        amount: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        installments: 1
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao Salvar", description: "Não foi possível registrar a conta." });
    } finally {
      setDeleting(false);
    }
  };

  if (!reportData) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-1"
        >
          <div className="flex items-center gap-4">
            {/* Icon Container with subtle glow trace */}
            <motion.div
              animate={{ 
                y: [0, -4, 0],
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm overflow-hidden group"
            >
              {/* Subtle animated border trace */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_70%,#FF5F1F_100%)] opacity-40 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-[1px] bg-[#0A0A0A] rounded-[15px] z-10 flex items-center justify-center">
                <Sparkles className="text-primary w-6 h-6" />
              </div>
            </motion.div>

            {/* Title with Shimmering Gradient */}
            <div className="flex flex-col">
              <motion.h1 
                className="text-4xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-2"
              >
                <span>FINANCE</span>
                <motion.span 
                  animate={{ 
                    backgroundImage: [
                      'linear-gradient(90deg, #FF5F1F 0%, #FF8F5F 50%, #FF5F1F 100%)',
                      'linear-gradient(90deg, #FF8F5F 0%, #FF5F1F 50%, #FF8F5F 100%)',
                      'linear-gradient(90deg, #FF5F1F 0%, #FF8F5F 50%, #FF5F1F 100%)'
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: '200% auto' }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600"
                >
                  HUB
                </motion.span>
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-[2px] bg-gradient-to-r from-primary/50 to-transparent mt-1"
              />
            </div>
          </div>
        </motion.div>
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

           <DateRangePicker
             value={dateRange}
             onChange={setDateRange}
             onValidationError={(err) =>
               toast({ variant: 'destructive', title: 'Intervalo Inválido', description: err.message })
             }
           />
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Entradas Realizadas" value={reportData.kpis.incomes} color="text-emerald-500" icon={TrendingUp} />
        <KPICard label="Saídas Totais" value={reportData.kpis.expenses} color="text-red-500" icon={TrendingDown} />
        <KPICard label="Resultado Líquido" value={reportData.kpis.net} color="text-white" icon={Wallet} glow />
        <KPICard label="Crédito a Receber" value={reportData.kpis.receivables} color="text-yellow-500" icon={Target} />
        <KPICard label="Débito a Pagar" value={reportData.kpis.payables} color="text-rose-500" icon={AlertCircle} />
      </section>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800">
           {['FLUXO', 'CONTAS', 'PEDIDOS'].map((tab) => (
             <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-primary text-black shadow-lg" : "text-zinc-500 hover:text-white")}>{tab}</button>
           ))}
        </div>
        
        {activeTab === 'CONTAS' && (
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={14} /> Adicionar Conta
          </button>
        )}
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
                  <div className="flex items-center gap-4">
                    <p className={cn("text-lg font-black font-mono", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>{t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    {t.origin !== 'SISTEMA (OS)' && (
                      <button onClick={() => setTransactionToDelete(t)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Excluir movimentação">
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </div>
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
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-black text-white font-mono">{group.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <button onClick={() => setGroupToDelete(group)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Excluir conta"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.installments.map((p: any) => (
                      <div key={p.id} className={cn("p-3 rounded-xl border flex items-center justify-between", p.status === 'paid' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/50 border-zinc-800")}>
                        <span className="text-[9px] font-bold text-zinc-400">VENC: {format(parseISO(p.dueDate), 'dd/MM/yy')}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black font-mono text-white">{sanitizeCurrency(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
                    onClick={() => setSelectedOrderForPayment(order)}
                    className="group relative bg-zinc-900/20 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-5 hover:bg-zinc-900/40 hover:border-primary/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_-10px_rgba(255,95,31,0.15)] cursor-pointer"
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
              <p className="text-zinc-500 text-sm mb-8 uppercase tracking-widest font-bold">Deseja dar baixa no valor de {sanitizeCurrency(itemToPay.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}?</p>
              <div className="flex gap-4">
                <button onClick={() => setItemToPay(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px]">Cancelar</button>
                <button onClick={handleConfirmPayment} className="flex-1 py-4 rounded-xl bg-emerald-600 text-black font-black uppercase text-[10px]">Confirmar Baixa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {groupToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#0c0c0e] border border-red-500/20 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
              <div className="mx-auto mb-4 w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Excluir Conta?</h3>
              <p className="text-zinc-500 text-sm mb-2 font-bold uppercase">{groupToDelete.supplier}</p>
              <p className="text-zinc-600 text-xs mb-8">Esta ação é irreversível. Todas as parcelas desta conta serão removidas permanentemente.</p>
              <div className="flex gap-4">
                <button onClick={() => setGroupToDelete(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px] hover:bg-zinc-900 transition-all">Cancelar</button>
                <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 py-4 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#0c0c0e] border border-red-500/20 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center">
              <div className="mx-auto mb-4 w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Excluir Lançamento?</h3>
              <p className="text-zinc-500 text-sm mb-2 font-bold uppercase">{transactionToDelete.description}</p>
              <p className="text-zinc-600 text-xs mb-8">O lançamento de {transactionToDelete.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} será removido permanentemente do fluxo de caixa.</p>
              <div className="flex gap-4">
                <button onClick={() => setTransactionToDelete(null)} className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px] hover:bg-zinc-900 transition-all">Cancelar</button>
                <button onClick={handleDeleteTransaction} disabled={deleting} className="flex-1 py-4 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAccountModalOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none"><Wallet size={160} /></div>
               
               <header className="flex justify-between items-center mb-8">
                 <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Registrar <span className="text-primary">Conta</span></h3>
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Nova saída programada no fluxo</p>
                 </div>
                 <button onClick={() => setIsAccountModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500"><X size={20}/></button>
               </header>

               <form onSubmit={handleAddAccount} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="col-span-full">
                     <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Fornecedor / Favorecido</label>
                     <input required type="text" value={newAccount.supplier} onChange={e => setNewAccount({...newAccount, supplier: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary transition-all uppercase text-xs" placeholder="Ex: CEMIG, ALUGUEL, FORNECEDOR" />
                   </div>
                   <div className="col-span-full">
                     <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Descrição do Gasto</label>
                     <input required type="text" value={newAccount.description} onChange={e => setNewAccount({...newAccount, description: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary transition-all text-sm" placeholder="Ex: Parcela Material ACM" />
                   </div>
                   <div>
                     <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Valor Total</label>
                     <input required type="text" value={newAccount.amount} onChange={e => setNewAccount({...newAccount, amount: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-primary font-black outline-none focus:border-primary transition-all text-sm" placeholder="R$ 0,00" />
                   </div>
                   <div>
                     <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Data de Vencimento</label>
                     <input required type="date" value={newAccount.dueDate} onChange={e => setNewAccount({...newAccount, dueDate: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary transition-all text-xs" />
                   </div>
                   <div>
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Parcelamento (Meses)</label>
                      <input required type="number" min="1" max="60" value={newAccount.installments} onChange={e => setNewAccount({...newAccount, installments: Number(e.target.value)})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-primary transition-all text-sm font-black" />
                   </div>
                 </div>

                 <div className="pt-4 flex gap-4">
                   <button type="button" onClick={() => setIsAccountModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-zinc-800 text-zinc-500 font-black uppercase text-[10px] tracking-widest hover:bg-zinc-900 transition-all">Cancelar</button>
                   <button disabled={deleting} type="submit" className="flex-1 py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                     {deleting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                     {deleting ? 'Salvando...' : 'Confirmar Lançamento'}
                   </button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <OrderPaymentModal 
        order={selectedOrderForPayment}
        isOpen={!!selectedOrderForPayment}
        onClose={() => setSelectedOrderForPayment(null)}
      />
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
