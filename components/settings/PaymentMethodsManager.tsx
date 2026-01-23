import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { AddCardForm } from './AddCardForm';

interface PaymentMethod {
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    is_default: boolean;
}

export const PaymentMethodsManager: React.FC = () => {
    const supabase = createClient();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    };

    const fetchPaymentMethods = async () => {
        setLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');

            const { data, error } = await supabase.functions.invoke('stripe-payment-methods', {
                body: { action: 'list' },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) throw error;
            setPaymentMethods(data?.paymentMethods || []);
        } catch (err: any) {
            console.error('Error fetching payment methods:', err);
            toast.error('Erro ao carregar métodos de pagamento');
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefault = async (paymentMethodId: string) => {
        setActionLoading(paymentMethodId);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');

            const { error } = await supabase.functions.invoke('stripe-payment-methods', {
                method: 'POST',
                body: { action: 'set_default', payment_method_id: paymentMethodId },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) throw error;
            toast.success('Cartão definido como padrão');
            fetchPaymentMethods();
        } catch (err: any) {
            toast.error('Erro ao definir cartão padrão');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemove = async (paymentMethodId: string) => {
        if (!confirm('Tem certeza que deseja remover este cartão?')) return;

        setActionLoading(paymentMethodId);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');

            const { error } = await supabase.functions.invoke('stripe-payment-methods', {
                body: { action: 'remove', payment_method_id: paymentMethodId },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) throw error;
            toast.success('Cartão removido');
            fetchPaymentMethods();
        } catch (err: any) {
            toast.error('Erro ao remover cartão');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCardAdded = () => {
        setShowAddForm(false);
        fetchPaymentMethods();
    };

    const getBrandIcon = (brand: string) => {
        switch (brand?.toLowerCase()) {
            case 'visa':
                return '💳 Visa';
            case 'mastercard':
                return '💳 Mastercard';
            case 'amex':
                return '💳 Amex';
            default:
                return '💳 Cartão';
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <CreditCard size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Métodos de Pagamento</h3>
                        <p className="text-xs text-slate-500">Gerencie seus cartões salvos</p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowAddForm(true)}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus size={16} className="mr-1" /> Adicionar Cartão
                </Button>
            </div>

            {showAddForm && (
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-4">Novo Cartão</h4>
                    <AddCardForm
                        onSuccess={handleCardAdded}
                        onCancel={() => setShowAddForm(false)}
                    />
                </div>
            )}

            {paymentMethods.length === 0 && !showAddForm ? (
                <div className="text-center py-8 text-slate-500">
                    <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
                    <p>Nenhum cartão cadastrado</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {paymentMethods.map((pm) => (
                        <div
                            key={pm.id}
                            className={`flex items-center justify-between p-4 rounded-xl border ${pm.is_default ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{getBrandIcon(pm.brand)}</span>
                                <div>
                                    <p className="font-medium text-slate-900">
                                        •••• {pm.last4}
                                        {pm.is_default && (
                                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                                Padrão
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Expira em {pm.exp_month.toString().padStart(2, '0')}/{pm.exp_year}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!pm.is_default && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSetDefault(pm.id)}
                                        disabled={actionLoading === pm.id}
                                    >
                                        {actionLoading === pm.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Star size={14} />
                                        )}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemove(pm.id)}
                                    disabled={actionLoading === pm.id}
                                >
                                    {actionLoading === pm.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
