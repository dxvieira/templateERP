'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOrders } from '@/hooks/use-orders';
import { FileText, CheckCircle2, AlertCircle, Clock, Loader2, Package, TrendingUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { AdminGuard } from '@/components/auth/AdminGuard';

function FiscalCenterContent() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { orders, isLoading } = useOrders();
  const [filter, setFilter] = useState<'all' | 'issued' | 'pending' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fiscalOrders = useMemo(() => orders.filter(o => o.nfe_status !== undefined), [orders]);
  const kpis = useMemo(() => {
    let totalInvoiced = 0, issuedCount = 0, processingCount = 0, errorCount = 0;
    fiscalOrders.forEach(o => {
      const status = o.nfe_status;
      const val = Number(o.total_value || 0);
      if (status === 'issued') { totalInvoiced += val; issuedCount++; }
      else if (status === 'processing' || status === 'pending') processingCount++;
      else if (status === 'error') errorCount++;
    });
    return { totalInvoiced, issuedCount, processingCount, errorCount };
  }, [fiscalOrders]);

  const filteredList = useMemo(() => fiscalOrders.filter(o => {
    const status = o.nfe_status;
    const matchesFilter = filter === 'all' || (filter === 'issued' && status === 'issued') || (filter === 'pending' && (status === 'pending' || status === 'processing')) || (filter === 'error' && status === 'error');
    const matchesSearch = o.client?.toLowerCase().includes(searchTerm.toLowerCase()) || o.id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [fiscalOrders, filter, searchTerm]);

  const handleResetNote = async (orderId: string) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'orders', orderId), { 
      nfe_status: 'pending', nfe_url: null, nfe_pdf_url: null, nfe_xml_url: null 
    }).then(() => { toast({ title: "Status Resetado" }); });
  };

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

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
            {/* Icon Container with blue halo */}
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
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_70%,#60A5FA_100%)] opacity-40 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-[1px] bg-[#0A0A0A] rounded-[15px] z-10 flex items-center justify-center">
                <FileText className="text-blue-400 w-6 h-6" />
              </div>
            </motion.div>

            {/* Title with Blue Shimmering Gradient */}
            <div className="flex flex-col">
              <motion.h1 
                className="text-4xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-2"
              >
                <span>CENTRAL</span>
                <motion.span 
                  animate={{ 
                    backgroundImage: [
                      'linear-gradient(90deg, #60A5FA 0%, #22D3EE 50%, #60A5FA 100%)',
                      'linear-gradient(90deg, #22D3EE 0%, #60A5FA 50%, #22D3EE 100%)',
                      'linear-gradient(90deg, #60A5FA 0%, #22D3EE 50%, #60A5FA 100%)'
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: '200% auto' }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-600"
                >
                  FISCAL
                </motion.span>
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-[2px] bg-gradient-to-r from-blue-400/50 to-transparent mt-1"
              />
            </div>
          </div>
        </motion.div>
        <Button className="bg-blue-600 h-14 px-8 rounded-2xl uppercase font-black text-[10px] tracking-widest shadow-[0_0_25px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95">
          <Package size={16} className="mr-2" /> Exportar XMLs
        </Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Faturamento Confirmado" value={kpis.totalInvoiced} color="text-emerald-500" icon={TrendingUp} />
        <KPICard label="Notas Emitidas" value={kpis.issuedCount} color="text-blue-400" icon={CheckCircle2} isCurrency={false} />
        <KPICard label="Em Processamento" value={kpis.processingCount} color="text-yellow-500" icon={Clock} isCurrency={false} />
        <KPICard label="Erros / Rejeições" value={kpis.errorCount} color="text-red-500" icon={AlertCircle} isCurrency={false} />
      </section>

      <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="divide-y divide-white/5">
          {filteredList.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-blue-400 font-black text-xs">#{order.id.slice(-4)}</div>
                <div><p className="text-sm font-bold text-white uppercase">{order.client}</p><p className="text-[9px] text-zinc-500">Protocolo: {order.id}</p></div>
              </div>
              <div className="flex items-center gap-6">
                <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase", order.nfe_status === 'issued' ? "bg-emerald-500/10 text-emerald-500" : "bg-yellow-500/10 text-yellow-500")}>{order.nfe_status}</div>
                <p className="text-sm font-black text-white">{Number(order.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <button onClick={() => handleResetNote(order.id)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color, icon: Icon, isCurrency = true }: any) {
  return <div className="bg-[#09090b] border border-zinc-800 p-5 rounded-2xl"><div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black text-zinc-500 uppercase">{label}</span><Icon size={14} className={color} /></div><p className={cn("text-xl font-black font-mono", color)}>{isCurrency ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}</p></div>;
}

export default function FiscalCenterPage() {
  return <AdminGuard><FiscalCenterContent /></AdminGuard>;
}
