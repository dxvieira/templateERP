'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Box, 
  FileText, 
  ChevronDown, 
  Activity,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';

const PRODUCTION_STAGES = [
  'Arte',
  'Serralheria',
  'Impressão',
  'Acabamento',
  'Instalação',
  'Concluído'
];

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

  // Estados do Formulário
  const [client, setClient] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState('Arte');
  const [seller, setSeller] = useState('Vendedor Geral');
  const [items, setItems] = useState<any[]>([]);

  // Carrega dados se for edição
  useEffect(() => {
    if (order) {
      setClient(order.client || '');
      setDeliveryDate(order.deliveryDate || '');
      setStatus(order.status || 'Arte');
      setSeller(order.seller || 'Vendedor Geral');
      setItems(order.items || [{ desc: '', quantity: 1, observation: '' }]);
    } else {
      setClient('');
      setDeliveryDate('');
      setStatus('Arte');
      setSeller('Vendedor Geral');
      setItems([{ desc: '', quantity: 1, observation: '' }]);
    }
  }, [order, isOpen]);

  // Cores dinâmicas para o Status Hero
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

  // --- LINK PROFUNDO PARA CLIENTE ---
  const handleGoToClient = () => {
    if (!client) return;
    onClose();
    router.push(`/clients?search=${encodeURIComponent(client)}`);
  };

  // Gerenciamento de Itens
  const handleAddItem = () => {
    setItems([...items, { desc: '', quantity: 1, observation: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      client,
      deliveryDate,
      status,
      seller,
      items,
      totalValue: items.reduce((acc, item) => acc + (Number(item.quantity) * (Number(item.unitValue) || 0)), 0)
    };

    try {
      if (order) {
        await updateOrder(order.id, payload);
        toast({ title: "Protocolo Atualizado" });
      } else {
        await createOrder(payload);
        toast({ title: "Novo Lançamento Gravado" });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (window.confirm("Remover este protocolo permanentemente da base?")) {
      setLoading(true);
      try {
        await deleteOrder(order.id);
        toast({ title: "Protocolo Removido" });
        onClose();
      } catch (err) {} finally {
        setLoading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="relative bg-[#09090b] w-full max-w-2xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-white uppercase tracking-tighter">
                  {order ? 'Ajustar Pedido' : 'Novo Lançamento'}
                </h2>
                {order && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700" style={{ color: currentColor }}>
                    #{order.id}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {order && (
                  <button onClick={handleDelete} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* FORM BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <form id="orderForm" onSubmit={handleSave} className="space-y-8">
                
                {/* 1. STATUS HERO CONTROL */}
                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] flex items-center gap-2 ml-1">
                    <Activity size={12} className="animate-pulse" /> Etapa da Produção
                  </label>
                  <div className="relative group">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="
                        w-full appearance-none bg-black border-2 rounded-2xl py-4 pl-6 pr-12
                        text-xl font-black uppercase tracking-widest outline-none cursor-pointer
                        transition-all duration-500
                      "
                      style={{ 
                        borderColor: currentColor, 
                        color: currentColor,
                        boxShadow: `0 0 30px -10px ${currentColor}40`
                      }}
                    >
                      {PRODUCTION_STAGES.map(s => (
                        <option key={s} value={s} className="bg-zinc-950 text-white font-bold text-sm">
                          {s}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: currentColor }}>
                      <ChevronDown size={24} strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* 2. DADOS PRINCIPAIS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1 ml-1">
                      <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Cliente / Projeto</label>
                      <button 
                        type="button"
                        onClick={handleGoToClient}
                        className="flex items-center gap-1 text-[9px] font-black uppercase text-cyan-500 hover:text-cyan-400 transition-colors"
                      >
                        Ver Perfil <ExternalLink size={10} />
                      </button>
                    </div>
                    <input
                      required
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-primary outline-none transition-all"
                      placeholder="Identificação do parceiro..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest ml-1">Prazo de Entrega</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="w-full h-px bg-white/5" />

                {/* 3. ITENS EM BLOCO COMPACTO */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-2">
                      <Box size={14} /> Ficha de Produção ({items.length})
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary hover:text-black transition-all"
                    >
                      <Plus size={14} className="inline mr-1" /> Add Material
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                        <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Nenhum item adicionado</p>
                      </div>
                    )}

                    {items.map((item, index) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={index}
                        className="bg-black/40 border border-zinc-800 rounded-2xl p-4 relative group hover:border-zinc-700 transition-all"
                      >
                        <div className="absolute -left-2 top-4 w-1 h-8 rounded-full bg-zinc-800 group-hover:bg-primary transition-colors" />
                        
                        <div className="space-y-4">
                          {/* LINHA SUPERIOR: MATERIAL E QUANTIDADE */}
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-1">
                              <label className="text-[8px] text-zinc-600 uppercase font-black">Material / Serviço</label>
                              <input
                                placeholder="Lona, Adesivo, ACM..."
                                value={item.desc}
                                onChange={(e) => handleItemChange(index, 'desc', e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-800 py-1 text-sm text-white focus:border-primary outline-none"
                              />
                            </div>
                            <div className="w-20 space-y-1">
                              <label className="text-[8px] text-zinc-600 uppercase font-black text-center block">Qtd.</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-sm text-white text-center outline-none focus:border-primary"
                              />
                            </div>
                          </div>

                          {/* LINHA INFERIOR: OBS E DELETE */}
                          <div className="flex gap-4 items-start">
                            <div className="flex-1 space-y-1">
                              <label className="text-[8px] text-zinc-600 uppercase font-black flex items-center gap-1">
                                <FileText size={10} /> Notas Técnicas
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Acabamento, refile, ilhós, detalhes..."
                                value={item.observation}
                                onChange={(e) => handleItemChange(index, 'observation', e.target.value)}
                                className="w-full bg-transparent border border-zinc-800 rounded-lg p-2 text-xs text-zinc-400 focus:border-primary outline-none resize-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="mt-6 p-2.5 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* FOOTER */}
            <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                form="orderForm"
                type="submit"
                disabled={loading}
                className="
                  px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest
                  hover:bg-white hover:scale-[1.02] active:scale-95 transition-all
                  shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)]
                  flex items-center gap-2
                "
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Gravar Protocolo</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
