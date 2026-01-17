import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, X, User, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { Client, Lead } from '../store/useAppData';

export type SearchResult = {
  id: string;
  type: 'client' | 'lead';
  name: string;
  email: string;
  phone: string;
  data: Client | Lead;
};

type ClientLeadSearchProps = {
  clients: Client[];
  leads: Lead[];
  value: string;
  onChange: (value: string, type: 'client' | 'lead' | null) => void;
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  className?: string;
};

export const ClientLeadSearch: React.FC<ClientLeadSearchProps> = ({
  clients,
  leads,
  value,
  onChange,
  onSelect,
  placeholder = 'Rechercher un client ou un prospect...',
  required = false,
  error = false,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trouver le nom du client/lead sélectionné
  // IMPORTANT: Le value (clientId) pointe toujours vers un CLIENT, même si c'était créé depuis un lead
  // Donc on cherche d'abord dans les clients, puis dans les leads
  const selectedName = useMemo(() => {
    if (!value) return '';
    // Chercher d'abord dans les clients (car clientId pointe toujours vers un client)
    const client = clients.find((c) => c.id === value);
    if (client) return client.name;
    // Si pas trouvé dans les clients, chercher dans les leads (au cas où)
    const lead = leads.find((l) => l.id === value);
    if (lead) return lead.company || lead.contact || '';
    return '';
  }, [value, clients, leads]);

  // Recherche dans les clients et leads
  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Si pas de recherche, afficher tous les clients et leads (limités)
    if (!query) {
      // Ajouter tous les clients
      clients.forEach((client) => {
        results.push({
          id: client.id,
          type: 'client',
          name: client.name,
          email: client.email || client.contacts.find((c) => c.active)?.email || '',
          phone: client.phone || client.contacts.find((c) => c.active)?.mobile || '',
          data: client,
        });
      });

      // Ajouter tous les leads
      leads.forEach((lead) => {
        results.push({
          id: lead.id,
          type: 'lead',
          name: lead.company || lead.contact,
          email: lead.email,
          phone: lead.phone,
          data: lead,
        });
      });

      // Limiter à 50 résultats quand on affiche tout
      return results.slice(0, 50);
    }

    // Rechercher dans les clients
    clients.forEach((client) => {
      const name = client.name.toLowerCase();
      const email = client.email?.toLowerCase() || '';
      const phone = client.phone?.toLowerCase() || '';
      const contactEmails = client.contacts
        .map((c) => c.email.toLowerCase())
        .join(' ');
      const contactPhones = client.contacts.map((c) => c.mobile.toLowerCase()).join(' ');

      if (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        contactEmails.includes(query) ||
        contactPhones.includes(query)
      ) {
        results.push({
          id: client.id,
          type: 'client',
          name: client.name,
          email: client.email || client.contacts.find((c) => c.active)?.email || '',
          phone: client.phone || client.contacts.find((c) => c.active)?.mobile || '',
          data: client,
        });
      }
    });

    // Rechercher dans les leads
    leads.forEach((lead) => {
      const company = (lead.company || '').toLowerCase();
      const contact = (lead.contact || '').toLowerCase();
      const email = (lead.email || '').toLowerCase();
      const phone = (lead.phone || '').toLowerCase();

      if (
        company.includes(query) ||
        contact.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      ) {
        results.push({
          id: lead.id,
          type: 'lead',
          name: lead.company || lead.contact,
          email: lead.email,
          phone: lead.phone,
          data: lead,
        });
      }
    });

    // Limiter à 50 résultats lors de la recherche
    return results.slice(0, 50);
  }, [searchQuery, clients, leads]);

  // Gérer le clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onChange(result.id, result.type);
    setSearchQuery('');
    setIsOpen(false);
    setFocusedIndex(-1);
    if (onSelect) {
      onSelect(result);
    }
  };

  const handleClear = () => {
    onChange('', null);
    setSearchQuery('');
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(query.trim().length > 0);
    setFocusedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };
  
  const handleInputClick = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
          handleSelect(searchResults[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div ref={searchRef} className={clsx('relative', className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={selectedName || searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={clsx(
            'w-full rounded-lg border-2 bg-white px-10 py-2 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
            error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20',
            selectedName && 'pr-10'
          )}
        />
        {selectedName && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {!searchQuery.trim() && (
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tous les clients et prospects
              </p>
            </div>
          )}
          {searchResults.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              type="button"
              onClick={() => handleSelect(result)}
              className={clsx(
                'w-full px-4 py-3 text-left hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors',
                index === focusedIndex && 'bg-blue-50/30 dark:bg-blue-900/10',
                index !== searchResults.length - 1 && 'border-b border-slate-100 dark:border-slate-700'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                  result.type === 'client' 
                    ? "bg-blue-200 dark:bg-blue-500" 
                    : "bg-orange-200 dark:bg-orange-500"
                )}>
                  {result.type === 'client' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {result.name}
                    </p>
                  </div>
                  {result.email && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {result.email}
                    </p>
                  )}
                  {result.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {result.phone}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && searchQuery.trim().length > 0 && searchResults.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucun résultat trouvé
          </p>
        </div>
      )}
    </div>
  );
};

