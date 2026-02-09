'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderId: string | null;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, orderId }: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Janela do Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#1E1E1E] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-destructive hover:shadow-[0_0_30px_rgba(255,0,0,0.2)]"
          >
            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 flex flex-col items-center text-center">
              {/* Ícone de Alerta */}
              <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>

              {/* Textos */}
              <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">
                Excluir Protocolo?
              </h2>
              <p className="text-xs text-zinc-400 uppercase tracking-widest leading-relaxed mb-8">
                Você tem certeza que deseja remover a OS <span className="text-white font-bold">#{orderId}</span>? 
                <br />Essa ação é irreversível.
              </p>

              {/* Botões */}
              <div className="flex flex-col w-full gap-3">
                <Button
                  onClick={onConfirm}
                  className="w-full h-14 bg-destructive text-white hover:bg-destructive/90 font-black uppercase tracking-widest rounded-2xl shadow-[0_0_15px_rgba(255,0,0,0.3)]"
                >
                  Confirmar Exclusão
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-12 text-zinc-400 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest rounded-2xl"
                >
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Rodapé Decorativo */}
            <div className="h-1 bg-destructive/20 w-full" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
