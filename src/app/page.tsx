'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Layers, CheckCircle2 } from 'lucide-react';

import { useOrders } from '@/hooks/use-orders';
import { useUser } from '@/firebase';

import { ProductionHub } from '@/components/dashboard/ProductionHub';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { WeeklyTargetCard } from '@/components/dashboard/WeeklyTargetCard';
import { OrderFormModal } from '@/components/dashboard/OrderFormModal';

/** Skeleton shimmer para cards durante carregamento */
function OrderCardSkeleton() {
  return (
    <div className="w-full bg-[#0d0d0f] border border-white/5 rounded-xl p-5 space-y-4 overflow-hidden relative">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite]
        bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
      <div className="flex items-center gap-2.5">
        <div className="w-16 h-4 bg-zinc-900 rounded-md" />
        <div className="w-20 h-3 bg-zinc-900 rounded-full" />
      </div>
      <div className="w-2/3 h-4 bg-zinc-900 rounded-md" />
      <div className="pt-3 border-t border-white/5 space-y-2">
        <div className="w-1/2 h-2 bg-zinc-900 rounded-full" />
        <div className="w-full h-[3px] bg-zinc-900 rounded-full" />
      </div>
    </div>
  );
}

/** Separador de seção com label */
function SectionHeader({
  icon: Icon,
  label,
  count,
  color = 'text-zinc-500',
  dotColor = '#FF5F1F',
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color?: string;
  dotColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-1 pb-5 border-b border-white/5">
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}60` }}
      />
      <Icon size={13} className={color} strokeWidth={2.5} />
      <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${color}`}>
        {label}
      </span>
      <span
        className="ml-auto text-[9px] font-black font-mono px-2 py-0.5 rounded-full border"
        style={{
          color: dotColor,
          backgroundColor: `${dotColor}12`,
          borderColor: `${dotColor}25`,
        }}
      >
        {count}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { orders, stats, isLoading } = useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  useEffect(() => {
    if (!isUserLoading && !user) router.replace('/login');
  }, [user, isUserLoading, router]);

  const activeOrders = useMemo(() =>
    orders
      .filter(o => !['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => {
        const dateA = a.delivery_date || a.deliveryDate || '9999-12-31';
        const dateB = b.delivery_date || b.deliveryDate || '9999-12-31';
        return dateA.localeCompare(dateB);
      }),
    [orders],
  );

  const completedOrders = useMemo(() =>
    orders
      .filter(o => ['Concluído', 'Entregue'].includes(o.status))
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)),
    [orders],
  );

  const handleEditOrder = useCallback((order: any) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-10 mt-14 md:mt-0 pb-24">

      {/* ── Top Grid: Hub + Meta ─────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5"
      >
        <div className="lg:col-span-8 bg-[#0d0d0f] border border-white/5 rounded-2xl p-8 relative overflow-hidden
          hover:border-white/8 transition-colors duration-300">
          <ProductionHub stats={stats} />
        </div>
        <div className="lg:col-span-4 bg-[#0d0d0f] border border-white/5 rounded-2xl p-8 flex flex-col
          justify-between relative overflow-hidden group hover:border-white/8 transition-colors duration-300">
          <WeeklyTargetCard pendingCount={stats.weeklyGoalCount} />
        </div>
      </motion.section>

      {/* ── Fluxo Ativo ──────────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeader
          icon={Layers}
          label="Fluxo de Produção"
          count={activeOrders.length}
          color="text-zinc-400"
          dotColor="#FF5F1F"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
          {isLoading ? (
            // Skeleton de carregamento — 6 placeholders
            Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)
          ) : activeOrders.length > 0 ? (
            activeOrders.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} onClick={handleEditOrder} />
            ))
          ) : (
            <div className="col-span-full py-16 text-center border border-dashed border-white/5 rounded-2xl">
              <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.4em]">
                Fila Nominal Desimpedida
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Pedidos Concluídos ────────────────────────────────────────── */}
      {completedOrders.length > 0 && (
        <section className="space-y-5 pt-2">
          <SectionHeader
            icon={CheckCircle2}
            label="Concluídos"
            count={completedOrders.length}
            color="text-zinc-600"
            dotColor="#4ade80"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
            {completedOrders.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} onClick={handleEditOrder} />
            ))}
          </div>
        </section>
      )}

      <OrderFormModal
        isOpen={isModalOpen}
        order={editingOrder}
        onClose={() => { setIsModalOpen(false); setEditingOrder(null); }}
      />
    </div>
  );
}
