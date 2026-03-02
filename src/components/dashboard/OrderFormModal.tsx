
'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Box, ChevronDown, Activity, Loader2 } from 'lucide-react';
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

const OrderFormModalComponent = ({ order, isOpen, onClose }: { order?: any | null; isOpen: boolean; onClose: () => void }) => {
  const router = useRouter();
  const { updateOrder } = useOrders();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    client: '',
    deliveryDate: '',
    status: 'Arte',
    seller: 'Vendedor Geral',
    items: [] as any[]
  });

  useEffect(() => {
    if (order) {
      setFormData({
        client: order.client || '',
        deliveryDate: order.deliveryDate || order.delivery_date || '',
        status: order.status || 'Arte',
        seller: order.seller || 'Vendedor Geral',
        items: order.items?.map((item: any) => ({ ...item })) || []
      });
    }
  }, [order, isOpen]);

  const currentColor = getStatusColor(formData.status);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    setLoading(true);
    try {
      // BACKEND REQUIREMENT: Remove deliveryDate from payload to prevent accidental re-submission
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { deliveryDate, client, ...payload } = formData;
      
      await updateOrder(order.id, payload);
      toast({ title: "Protocolo Atualizado" });
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
          <h2 className="text-lg font-black text-white uppercase tracking-tighter">{order ? 'Ajustar Pedido' : 'Detalhes do Pedido'}</h2>
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
              {/* CAMPO CLIENTE BLOQUEADO */}
              <div className="opacity-60 pointer-events-none">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-1 block">Cliente / Projeto</label>
                <input readOnly value={formData.client} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-400 outline-none cursor-not-allowed" />
              </div>
              
              {/* CAMPO PRAZO DE ENTREGA BLOQUEADO (NOVO REQUISITO) */}
              <div className="opacity-60 pointer-events-none">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-1 block">Prazo de Entrega</label>
                <input 
                  readOnly 
                  value={formData.deliveryDate} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-400 outline-none cursor-not-allowed" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-2"><Box size={14} /> Ficha de Produção (Leitura)</h3>
                <span className="text-[8px] font-black text-zinc-600 uppercase border border-zinc-800 px-2 py-1 rounded">Modo Visualização</span>
              </div>
              
              <div className="space-y-3 mt-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {formData.items && formData.items.length > 0 ? (
                  formData.items.map((item, index) => (
                    <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 transition-all hover:border-zinc-700/50">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Material / Serviço</label>
                          <p className="text-zinc-200 text-sm font-black uppercase mt-0.5">
                            {item.desc || item.name || item.descricao || 'Item não especificado'}
                          </p>
                        </div>
                        <div className="w-16 flex flex-col items-center">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Qtd.</label>
                          <p className="text-zinc-300 text-sm font-black bg-zinc-800/80 px-3 py-1 rounded border border-zinc-700/50 mt-0.5">
                            {item.quantity || item.qtd || 1}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-zinc-800/50">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          Notas Técnicas
                        </label>
                        <p className="text-zinc-400 text-xs italic mt-1 leading-relaxed">
                          {item.observation || item.notes || item.observacao || item.details || 'Nenhuma nota técnica atrelada a este item.'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                    <p className="text-zinc-600 font-black uppercase text-[10px] tracking-widest">Nenhum detalhamento técnico</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">Fechar</button>
          <button form="orderForm" type="submit" disabled={loading} className="px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)] flex items-center gap-2 transition-all active:scale-95">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Salvar Etapa</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const OrderFormModal = memo(OrderFormModalComponent);
