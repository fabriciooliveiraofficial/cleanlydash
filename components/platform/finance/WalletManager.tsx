import React, { useState } from 'react';
import { createPlatformClient } from '../../../lib/supabase/platform-client';
import { toast } from 'sonner';
import { Search, PlusCircle, DollarSign, User, Wallet } from 'lucide-react';
import { Button } from '../../ui/button';

export const WalletManager: React.FC = () => {
    const [emailSearch, setEmailSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [targetUser, setTargetUser] = useState<any>(null);
    const [amount, setAmount] = useState('10.00');
    const [description, setDescription] = useState('Crédito de Teste (Admin)');

    const supabase = createPlatformClient();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTargetUser(null);
        try {
            // Find user by email in auth schema? 
            // NOTE: Client SDK cannot query auth.users directly usually.
            // We rely on public.tenant_profiles or public.user_roles joined with a view if available.
            // If we don't have a view exposing emails, we might need an Edge Function or RPC.
            // For now, let's assume we can search `tenant_profiles` if email is stored there, 
            // OR use a specialized RPC for admin user search.

            // Checking tenant_profiles (assuming it has email or contact info)
            // Actually, best bet for "Super Admin" is a secure RPC or querying a view `admin_users_view`
            // Let's try searching by ID first if email fails, or implemented searching `tenant_profiles` logic previously.

            // Fallback: Simple ID input if no email search infrastructure
            // But User expects "Manager". Let's assume user inputs ID for now or exact Email if we have a lookup function.

            // Let's try to find an RPC or just use ID for MVP safety.
            // UPDATE: I'll assume input is EMAIL and we use an RPC `get_user_by_email` if it exists,
            // OR we just ask for UUID. 
            // To make it UX friendly, let's ask for UUID.

            // Simulating "Found" for ID input
            if (emailSearch.includes('@')) {
                toast.warning("Busca por email requer RPC específico. Por favor, use o User UUID por enquanto.");
                return; // blocking for now to be safe
            }

            const { data, error } = await supabase
                .from('wallets')
                .select('id, user_id, balance')
                .eq('user_id', emailSearch) // Treating input as ID
                .maybeSingle();

            if (error) throw error;
            setTargetUser(data);
            toast.success("Carteira encontrada!");

        } catch (err: any) {
            console.error(err);
            toast.error("Usuário/Carteira não encontrada.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddCredits = async () => {
        if (!targetUser) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_add_credits', {
                p_user_id: targetUser.user_id,
                p_amount: parseFloat(amount),
                p_description: description
            });

            if (error) throw error;

            toast.success(`Adicionado $${amount} com sucesso!`);
            // Refresh
            const { data: newData } = await supabase.from('wallets').select('balance').eq('id', targetUser.id).maybeSingle();
            if (newData) setTargetUser({ ...targetUser, balance: newData.balance });

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao adicionar créditos');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Wallet className="text-indigo-600" />
                    Gerenciador de Créditos (Super Admin)
                </h3>

                {/* Search */}
                <form onSubmit={handleSearch} className="flex gap-4 mb-6">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Cole o UUID do Usuário..."
                            value={emailSearch}
                            onChange={(e) => setEmailSearch(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="shrink-0">
                        <Search size={16} className="mr-2" /> Buscar
                    </Button>
                </form>

                {/* Result & Action */}
                {targetUser && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Carteira ID: {targetUser.id.slice(0, 8)}...</p>
                                    <p className="text-xl font-bold text-slate-900">${targetUser.balance.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                Ativo
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Valor a Adicionar ($)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Motivo / Descrição</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleAddCredits} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                                <PlusCircle size={16} className="mr-2" />
                                Adicionar Créditos
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
