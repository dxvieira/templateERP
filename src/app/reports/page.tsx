'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Wallet, Target, AlertCircle, Plus, Trash2, Calendar, 
  Loader2, X, CheckCircle2, Sparkles, Download, FileText, ChevronDown
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

  const reportData = useMemo(() => {
    if (!selectedMonth) return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    let incomes = 0, expenses = 0, receivables = 0, totalPayables = 0;
    const transactions: any[] = [];

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
              transactions.push({ id: `${order.id}-${inst.uid}`, date: inst.paid_date, description: `PGTO OS #${order.id.slice(-6)} - ${order.client}`, type: 'income', amount, method: inst.payment_method || 'Sistema', origin: 'SISTEMA (OS)', originalId: order.id });
            }
          } catch (e) {}
        }
      });
    });

    const groups: Record<string, any> = {};
    payables?.forEach(payable => {
      if (payable.status !== 'paid') totalPayables += cleanCurrency(payable.amount);
      const gid = payable.groupId || payable.id;
      if (!groups[gid]) groups[gid] = { groupId: gid, supplier: payable.supplier, description: payable.description, installments: [], totalAmount: 0, allPaid: true };
      groups[gid].installments.push(payable); 
      groups[gid].totalAmount += cleanCurrency(payable.amount);
      if (payable.status !== 'paid') groups[gid].allPaid = false;
    });

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

    transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return { transactions, groupedPayables: Object.values(groups), kpis: { incomes, expenses, net: incomes - expenses, receivables, payables: totalPayables } };
  }, [orders, cashflowManual, payables, selectedMonth]);

  const handleExport = (formatType: 'xlsx' | 'csv' | 'xml') => {
    if (!reportData) return;

    const dataToExport = reportData.transactions.map(t => ({
      Data: format(parseISO(t.date), 'dd/MM/yyyy'),
      Tipo: t.type === 'income' ? 'Entrada' : 'Saída',
      Descrição: t.description,
      'Origem/Destino': t.origin,
      'Valor Bruto': t.amount,
      Status: 'Compensado',
      Responsável: t.method
    }));

    if (formatType === 'xlsx' || formatType === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fluxo de Caixa");
      
      if (formatType === 'xlsx') {
        XLSX.writeFile(workbook, `Relatorio_Financeiro_${selectedMonth}.xlsx`);
      } else {
        XLSX.writeFile(workbook, `Relatorio_Financeiro_${selectedMonth}.csv`, { bookType: 'csv' });
      }
      toast({ title: "Exportação Concluída", description: `Arquivo ${formatType.toUpperCase()} gerado com sucesso.` });
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
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Financeiro_${selectedMonth}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exportação Concluída", description: "Arquivo XML gerado com sucesso." });
    }
  };

  const handleConfirmPayment = async () => {
    if (!itemToPay || !firestore || !user) return;
    const payableRef = doc(firestore, 'accounts_payable', itemToPay.id);
    updateDoc(payableRef, { status: 'paid', paidAt: serverTimestamp(), paymentDate: new Date().toISOString() }).then(async () => {
      await addDoc(collection(firestore, 'cashflow_manual'), { description: `PGTO: ${itemToPay.supplier}`, amount: cleanCurrency(itemToPay.amount), type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), method: 'Boleto', origin: 'CONTAS A PAGAR', createdAt: serverTimestamp(), userId: user.uid });
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
           {/* BOTÃO EXPORTAR */}
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
        <KPICard label="Entradas" value={reportData.kpis.incomes} color="text-emerald-500" icon={TrendingUp} />
        <KPICard label="Saídas" value={reportData.kpis.expenses} color="text-red-500" icon={TrendingDown} />
        <KPICard label="Líquido" value={reportData.kpis.net} color="text-white" icon={Wallet} glow />
        <KPICard label="A Receber" value={reportData.kpis.receivables} color="text-yellow-500" icon={Target} />
        <KPICard label="A Pagar" value={reportData.kpis.payables} color="text-rose-500" icon={AlertCircle} />
      </section>

      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl w-fit border border-zinc-800">
         {['FLUXO', 'CONTAS', 'PEDIDOS'].map((tab) => (
           <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-primary text-black shadow-lg" : "text-zinc-500 hover:text-white")}>{tab}</button>
         ))}
      </div>

      <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        {activeTab === 'FLUXO' && (
          <div className="divide-y divide-white/5">
            {reportData.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-all">
                <div className="flex items-center gap-4">
                   <div className="flex flex-col items-center justify-center min-w-[50px] bg-zinc-950 p-2 rounded-xl border border-zinc-900"><span className="text-[8px] font-black text-zinc-600 uppercase">{format(parseISO(t.date), 'MMM', { locale: ptBR })}</span><span className="text-lg font-black text-white">{format(parseISO(t.date), 'dd')}</span></div>
                   <div>
                     <p className="text-sm font-bold text-white uppercase">{t.description}</p>
                     <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">{t.method} &bull; {t.origin}</p>
                   </div>
                </div>
                <p className={cn("text-lg font-black font-mono", t.type === 'income' ? "text-emerald-500" : "text-red-500")}>{t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'CONTAS' && (
          <div className="divide-y divide-white/5">
            {reportData.groupedPayables.map((group: any) => (
              <div key={group.groupId} className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase">{group.supplier}</h4>
                    <p className="text-[10px] text-zinc-500 uppercase">{group.description}</p>
                  </div>
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
          </div>
        )}
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
