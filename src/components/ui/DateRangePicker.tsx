'use client';

import React from 'react';
import { Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportRangeRequest, RangeValidationResult } from '@/types/finance';
import { validateReportRange } from '@/services/reportService';

interface DateRangePickerProps {
  /** Valor atual do intervalo */
  value: ReportRangeRequest;
  /** Callback acionado ao aplicar um novo intervalo válido */
  onChange: (range: ReportRangeRequest) => void;
  /** Callback acionado para erros de validação — permite exibição externa */
  onValidationError?: (error: RangeValidationResult & { valid: false }) => void;
  className?: string;
}

/**
 * DateRangePicker — Componente de Seleção de Intervalo de Datas.
 *
 * Responsabilidades:
 *  - Renderizar dois inputs de data (início e fim)
 *  - Executar validação via `validateReportRange` (FMEA Gate) antes de propagar
 *  - Emitir `onChange` SOMENTE para ranges válidos
 *  - Emitir `onValidationError` para erros — nunca lança exceções para a UI
 *
 * @example
 * <DateRangePicker
 *   value={{ startDate: '2026-01-01', endDate: '2026-03-31' }}
 *   onChange={(range) => setReportRange(range)}
 *   onValidationError={(err) => toast({ description: err.message, variant: 'destructive' })}
 * />
 */
export function DateRangePicker({ value, onChange, onValidationError, className }: DateRangePickerProps) {
  const handleChange = (field: keyof ReportRangeRequest, newValue: string) => {
    const newRange: ReportRangeRequest = { ...value, [field]: newValue };

    // Só valida se ambos os campos estiverem preenchidos
    if (!newRange.startDate || !newRange.endDate) {
      onChange(newRange);
      return;
    }

    const validation = validateReportRange(newRange);

    if (!validation.valid) {
      // Retorna o estado local sem propagar para cima — evita que o pai renderize dados inválidos
      onValidationError?.(validation);
      return;
    }

    onChange(newRange);
  };

  // Indicação visual inline de erro imediato
  const isInverted =
    value.startDate &&
    value.endDate &&
    value.startDate > value.endDate;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Start Date */}
      <div className="relative group">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={14} />
        <input
          type="date"
          value={value.startDate}
          max={value.endDate || undefined}
          onChange={(e) => handleChange('startDate', e.target.value)}
          className={cn(
            'bg-zinc-900 border rounded-xl py-2.5 pl-9 pr-3 text-white text-xs font-black outline-none transition-all cursor-pointer',
            isInverted
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-zinc-800 focus:border-primary',
          )}
          title="Data de início"
        />
      </div>

      {/* Separator */}
      {isInverted ? (
        <AlertTriangle size={14} className="text-red-500 shrink-0 animate-pulse" />
      ) : (
        <ArrowRight size={14} className="text-zinc-600 shrink-0" />
      )}

      {/* End Date */}
      <div className="relative group">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={14} />
        <input
          type="date"
          value={value.endDate}
          min={value.startDate || undefined}
          onChange={(e) => handleChange('endDate', e.target.value)}
          className={cn(
            'bg-zinc-900 border rounded-xl py-2.5 pl-9 pr-3 text-white text-xs font-black outline-none transition-all cursor-pointer',
            isInverted
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-zinc-800 focus:border-primary',
          )}
          title="Data de fim"
        />
      </div>
    </div>
  );
}
