'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, query, orderBy, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Building2, 
  Mail,
  X,
  Save,
  Loader2,
  Trash2,
  ChevronRight,
  FileBadge,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ClientsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do Formulário (Dossiê Completo)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    zip: '',
    cpfCnpj: ''
  });

  // --- CARREGAR CLIENTES VIA HOOKS ---
  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'clients'), orderBy('name', 'asc'));
  }, [firestore, user]);

  const { data: clients, isLoading } = useCollection(clientsQuery);

  // --- FILTRO DE BUSCA ---
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.cpfCnpj && client.cpfCnpj.includes(searchTerm))
    );
  }, [clients, searchTerm]);

  // --- AÇÕES DO CRUD ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    
    setIsSubmitting(true);
    const clientRef = editingClient ? doc(firestore, 'clients', editingClient.id) : doc(collection(firestore, 'clients'));
    
    const payload = {
      ...formData,
      id: clientRef.id,
      updatedAt: serverTimestamp(),
      ...(editingClient ? {} : { createdAt: serverTimestamp() })
    };

    setDoc(clientRef, payload, { merge: true })
      .then(() => {
        toast({ title: editingClient ? "Dossiê Atualizado" : "Novo Parceiro Registrado" });
        closeModal();
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: clientRef.path,
          operation: editingClient ? 'update' : 'create',
          requestResourceData: payload
        }));
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (window.confirm("Tem certeza que deseja remover este parceiro da base permanentemente?")) {
      deleteDoc(doc(firestore, 'clients', id))
        .then(() => {
          toast({ title: "Parceiro Removido" });
          closeModal();
        })
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `clients/${id}`,
            operation: 'delete'
          }));
        });
    }
  };

  const openModal = (client: any = null) => {
    if (client) {
      setEditingClient(client);
      // Garantir que campos de objeto (como endereço estruturado) sejam convertidos em string ou ignorados para evitar erro de renderização
      const safeAddress = typeof client.address === 'object' 
        ? `${client.address.street || ''}, ${client.address.number || ''} ${client.address.neighborhood || ''}`.trim()
        : client.address || '';

      setFormData({ 
        name: client.name || '', 
        company: client.company || '', 
        phone: client.phone || '', 
        email: client.email || '',
        address: safeAddress,
        zip: client.zip || '',
        cpfCnpj: client.cpfCnpj || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', company: '', phone: '', email: '', address: '', zip: '', cpfCnpj: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden selection:bg-[#FF5F1F] selection:text-black">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-12 space-y-12 mt-16 md:mt-0 pb-32">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
             <div className="flex items-center gap-3 mb-3">
               <div className="p-2 bg-[#FF5F1F]/10 rounded-xl border border-[#FF5F1F]/20">
                 <Users size={18} className="text-[#FF5F1F]" />
               </div>
               <span className="text-[#FF5F1F] text-[10px] font-black uppercase tracking-[0.4em]">Hub de Parceiros</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
               Base de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5F1F] to-orange-600">Parceiros</span>
             </h1>
          </motion.div>
          
          <button 
            onClick={() => openModal()}
            className="
              group flex items-center gap-3 px-10 py-5 rounded-2xl 
              bg-[#FF5F1F] text-black font-black uppercase tracking-[0.2em] text-xs
              hover:bg-white hover:scale-[1.02] transition-all 
              shadow-[0_10px_30px_-5px_rgba(255,95,31,0.4)] active:scale-95
            "
          >
            <Plus size={20} strokeWidth={3} /> Novo Parceiro
          </button>
        </div>

        {/* --- BUSCA --- */}
        <div className="relative group max-w-4xl">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="text-zinc-600 group-focus-within:text-[#FF5F1F] transition-colors" size={24} />
          </div>
          <input 
            type="text"
            placeholder="Buscar por nome, empresa ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full bg-[#09090b] border border-zinc-800 rounded-[2rem] py-6 pl-16 pr-8
              text-white placeholder-zinc-700 outline-none transition-all duration-500
              focus:border-[#FF5F1F]/50 focus:shadow-[0_0_50px_-10px_rgba(255,95,31,0.15)]
              text-xl font-medium
            "
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-500 tracking-widest uppercase">
            {filteredClients.length} Localizados
          </div>
        </div>

        {/* --- GRID DE CARDS (Clique Único para Dossiê) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, idx) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                key={client.id}
                onClick={() => openModal(client)}
                className="
                  group relative bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-8
                  hover:border-[#FF5F1F]/40 hover:bg-zinc-900/40
                  transition-all duration-500 overflow-hidden cursor-pointer
                  hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(255,95,31,0.1)]
                "
              >
                {/* Indicador Lateral Neon */}
                <div className="absolute left-0 top-10 bottom-10 w-1.5 rounded-r-full bg-[#FF5F1F] opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_15px_#FF5F1F]" />

                {/* Header do Card */}
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex items-center gap-5 min-w-0">
                    {/* Avatar Iniciais */}
                    <div className="shrink-0 w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FF5F1F] font-black text-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                      {client.name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight group-hover:text-[#FF5F1F] transition-colors truncate">
                        {client.name}
                      </h3>
                      <div className="flex flex-col mt-1">
                        {client.company && (
                          <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-widest truncate">
                            <Building2 size={12} className="text-[#FF5F1F]" /> {client.company}
                          </p>
                        )}
                        {client.cpfCnpj && (
                          <p className="text-[9px] font-mono text-zinc-600 flex items-center gap-2 mt-0.5 truncate uppercase">
                            <FileBadge size={11} className="text-zinc-700" /> {client.cpfCnpj}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-zinc-800 group-hover:text-[#FF5F1F] group-hover:translate-x-1 transition-all" size={24} />
                </div>

                {/* Resumo de Contato */}
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                    <Phone size={16} className="text-zinc-700 group-hover:text-[#FF5F1F] transition-colors" />
                    <span className="truncate">{client.phone || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                    <Mail size={16} className="text-zinc-700 group-hover:text-[#FF5F1F] transition-colors" />
                    <span className="truncate">{client.email || 'Sem e-mail'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="col-span-full py-24 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#FF5F1F] animate-spin" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em]">Sincronizando Dossiês...</p>
            </div>
          )}

          {!isLoading && filteredClients.length === 0 && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] opacity-20">
              <Users size={64} className="mx-auto mb-6" />
              <p className="text-xl font-black uppercase tracking-widest text-zinc-500">Nenhum parceiro localizado</p>
            </div>
          )}
        </div>

        {/* --- MODAL DE DOSSIÊ COMPLETO --- */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={closeModal}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-2xl bg-[#0A0A0A] border border-white/5 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header do Modal */}
                <div className="flex items-center justify-between p-10 pb-6 border-b border-white/5 bg-white/[0.01]">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      {editingClient ? 'Detalhes do Parceiro' : 'Novo Parceiro'}
                      <div className="w-2 h-2 rounded-full bg-[#FF5F1F] animate-pulse shadow-[0_0_10px_rgba(255,95,31,1)]" />
                    </h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Dados Sincronizados em Tempo Real</p>
                  </div>
                  <button onClick={closeModal} className="p-3 bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <X size={24}/>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 pt-8 custom-scrollbar">
                  <form id="clientForm" onSubmit={handleSave} className="space-y-10">
                    
                    {/* Identificação Principal */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-[#FF5F1F] uppercase font-black tracking-[0.3em] ml-1">Nome Completo do Contato *</label>
                        <input 
                          required 
                          className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-[#FF5F1F] focus:bg-white/[0.05] outline-none transition-all" 
                          value={formData.name} 
                          onChange={e => setFormData({...formData, name: e.target.value})} 
                          placeholder="Ex: João Silva"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">CPF ou CNPJ</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-[#FF5F1F] outline-none transition-all font-mono" 
                            value={formData.cpfCnpj} 
                            onChange={e => setFormData({...formData, cpfCnpj: e.target.value})} 
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Empresa / Organização</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.company} 
                            onChange={e => setFormData({...formData, company: e.target.value})} 
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contato e Localização */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">WhatsApp / Telefone</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})} 
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">E-mail Corporativo</label>
                          <input 
                            type="email"
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            placeholder="parceiro@viscomm.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Endereço de Entrega</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.address} 
                            onChange={e => setFormData({...formData, address: e.target.value})} 
                            placeholder="Rua, Número, Bairro, Cidade"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">CEP</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.zip} 
                            onChange={e => setFormData({...formData, zip: e.target.value})} 
                            placeholder="00000-000"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer do Modal */}
                <div className="p-10 pt-6 border-t border-white/5 bg-white/[0.01] flex flex-col md:flex-row gap-4">
                  {editingClient && (
                    <button 
                      type="button" 
                      onClick={() => handleDelete(editingClient.id)} 
                      className="flex-1 py-5 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"
                    >
                      <Trash2 size={18} /> Remover Parceiro
                    </button>
                  )}
                  <div className="flex-[2] flex gap-4">
                    <button 
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      form="clientForm"
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-[2] py-5 rounded-2xl bg-[#FF5F1F] text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white transition-all flex justify-center items-center gap-3 shadow-[0_10px_30px_-5px_rgba(255,95,31,0.4)]"
                    >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Gravar Dossiê</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}