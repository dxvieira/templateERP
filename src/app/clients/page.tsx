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
  Lock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ClientsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  // --- 1. ESTADOS DE SEGURANÇA (VOLÁTIL) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);

  // --- 2. ESTADOS DE GESTÃO ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do Formulário
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    zip: '',
    cpfCnpj: ''
  });

  // --- 3. LÓGICA DE DESBLOQUEIO ---
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '@impactoADM') {
      setIsAuthenticated(true);
      setIsPassError(false);
    } else {
      setIsPassError(true);
      setTimeout(() => setIsPassError(false), 500);
    }
  };

  // --- 4. CARREGAR CLIENTES (SÓ SE AUTENTICADO) ---
  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isAuthenticated) return null;
    return query(collection(firestore, 'clients'), orderBy('name', 'asc'));
  }, [firestore, user, isAuthenticated]);

  const { data: clients, isLoading } = useCollection(clientsQuery);

  // --- FILTRO DE BUSCA ---
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const term = searchTerm.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(term) ||
      client.company?.toLowerCase().includes(term) ||
      (client.cpfCnpj && client.cpfCnpj.includes(term))
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
    if (window.confirm("Remover este parceiro permanentemente?")) {
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
      setFormData({ 
        name: client.name || '', 
        company: client.company || '', 
        phone: client.phone || '', 
        email: client.email || '',
        address: client.address || '',
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

  // --- VIEW: LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-zinc-800/20 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            x: isPassError ? [0, -10, 10, -10, 10, 0] : 0 
          }}
          className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2rem] p-8 shadow-2xl relative z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className={`
              p-5 rounded-3xl mb-6 transition-all duration-300 border
              ${isPassError ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_20px_rgba(255,0,0,0.2)]' : 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_20px_rgba(255,95,31,0.2)]'}
            `}>
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter text-center leading-tight">Acesso Restrito ao CRM</h2>
            <p className="text-zinc-500 text-[10px] mt-2 text-center uppercase tracking-[0.3em] font-bold">
              Base de dados de parceiros sensível <br/> Identifique-se para gerenciar
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-5">
            <div className="relative group">
              <input 
                type="password"
                placeholder="SENHA ADMINISTRATIVA"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`
                  w-full bg-zinc-900/50 border rounded-2xl py-4 pl-4 pr-12 text-center text-white tracking-[0.5em] outline-none transition-all duration-300 font-bold
                  placeholder:tracking-normal placeholder:text-zinc-700 placeholder:text-[10px]
                  ${isPassError 
                    ? 'border-destructive/50 focus:border-destructive shadow-[0_0_30px_rgba(255,0,0,0.15)]' 
                    : 'border-zinc-800 focus:border-primary/50 focus:shadow-[0_0_30px_rgba(255,95,31,0.1)]'
                  }
                `}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                {isPassError ? <X size={20} className="text-destructive" /> : <ShieldCheck size={20} className="text-zinc-700 group-focus-within:text-primary transition-colors" />}
              </div>
            </div>

            <button 
              type="submit"
              className="
                w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[10px]
                hover:bg-white transition-all duration-300 shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)]
                flex items-center justify-center gap-2 group
              "
            >
              Acessar Base <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {isPassError && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-[9px] font-black text-center mt-6 uppercase tracking-[0.2em]"
            >
              Senha Incorreta • Acesso Negado
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  // --- VIEW: AUTHENTICATED CONTENT ---
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden selection:bg-[#FF5F1F] selection:text-black">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6 mt-16 md:mt-0 pb-24">
        
        {/* --- HEADER COMPACTO --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-1">
               <div className="p-1.5 bg-[#FF5F1F]/10 rounded-lg border border-[#FF5F1F]/20">
                 <Users size={14} className="text-[#FF5F1F]" />
               </div>
               <span className="text-[#FF5F1F] text-[9px] font-black uppercase tracking-[0.4em]">CRM Protegido</span>
             </div>
             <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
               Base de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5F1F] to-orange-600">Parceiros</span>
             </h1>
          </div>
          
          <button 
            onClick={() => openModal()}
            className="
              group flex items-center gap-2 px-6 py-2.5 rounded-full 
              bg-[#FF5F1F] text-black font-black uppercase tracking-widest text-[9px]
              hover:bg-white transition-all shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)]
            "
          >
            <Plus size={16} strokeWidth={3} /> Novo Cliente
          </button>
        </div>

        {/* --- BUSCA --- */}
        <div className="relative group max-w-3xl">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-zinc-600 group-focus-within:text-[#FF5F1F] transition-colors" size={18} />
          </div>
          <input 
            type="text"
            placeholder="Buscar por nome, empresa ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full bg-[#09090b] border border-zinc-800 rounded-xl py-2.5 pl-12 pr-6
              text-white placeholder-zinc-700 outline-none transition-all
              focus:border-[#FF5F1F]/50 focus:shadow-[0_0_30px_-10px_rgba(255,95,31,0.15)]
              text-sm font-medium
            "
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] font-black text-zinc-500 tracking-widest uppercase">
            {filteredClients.length} Registros
          </div>
        </div>

        {/* --- GRID DE CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, idx) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.02 }}
                key={client.id}
                onClick={() => openModal(client)}
                className="
                  group relative bg-[#09090b] border border-zinc-800 rounded-xl p-4
                  hover:border-[#FF5F1F]/40 hover:bg-zinc-900/40
                  transition-all duration-300 overflow-hidden cursor-pointer
                  hover:-translate-y-0.5
                "
              >
                <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-[#FF5F1F] opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_10px_#FF5F1F]" />

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FF5F1F] font-black text-lg shadow-inner group-hover:scale-105 transition-transform">
                      {client.name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white leading-tight uppercase tracking-tight group-hover:text-[#FF5F1F] transition-colors truncate">
                        {client.name}
                      </h3>
                      <div className="flex flex-col mt-0.5">
                        {client.company && (
                          <p className="text-[8px] font-bold text-zinc-500 flex items-center gap-1 uppercase tracking-widest truncate">
                            <Building2 size={10} className="text-[#FF5F1F]" /> {client.company}
                          </p>
                        )}
                        {client.cpfCnpj && (
                          <p className="text-[8px] font-mono text-zinc-600 flex items-center gap-1 mt-0.5 truncate uppercase">
                            <FileBadge size={10} className="text-zinc-700" /> {client.cpfCnpj}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-zinc-800 group-hover:text-[#FF5F1F] group-hover:translate-x-1 transition-all" size={16} />
                </div>

                <div className="space-y-1.5 relative z-10">
                  <div className="flex items-center gap-2.5 text-[9px] font-bold text-zinc-400">
                    <Phone size={12} className="text-zinc-700 group-hover:text-[#FF5F1F] transition-colors" />
                    <span className="truncate">{client.phone || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[9px] font-bold text-zinc-400">
                    <Mail size={12} className="text-zinc-700 group-hover:text-[#FF5F1F] transition-colors" />
                    <span className="truncate">{client.email || 'Sem e-mail'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="col-span-full py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#FF5F1F] animate-spin" />
              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em]">Sincronizando Registros...</p>
            </div>
          )}

          {!isLoading && filteredClients.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/20">
              <Users size={32} className="mx-auto mb-3 text-zinc-800" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum parceiro localizado</p>
            </div>
          )}
        </div>

        {/* MODAL DE DOSSIÊ COMPLETO */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={closeModal}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 15 }}
                className="w-full max-w-2xl bg-[#0A0A0A] border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5 bg-white/[0.01]">
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                      {editingClient ? 'Detalhes do Parceiro' : 'Novo Cadastro'}
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F1F] animate-pulse shadow-[0_0_10px_rgba(255,95,31,1)]" />
                    </h2>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Sincronização em Tempo Real Ativa</p>
                  </div>
                  <button onClick={closeModal} className="p-2 bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <X size={18}/>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
                  <form id="clientForm" onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[8px] text-[#FF5F1F] uppercase font-black tracking-[0.2em] ml-1">Nome Completo do Contato *</label>
                        <input 
                          required 
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-white focus:border-[#FF5F1F] outline-none transition-all" 
                          value={formData.name} 
                          onChange={e => setFormData({...formData, name: e.target.value})} 
                          placeholder="Ex: João Silva"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest ml-1">CPF ou CNPJ</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-white focus:border-[#FF5F1F] outline-none transition-all font-mono" 
                            value={formData.cpfCnpj} 
                            onChange={e => setFormData({...formData, cpfCnpj: e.target.value})} 
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest ml-1">Empresa / Organização</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.company} 
                            onChange={e => setFormData({...formData, company: e.target.value})} 
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest ml-1">WhatsApp / Telefone</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})} 
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest ml-1">E-mail Corporativo</label>
                          <input 
                            type="email"
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            placeholder="parceiro@viscomm.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest ml-1">Endereço Completo</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.address} 
                            onChange={e => setFormData({...formData, address: e.target.value})} 
                            placeholder="Rua, Número, Bairro, Cidade"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] text-zinc-500 uppercase font-black tracking-widest ml-1">CEP</label>
                          <input 
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-white focus:border-[#FF5F1F] outline-none transition-all" 
                            value={formData.zip} 
                            onChange={e => setFormData({...formData, zip: e.target.value})} 
                            placeholder="00000-000"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="p-6 pt-4 border-t border-white/5 bg-white/[0.01] flex flex-col md:flex-row gap-3">
                  {editingClient && (
                    <button 
                      type="button" 
                      onClick={() => handleDelete(editingClient.id)} 
                      className="flex-1 py-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  )}
                  <div className="flex-[2] flex gap-3">
                    <button 
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 font-black uppercase tracking-widest text-[8px] hover:bg-zinc-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      form="clientForm"
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-[2] py-3 rounded-xl bg-[#FF5F1F] text-black font-black uppercase tracking-[0.2em] text-[8px] hover:bg-white transition-all flex justify-center items-center gap-2 shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)]"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Gravar Dossiê</>}
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
