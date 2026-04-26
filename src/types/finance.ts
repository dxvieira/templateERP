// types/finance.ts
// Contrato de dados imutável para o Motor de Faturamento Industrial

/**
 * DTO para requisições de relatório baseadas em intervalo de datas.
 * Substitui o modelo de seleção discreta (mês único) por um range explícito.
 *
 * @property startDate - Data de início no formato ISO (YYYY-MM-DD). Estritamente <= endDate.
 * @property endDate   - Data de fim no formato ISO (YYYY-MM-DD). Estritamente >= startDate.
 *
 * @example
 * const range: ReportRangeRequest = {
 *   startDate: '2026-01-01',
 *   endDate:   '2026-03-31',
 * };
 */
export interface ReportRangeRequest {
  /** ISO Date string (YYYY-MM-DD) — início do intervalo de análise */
  startDate: string;
  /** ISO Date string (YYYY-MM-DD) — fim do intervalo de análise */
  endDate: string;
}

/**
 * Resultado da validação de um ReportRangeRequest.
 * Padrão Result<T> para evitar exceções não tratadas.
 */
export type RangeValidationResult =
  | { valid: true; startDate: Date; endDate: Date }
  | { valid: false; code: 'INVALID_FORMAT' | 'RANGE_INVERTED' | 'RANGE_EMPTY' | 'RANGE_TOO_WIDE'; message: string };

export type PaymentMethod = 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Boleto' | 'Transferência';

export type InstallmentStatus = 'pending' | 'paid' | 'overdue';

export interface Installment {
  id: string;           // UUID para identificação única
  index: number;        // 0 = Entrada (Down Payment), 1..n = Parcelas
  amount: number;       // Valor em centavos ou float
  due_date: string;     // ISO Date string (YYYY-MM-DD)
  status: InstallmentStatus;
  isEntry: boolean;     // Flag para Entrada (Down Payment)
  payment_method: PaymentMethod;
  paid_at?: string;     // ISO Timestamp de liquidação
  paid_by?: string;     // E-mail do usuário que processou
  transaction_ref?: string; // Referência externa (maquininha, gateway)
}

export interface FinancialSummary {
  totalContract: number;
  totalLiquidated: number;
  totalDeficit: number;
  installmentCount: number;
}
