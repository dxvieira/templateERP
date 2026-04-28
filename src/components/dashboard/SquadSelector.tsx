'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Users, Crown, Save, Loader2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { getAllEmployees, getEmployeeById } from '@/services/squadService';
import { AvatarStack } from '@/components/ui/AvatarStack';
import type { Employee } from '@/types/squad';

interface SquadSelectorProps {
  /** Dados da OS para atribuição */
  order: { id: string; client: string; status: string; assigned_to?: string[]; lead_operator?: string };
  /** Controle de visibilidade */
  isOpen: boolean;
  /** Callback de fechamento */
  onClose: () => void;
}

/**
 * SquadSelector — Modal de atribuição de equipe a uma OS.
 *
 * Features:
 * - Quick-Tags: Seleção por clique em avatares de colaboradores
 * - Smart Squad: Sugestão automática baseada no status da OS
 * - Lead Selector: Definição de líder operacional dentre os selecionados
 * - Zero-CLS: Layout com dimensões pré-determinadas
 */
export function SquadSelector({ order, isOpen, onClose }: SquadSelectorProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const allEmployees = useMemo(() => getAllEmployees(), []);

  const [selectedIds, setSelectedIds] = useState<string[]>(order.assigned_to || []);
  const [leadId, setLeadId] = useState<string>(order.lead_operator || '');
  const [isSaving, setIsSaving] = useState(false);

  // Reseta estado quando a modal abre com dados novos
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(order.assigned_to || []);
      setLeadId(order.lead_operator || '');
    }
  }, [isOpen, order.assigned_to, order.lead_operator]);

  const toggleEmployee = useCallback((empId: string) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(empId);
      const next = isSelected ? prev.filter(id => id !== empId) : [...prev, empId];

      // Se removeu o lead, resetar
      if (isSelected && empId === leadId) {
        setLeadId(next[0] || '');
      }
      // Se é o primeiro selecionado, definir como lead
      if (!isSelected && next.length === 1) {
        setLeadId(empId);
      }

      return next;
    });
  }, [leadId]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);

    try {
      await updateDoc(doc(firestore, 'orders', order.id), {
        assigned_to: selectedIds,
        lead_operator: leadId || (selectedIds[0] ?? ''),
      });
      toast({ title: 'Equipe Atribuída', description: `${selectedIds.length} colaborador(es) vinculados à OS #${order.id}.` });
      onClose();
    } catch (err: any) {
      console.error('[SQUAD] Erro ao salvar atribuição:', err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atribuir equipe.' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEmployees = useMemo(() => {
    return selectedIds.map(id => getEmployeeById(id)).filter(Boolean) as Employee[];
  }, [selectedIds]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="bg-[#09090b] w-full max-w-3xl border border-white/5 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden relative"
        >
          {/* ── Background Glow ──────────────────────────────────────── */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[100px] bg-primary/10 blur-[100px] pointer-events-none" />

          {/* ── Header ────────────────────────────────────────────── */}
          <div className="p-8 border-b border-white/5 bg-zinc-900/20 backdrop-blur-xl flex items-center justify-between relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,95,31,0.15)] shrink-0">
                <Users size={24} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">
                  Definição de Equipe
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded uppercase tracking-tighter">
                    OS #{order.id?.slice(-6)}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest truncate">
                    • {order.client}
                  </span>
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-primary border border-primary/20 ml-2">
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-3 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 shrink-0 ml-4">
              <X size={24} />
            </button>
          </div>

          {/* ── Content ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">


            {/* All Employees — Quick Tags */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Operadores e Liderança ({allEmployees.length})</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {allEmployees.map(emp => {
                  const isSelected = selectedIds.includes(emp.id);
                  const isLead = emp.id === leadId;
                  
                  return (
                    <button
                      key={emp.id}
                      onClick={() => toggleEmployee(emp.id)}
                      className={cn(
                        'group relative flex items-center gap-3 p-3 rounded-[1.5rem] border transition-all duration-300 overflow-hidden',
                        isSelected
                          ? 'border-white/20 bg-white/5 shadow-lg scale-[1.02]'
                          : 'border-white/5 bg-[#0c0c0e] hover:border-white/10 hover:bg-[#111114]'
                      )}
                    >
                      {/* Avatar circle */}
                      <div
                        className={cn(
                          'w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black transition-all border-2',
                          isSelected
                            ? 'border-transparent shadow-[0_0_15px_currentColor]'
                            : 'border-white/5 group-hover:border-white/10'
                        )}
                        style={{
                          backgroundColor: isSelected ? emp.color : `${emp.color}15`,
                          color: isSelected ? '#000' : emp.color,
                        }}
                      >
                        {emp.initials}
                      </div>

                      <div className="flex flex-col items-start min-w-0">
                        <span className={cn("text-[11px] font-black uppercase tracking-wide truncate w-full text-left transition-colors", isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-200")}>
                          {emp.name}
                        </span>
                      </div>

                      {/* Lead crown indicator */}
                      {isLead && isSelected && (
                        <div className="absolute top-2 right-3 opacity-80">
                          <Crown size={12} className="text-yellow-500 fill-yellow-500" />
                        </div>
                      )}

                      {/* Selection highlight border */}
                      {isSelected && (
                        <div className="absolute inset-0 border-2 rounded-[1.5rem] pointer-events-none opacity-30" style={{ borderColor: emp.color }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lead Selector */}
            {selectedIds.length > 1 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Crown size={12} className="fill-yellow-500" />
                    Definir Líder Operacional
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {selectedEmployees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => setLeadId(emp.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all',
                        emp.id === leadId
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)] scale-105'
                          : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                      )}
                    >
                      <Crown size={12} className={emp.id === leadId ? 'fill-yellow-500' : ''} />
                      {emp.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────── */}
          <div className="p-8 border-t border-white/5 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 backdrop-blur-md">
            
            {/* Live Preview of Squad */}
            <div className="flex flex-col items-center sm:items-start w-full sm:w-auto">
              {selectedIds.length > 0 ? (
                <>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 text-center sm:text-left">Squad Configurado</p>
                  <div className="flex items-center gap-3 bg-[#09090b] px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                    <AvatarStack employeeIds={selectedIds} max={5} size="md" />
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest border-l border-white/10 pl-3">
                      {selectedIds.length} MEMBRO{selectedIds.length > 1 ? 'S' : ''}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} /> Selecione Operadores
                </div>
              )}
            </div>

            <div className="flex w-full sm:w-auto gap-3">
              <button
                onClick={onClose}
                className="py-4 px-6 rounded-2xl border border-white/10 text-zinc-400 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 hover:text-white transition-all min-w-[120px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || selectedIds.length === 0}
                className="flex-1 sm:flex-none py-4 px-8 rounded-2xl bg-primary text-black font-black uppercase text-[11px] tracking-widest hover:bg-white transition-all shadow-[0_0_30px_rgba(255,95,31,0.3)] hover:shadow-[0_0_40px_rgba(255,95,31,0.5)] disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 active:scale-95"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Salvando...' : 'Confirmar Squad'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
