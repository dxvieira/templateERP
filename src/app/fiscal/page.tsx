'use client';

import React, { useState, useMemo } from 'react';
import { useOrders } from '@/hooks/use-orders';
import { FileText, Search, CheckCircle2, AlertCircle, Clock, Loader2, Package, TrendingUp, Zap, Trash2 } from 'lucide-react';
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
  const [noteToDelete, setNoteToDelete] = useState<any>(null);

  const fiscalOrders = useMemo(() => orders.filter(o => o.nfe_status !== undefined || o.nfeStatus !== undefined), [orders]);
  const kpis = useMemo(() => {
    let totalInvoiced = 0, issuedCount = 0, processingCount = 0, errorCount = 0;
    fiscalOrders.forEach(o => {
      const status = o.nfe_status || o.nfeStatus;
      const val = Number(o.total_value || 0);
      if (status === 'issued') { totalInvoiced += val; issuedCount++; }
      else if (status === 'processing' || status === 'pending') processingCount++;
      else if (status === 'error') errorCount++;
    });
    return { totalInvoiced, issuedCount, processingCount, errorCount };
  }, [fiscalOrders]);

  const filteredList = useMemo(() => fiscalOrders.filter(o => {
    const status = o.nfe_status || o.nfeStatus;
    const matchesFilter = filter === 'all' || (filter === 'issued' && status === 'issued') || (filter === 'pending' && (status === 'pending' || status === 'processing')) || (filter === 'error' && status === 'error');
    const matchesSearch = o.client?.toLowerCase().includes(searchTerm.toLowerCase()) || o.id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [fiscalOrders, filter, searchTerm]);

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete || !firestore) return;
    updateDoc(doc(firestore, 'orders', noteToDelete.id), { nfe_status: null, nfeStatus: null, nfe_url: null, nfeUrl: null, nfe_pdf_url: null, nfe_xml_url: null }).then(() => { toast({ title: "Resetado" }); setNoteToDelete(null); });
  };

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400"><FileText size={14} /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Compliance</span></div>
          <h1 className="text-4xl font-black text-white uppercase leading-none">Central <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-600">Fiscal</span></h1>
        </div>
        <Button className="bg-blue-600 h-12 px-6 rounded-xl uppercase font-black text-[10px]"><Package size={16} className="mr-2" /> Exportar XMLs</Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Faturado" value={kpis.totalInvoiced} color="text-emerald-500" icon={TrendingUp} />
        <KPICard label="Notas Emitidas" value={kpis.issuedCount} color="text-blue-400" icon={CheckCircle2} />
        <KPICard label="Processamento" value={kpis.processingCount} color="text-yellow-500" icon={Clock} />
        <KPICard label="Rejeitadas" value={kpis.errorCount} color="text-red-500" icon={AlertCircle} />
      </section>

      <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="divide-y divide-white/5">
          {filteredList.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-blue-400 font-black text-xs">#{order.id.slice(-4)}</div>
                <div><p className="text-sm font-bold text-white uppercase">{order.client}</p><p className="text-[9px] text-zinc-500">OS: {order.id}</p></div>
              </div>
              <div className="flex items-center gap-6">
                <p className="text-sm font-black text-white">{Number(order.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <button onClick={() => setNoteToDelete(order)} className="p-2 text-red-500 bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon }: any) {
  return <div className="bg-[#09090b] border border-zinc-800 p-5 rounded-2xl"><div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black text-zinc-500 uppercase">{label}</span><Icon size={14} className={color} /></div><p className={cn("text-xl font-black font-mono", color)}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>;
}