
'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, Box, ChevronDown, Activity, Loader2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';

const PRODUCTION_STAGES = ['Arte', 'Serralheria', 'Impressão', 'Acabamento', 'Instalação', 'Concluído'];

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

// Componente de Item isolado para performance extrema em listas dinâmicas
const OrderItemRow = memo(({ item, index, onChange, onRemove }: any) => {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 border border-zinc-800 rounded-2xl p-4 space-y-4 group relative">
      <div className="absolute left-0 top-6 bottom-6 w-1 rounded-r bg-zinc-800 group-hover:bg-primary transition-colors duration-300" />
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-1 block">Material</label>
          <input 
            placeholder="Descrição do material..." 
            value={item.desc} 
            onChange={(e) => onChange(index, 'desc', e.target.value)} 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all" 
          />
        </div>
        <div className="w-20">
          <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest text-center mb-1 block">Qtd.</label>
          <input 
            type="number" 
            value={item.quantity} 
            onChange={(e) => onChange(index, 'quantity', e.target.value)} 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none text-center" 
          />
        </div>
      </div>
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <textarea 
            rows={2} 
            placeholder="Notas técnicas de acabamento..." 
            value={item.observation} 
            onChange={(e) => onChange(index, 'observation', e.target.value)} 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 focus:border-primary outline-none resize-none transition-all" 
          />
        </div>
        <button 
          type="button" 
          onClick={() => onRemove(index)} 
          className="h-10 w-10 flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors mt-1"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
});
OrderItemRow.displayName = 'OrderItemRow';

const OrderFormModalComponent = ({ order, isOpen, onClose }: { order?: any | null; isOpen: boolean; onClose: () => void }) => {
  const router = useRouter();
  const { createOrder, updateOrder, deleteOrder } = useOrders();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    client: '',
    deliveryDate: '',
    status: 'Arte',
    seller: 'Vendedor Geral',
    items: [{ desc: '', quantity: 1, observation: '' }]
  });

  useEffect(() => {
    if (order) {
      setFormData({
        client: order.client || '',
        deliveryDate: order.deliveryDate || '',
        status: order.status || 'Arte',
        seller: order.seller || 'Vendedor Geral',
        items: order.items?.map((item: any) => ({ ...item })) || [{ desc: '', quantity: 1, observation: '' }]
      });
    } else {
      setFormData({
        client: '',
        deliveryDate: '',
        status: 'Arte',
        seller: 'Vendedor Geral',
        items: [{ desc: '', quantity: 1, observation: '' }]
      });
    }
  }, [order, isOpen]);

  const currentColor = getStatusColor(formData.status);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleItemChange = useCallback((index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  }, []);

  const handleAddItem = useCallback(() => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { desc: '', quantity: 1, observation: '' }] }));
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (order) {
        await updateOrder(order.id, formData);
        toast({ title: "Protocolo Atualizado" });
      } else {
        await createOrder(formData);
        toast({ title: "Lançamento Gravado" });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-[#09090b] w-full max-w-2xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/30">
          <h2 className="text-lg font-black text-white uppercase tracking-tighter">{order ? 'Ajustar Pedido' : 'Novo Lançamento'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#050505]">
          <form id="orderForm" onSubmit={handleSave} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] flex items-center gap-2 ml-1">
                <Activity size={12} className="animate-pulse" /> Etapa da Produção
              </label>
              <div className="relative group">
                <select 
                  value={formData.status} 
                  onChange={(e) => handleFieldChange('status', e.target.value)} 
                  className="w-full appearance-none bg-black border-2 rounded-2xl py-4 pl-6 pr-12 text-xl font-black uppercase tracking-widest outline-none transition-all" 
                  style={{ borderColor: currentColor, color: currentColor, boxShadow: `0 0 30px -10px ${currentColor}40` }}
                >
                  {PRODUCTION_STAGES.map(s => <option key={s} value={s} className="bg-zinc-950 text-white font-bold text-sm">{s}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: currentColor }} size={24} strokeWidth={3} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-1 block">Cliente / Projeto</label>
                <input required value={formData.client} onChange={(e) => handleFieldChange('client', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-1 block">Prazo de Entrega</label>
                <input type="date" value={formData.deliveryDate} onChange={(e) => handleFieldChange('deliveryDate', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-2"><Box size={14} /> Ficha de Produção</h3>
                <button type="button" onClick={handleAddItem} className="text-[9px] font-black uppercase bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary hover:text-black transition-all"><Plus size={14} /> Add</button>
              </div>
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <OrderItemRow 
                    key={index} 
                    item={item} 
                    index={index} 
                    onChange={handleItemChange} 
                    onRemove={handleRemoveItem} 
                  />
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button form="orderForm" type="submit" disabled={loading} className="px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)] flex items-center gap-2 transition-all active:scale-95">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Gravar</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const OrderFormModal = memo(OrderFormModalComponent);
