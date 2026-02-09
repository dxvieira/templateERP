
"use client"

import React from 'react';

/**
 * Spinner ultra-leve utilizando apenas CSS puro.
 * Sem dependências de bibliotecas de ícones para garantir boot imediato.
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,95,31,0.4)]" />
      </div>
    </div>
  );
}
