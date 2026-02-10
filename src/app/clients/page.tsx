
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
  MapPin, 
  MoreVertical, 
  Building2, 
  MessageCircle,
  Briefcase,
  X,
  Save,
  Loader2,
  Trash2
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

  // Estados do Formulário
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    address: ''
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
      client.company?.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (window.confirm("Tem certeza que deseja remover este cliente?")) {
      deleteDoc(doc(firestore, 'clients', id)).catch(() => {
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
      setFormData({ 
        name: client.name, 
        company: client.company || '', 
        phone: client.phone || '', 
        address: client.address || '' 
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', company: '', phone: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const getWhatsappLink = (phone: string) => {
    const cleanNum = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleanNum}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-12 space-y-12 mt-16 md:mt-0 pb-32">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
             <div className="flex items-center gap-3 mb-3">
               <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                 <Users size={18} className="text-cyan-400" />
               </div>
               <span className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.4em]">Relacionamento CRM</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
               Base de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Parceiros</span>
             </h1>
          </motion.div>
          
          <button 
            onClick={() => openModal()}
            className="
              group flex items-center gap-3 px-10 py-5 rounded-2xl 
              bg-cyan-500 text-black font-black uppercase tracking-[0.2em] text-xs
              hover:bg-cyan-400 hover:scale-[1.02] transition-all 
              shadow-[0_10px_30px_-5px_rgba(6,182,212,0.4)] active:scale-95
            "
          >
            <Plus size={20} strokeWidth={3} /> Novo Parceiro
          </button>
        </div>

        {/* --- BARRA DE BUSCA (CMD STYLE) --- */}
        <div className="relative group max-w-4xl">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="text-zinc-600 group-focus-within:text-cyan-400 transition-colors" size={24} />
          </div>
          <input 
            type="text"
            placeholder="Filtrar por nome, empresa ou identificação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full bg-[#09090b] border border-zinc-800 rounded-[2rem] py-6 pl-16 pr-8
              text-white placeholder-zinc-700 outline-none transition-all duration-500
              focus:border-cyan-500/50 focus:shadow-[0_0_50px_-10px_rgba(6,182,212,0.15)]
              text-xl font-medium
            "
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-500 tracking-widest uppercase">
            {filteredClients.length} Encontrados
          </div>
        </div>

        {/* --- GRID DE CLIENTES --- */}
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
                className="
                  group relative bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-8
                  hover:border-cyan-500/40 hover:shadow-[0_20px_60px_-15px_rgba(6,182,212,0.1)]
                  transition-all duration-500 overflow-hidden cursor-default
                "
              >
                {/* Efeito Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Header do Card */}
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex items-center gap-5">
                    {/* Avatar Gerado */}
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-cyan-400 font-black text-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                      {client.name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight group-hover:text-cyan-400 transition-colors truncate">
                        {client.name}
                      </h3>
                      {client.company && (
                        <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-2 mt-1 uppercase tracking-widest">
                          <Building2 size={12} className="text-cyan-600" /> {client.company}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => openModal(client)} 
                    className="p-3 bg-zinc-900/50 hover:bg-cyan-500 hover:text-black rounded-2xl text-zinc-600 transition-all active:scale-90"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>

                {/* Informações */}
                <div className="space-y-4 mb-8 relative z-10">
                  {client.phone && (
                     <div className="flex items-center gap-4 text-xs font-bold text-zinc-400 bg-white/[0.02] p-4 rounded-2xl border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                       <Phone size={16} className="text-cyan-600" />
                       {client.phone}
                     </div>
                  )}
                  {client.address && (
                     <div className="flex items-center gap-4 text-xs font-bold text-zinc-400 bg-white/[0.02] p-4 rounded-2xl border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                       <MapPin size={16} className="text-cyan-600" />
                       <span className="truncate">{client.address}</span>
                     </div>
                  )}
                </div>

                {/* Footer com Ações */}
                <div className="flex gap-3 relative z-10 pt-6 border-t border-white/5">
                  <button 
                    onClick={() => window.open(getWhatsappLink(client.phone), '_blank')}
                    className="flex-1 py-4 rounded-2xl bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-black font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </button>
                  <button 
                     onClick={() => toast({ title: "Módulo em Desenvolvimento", description: "O dossiê de projetos será liberado na v2.1" })}
                     className="px-6 py-4 rounded-2xl bg-zinc-900 text-zinc-500 border border-zinc-800 hover:bg-white hover:text-black transition-all flex items-center justify-center"
                  >
                    <Briefcase size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="col-span-full py-24 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em]">Sincronizando Base Cloud...</p>
            </div>
          )}

          {!isLoading && filteredClients.length === 0 && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] opacity-20">
              <Users size={64} className="mx-auto mb-6" />
              <p className="text-xl font-black uppercase tracking-widest">Nenhum parceiro localizado</p>
            </div>
          )}
        </div>

        {/* --- MODAL (Adicionar/Editar) --- */}
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
                className="w-full max-w-lg bg-[#0A0A0A] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
              >
                {/* Header do Modal */}
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      {editingClient ? 'Editar Dossiê' : 'Novo Parceiro'}
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
                    </h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Identificação de Rede VisComm</p>
                  </div>
                  <button onClick={closeModal} className="p-3 bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <X size={24}/>
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Nome Completo do Contato</label>
                    <input 
                      required 
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-cyan-500 focus:bg-white/[0.05] outline-none transition-all" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Organização / Empresa</label>
                    <input 
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-cyan-500 focus:bg-white/[0.05] outline-none transition-all" 
                      value={formData.company} 
                      onChange={e => setFormData({...formData, company: e.target.value})} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">WhatsApp / Fone</label>
                        <input 
                          className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-cyan-500 focus:bg-white/[0.05] outline-none transition-all" 
                          placeholder="(00) 00000-0000"
                          value={formData.phone} 
                          onChange={e => setFormData({...formData, phone: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Localidade Principal</label>
                        <input 
                          className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-white focus:border-cyan-500 focus:bg-white/[0.05] outline-none transition-all" 
                          placeholder="Cidade / Estado"
                          value={formData.address} 
                          onChange={e => setFormData({...formData, address: e.target.value})} 
                        />
                      </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 mt-12 pt-8 border-t border-white/5">
                    {editingClient && (
                      <button 
                        type="button" 
                        onClick={() => handleDelete(editingClient.id)} 
                        className="flex-1 py-5 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"
                      >
                        <Trash2 size={18} /> Remover Parceiro
                      </button>
                    )}
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-[2] py-5 rounded-2xl bg-cyan-500 text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-cyan-400 transition-all flex justify-center items-center gap-3 shadow-[0_10px_30px_-5px_rgba(6,182,212,0.4)]"
                    >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Gravar Dossiê</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
