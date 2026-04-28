'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getEmployeeById } from '@/services/squadService';

interface AvatarStackProps {
  /** Array de Employee IDs para renderizar */
  employeeIds: string[];
  /** Número máximo de avatares visíveis antes do "+N" */
  max?: number;
  /** Tamanho do avatar */
  size?: 'sm' | 'md' | 'lg';
  /** Se true, exibe badge "SEM EQUIPE" quando vazio */
  showEmpty?: boolean;
}

const SIZE_MAP = {
  sm: { circle: 'w-6 h-6', text: 'text-[7px]', overlap: '-ml-1.5', badge: 'text-[6px] px-1 py-0.5' },
  md: { circle: 'w-8 h-8', text: 'text-[8px]', overlap: '-ml-2', badge: 'text-[7px] px-1.5 py-0.5' },
  lg: { circle: 'w-10 h-10', text: 'text-[9px]', overlap: '-ml-2.5', badge: 'text-[8px] px-2 py-1' },
};

/**
 * AvatarStack — Avatares empilhados com iniciais coloridas.
 *
 * Zero-CLS: Todas as dimensões pré-determinadas pelo size prop.
 * Exibe até `max` avatares + indicador "+N" se houver excesso.
 */
export function AvatarStack({ employeeIds, max = 3, size = 'sm', showEmpty = false }: AvatarStackProps) {
  const styles = SIZE_MAP[size];

  const resolved = useMemo(() => {
    if (!employeeIds) return [];
    return employeeIds
      .map(id => getEmployeeById(id))
      .filter(Boolean) as NonNullable<ReturnType<typeof getEmployeeById>>[];
  }, [employeeIds ? employeeIds.join(',') : '']);

  if (resolved.length === 0) {
    if (!showEmpty) return null;
    return (
      <span className={cn(
        'rounded border border-zinc-800 bg-zinc-900/50 text-zinc-600 font-black uppercase tracking-widest',
        styles.badge
      )}>
        Sem equipe
      </span>
    );
  }

  const visible = resolved.slice(0, max);
  const remaining = resolved.length - max;

  return (
    <div className="flex items-center">
      {visible.map((emp, idx) => (
        <div
          key={emp.id}
          title={emp.name}
          className={cn(
            styles.circle,
            idx > 0 && styles.overlap,
            'rounded-full flex items-center justify-center font-black border-2 border-[#0d0d0f] ring-1 ring-white/10 transition-transform hover:scale-110 hover:z-10 cursor-default select-none'
          )}
          style={{
            backgroundColor: `${emp.color}20`,
            color: emp.color,
            zIndex: visible.length - idx,
          }}
        >
          <span className={styles.text}>{emp.initials}</span>
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={cn(
            styles.circle,
            styles.overlap,
            'rounded-full flex items-center justify-center font-black bg-zinc-800 text-zinc-400 border-2 border-[#0d0d0f]'
          )}
          style={{ zIndex: 0 }}
        >
          <span className={styles.text}>+{remaining}</span>
        </div>
      )}
    </div>
  );
}
