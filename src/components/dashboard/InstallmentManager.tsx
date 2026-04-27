'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Clock, AlertTriangle, Loader2,
  ChevronDown, Plus, Trash2, RefreshCw, DollarSign, CreditCard
} from 'lucide-react';
import { isBefore, startOfDay, parseISO, isValid, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Installment, PaymentMethod } from '../../types/finance';
import { generateInstallments, settleInstallment, reverseInstallment } from '../../services/financeService';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const PAYMENT_METHODS: PaymentMethod[] = [
  'PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência'
];

interface InstallmentManagerProps {
  orderId: string | null;
  totalValue: number;
  installments: Installment[];
  onInstallmentsChange: (installments: Installment[]) => void;
  readOnly?: boolean;
}

export function InstallmentManager({
  orderId,
  totalValue,
  installments,
  onInstallmentsChange,
  readOnly = false
}: InstallmentManagerProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Estados do Gerador
  const [installmentCount, setInstallmentCount] = useState(2);
  const [hasEntry, setHasEntry] = useState(false);
  const [entryValue, setEntryValue] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [showGenerator, setShowGenerator] = useState(false);

  // Estado de Liquidação
  const [isSettling, setIsSettling] = useState(false);

  const today = startOfDay(new Date());

  const getInstallmentStatus = (inst: Installment): 'paid' | 'overdue' | 'pending' => {
    if (inst.status === 'paid' || (inst.status as any) === 'pago') return 'paid';
    const due = parseISO(inst.due_date);
    if (isValid(due) && isBefore(due, today)) return 'overdue';
    return 'pending';
  };

  const handleGenerate = () => {
    if (totalValue <= 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Adicione itens técnicos com valor antes de gerar parcelas.' });
      return;
    }
    const generated = generateInstallments(totalValue, installmentCount, hasEntry, entryValue, startDate);
    onInstallmentsChange(generated);
    setShowGenerator(false);
    toast({ title: 'Cronograma Gerado', description: `${generated.length} parcela(s) criadas com sucesso.` });
  };

  const handleSettle = async (inst: Installment, method: PaymentMethod) => {
    // 1. Caso de Pedido Novo (OS #NOVA) - Baixa apenas no estado local
    if (!orderId) {
      const updated = installments.map(i => {
        if (i.index === inst.index) {
          return {
            ...i,
            status: 'paid' as const,
            payment_method: method,
            paid_at: new Date().toISOString(),
            paid_by: user?.email || 'sistema@impacto.com'
          };
        }
        return i;
      });
      onInstallmentsChange(updated);
      toast({ 
        title: 'Baixa Local Ativada', 
        description: `Parcela marcada como paga via ${method}. Lembre-se de Gravar o Registro para consolidar no banco.` 
      });
      return;
    }

    // 2. Caso de Pedido Existente - Valida autenticação e grava no Firestore
    if (!firestore) return;
    if (!user) {
      toast({ variant: 'destructive', title: 'Autenticação Necessária', description: 'Você precisa estar logado para processar liquidações financeiras.' });
      return;
    }

    setIsSettling(true);
    try {
      await settleInstallment(
        firestore, 
        orderId, 
        inst.index, 
        method, 
        user.email || 'operacional@impacto.com',
        installments
      );
      
      toast({ 
        title: 'Liquidação Industrial', 
        description: `Parcela #${inst.index} liquidada via ${method} com sucesso.` 
      });
    } catch (err: any) {
      console.error("Erro na liquidação:", err);
      toast({ 
        variant: 'destructive', 
        title: 'Falha no Processamento', 
        description: err.message || 'Houve um erro ao gravar a baixa no banco de dados.' 
      });
    } finally {
      setIsSettling(false);
    }
  };

  const handleReverse = async (index: number) => {
    if (!orderId) {
      const updated = installments.map(i => {
        if (i.index === index) {
          const { paid_at, paid_by, ...rest } = i;
          return { 
            ...rest, 
            status: 'pending' as const, 
            payment_method: 'PIX' as PaymentMethod
          };
        }
        return i;
      });
      onInstallmentsChange(updated);
      toast({ title: 'Estorno Local', description: 'O pagamento foi revertido neste rascunho.' });
      return;
    }

    if (!firestore || !user) return;
    
    setIsSettling(true);
    try {
      await reverseInstallment(firestore, orderId, index);
      toast({ title: 'Estorno Confirmado', description: `A parcela #${index} foi marcada como pendente.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Falha no Estorno', description: err.message });
    } finally {
      setIsSettling(false);
    }
  };

  const handleRemoveInstallment = (index: number) => {
    onInstallmentsChange(installments.filter(i => i.index !== index));
  };

  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearSchedule = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    onInstallmentsChange([]);
    setConfirmClear(false);
    toast({ title: 'Cronograma Removido', description: 'Todos os registros de parcelas foram limpos localmente.' });
  };

  return (
    <div className="space-y-4">
      {/* Gerador de Parcelas */}
      {!readOnly && (
        <div className="border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-1 pr-4 bg-zinc-900/20">
            <button
              type="button"
              onClick={() => setShowGenerator(!showGenerator)}
              className="flex-1 flex items-center justify-between p-3 text-left hover:bg-zinc-900/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <RefreshCw size={12} /> Gerador de Cronograma
              </span>
              <ChevronDown size={14} className={cn("text-zinc-500 transition-transform", showGenerator && "rotate-180")} />
            </button>
            
            {installments.length > 0 && (
              <button
                type="button"
                onClick={handleClearSchedule}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-2 flex items-center",
                  confirmClear 
                    ? "bg-red-600 text-white animate-pulse" 
                    : "bg-zinc-800 text-zinc-500 hover:text-red-400"
                )}
              >
                <Trash2 size={12} />
                {confirmClear ? 'Clique para Confirmar' : 'Limpar'}
              </button>
            )}
          </div>

          <AnimatePresence>
            {showGenerator && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-4 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Nº de Parcelas</label>
                      <input
                        type="number"
                        min={1}
                        max={36}
                        value={installmentCount}
                        onChange={e => setInstallmentCount(Number(e.target.value))}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm font-black text-center outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Data da 1ª Parcela</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setHasEntry(!hasEntry)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                        hasEntry ? "bg-primary/10 border-primary/30 text-primary" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                      )}
                    >
                      <DollarSign size={12} />
                      Entrada (Down Payment)
                    </button>
                  </div>

                  <AnimatePresence>
                    {hasEntry && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <label className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Valor da Entrada (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={totalValue}
                          value={entryValue}
                          onChange={e => setEntryValue(Number(e.target.value))}
                          className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-primary text-sm font-black outline-none focus:border-primary/50"
                          placeholder="0.00"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-zinc-500 uppercase font-black">Prévia do Rateio</p>
                    <p className="text-white font-black font-mono mt-1">
                      {hasEntry && entryValue > 0 ? (
                        <>
                          Entrada: {entryValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} +{' '}
                          {installmentCount}x de{' '}
                          {((totalValue - entryValue) / installmentCount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </>
                      ) : (
                        <>
                          {installmentCount}x de{' '}
                          {(totalValue / installmentCount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="w-full py-3 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> Gerar Cronograma
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Grid de Parcelas */}
      <div className="space-y-2">
        {installments.length > 0 ? (
          installments.map((inst) => (
            <InstallmentRow
              key={inst.id || inst.index}
              inst={inst}
              orderId={orderId}
              readOnly={readOnly}
              onSettle={handleSettle}
              onReverse={handleReverse}
              onRemove={handleRemoveInstallment}
              isProcessing={isSettling}
              today={today}
            />
          ))
        ) : (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
            <CreditCard size={32} className="mx-auto mb-3 text-zinc-700 opacity-30" />
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Nenhuma fatura lançada</p>
            <p className="text-[9px] text-zinc-700 mt-1">Use o Gerador acima para criar o cronograma de pagamento</p>
          </div>
        )}
      </div>

      {/* Adicionar parcela avulsa */}
      {!readOnly && installments.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const lastIdx = Math.max(...installments.map(i => i.index), 0);
            const lastDate = installments[installments.length - 1]?.due_date;
            const nextDate = lastDate ? new Date(lastDate + 'T12:00:00') : new Date();
            nextDate.setMonth(nextDate.getMonth() + 1);
            onInstallmentsChange([
              ...installments,
              {
                id: `inst_manual_${Date.now()}`,
                index: lastIdx + 1,
                amount: 0,
                due_date: nextDate.toISOString().split('T')[0],
                status: 'pending' as const,
                isEntry: false,
                payment_method: 'PIX' as PaymentMethod,
              }
            ]);
          }}
          className="w-full py-3 rounded-2xl border border-dashed border-zinc-700 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Adicionar Parcela Avulsa
        </button>
      )}
    </div>
  );
}

/**
 * Componente interno para gerenciar cada linha de parcela com seu próprio estado
 */
function InstallmentRow({ 
  inst, 
  orderId, 
  readOnly, 
  onSettle, 
  onReverse,
  onRemove, 
  isProcessing,
  today
}: { 
  inst: Installment; 
  orderId: string | null; 
  readOnly: boolean; 
  onSettle: (inst: Installment, method: PaymentMethod) => Promise<void>; 
  onReverse: (index: number) => Promise<void>;
  onRemove: (index: number) => void;
  isProcessing: boolean;
  today: Date;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmReverse, setConfirmReverse] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(inst.payment_method || 'PIX');

  const handleReverseClick = async () => {
    if (!confirmReverse) {
      setConfirmReverse(true);
      setTimeout(() => setConfirmReverse(false), 3000);
      return;
    }
    
    try {
      await onReverse(inst.index);
    } finally {
      setConfirmReverse(false);
    }
  };

  const statusKey = (() => {
    if (inst.status === 'paid' || (inst.status as any) === 'pago') return 'paid';
    const due = parseISO(inst.due_date);
    if (isValid(due) && isBefore(due, today)) return 'overdue';
    return 'pending';
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-2xl overflow-hidden transition-all",
        statusKey === 'paid' ? "border-emerald-500/20 bg-emerald-500/[0.03]" :
        statusKey === 'overdue' ? "border-red-500/30 bg-red-500/[0.03]" :
        "border-zinc-800 bg-zinc-900/40"
      )}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border text-[9px] font-black shrink-0",
            statusKey === 'paid' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
            statusKey === 'overdue' ? "bg-red-500/10 border-red-500/20 text-red-500" :
            "bg-zinc-800 border-zinc-700 text-zinc-400"
          )}>
            {statusKey === 'paid' ? <CheckCircle2 size={16} /> :
             statusKey === 'overdue' ? <AlertTriangle size={16} /> :
             <Clock size={16} />}
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              {inst.isEntry ? '⬇ ENTRADA' : `PARCELA ${inst.index}`}
            </p>
            <p className="text-sm font-black text-white font-mono">
              {Number(inst.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-[9px] text-zinc-600 font-bold uppercase mt-0.5">
              Venc: {inst.due_date ? format(parseISO(inst.due_date), "dd/MM/yyyy") : '—'}
              {statusKey === 'paid' && inst.paid_at && (
                <span className="text-emerald-500 ml-2">
                  · Pago {format(new Date(inst.paid_at), "dd/MM", { locale: ptBR })} via {inst.payment_method}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {statusKey !== 'paid' && !readOnly && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
            >
              <CreditCard size={12} /> Dar Baixa
            </button>
          )}
          {statusKey === 'paid' && !readOnly && (
            <button
              type="button"
              onClick={handleReverseClick}
              disabled={isProcessing}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                confirmReverse 
                  ? "bg-red-600 border-red-600 text-white animate-pulse" 
                  : "bg-emerald-500/5 border-emerald-500/10 text-emerald-500 hover:border-red-500/50 hover:text-red-500"
              )}
            >
              {confirmReverse ? <Trash2 size={12} /> : <CheckCircle2 size={12} />}
              {confirmReverse ? 'Confirmar Estorno' : 'Liquidado'}
            </button>
          )}
          {statusKey === 'paid' && readOnly && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
              <CheckCircle2 size={12} /> Liquidado
            </span>
          )}

          {!readOnly && statusKey !== 'paid' && (
            <button
              type="button"
              onClick={() => onRemove(inst.index)}
              className="p-2 text-zinc-700 hover:text-red-500 transition-colors rounded-lg"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && statusKey !== 'paid' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800 bg-black/40"
          >
            <div className="p-4 space-y-3">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Forma de Pagamento</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                      selectedMethod === method
                        ? "bg-primary border-primary text-black"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onSettle(inst, selectedMethod)}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isProcessing ? 'Registrando...' : `Confirmar Baixa — ${selectedMethod}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
