
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, serverTimestamp, updateDoc, onSnapshot, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirestore, useUser, useFunctions } from '@/firebase';
import { 
  X, Save, Plus, Trash2, Box, 
  Calculator, Loader2,
  History, FileText,
  Printer, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ClientSearchField } from './ClientSearchField';
import { Client } from '../../types/client';
import { InstallmentManager } from './InstallmentManager';
import { Installment } from '../../types/finance';
import { dbService } from '@/services/db-service';

interface AdminOrderModalProps {
  order?: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminOrderModal({ order, isOpen, onClose }: AdminOrderModalProps) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'operacional' | 'financeiro'>('operacional');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasFiscalAccess, setHasFiscalAccess] = useState(false);

  // Estados dos Campos
  const [client, setClient] = useState('');
  const [status, setStatus] = useState('Arte');
  const [emissionDate, setEmissionDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const unlocked = sessionStorage.getItem('admin_authenticated') === 'true' || 
                       sessionStorage.getItem('page_unlocked') === 'true';
      setIsUnlocked(unlocked);

      if (user) {
        user.getIdTokenResult().then(result => {
          setHasFiscalAccess(!!result.claims.admin || !!result.claims.financeiro);
        }).catch(() => setHasFiscalAccess(false));
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen || !order?.id || !firestore) return;

    const docRef = doc(firestore, 'orders', order.id);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setClient(data.client || '');
        setStatus(data.status || 'Arte');
        setEmissionDate(data.emission_date || data.emissionDate || '');
        setDeliveryDate(data.delivery_date || data.deliveryDate || '');
        setObservations(data.observations || '');
        setItems(data.items || [{ desc: '', quantity: 1, unitValue: 0 }]);
        setInstallments(data.installments || []);
      }
    });

    return () => unsubscribe();
  }, [isOpen, order?.id, firestore]);

  useEffect(() => {
    if (isOpen && !order) {
      setClient('');
      setStatus('Arte');
      setEmissionDate(new Date().toISOString().split('T')[0]);
      setDeliveryDate('');
      setObservations('');
      setItems([{ desc: '', quantity: 1, unitValue: 0 }]);
      setInstallments([]);
      setActiveTab('operacional');
    }
  }, [isOpen, order]);

  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitValue || 0)), 0);
  }, [items]);

  const amountPaid = useMemo(() => {
    return (installments as Installment[])
      .filter(i => i.status === 'paid' || (i.status as any) === 'pago')
      .reduce((acc, i) => acc + Number(i.amount), 0);
  }, [installments]);

  const balanceDue = totalValue - amountPaid;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de Conexão', description: 'O banco de dados não foi inicializado corretamente.' });
      return;
    }
    
    setLoading(true);

    try {
      const isNew = !order;
      let finalId = order?.id;
      let oldId: string | null = null;

      // Lógica de ID Sequencial (00001...)
      if (isNew) {
        finalId = await dbService.getNextOrderNumber(firestore);
      } else if (order?.id && order.id.length !== 5) {
        // Migração do pedido aberto (se o ID for legado/diferente de 5 dígitos)
        // Isso atende ao pedido do usuário: "o pedido que já tem aberto, pode ser o 00001"
        oldId = order.id;
        finalId = await dbService.getNextOrderNumber(firestore);
      }

      const docRef = doc(firestore, 'orders', finalId);

      // Payload robusto (snake_case para DB antigo, camelCase para compatibilidade)
      const payload = {
        id: finalId,
        client: client,
        status: status,
        emission_date: emissionDate,
        emissionDate: emissionDate,
        delivery_date: deliveryDate,
        deliveryDate: deliveryDate,
        observations: observations,
        items: items,
        total_value: totalValue,
        totalValue: totalValue,
        amount_paid: amountPaid,
        amountPaid: amountPaid,
        balance_due: balanceDue,
        balanceDue: balanceDue,
        installments: installments,
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : (order.createdAt ? { createdAt: order.createdAt } : {}))
      };

      // Se for migração, precisamos criar o novo e deletar o antigo
      if (oldId) {
        await setDoc(docRef, payload);
        await deleteDoc(doc(firestore, 'orders', oldId));
        toast({ 
          title: "Migração Concluída", 
          description: `OS #${oldId} migrada para a nova sequência: #${finalId}` 
        });
        onClose(); // Fecha para evitar inconsistência de ID no snapshot
      } else {
        await setDoc(docRef, payload, { merge: true });
        toast({ 
          title: "Registro Salvo", 
          description: `Protocolo #${finalId} atualizado com sucesso.` 
        });
        if (isNew) onClose();
      }
    } catch (err: any) {
      console.error("Erro ao salvar OS:", err);
      toast({ 
        variant: "destructive", 
        title: "Falha na Gravação", 
        description: err.message || "Erro desconhecido ao gerar numeração ou salvar." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintOP = async () => {
    if (!order?.id || !firestore) return;
    
    // Log de auditoria de impressão
    const orderRef = doc(firestore, 'orders', order.id);
    updateDoc(orderRef, {
      lastPrintedAt: serverTimestamp(),
      printLogs: (order.printLogs || []).concat({
        date: new Date().toISOString(),
        user: user?.email || 'Sistema'
      })
    });

    // Busca dados do cliente para o cabeçalho
    let clientInfo = { doc: '---', tel: '---', address: '---' };
    try {
      const q = query(collection(firestore, 'clients'), where('name', '==', client));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const cData = qSnap.docs[0].data();
        clientInfo = {
          doc: cData.cpfCnpj || '---',
          tel: cData.mobile || cData.landline || '---',
          address: cData.address || '---'
        };
      }
    } catch (e) { console.error("Falha ao buscar detalhes do cliente", e); }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-8015019704-68176.firebasestorage.app/o/logo%20IMPACTO.png?alt=media&token=c481fc0a-08b9-4613-bb67-d4052b3a39dd';
    const now = format(new Date(), "dd/MM/yyyy, HH:mm:ss");

    const html = `
      <html>
        <head>
          <title>OP #${order.id.slice(-6)} - IMPACTO</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; height: auto; }
            body { font-family: 'Inter', sans-serif; color: #000; background: #ffffff !important; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-container { padding: 10px; max-height: 257mm; overflow: hidden; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
            .header-info { text-align: right; }
            .header-info h1 { margin: 0; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
            .header-info p { margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #333; }
            .client-card { display: flex; gap: 20px; margin-bottom: 20px; }
            .client-box { flex: 2; border: 1.5px solid #000; border-radius: 12px; padding: 12px 15px; }
            .client-label { font-size: 9px; font-weight: 900; color: #666; text-transform: uppercase; margin-bottom: 6px; }
            .client-name { font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0 0 8px; }
            .client-details { font-size: 12px; font-weight: 500; }
            .date-box { border: 1.5px solid #000; border-radius: 12px; padding: 10px; text-align: center; min-width: 140px; }
            .date-label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #666; margin-bottom: 4px; }
            .date-value { font-size: 16px; font-weight: 900; }
            .section-title { background: #fff !important; padding: 8px 15px; font-size: 11px; font-weight: 900; text-transform: uppercase; border: 1.5px solid #000; border-radius: 10px 10px 0 0; display: flex; align-items: center; gap: 8px; }
            .items-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; border-radius: 0 0 10px 10px; overflow: hidden; margin-bottom: 25px; }
            .items-table th { background: #fff !important; padding: 10px; font-size: 10px; font-weight: 900; border-bottom: 1.5px solid #000; border-right: 1.5px solid #000; text-transform: uppercase; }
            .items-table td { padding: 12px; font-size: 12px; border-bottom: 1px solid #ccc; border-right: 1.5px solid #000; font-weight: 700; }
            .items-table td:last-child, .items-table th:last-child { border-right: none; }
            .conf-circle { width: 16px; height: 16px; border: 1.5px solid #000; border-radius: 50%; margin: 0 auto; }
            .bottom-grid { display: grid; grid-template-cols: 1fr 1.2fr; gap: 25px; }
            .notes-area { border: 1.5px solid #ccc; border-radius: 15px; padding: 15px; min-height: 120px; font-size: 12px; }
            .workflow-step { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
            .step-circle { width: 16px; height: 16px; border: 1.5px solid #000; border-radius: 50%; margin-top: 2px; }
            .step-info { flex: 1; }
            .step-label { font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
            .step-lines { display: flex; gap: 15px; }
            .line-box { border-bottom: 1px solid #ccc; font-size: 8px; font-weight: 700; color: #999; padding-bottom: 2px; flex: 1; }
            .signatures { display: flex; justify-content: space-around; margin-top: 30px; }
            .sig-box { width: 250px; border-top: 1.5px solid #000; text-align: center; padding-top: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; }
            .footer { margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; font-weight: 700; text-transform: uppercase; }
            @media print { 
              html, body { height: auto !important; overflow: visible !important; }
              .page-container { page-break-after: avoid; page-break-inside: avoid; }
              .header { border-bottom-width: 3px; }
              .notes-area { border-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
          <div class="header">
            <img src="${logoUrl}" style="height: 60px; max-width: 200px; object-fit: contain;">
            <div class="header-info">
              <h1>Ordem de Produção</h1>
              <p>OS #${order.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          <div class="client-card">
            <div class="client-box">
              <div class="client-label">Dados do Parceiro / Cliente</div>
              <h2 class="client-name">${client}</h2>
              <div class="client-details">
                <p style="margin:0"><strong>DOC:</strong> ${clientInfo.doc} <span style="margin-left:30px"><strong>TEL:</strong> ${clientInfo.tel}</span></p>
                <p style="margin:8px 0 0"><strong>ENDEREÇO:</strong> ${clientInfo.address}</p>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px">
              <div class="date-box">
                <div class="date-label">Emissão</div>
                <div class="date-value">${emissionDate ? format(new Date(emissionDate + 'T12:00:00'), 'dd/MM/yyyy') : '--/--/----'}</div>
              </div>
              <div class="date-box" style="border-width: 2px">
                <div class="date-label">Prazo de Entrega</div>
                <div class="date-value">${deliveryDate ? format(new Date(deliveryDate + 'T12:00:00'), 'dd/MM/yyyy') : '--/--/----'}</div>
              </div>
            </div>
          </div>

          <div class="section-title">📦 Descrição dos Serviços e Materiais</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 60px">Qtd</th>
                <th style="width: 80px">Cód</th>
                <th style="text-align: left">Especificação Técnica</th>
                <th style="width: 70px">Conf.</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="text-align: center; font-size: 16px">${item.quantity}</td>
                  <td style="text-align: center; color: #999">--</td>
                  <td style="text-transform: uppercase">${item.desc}</td>
                  <td><div class="conf-circle"></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="bottom-grid">
            <div>
              <div class="client-label" style="margin-bottom: 10px">Notas de Produção</div>
              <div class="notes-area">
                ${items.map((item, i) => `
                  <div style="margin-bottom: 15px">
                    <div style="font-weight: 900; text-transform: uppercase; font-size: 11px">${i+1}. ${item.desc}</div>
                    <div style="color: #555; font-style: italic; margin-top: 4px">${item.observation || item.observacao || 'Sem observações específicas.'}</div>
                  </div>
                `).join('')}
                ${observations ? `<div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px; font-weight: 700">${observations}</div>` : ''}
              </div>
            </div>
            <div>
              <div class="client-label" style="text-align: right; margin-bottom: 10px">Controle de Etapa / Fluxo</div>
              ${['Arte Final', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Qualidade'].map(step => `
                <div class="workflow-step">
                  <div class="step-circle"></div>
                  <div class="step-info">
                    <div class="step-label">${step}</div>
                    <div class="step-lines">
                      <div class="line-box">RESPONSÁVEL:</div>
                      <div class="line-box" style="max-width: 100px">DATA:</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="signatures">
            <div class="sig-box">Responsável Produção</div>
            <div class="sig-box">Conferência de Qualidade</div>
          </div>

          <div class="footer">
            <span>Sistema Impacto • Cloud Gestão Industrial</span>
            <span>Gerado em: ${now}</span>
          </div>
          </div><!-- end .page-container -->
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 150);
            };
            setTimeout(function() { window.print(); }, 3000);
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleEmitNFe = async () => {
    if (!order?.id || !functions) return;
    setLoading(true);
    const emitNFeFunc = httpsCallable(functions, 'emitNFe');
    try {
      await emitNFeFunc({ orderId: order.id });
      toast({ title: "NF-e Solicitada", description: "O processamento fiscal foi iniciado." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro Fiscal", description: error.message });
    } finally { setLoading(false); }
  };

  const handleDeleteOrder = async () => {
    if (!order?.id || !firestore) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'orders', order.id));
      toast({ title: "OS Cancelada", description: "O protocolo foi removido permanentemente do sistema." });
      setShowDeleteModal(false);
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro na exclusão", description: "Houve um problema ao apagar a OS. Verifique as permissões." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClientSelection = (selectedClient: Client) => {
    setClient(selectedClient.name);
    
    let note = '';
    if (selectedClient.pricingTier) {
      note += `[CLIENTE ${selectedClient.pricingTier.toUpperCase()}] `;
    }
    if (selectedClient.defaultTechnicalNote) {
      note += selectedClient.defaultTechnicalNote;
    }

    if (note) {
      setObservations(prev => prev ? `${prev}\n\n${note}` : note);
    }

    toast({ title: "Cliente Carregado", description: "Os dados padrão do cliente foram carregados na pauta." });
  };

  if (!isOpen) return null;

  const canShowAdminData = isUnlocked || hasFiscalAccess;
  const labelClass = "text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#09090b] w-full max-w-5xl border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20"><Calculator size={20} /></div>
            <div>
              <h2 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">IMPACTO DIGITAL</h2>
              <p className="text-sm font-black text-white uppercase tracking-tight">OS #{order?.id || 'NOVA'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {canShowAdminData && (
               <div className="flex items-center gap-6 border-r border-zinc-800 pr-6 mr-2">
                 <button onClick={handleEmitNFe} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50">
                   {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                   <span className="text-[10px] font-black uppercase">Emitir NF-e</span>
                 </button>
                 <div className="text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-black">Saldo de Contrato</p>
                    <p className={cn("text-lg font-black font-mono leading-none mt-1", balanceDue > 0 ? "text-red-500" : "text-emerald-500")}>
                      {balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                 </div>
               </div>
             )}
             <button onClick={handlePrintOP} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-white hover:text-black transition-all font-black text-[10px] uppercase">
               <Printer size={18} /> Imprimir OP
             </button>
             <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20}/></button>
          </div>
        </div>

        <div className="flex bg-zinc-900/30 border-b border-zinc-800">
           <button onClick={() => setActiveTab('operacional')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'operacional' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500")}>Produção e Arte</button>
           <button onClick={() => setActiveTab('financeiro')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2", activeTab === 'financeiro' ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500")}>Financeiro e Parcelas</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050505]">
          <form id="adminOrderForm" onSubmit={handleSave} className="space-y-8">
            {activeTab === 'operacional' ? (
              <div className="space-y-8">
                <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Cliente / Projeto</label>
                    <ClientSearchField 
                      initialValue={client}
                      onClientSelect={handleClientSelection}
                      className={inputClass}
                    />
                    <input type="hidden" required value={client} />
                  </div>
                  <div>
                    <label className={labelClass}>Status da Pauta</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
                       {['Arte', 'Serralheria', 'Impressão', 'Acabamento', 'Instalação', 'Concluído'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Promessa de Entrega</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass} />
                  </div>
                </section>

                <section className="space-y-4">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] flex items-center gap-2"><Box size={14}/> Itens Técnicos</h3>
                      <button type="button" onClick={() => setItems([...items, { desc: '', quantity: 1, unitValue: 0 }])} className="bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-[9px] font-black uppercase transition-all flex items-center gap-1"><Plus size={12}/> Adicionar Material</button>
                   </div>
                   <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
                           <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                              <div className="md:col-span-6"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Descrição do Serviço/Produto</label><input value={item.desc} onChange={e => { const n = [...items]; n[index].desc = e.target.value; setItems(n); }} className={`${inputClass} p-2 text-xs`} /></div>
                              <div className="md:col-span-2"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Qtd</label><input type="number" value={item.quantity} onChange={e => { const n = [...items]; n[index].quantity = Number(e.target.value); setItems(n); }} className={`${inputClass} p-2 text-center text-xs`} /></div>
                              <div className="md:col-span-2"><label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Unitário</label><input type="number" step="0.01" value={item.unitValue} onChange={e => { const n = [...items]; n[index].unitValue = Number(e.target.value); setItems(n); }} className={`${inputClass} p-2 text-right text-xs`} /></div>
                              <div className="md:col-span-2 flex justify-end items-end h-full"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>
                           </div>
                           <div className="w-full">
                              <label className="text-[8px] text-zinc-600 uppercase font-black mb-1 block">Observação Técnica / Detalhes</label>
                              <textarea value={item.observation || ''} onChange={e => { const n = [...items]; n[index].observation = e.target.value; setItems(n); }} className={`${inputClass} p-2 text-[10px] min-h-[60px]`} placeholder="Ex: Madeira nas laterais, Ilhós a cada 20cm..." />
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="space-y-2">
                   <label className={labelClass}>Observações Gerais de Produção</label>
                   <textarea value={observations} onChange={e => setObservations(e.target.value)} className={`${inputClass} min-h-[100px] text-xs`} placeholder="Instruções adicionais para a equipe de fábrica..." />
                </section>
              </div>
            ) : (
              <div className="space-y-10">
                <section className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 text-center">
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-4">Balancete do Protocolo</p>
                   <div className="flex flex-wrap justify-center gap-12">
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">Valor do Contrato</p><p className="text-3xl font-black text-white font-mono tracking-tighter">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">Montante Liquidado</p><p className="text-3xl font-black text-emerald-500 font-mono tracking-tighter">{amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      <div><p className="text-[9px] text-zinc-600 uppercase font-black">Déficit de Receita</p><p className="text-3xl font-black text-red-500 font-mono tracking-tighter">{balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                   </div>
                </section>
                <section className="space-y-4">
                   <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2 flex items-center gap-2"><History size={14}/> Cronograma de Faturamento</h3>
                   <InstallmentManager
                     orderId={order?.id || null}
                     totalValue={totalValue}
                     installments={installments as Installment[]}
                     onInstallmentsChange={(updated) => setInstallments(updated)}
                     readOnly={false}
                   />
                </section>
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row justify-between items-center gap-3">
           <div>
             {order?.id && (
                <button type="button" onClick={() => setShowDeleteModal(true)} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Excluir Pedido</button>
             )}
           </div>
           <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
             <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">Cancelar</button>
             <button 
               form="adminOrderForm" 
               type="submit" 
               disabled={loading} 
               className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(255,95,31,0.5)] disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
             >
               {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Gravar Registro Industrial</>}
             </button>
           </div>
        </div>

        <div className="py-3 px-6 bg-black flex items-center justify-center gap-2 border-t border-white/5 opacity-30">
           <ShieldCheck size={12} className="text-primary" />
           <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em]">Protocolo de Integridade Firestore SDK v9 Ativo</span>
        </div>
      </motion.div>

      <DeleteConfirmationModal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteOrder}
        orderId={order?.id}
      />
    </div>
  );
}
