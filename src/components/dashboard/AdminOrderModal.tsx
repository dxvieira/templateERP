'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Plus, Trash2, Box, FileText, 
  User, CreditCard, DollarSign, 
  Calculator, Briefcase, Percent,
  Loader2,
  Calendar
} from 'lucide-react';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';

// Opções de Pagamento
const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Faturado'];
const CARD_MACHINES = ['PAGBANK', 'SIPAG/SICOOB'];

interface AdminOrderModalProps {
  order?: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminOrderModal({ order, isOpen, onClose }: AdminOrderModalProps) {
  const { updateOrder, createOrder } = useOrders();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DO PEDIDO ---
  const [client, setClient] = useState('');
  const [seller, setSeller] = useState('');
  const [status, setStatus] = useState('Arte');
  const [emissionDate, setEmissionDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Financeiro
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [installments, setInstallments] = useState(1);
  const [machine, setMachine] = useState('');

  // Observações
  const [observations, setObservations] = useState('');

  // Itens
  const [items, setItems] = useState<any[]>([]);

  // Carregar dados na abertura
  useEffect(() => {
    if (order) {
      setClient(order.client || '');
      setSeller(order.seller || '');
      setStatus(order.status || 'Arte');
      setEmissionDate(order.emissionDate || new Date().toISOString().split('T')[0]);
      setDeliveryDate(order.deliveryDate || '');
      setPaymentMethod(order.paymentMethod || 'PIX');
      setInstallments(order.installments || 1);
      setMachine(order.machine || '');
      setObservations(order.observations || '');
      
      const loadedItems = order.items?.map((item: any) => ({
        productCode: item.productCode || '',
        desc: item.desc || '',
        quantity: item.quantity || 1,
        unitValue: item.unitValue || 0,
        observation: item.observation || ''
      })) || [{ productCode: '', desc: '', quantity: 1, unitValue: 0, observation: '' }];
      
      setItems(loadedItems);
    } else {
      setClient('');
      setSeller('');
      setStatus('Arte');
      setEmissionDate(new Date().toISOString().split('T')[0]);
      setDeliveryDate('');
      setPaymentMethod('PIX');
      setInstallments(1);
      setMachine('');
      setObservations('');
      setItems([{ productCode: '', desc: '', quantity: 1, unitValue: 0, observation: '' }]);
    }
  }, [order, isOpen]);

  // Cálculo Total
  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitValue || 0)), 0);
  }, [items]);

  const handleAddItem = () => {
    setItems([...items, { productCode: '', desc: '', quantity: 1, unitValue: 0, observation: '' }]);
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
      seller,
      status,
      emissionDate,
      deliveryDate,
      paymentMethod,
      installments: paymentMethod === 'Cartão de Crédito' ? installments : 1,
      machine: paymentMethod === 'Cartão de Crédito' ? machine : '',
      observations,
      items,
      totalValue
    };

    try {
      if (order?.id) {
        await updateOrder(order.id, payload);
        toast({ title: "Gestão Financeira Atualizada" });
      } else {
        await createOrder(payload);
        toast({ title: "Novo Lançamento Administrativo Gravado" });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4">
      <motion.div 
        initial={{ scale: 0.98, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="bg-[#09090b] w-full max-w-5xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
      >
        
        {/* HEADER FINANCEIRO */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl border border-emerald-500/20">
              <Calculator size={20} />
            </div>
            <div>
              <span className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.3em]">Painel Administrativo</span>
              <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                Gestão Total <span className="text-zinc-600 font-mono text-sm">#{order?.id || 'NOVA'}</span>
              </h2>
            </div>
          </div>
          
          <div className="hidden md:flex flex-col items-end">
             <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Valor do Contrato</p>
             <p className="text-3xl font-black text-emerald-400 tracking-tighter">
               {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
             </p>
          </div>

          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full">
            <X size={20}/>
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050505] space-y-8">
          <form id="adminOrderForm" onSubmit={handleSave} className="space-y-8">
            
            {/* 1. DADOS CADASTRAIS */}
            <section className="space-y-4">
               <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                 <User size={14} className="text-zinc-500" />
                 <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Identificação do Projeto</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2 space-y-1.5">
                    <label className="text-[9px] text-zinc-600 uppercase font-black ml-1">Cliente / Parceiro</label>
                    <input required value={client} onChange={e => setClient(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-600 uppercase font-black ml-1">Responsável Comercial</label>
                    <div className="relative">
                       <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" />
                       <input value={seller} onChange={e => setSeller(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 pl-9 text-sm text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-600 uppercase font-black ml-1">Fase da Produção</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer">
                       {['Arte', 'Serralheria', 'Impressão', 'Acabamento', 'Instalação', 'Concluído'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-600 uppercase font-black ml-1">Data de Emissão</label>
                    <input type="date" value={emissionDate} onChange={e => setEmissionDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-600 uppercase font-black ml-1">Prazo de Entrega</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                  </div>
               </div>
            </section>

            {/* 2. TABELA DE ITENS */}
            <section className="space-y-4">
               <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Box size={14} className="text-primary" />
                    <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Ficha Técnica de Produtos</h3>
                  </div>
                  <button type="button" onClick={handleAddItem} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-black rounded-lg px-3 py-1 text-[9px] font-black uppercase transition-all flex items-center gap-1">
                    <Plus size={12} /> Adicionar Material
                  </button>
               </div>

               <div className="space-y-2">
                  <div className="hidden md:grid grid-cols-12 gap-2 text-[8px] font-black text-zinc-600 uppercase px-4">
                     <div className="col-span-1">Cód.</div>
                     <div className="col-span-5">Material / Serviço</div>
                     <div className="col-span-1 text-center">Qtd.</div>
                     <div className="col-span-2 text-right">Vl. Unit.</div>
                     <div className="col-span-2 text-right">Subtotal</div>
                     <div className="col-span-1"></div>
                  </div>

                  {items.map((item, index) => (
                    <div key={index} className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 md:grid md:grid-cols-12 md:items-center gap-3 hover:border-zinc-700 transition-colors group">
                       <div className="col-span-1 mb-2 md:mb-0">
                         <input placeholder="COD" value={item.productCode} onChange={e => handleItemChange(index, 'productCode', e.target.value)} 
                           className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-400 text-center font-mono focus:border-primary outline-none" />
                       </div>
                       <div className="col-span-5 mb-2 md:mb-0">
                         <input placeholder="Descrição detalhada..." value={item.desc} onChange={e => handleItemChange(index, 'desc', e.target.value)} 
                           className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-primary outline-none" />
                       </div>
                       <div className="col-span-1 mb-2 md:mb-0">
                         <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} 
                           className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2 text-xs text-white text-center outline-none focus:border-primary" />
                       </div>
                       <div className="col-span-2 mb-2 md:mb-0 relative">
                         <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-700 text-[10px] font-bold">R$</span>
                         <input type="number" step="0.01" value={item.unitValue} onChange={e => handleItemChange(index, 'unitValue', e.target.value)} 
                           className="w-full bg-black/40 border border-emerald-500/10 rounded-lg p-2 pl-7 text-xs text-emerald-400 text-right outline-none focus:border-emerald-500" />
                       </div>
                       <div className="col-span-2 mb-2 md:mb-0 text-right font-mono text-xs font-black text-zinc-400 bg-black/20 p-2 rounded-lg border border-zinc-800/50">
                         {(item.quantity * item.unitValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                       </div>
                       <div className="col-span-1 text-right">
                         <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors">
                           <Trash2 size={14} />
                         </button>
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            {/* 3. FINANCEIRO */}
            <section className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl p-5 space-y-6">
               <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                 <DollarSign size={14} className="text-emerald-500" />
                 <h3 className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em]">Condições de Pagamento</h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-600 uppercase font-black ml-1">Método</label>
                    <div className="relative">
                      <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700"/>
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 pl-9 text-sm text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer">
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  {paymentMethod === 'Cartão de Crédito' && (
                    <>
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1.5">
                        <label className="text-[9px] text-zinc-600 uppercase font-black ml-1">Parcelamento</label>
                        <div className="relative">
                          <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700"/>
                          <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 pl-9 text-sm text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer">
                            {[...Array(12)].map((_, i) => (
                              <option key={i+1} value={i+1}>{i+1}x de {((totalValue / (i+1))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>
                            ))}
                          </select>
                        </div>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1.5">
                        <label className="text-[9px] text-zinc-600 uppercase font-black ml-1">Terminal / Máquina</label>
                        <select value={machine} onChange={e => setMachine(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer">
                          <option value="">Selecione...</option>
                          {CARD_MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </motion.div>
                    </>
                  )}
               </div>
            </section>

            {/* 4. OBSERVAÇÕES */}
            <div className="space-y-1.5">
               <label className="text-[9px] text-zinc-600 uppercase font-black flex items-center gap-1 ml-1"><FileText size={10}/> Dossiê de Observações</label>
               <textarea rows={4} value={observations} onChange={e => setObservations(e.target.value)} 
                 className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-white focus:border-primary outline-none resize-none transition-all" placeholder="Informações críticas de instalação, detalhes do material ou notas de faturamento..." />
            </div>

          </form>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <div className="md:hidden">
             <span className="text-[8px] text-zinc-500 uppercase font-black block">Total</span>
             <span className="font-black text-emerald-400 text-lg leading-none">
               {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
             </span>
          </div>
          <div className="flex gap-3 ml-auto">
             <button onClick={onClose} className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all">
               Cancelar
             </button>
             <button form="adminOrderForm" type="submit" disabled={loading} 
               className="px-10 py-3 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-white hover:scale-[1.02] transition-all shadow-[0_0_25px_-5px_rgba(16,185,129,0.5)] disabled:opacity-50 flex items-center gap-2">
               {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Efetivar Protocolo</>}
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}