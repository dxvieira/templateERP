'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, Clock, AlertTriangle, CreditCard, 
  DollarSign, Plus, ArrowRight, Wallet, History, Loader2 
} from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { settleInstallment } from '@/services/financeService';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Installment } from '@/types/finance';
import { useState } from 'react';

interface OrderPaymentModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * OrderPaymentModal - Extrato de Liquidez Industrial.
 * Exibe o detalhamento de faturas e saúde financeira do contrato.
 */
export function OrderPaymentModal({ order, isOpen, onClose }: OrderPaymentModalProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  const financialSummary = useMemo(() => {
    if (!order) return null;

    const total = Number(order.calculatedTotal || order.total_value || 0);
    const paid = Number(order.amount_paid || order.calculatedPaid || 0);
    const balance = total - paid;
    const installments = Array.isArray(order.installments) ? order.installments : [];
    
    const today = startOfDay(new Date());

    const processedInstallments = installments.map((inst: Installment, index: number) => {
      const isPaid = inst.status === 'paid' || (inst.status as string) === 'pago';
      const dueDate = inst.due_date ? parseISO(inst.due_date) : null;
      const isOverdue = !isPaid && dueDate && isValid(dueDate) && isBefore(dueDate, today);
      
      // Garante que o índice seja um número inteiro válido para o serviço
      const safeIndex = inst.index !== undefined ? Number(inst.index) : index;

      return {
        ...inst,
        index: safeIndex,
        totalParts: installments.length,
        isPaid,
        isOverdue,
        formattedDate: dueDate && isValid(dueDate) ? format(dueDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Data não informada'
      };
    });

    return {
      total,
      paid,
      balance,
      processedInstallments,
      isFullyPaid: balance <= 0 && total > 0,
      nextPending: processedInstallments.find((i: any) => !i.isPaid)
    };
  }, [order]);

  const handleSettle = async (installmentIndex: number) => {
    if (!firestore || !user || !order) return;
    
    setIsProcessing(installmentIndex);
    try {
      await settleInstallment(
        firestore,
        order.id,
        installmentIndex,
        'PIX',
        user.email || 'sistema@exemplo.com',
        Array.isArray(order.installments) ? order.installments : []
      );
      toast({
        title: "Pagamento Registrado",
        description: `Parcela #${installmentIndex} liquidada com sucesso.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao Liquidar",
        description: error.message || "Não foi possível registrar o pagamento.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(null);
    }
  };

  if (!order || !financialSummary) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          {/* Backdrop com Blur Intenso */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
          />

          {/* Janela do Modal (Spring Effect) */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-2xl bg-secondary border border-border rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Header Industrial */}
            <div className="p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                  <Wallet size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Extrato de Liquidez</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
                    OS #{order.id.slice(-6).toUpperCase()} • {order.client}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground bg-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo - Lista de Parcelas */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <History size={14} className="text-primary" />
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Cronograma de Faturamento</h3>
              </div>

              <div className="space-y-3">
                {financialSummary.processedInstallments.length > 0 ? (
                  financialSummary.processedInstallments.map((inst: any) => (
                    <div 
                      key={inst.index}
                      className={cn(
                        "group relative p-4 rounded-2xl border transition-all duration-300",
                        inst.isPaid ? "bg-emerald-500/[0.03] border-emerald-500/20" : 
                        inst.isOverdue ? "bg-red-500/[0.03] border-red-500/30 animate-pulse-neon-red" : 
                        "bg-secondary/40 border-border hover:border-border"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border",
                            inst.isPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : 
                            inst.isOverdue ? "bg-red-500/10 border-red-500/20 text-red-500" : 
                            "bg-secondary border-border text-muted-foreground"
                          )}>
                             {inst.isEntry ? 'E' : inst.index}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground uppercase tracking-tight">{inst.formattedDate}</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{inst.payment_method || 'A DEFINIR'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                          <p className="text-sm font-black text-foreground font-mono">
                            {Number(inst.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <button 
                            disabled={inst.isPaid || isProcessing !== null}
                            onClick={() => handleSettle(inst.index)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest shadow-sm transition-all",
                              inst.isPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : 
                              inst.isOverdue ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-foreground" : 
                              "bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-foreground"
                            )}
                          >
                            {isProcessing === inst.index ? <Loader2 size={10} className="animate-spin"/> : inst.isPaid ? <CheckCircle2 size={10}/> : inst.isOverdue ? <AlertTriangle size={10}/> : <Clock size={10}/>}
                            {inst.isPaid ? 'Liquidado' : inst.isOverdue ? 'Atrasado' : 'Pagar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-border rounded-3xl bg-secondary/10">
                    <CreditCard size={32} className="mx-auto mb-3 text-muted-foreground opacity-20" />
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Nenhum registro de faturamento</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer com Resumo de Saldo */}
            <div className="p-8 border-t border-border bg-secondary/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Déficit de Contrato</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-4xl font-black font-mono tracking-tighter",
                      financialSummary.isFullyPaid ? "text-emerald-500" : "text-red-500"
                    )}>
                      {financialSummary.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {financialSummary.isFullyPaid && (
                      <span className="text-[10px] bg-emerald-500 text-primary-foreground font-black px-2 py-0.5 rounded uppercase ml-2 animate-pulse">Quitado</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-6 py-4 rounded-2xl border border-border text-muted-foreground font-black uppercase text-[10px] tracking-widest hover:bg-secondary transition-all"
                  >
                    Fechar
                  </button>
                  <button 
                    disabled={financialSummary.isFullyPaid || isProcessing !== null || !financialSummary.nextPending}
                    onClick={() => financialSummary.nextPending && handleSettle(financialSummary.nextPending.index)}
                    className="flex-1 sm:flex-none px-8 py-4 rounded-2xl bg-primary disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-[0_0_30px_rgba(255,95,31,0.4)] hover:bg-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing !== null ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Registrar Proximo</>}
                  </button>
                </div>
              </div>

              {/* Assinatura Visual Discreta */}
              <div className="mt-8 flex justify-center opacity-10 hover:opacity-30 transition-opacity grayscale brightness-200">
                <div className="relative w-24 h-6 flex items-center justify-center border border-border bg-secondary rounded">
                  <span className="text-muted-foreground text-[8px] font-black tracking-widest">LOGO</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
