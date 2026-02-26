'use client';

import React, { useState, useMemo } from 'react';
import { useOrders } from '@/hooks/use-orders';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Download, 
  RefreshCw,
  TrendingUp,
  Package,
  Zap,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function FiscalCenterPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { orders, isLoading } = useOrders();
  const [filter, setFilter] = useState<'all' | 'issued' | 'pending' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para exclusão cirúrgica de registros fiscais
  const [noteToDelete, setNoteToDelete] = useState<any>(null);

  // 1. Filtrar pedidos que possuem metadados de NFe
  const fiscalOrders = useMemo(() => {
    return orders.filter(o => 
      o.nfe_status !== undefined && o.nfe_status !== null || 
      o.nfeStatus !== undefined && o.nfeStatus !== null
    );
  }, [orders]);

  // 2. Cálculo de KPIs
  const kpis = useMemo(() => {
    let totalInvoiced = 0;
    let issuedCount = 0;
    let processingCount = 0;
    let errorCount = 0;

    fiscalOrders.forEach(o => {
      const status = o.nfe_status || o.nfeStatus;
      const val = Number(o.total_value || o.totalValue || 0);

      if (status === 'issued') {
        totalInvoiced += val;
        issuedCount++;
      } else if (status === 'processing' || status === 'pending') {
        processingCount++;
      } else if (status === 'error') {
        errorCount++;
      }
    });

    return { totalInvoiced, issuedCount, processingCount, errorCount };
  }, [fiscalOrders]);

  // 3. Filtragem e Busca
  const filteredList = useMemo(() => {
    return fiscalOrders.filter(o => {
      const status = o.nfe_status || o.nfeStatus;
      const matchesFilter = 
        filter === 'all' || 
        (filter === 'issued' && status === 'issued') ||
        (filter === 'pending' && (status === 'pending' || status === 'processing')) ||
        (filter === 'error' && status === 'error');
      
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        o.client?.toLowerCase().includes(term) || 
        o.id?.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [fiscalOrders, filter, searchTerm]);

  // FUNÇÃO DE EXCLUSÃO CIRÚRGICA (RESET FISCAL)
  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete || !firestore) return;
    
    try {
      const orderRef = doc(firestore, 'orders', noteToDelete.id);
      
      // Reseta absolutamente todas as propriedades fiscais (camelCase e snake_case)
      await updateDoc(orderRef, {
        nfe_status: null,
        nfeStatus: null,
        nfe_url: null,
        nfeUrl: null,
        nfe_pdf_url: null,
        nfePdfUrl: null,
        nfe_xml_url: null,
        nfeXmlUrl: null
      });
      
      toast({ title: "Registro Fiscal Removido", description: "Os dados da nota foram resetados com sucesso." });
      setNoteToDelete(null);
    } catch (error: any) {
      console.error("Erro ao excluir nota:", error);
      alert("Erro ao excluir registro fiscal: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-blue-500 selection:text-white">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 pb-24 relative z-10">
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500 opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400">
              <FileText size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Compliance & Tax Control</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Central <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-600">Fiscal</span>
            </h1>
          </div>

          <Button 
            onClick={() => alert('Esta função irá compactar todas as notas aprovadas do mês em um arquivo .zip para a contabilidade.')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest h-12 px-6 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
          >
            <Package size={16} className="mr-2" /> Exportar XMLs (Mês)
          </Button>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            label="Total Faturado" 
            value={kpis.totalInvoiced} 
            isCurrency 
            color="text-emerald-500" 
            icon={TrendingUp} 
            glow 
          />
          <KPICard 
            label="Notas Emitidas" 
            value={kpis.issuedCount} 
            color="text-blue-400" 
            icon={CheckCircle2} 
          />
          <KPICard 
            label="Em Processamento" 
            value={kpis.processingCount} 
            color="text-yellow-500" 
            icon={Clock} 
          />
          <KPICard 
            label="Falhas / Rejeitadas" 
            value={kpis.errorCount} 
            color="text-red-500" 
            icon={AlertCircle} 
          />
        </section>

        {/* FILTROS */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800">
          <div className="flex gap-1 w-full lg:w-auto overflow-x-auto no-scrollbar">
            <FilterButton active={filter === 'all'} label="Todas" onClick={() => setFilter('all')} />
            <FilterButton active={filter === 'issued'} label="Autorizadas" onClick={() => setFilter('issued')} />
            <FilterButton active={filter === 'pending'} label="Pendentes" onClick={() => setFilter('pending')} />
            <FilterButton active={filter === 'error'} label="Com Erro" onClick={() => setFilter('error')} />
          </div>
          
          <div className="relative w-full lg:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Buscar Cliente ou OS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
        </div>

        {/* LISTA */}
        <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-zinc-900/20 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <div className="col-span-2">Data da OS</div>
            <div className="col-span-4">Cliente & Pedido</div>
            <div className="col-span-2 text-right">Valor</div>
            <div className="col-span-2 text-center">Status NFe</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>

          <div className="divide-y divide-white/5">
            {filteredList.length > 0 ? filteredList.map((order) => {
              const status = order.nfe_status || order.nfeStatus;
              const date = order.createdAt?.seconds 
                ? format(new Date(order.createdAt.seconds * 1000), 'dd/MM/yyyy') 
                : order.emission_date || '--/--/----';

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={order.id} 
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-all group"
                >
                  <div className="col-span-2 text-xs font-mono text-zinc-500">{date}</div>
                  
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 font-black text-xs">
                      #{order.id.slice(-4)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white uppercase truncate">{order.client}</p>
                      <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Protocolo: {order.id}</p>
                    </div>
                  </div>

                  <div className="col-span-2 text-right">
                    <p className="text-sm font-black font-mono text-white">
                      {(Number(order.total_value || order.totalValue) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <StatusBadge status={status} />
                  </div>

                  <div className="col-span-2 flex justify-end items-center gap-2">
                    {status === 'issued' ? (
                      <div className="flex items-center gap-2">
                        {/* BOTÃO PDF (DANFE) */}
                        <button
                          onClick={() => window.open(order.nfePdfUrl || order.nfe_pdf_url || order.nfe_url || order.nfeUrl, '_blank')}
                          className="flex items-center justify-center p-2 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded border border-emerald-500/20 transition-all"
                          title="Baixar DANFE (PDF)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
                        </button>
                        {/* BOTÃO XML */}
                        <button
                          onClick={() => window.open(order.nfeXmlUrl || order.nfe_xml_url, '_blank')}
                          className="flex items-center justify-center p-2 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500 hover:text-white rounded border border-cyan-500/20 transition-all"
                          title="Baixar XML"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => alert('Função de reemissão em breve')}
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 text-zinc-400 hover:bg-white hover:text-black rounded-xl transition-all text-[9px] font-black uppercase tracking-widest border border-zinc-700"
                      >
                        <RefreshCw size={12} /> Reemitir
                      </button>
                    )}

                    {/* BOTÃO DE EXCLUIR REGISTRO FISCAL (SURGICAL RESET) */}
                    <button
                      onClick={() => setNoteToDelete(order)}
                      className="flex items-center justify-center p-2 text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded border border-red-500/20 transition-all ml-1"
                      title="Excluir Registro da Nota"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="py-24 text-center opacity-20">
                <Package size={48} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Nenhuma nota encontrada com este filtro</p>
              </div>
            )}
          </div>
        </div>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO FISCAL */}
        <AnimatePresence>
          {noteToDelete && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[#0c0c0e] border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center"
              >
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20 mx-auto">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Excluir Registro Fiscal?</h3>
                <p className="text-zinc-400 text-sm uppercase tracking-widest leading-relaxed mb-8">
                  Tem certeza que deseja apagar os dados da NFe do cliente <strong className="text-white">"{noteToDelete.client}"</strong>? 
                  <br /><br />
                  <span className="text-xs text-red-400/80 font-bold px-3 py-1.5 bg-red-500/5 rounded-lg border border-red-500/10">O PEDIDO CONTINUARÁ EXISTINDO, MAS O STATUS FISCAL SERÁ RESETADO.</span>
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setNoteToDelete(null)} 
                    className="flex-1 py-4 rounded-xl border border-zinc-800 text-zinc-400 font-black uppercase text-[10px] tracking-widest hover:bg-zinc-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmDeleteNote} 
                    className="flex-1 py-4 rounded-xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest shadow-[0_0_25px_rgba(239,68,68,0.4)] active:scale-95 transition-all"
                  >
                    Sim, Excluir NFe
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon, glow, isCurrency = false }: any) {
  return (
    <div className={cn(
      "relative bg-[#09090b] border border-zinc-800 p-5 rounded-2xl overflow-hidden transition-all duration-500 hover:border-zinc-700 group",
      glow && "border-blue-500/30 shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)]"
    )}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <Icon size={14} className={cn(color, "opacity-40 group-hover:opacity-100 transition-opacity")} />
      </div>
      <p className={cn("text-xl font-black font-mono tracking-tighter truncate", color)}>
        {isCurrency ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}
      </p>
      {glow && <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-blue-500/20 blur-2xl rounded-full" />}
    </div>
  );
}

function FilterButton({ active, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-zinc-500 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    issued: { label: 'Autorizada', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 },
    processing: { label: 'Processando', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
    pending: { label: 'Pendente', color: 'bg-zinc-800 text-zinc-500 border-zinc-700', icon: Zap },
    error: { label: 'Erro SEFAZ', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle },
  };

  const current = config[status] || config.pending;
  const Icon = current.icon;

  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest", current.color)}>
      <Icon size={10} className={status === 'processing' ? 'animate-spin' : ''} />
      {current.label}
    </div>
  );
}
