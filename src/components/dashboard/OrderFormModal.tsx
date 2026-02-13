'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, Box, FileText, ChevronDown, Activity, Loader2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';

const PRODUCTION_STAGES = ['Arte', 'Serralheria', 'Impressão', 'Acabamento', 'Instalação', 'Concluído'];

interface OrderFormModalProps {
  order?: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderFormModal({ order, isOpen, onClose }: OrderFormModalProps) {
  const router = useRouter();
  const { createOrder, updateOrder, deleteOrder } = useOrders();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [client, setClient] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState('Arte');
  const [seller, setSeller] = useState('Vendedor Geral');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (order) {
      setClient(order.client || '');
      setDeliveryDate(order.deliveryDate || '');
      setStatus(order.status || 'Arte');
      setSeller(order.seller || 'Vendedor Geral');
      // Ensure all fields exist to avoid controlled/uncontrolled warning
      const loadedItems = order.items?.map((item: any) => ({
        desc: item.desc || '',
        quantity: item.quantity || 0,
        observation: item.observation || ''
      })) || [{ desc: '', quantity: 1, observation: '' }];
      setItems(loadedItems);
    } else {
      setClient('');
      setDeliveryDate('');
      setStatus('Arte');
      setSeller('Vendedor Geral');
      setItems([{ desc: '', quantity: 1, observation: '' }]);
    }
  }, [order, isOpen]);

  const getStatusColor = (currentStatus: string) => {
    switch(currentStatus) {
      case 'Arte': return '#d946ef';
      case 'Serralheria': return '#EAB308';
      case 'Impressão': return '#3B82F6';
      case 'Acabamento': return '#FF5F1F';
      case 'Instalação': return '#8B5CF6';
      case 'Concluído': return '#4ade80';
      default: return '#71717A';
    }
  };

  const currentColor = getStatusColor(status);

  const handleGoToClient = () => {
    if (!client) return;
    onClose();
    router.push(`/clients?search=${encodeURIComponent(client)}`);
  };

  const handleAddItem = () => setItems([...items, { desc: '', quantity: 1, observation: '' }]);
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { client, deliveryDate, status, seller, items };
    try {
      if (order) {
        await updateOrder(order.id, payload);
        toast({ title: "Protocolo Atualizado" });
      } else {
        await createOrder(payload);
        toast({ title: "Lançamento Gravado" });
      }
      onClose();
    } catch (err) {} finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (window.confirm("Remover permanentemente?")) {
      setLoading(true);
      try {
        await deleteOrder(order.id);
        toast({ title: "Removido" });
        onClose();
      } catch (err) {} finally { setLoading(false); }
    }
  };

  if (!isOpen) return null;

  const labelClass = "text-[8px] text-zinc-500 uppercase font-black tracking-widest ml-1 block mb-1";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#09090b] w-full max-w-2xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">{order ? 'Ajustar Pedido' : 'Novo Lançamento'}</h2>
            {order && <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800" style={{ color: currentColor }}>#{order.id}</span>}
          </div>
          <div className="flex items-center gap-2">
            {order && <button onClick={handleDelete} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#050505]">
          <form id="orderForm" onSubmit={handleSave} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] flex items-center gap-2 ml-1"><Activity size={12} className="animate-pulse" /> Etapa da Produção</label>
              <div className="relative group">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full appearance-none bg-black border-2 rounded-2xl py-4 pl-6 pr-12 text-xl font-black uppercase tracking-widest outline-none transition-all" style={{ borderColor: currentColor, color: currentColor, boxShadow: `0 0 30px -10px ${currentColor}40` }}>
                  {PRODUCTION_STAGES.map(s => <option key={s} value={s} className="bg-zinc-950 text-white font-bold text-sm">{s}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: currentColor }} size={24} strokeWidth={3} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-1 ml-1">
                  <label className={labelClass}>Cliente / Projeto</label>
                  <button type="button" onClick={handleGoToClient} className="flex items-center gap-1 text-[9px] font-black uppercase text-primary hover:text-white transition-all">Ver Perfil <ExternalLink size={10} /></button>
                </div>
                <input required value={client || ''} onChange={(e) => setClient(e.target.value)} className={inputClass} placeholder="Identificação..." />
              </div>
              <div>
                <label className={labelClass}>Prazo de Entrega</label>
                <input type="date" value={deliveryDate || ''} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-2"><Box size={14} /> Ficha de Produção</h3>
                <button type="button" onClick={handleAddItem} className="text-[9px] font-black uppercase bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary hover:text-black transition-all"><Plus size={14} /> Add</button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="bg-black/40 border border-zinc-800 rounded-2xl p-4 space-y-4">
                    <div className="flex gap-4">
                      <input placeholder="Material..." value={item.desc || ''} onChange={(e) => handleItemChange(index, 'desc', e.target.value)} className={`${inputClass} flex-1`} />
                      <input type="number" value={item.quantity || 0} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className={`${inputClass} w-20 text-center`} />
                    </div>
                    <textarea rows={2} placeholder="Notas técnicas..." value={item.observation || ''} onChange={(e) => handleItemChange(index, 'observation', e.target.value)} className={`${inputClass} text-xs text-zinc-400`} />
                    <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-zinc-700 hover:text-red-500 flex ml-auto"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800">Cancelar</button>
          <button form="orderForm" type="submit" disabled={loading} className="px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)] flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Gravar</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
