// services/financeService.ts
// Motor de Faturamento Industrial — Impacto Digital
// Utiliza Firestore Transactions para garantir integridade ACID

import {
  doc,
  runTransaction,
  Firestore,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { Installment, PaymentMethod } from '../types/finance';

/**
 * Gera N parcelas de forma atômica, suportando Entrada (Down Payment).
 * A diferença de arredondamento (dízimas) é adicionada na PRIMEIRA parcela/entrada.
 */
export function generateInstallments(
  totalValue: number,
  count: number,
  hasEntry: boolean = false,
  entryValue: number = 0,
  startDate?: string
): Installment[] {
  const installments: Installment[] = [];
  const baseDate = startDate ? new Date(startDate + 'T12:00:00') : new Date();

  let remaining = totalValue;
  let indexOffset = 0;

  // Down Payment (Entrada)
  if (hasEntry && entryValue > 0) {
    const entryDate = new Date(baseDate);
    installments.push({
      id: `inst_entry_${Date.now()}`,
      index: 0,
      amount: entryValue,
      due_date: entryDate.toISOString().split('T')[0],
      status: 'pending',
      isEntry: true,
      payment_method: 'PIX' as PaymentMethod,
    });
    remaining -= entryValue;
    indexOffset = 1;
  }

  if (count <= 0 || remaining <= 0) return installments;

  // Divisão do restante em N parcelas com ajuste de arredondamento
  const baseInstallmentValue = Math.floor((remaining / count) * 100) / 100;
  const totalFromParcelas = baseInstallmentValue * count;
  const roundingDiff = Math.round((remaining - totalFromParcelas) * 100) / 100;

  for (let i = 0; i < count; i++) {
    const dueDate = new Date(baseDate);
    // Cada parcela vence 30 dias após a anterior (entry = hoje, parcela 1 = +30 dias, etc.)
    const monthOffset = hasEntry ? i + 1 : i;
    dueDate.setMonth(dueDate.getMonth() + monthOffset);

    // A diferença de arredondamento vai na primeira parcela
    const amount = i === 0
      ? Math.round((baseInstallmentValue + roundingDiff) * 100) / 100
      : baseInstallmentValue;

    installments.push({
      id: `inst_${Date.now()}_${i}`,
      index: i + indexOffset,
      amount,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      isEntry: false,
      payment_method: 'PIX' as PaymentMethod,
    });
  }

  return installments;
}

/**
 * Liquidação Atômica via Firestore Transaction.
 * Garante que status da parcela + saldo da OS são atualizados juntos (anti Double-Spending).
 */
export async function settleInstallment(
  firestore: Firestore,
  orderId: string,
  installmentIndex: number,
  method: PaymentMethod,
  userEmail: string
): Promise<void> {
  const orderRef = doc(firestore, 'orders', orderId);

  await runTransaction(firestore, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Pedido não encontrado');

    const orderData = orderSnap.data();
    const currentInstallments: Installment[] = orderData.installments || [];

    // Localiza a parcela pelo índice
    const instIdx = currentInstallments.findIndex(i => i.index === installmentIndex);
    if (instIdx === -1) throw new Error('Parcela não encontrada');

    const inst = currentInstallments[instIdx];
    // Se a parcela já estiver liquidada (paid ou pago), retornamos sucesso (idempotência)
    if (inst.status === 'paid' || (inst.status as string) === 'pago') {
      return;
    }

    // Atualização imutável da parcela
    const updatedInstallments = [...currentInstallments];
    updatedInstallments[instIdx] = {
      ...inst,
      status: 'paid',
      payment_method: method,
      paid_at: new Date().toISOString(),
      paid_by: userEmail,
    };

    // Recalcula totais pagos para consistência
    const newAmountPaid = updatedInstallments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const totalValue = Number(orderData.total_value || 0);

    transaction.update(orderRef, {
      installments: updatedInstallments,
      amount_paid: newAmountPaid,
      balance_due: Math.max(0, totalValue - newAmountPaid),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Reverte a liquidação de uma parcela (Estorno).
 * Retorna o status para 'pending' e limpa os metadados de pagamento.
 */
export async function reverseInstallment(
  firestore: Firestore,
  orderId: string,
  installmentIndex: number
): Promise<void> {
  const orderRef = doc(firestore, 'orders', orderId);

  await runTransaction(firestore, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Pedido não encontrado');

    const orderData = orderSnap.data();
    const currentInstallments: Installment[] = orderData.installments || [];

    const instIdx = currentInstallments.findIndex(i => i.index === installmentIndex);
    if (instIdx === -1) throw new Error('Parcela não encontrada');

    // Atualização imutável para reverter
    const updatedInstallments = [...currentInstallments];
    const inst = updatedInstallments[instIdx];

    // Removemos explicitamente os campos de pagamento para limpar o registro
    const { paid_at, paid_by, payment_method, ...rest } = inst;
    
    updatedInstallments[instIdx] = {
      ...rest,
      status: 'pending',
      payment_method: 'PIX' as PaymentMethod
    };

    // Recalcula totais
    const newAmountPaid = updatedInstallments
      .filter(i => i.status === 'paid' || (i.status as any) === 'pago')
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const totalValue = Number(orderData.total_value || 0);

    transaction.update(orderRef, {
      installments: updatedInstallments,
      amount_paid: newAmountPaid,
      balance_due: Math.max(0, totalValue - newAmountPaid),
      updatedAt: serverTimestamp(),
    });
  });
}
