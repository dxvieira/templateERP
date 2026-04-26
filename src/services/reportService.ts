/**
 * @fileoverview reportService.ts — Camada de Serviço de Relatórios (Domain Service)
 *
 * Responsável por:
 *  1. Validação do DTO de intervalo (FMEA Gate)
 *  2. Consolidação financeira (Receitas, Despesas, A/R, A/P)
 *  3. Desacoplamento total da UI — não importa nenhum componente React
 *
 * Arquitetura: Hexagonal (Ports & Adapters)
 *  - Input Port: `ReportRangeRequest`
 *  - Output Port: `ConsolidatedReport`
 *  - Adapters: Firestore collections (orders, cashflow_manual, accounts_payable)
 */

import { isWithinInterval, parseISO, isValid, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { ReportRangeRequest, RangeValidationResult } from '@/types/finance';

// ─── Limite de intervalo máximo para evitar timeout (365 dias) ──────────────
const MAX_RANGE_DAYS = 365;

// ─── Utilitário de Sanitização Monetária ────────────────────────────────────

/**
 * Converte qualquer representação monetária em número float seguro.
 * Suporta strings formatadas (R$ 1.234,56) e numbers nativos.
 *
 * @param val - Valor bruto a ser sanitizado
 * @returns Número float, nunca NaN (retorna 0 em caso de falha)
 */
export const sanitizeCurrency = (val: unknown): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val || typeof val !== 'string') return 0;
  const cleaned = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// ─── FMEA Gate — Validação do ReportRangeRequest ────────────────────────────

/**
 * Valida estritamente um `ReportRangeRequest` antes de processar qualquer dado.
 *
 * Failure Modes cobertos (FMEA):
 *  - FM-01: String de data mal formada ou ausente → INVALID_FORMAT
 *  - FM-02: startDate >= endDate → RANGE_INVERTED
 *  - FM-03: startDate === endDate (dia único) → permitido, retorna valid
 *  - FM-04: Intervalo > MAX_RANGE_DAYS → RANGE_TOO_WIDE (timeout prevention)
 *
 * @param req - DTO a ser validado
 * @returns RangeValidationResult — tagged union Result<T>
 *
 * @example
 * const result = validateReportRange({ startDate: '2026-01-01', endDate: '2026-03-31' });
 * if (!result.valid) { console.error(result.message); return; }
 * // result.startDate e result.endDate agora são Date objects seguros
 */
export function validateReportRange(req: ReportRangeRequest): RangeValidationResult {
  // FM-01: Valida formato ISO
  const start = parseISO(req.startDate);
  const end = parseISO(req.endDate);

  if (!isValid(start) || !isValid(end)) {
    return {
      valid: false,
      code: 'INVALID_FORMAT',
      message: `Formato de data inválido. Use YYYY-MM-DD. Recebido: "${req.startDate}" → "${req.endDate}"`,
    };
  }

  // FM-02: Valida inversão de range
  if (start > end) {
    return {
      valid: false,
      code: 'RANGE_INVERTED',
      message: `Data de início (${req.startDate}) é posterior à data de fim (${req.endDate}).`,
    };
  }

  // FM-04: Previne timeout em ranges muito extensos
  const daysDiff = differenceInDays(end, start);
  if (daysDiff > MAX_RANGE_DAYS) {
    return {
      valid: false,
      code: 'RANGE_TOO_WIDE',
      message: `Intervalo de ${daysDiff} dias excede o limite de ${MAX_RANGE_DAYS} dias. Reduza o período ou use exportação em background.`,
    };
  }

  return {
    valid: true,
    startDate: startOfDay(start),
    endDate: endOfDay(end),
  };
}

// ─── Tipos de Output ─────────────────────────────────────────────────────────

export interface ReportTransaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  method: string;
  origin: string;
  originalId?: string;
}

export interface ReportOrder {
  id: string;
  client: string;
  status: string;
  calculatedTotal: number;
  calculatedPaid: number;
  calculatedBalance: number;
  progress: number;
  [key: string]: unknown;
}

export interface ReportKPIs {
  incomes: number;
  expenses: number;
  net: number;
  receivables: number;
  payables: number;
  totalOrdersValue: number;
}

export interface ConsolidatedReport {
  transactions: ReportTransaction[];
  monthlyOrders: ReportOrder[];
  groupedPayables: GroupedPayable[];
  kpis: ReportKPIs;
  /** Metadados do intervalo para exibição na UI */
  meta: {
    startDate: Date;
    endDate: Date;
    totalDays: number;
  };
}

export interface GroupedPayable {
  groupId: string;
  supplier: string;
  description: string;
  installments: unknown[];
  totalAmount: number;
  allPaid: boolean;
}

// ─── Engine de Consolidação (Service Core) ───────────────────────────────────

/**
 * Consolida todas as fontes de dados financeiros dentro de um intervalo validado.
 * 
 * Esta função é PURA em relação ao intervalo — não faz nenhum cálculo de datas
 * internamente, recebendo os objetos Date já validados pelo `validateReportRange`.
 *
 * @param startDate - Data de início (já sanitizada, meia-noite)
 * @param endDate   - Data de fim (já sanitizada, 23:59:59)
 * @param orders    - Coleção de pedidos do Firestore
 * @param cashflowManual - Coleção de lançamentos manuais
 * @param payables  - Coleção de contas a pagar
 * @returns ConsolidatedReport com todos os KPIs e transações do período
 */
export function consolidateReport(
  startDate: Date,
  endDate: Date,
  orders: unknown[] = [],
  cashflowManual: unknown[] = [],
  payables: unknown[] = [],
): ConsolidatedReport {
  let incomes = 0;
  let expenses = 0;
  let receivables = 0;
  let totalPayables = 0;
  const transactions: ReportTransaction[] = [];
  const monthlyOrders: ReportOrder[] = [];

  const interval = { start: startDate, end: endDate };

  // ── Processamento de Ordens de Serviço ──────────────────────────────────
  for (const order of orders as any[]) {
    let orderDate: Date;
    try {
      orderDate = order.createdAt?.seconds
        ? new Date(order.createdAt.seconds * 1000)
        : parseISO(order.emission_date || order.delivery_date || '');
      if (!isValid(orderDate)) continue;
    } catch {
      continue;
    }

    const totalVal = sanitizeCurrency(order.total_value ?? order.totalValue);
    const paidVal = sanitizeCurrency(order.amount_paid ?? order.amountPaid);
    const balDue = totalVal - paidVal;

    if (isWithinInterval(orderDate, interval)) {
      if (balDue > 0) receivables += balDue;
      monthlyOrders.push({
        ...order,
        calculatedTotal: totalVal,
        calculatedPaid: paidVal,
        calculatedBalance: balDue,
        progress: totalVal > 0 ? Math.round((paidVal / totalVal) * 100) : 0,
      });
    }

    // Parcelas quitadas dentro do intervalo → Entradas
    const installments = Array.isArray(order.installments) ? order.installments : [];
    for (const inst of installments) {
      const isPaid = inst?.status === 'paid' || inst?.status === 'pago';
      const paidDateStr: string | undefined = inst.paid_at || inst.paid_date;
      if (!isPaid || !paidDateStr) continue;

      try {
        const paidDate = parseISO(paidDateStr.substring(0, 10));
        if (!isValid(paidDate) || !isWithinInterval(paidDate, interval)) continue;

        const amount = sanitizeCurrency(inst.amount);
        incomes += amount;
        transactions.push({
          id: `${order.id}-${inst.id ?? inst.index ?? Math.random()}`,
          date: paidDateStr.substring(0, 10),
          description: `PGTO OS #${String(order.id).slice(-6)} - ${order.client}`,
          type: 'income',
          amount,
          method: inst.payment_method ?? inst.method ?? 'Sistema',
          origin: 'SISTEMA (OS)',
          originalId: order.id,
        });
      } catch {
        // Ignora datas corrompidas silenciosamente (não propaga para o usuário)
        continue;
      }
    }
  }

  // ── Processamento de Contas a Pagar ──────────────────────────────────────
  const groups: Record<string, GroupedPayable> = {};
  for (const payable of payables as any[]) {
    if (payable.status !== 'paid') totalPayables += sanitizeCurrency(payable.amount);
    const gid: string = payable.groupId ?? payable.id;
    if (!groups[gid]) {
      groups[gid] = {
        groupId: gid,
        supplier: payable.supplier,
        description: payable.description,
        installments: [],
        totalAmount: 0,
        allPaid: true,
      };
    }
    groups[gid].installments.push(payable);
    groups[gid].totalAmount += sanitizeCurrency(payable.amount);
    if (payable.status !== 'paid') groups[gid].allPaid = false;
  }

  // ── Processamento de Lançamentos Manuais ─────────────────────────────────
  for (const entry of cashflowManual as any[]) {
    try {
      const entryDate = parseISO(entry.date);
      if (!isValid(entryDate) || !isWithinInterval(entryDate, interval)) continue;

      const amount = sanitizeCurrency(entry.amount);
      if (entry.type === 'income') incomes += amount;
      else expenses += amount;

      transactions.push({
        id: entry.id,
        date: entry.date,
        description: entry.description,
        type: entry.type,
        amount,
        method: entry.method ?? 'Manual',
        origin: entry.origin ?? 'MANUAL',
      });
    } catch {
      continue;
    }
  }

  // Ordena por data decrescente
  transactions.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  const totalOrdersValue = monthlyOrders.reduce((acc, o) => acc + o.calculatedTotal, 0);

  return {
    transactions,
    monthlyOrders,
    groupedPayables: Object.values(groups),
    kpis: {
      incomes,
      expenses,
      net: incomes - expenses,
      receivables,
      payables: totalPayables,
      totalOrdersValue,
    },
    meta: {
      startDate,
      endDate,
      totalDays: differenceInDays(endDate, startDate) + 1,
    },
  };
}
