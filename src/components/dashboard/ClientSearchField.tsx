'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { searchClients } from '../../services/clientService';
import { useDebounce } from '../../hooks/useDebounce';
import { Client } from '../../types/client';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientSearchFieldProps {
  onClientSelect: (client: Client) => void;
  initialValue?: string;
  className?: string;
}

export const ClientSearchField: React.FC<ClientSearchFieldProps> = ({ 
  onClientSelect, 
  initialValue = '',
  className 
}) => {
  const firestore = useFirestore();
  const [input, setInput] = useState(initialValue);
  const [results, setResults] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const debouncedSearch = useDebounce(input, 300);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Não busca se o input estiver vazio ou se o usuário acabou de selecionar alguém (e o nome tá inteiro lá)
    if (debouncedSearch && debouncedSearch.length >= 2 && showDropdown) {
      let isMounted = true;
      setIsLoading(true);
      searchClients(firestore, debouncedSearch).then(res => {
        if (isMounted) {
          setResults(res);
          setIsLoading(false);
        }
      });
      return () => { isMounted = false; };
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [debouncedSearch, firestore, showDropdown]);

  const handleSelect = (client: Client) => {
    setInput(client.name);
    setShowDropdown(false);
    onClientSelect(client);
  };

  const handleClear = () => {
    setInput('');
    setResults([]);
    // Opcional: onClientSelect com um modelo vazio se o app suportar
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          className={cn(
            "w-full bg-black border-2 border-zinc-800 rounded-2xl py-4 pl-12 pr-12 text-sm font-black uppercase tracking-widest text-white outline-none transition-all placeholder:text-zinc-600 focus:border-primary/50 focus:bg-zinc-900/50",
            className
          )}
          placeholder="BUSCAR CLIENTE NO BANCO..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {input && (
          <button 
            type="button"
            onClick={handleClear}
            className="absolute right-4 p-1 rounded-full hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-12">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        )}
      </div>
      
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-zinc-800/50">
          {results.map(client => (
            <li 
              key={client.id}
              className="p-4 hover:bg-primary/10 cursor-pointer transition-colors group flex justify-between items-center"
              onClick={() => handleSelect(client)}
            >
              <div>
                <p className="text-white text-sm font-black uppercase">{client.name}</p>
                {client.taxId && <p className="text-[10px] text-zinc-500 font-mono mt-1">{client.taxId}</p>}
              </div>
              <div className="text-[9px] font-black uppercase px-2 py-1 rounded bg-zinc-900 text-zinc-500 group-hover:bg-primary group-hover:text-black transition-colors">
                {client.pricingTier || 'Standard'}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showDropdown && !isLoading && input.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl p-4 text-center">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Nenhum cliente encontrado.</p>
          <p className="text-[10px] text-zinc-600 mt-1">Será salvo como novo cadastro se mantido.</p>
        </div>
      )}
    </div>
  );
};
