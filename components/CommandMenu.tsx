import React, { useState, useEffect } from 'react';
import { Search, Calendar, Users, Settings, Wallet, Mic, ArrowRight, Loader2, User } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Dialog, DialogContent } from './ui/dialog';
import { useTranslation } from 'react-i18next';
import { TabType } from '../types';

interface CommandMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigate: (tab: TabType) => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({ open, onOpenChange, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const { t } = useTranslation();

    // Navigation Items
    const navItems = [
        { label: 'Overview', icon: Calendar, tab: TabType.OVERVIEW },
        { label: 'Bookings', icon: Calendar, tab: TabType.BOOKINGS },
        { label: 'Customers', icon: Users, tab: TabType.CUSTOMERS },
        { label: 'Settings', icon: Settings, tab: TabType.SETTINGS },
        { label: 'Finance', icon: Wallet, tab: TabType.WALLET },
    ];

    // Dynamic Search
    useEffect(() => {
        const search = async () => {
            if (!query) {
                setResults([]);
                return;
            }
            setLoading(true);

            // Search Customers
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name, email')
                .ilike('name', `%${query}%`)
                .limit(3);

            setResults([
                ...(customers || []).map(c => ({ ...c, type: 'customer' }))
            ]);
            setLoading(false);
        };

        const timer = setTimeout(search, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (item: any) => {
        if (item.tab) {
            onNavigate(item.tab);
        } else if (item.type === 'customer') {
            // In a real app, navigating to customer details
            // For now, switch to Customers tab and maybe set a global filter (complex)
            // Or just notify
            onNavigate(TabType.CUSTOMERS);
        }
        onOpenChange(false);
        setQuery('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden bg-white shadow-2xl border-slate-100/50">
                <div className="flex items-center px-4 py-3 border-b border-slate-100">
                    <Search size={18} className="text-slate-400 mr-3" />
                    <input
                        className="flex-1 outline-none text-base placeholder:text-slate-400 text-slate-700 bg-transparent h-10"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
                </div>

                <div className="max-h-[300px] overflow-y-auto p-2">
                    {!query && (
                        <div className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Navigation
                        </div>
                    )}

                    {!query && navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => handleSelect(item)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-sm"
                        >
                            <item.icon size={16} />
                            <span>Go to {item.label}</span>
                        </button>
                    ))}

                    {query && results.length > 0 && (
                        <>
                            <div className="px-2 py-1.5 mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Results
                            </div>
                            {results.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-sm"
                                >
                                    <User size={16} />
                                    <div className="text-left">
                                        <p className="font-medium text-slate-900">{item.name}</p>
                                        <p className="text-xs text-slate-400">{item.email}</p>
                                    </div>
                                </button>
                            ))}
                        </>
                    )}

                    {query && results.length === 0 && !loading && (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No results found.
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Pro Tip: Use <b>CMD+K</b> to open</span>
                    <div className="flex gap-2">
                        <span>Navigate <b className="bg-white border rounded px-1">↓</b> <b className="bg-white border rounded px-1">↑</b></span>
                        <span>Select <b className="bg-white border rounded px-1">Enter</b></span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
