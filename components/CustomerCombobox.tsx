import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, User, MapPin, Phone, Mail, X, Check } from 'lucide-react';
import { AddressAutocomplete } from './crm/address-autocomplete';
import { InternationalPhoneInput } from './ui/InternationalPhoneInput';

interface Customer {
    id: string;
    name: string;
    address?: string;
    email?: string;
    phone?: string;
}

interface CustomerComboboxProps {
    customers: Customer[];
    selectedId: string;
    onSelect: (customer: Customer) => void;
    onCreate: (customer: Omit<Customer, 'id'>) => Promise<Customer | null>;
}

export const CustomerCombobox: React.FC<CustomerComboboxProps> = ({
    customers,
    selectedId,
    onSelect,
    onCreate
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' });
    const [creating, setCreating] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedCustomer = customers.find(c => c.id === selectedId);

    // Filter customers based on search term
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const showCreateOption = searchTerm.length >= 2 &&
        !filteredCustomers.some(c => c.name.toLowerCase() === searchTerm.toLowerCase());

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (customer: Customer) => {
        onSelect(customer);
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleStartCreate = () => {
        setNewCustomer({ name: searchTerm, email: '', phone: '', address: '' });
        setIsCreating(true);
    };

    const handleCreate = async () => {
        if (!newCustomer.name.trim()) return;

        setCreating(true);
        const created = await onCreate(newCustomer);
        setCreating(false);

        if (created) {
            onSelect(created);
            setSearchTerm('');
            setIsOpen(false);
            setIsCreating(false);
            setNewCustomer({ name: '', email: '', phone: '', address: '' });
        }
    };

    const handleClear = () => {
        onSelect({ id: '', name: '', address: '' });
        setSearchTerm('');
        setIsOpen(true);
        inputRef.current?.focus();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Main Input */}
            {selectedCustomer && !isOpen ? (
                // Selected Customer Display
                <div
                    className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors"
                    onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                            {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-medium text-emerald-800">{selectedCustomer.name}</div>
                            {selectedCustomer.address && (
                                <div className="text-sm text-emerald-600 flex items-center gap-1">
                                    <MapPin size={12} />
                                    {selectedCustomer.address}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleClear(); }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            ) : (
                // Search Input
                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Digite o nome do cliente..."
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
                    {!isCreating ? (
                        <>
                            {/* Filtered Results */}
                            <div className="max-h-64 overflow-y-auto">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map(customer => (
                                        <button
                                            key={customer.id}
                                            onClick={() => handleSelect(customer)}
                                            className={`w-full p-3 flex items-center gap-3 hover:bg-indigo-50 transition-colors text-left border-b border-slate-100 last:border-b-0 ${customer.id === selectedId ? 'bg-indigo-50' : ''
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-slate-800 truncate">{customer.name}</div>
                                                <div className="text-sm text-slate-500 truncate flex items-center gap-3">
                                                    {customer.address && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {customer.address}
                                                        </span>
                                                    )}
                                                    {customer.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone size={12} />
                                                            {customer.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {customer.id === selectedId && (
                                                <Check size={18} className="text-indigo-600 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-slate-500">
                                        {searchTerm ? (
                                            <>Nenhum cliente encontrado para "<span className="font-medium text-slate-700">{searchTerm}</span>"</>
                                        ) : (
                                            'Digite para buscar clientes'
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Create New Option */}
                            {showCreateOption && (
                                <button
                                    onClick={handleStartCreate}
                                    className="w-full p-3 flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100 hover:from-indigo-100 hover:to-purple-100 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                                        <Plus size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-indigo-700">
                                            Criar novo cliente
                                        </div>
                                        <div className="text-sm text-indigo-500">
                                            "{searchTerm}"
                                        </div>
                                    </div>
                                </button>
                            )}
                        </>
                    ) : (
                        // Create Form - Adicionado padding inferior generoso para permitir scroll no modal e ver sugestões de endereço
                        <div className="p-4 pb-48 space-y-3 bg-gradient-to-b from-indigo-50 to-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-indigo-700">
                                    <User size={18} />
                                    <span className="font-semibold">Novo Cliente</span>
                                </div>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="Nome *"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={newCustomer.name}
                                onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                autoFocus
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        value={newCustomer.email}
                                        onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Telefone</label>
                                    <InternationalPhoneInput
                                        value={newCustomer.phone}
                                        onChange={val => setNewCustomer({ ...newCustomer, phone: val })}
                                        placeholder="Telefone"
                                        defaultCountry="BR"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <AddressAutocomplete
                                    onSelect={(res) => {
                                        setNewCustomer({
                                            ...newCustomer,
                                            address: res.fullAddress,
                                            // Adicionando lat/lng ao estado para persistência se o schema permitir
                                            ...(res.lat && res.lng ? { latitude: res.lat, longitude: res.lng } : {})
                                        } as any);
                                    }}
                                    defaultValue={newCustomer.address}
                                />
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={!newCustomer.name.trim() || creating}
                                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                            >
                                {creating ? (
                                    'Criando...'
                                ) : (
                                    <>
                                        <Check size={18} />
                                        Criar e Selecionar
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
