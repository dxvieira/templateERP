'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { searchClients } from '../../services/clientService';
import { useDebounce } from '../../hooks/useDebounce';
import { Client } from '../../types/client';
import { Loader2, Search, X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientSearchFieldProps {
  onClientSelect: (client: Client) => void;
  /** Chamado quando usuário opta por usar texto livre sem cadastro */
  onFreeTextSelect?: (name: string) => void;
  initialValue?: string;
  className?: string;
}

export const ClientSearchField: React.FC<ClientSearchFieldProps> = ({ 
  onClientSelect,
  onFreeTextSelect,
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

  const handleFreeText = () => {
    const name = input.trim().toUpperCase();
    if (!name) return;
    setShowDropdown(false);
    if (onFreeTextSelect) {
      onFreeTextSelect(name);
    } else {
      // Fallback: passa um objeto Client mínimo com o nome digitado
      onClientSelect({ id: '', name });
    }
  };

  const handleClear = () => {
    setInput('');
    setResults([]);
  };

  const showNoResults = showDropdown && !isLoading && input.length >= 2 && results.length === 0;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          className={cn(
            "w-full bg-secondary border-2 border-border rounded-2xl py-4 pl-12 pr-12 text-sm font-black uppercase tracking-widest text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-card",
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
            className="absolute right-4 p-1 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
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
      
      {/* Dropdown com resultados encontrados */}
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden divide-y divide-border">
          {results.map(client => (
            <li 
              key={client.id}
              className="p-4 hover:bg-primary/10 cursor-pointer transition-colors group flex justify-between items-center"
              onClick={() => handleSelect(client)}
            >
              <div>
                <p className="text-foreground text-sm font-black uppercase">{client.name}</p>
                {client.taxId && <p className="text-[10px] text-muted-foreground font-mono mt-1">{client.taxId}</p>}
              </div>
              <div className="text-[9px] font-black uppercase px-2 py-1 rounded bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {client.pricingTier || 'Standard'}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Dropdown quando NÃO há resultados — oferece criar como novo */}
      {showNoResults && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 text-center border-b border-border">
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
              Nenhum cliente encontrado para
            </p>
            <p className="text-foreground text-sm font-black uppercase mt-1 truncate px-2">
              "{input.trim()}"
            </p>
          </div>
          <button
            type="button"
            onClick={handleFreeText}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors font-black text-[11px] uppercase tracking-widest group"
          >
            <UserPlus size={16} className="shrink-0" />
            <span>Usar <span className="underline underline-offset-2">"{input.trim().toUpperCase()}"</span> como novo cliente</span>
          </button>
        </div>
      )}
    </div>
  );
};
