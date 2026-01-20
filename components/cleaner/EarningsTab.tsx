import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { DollarSign, Calendar, TrendingUp, Clock, CheckCircle, MapPin, Filter, ChevronDown } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface EarningsTabProps {
    userId: string;
}

interface EarningEntry {
    id: string;
    start_date: string;
    cleaner_pay_rate: number;
    pay_status: 'pending' | 'paid' | 'cancelled';
    paid_at?: string;
    status: string;
    customers: {
        name: string;
        address: string;
    };
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ userId }) => {
    const [earnings, setEarnings] = useState<EarningEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
    const supabase = createClient();
    const { t, i18n } = useTranslation();

    const getDateLocale = () => {
        const lang = i18n.language;
        if (lang.includes('pt')) return ptBR;
        if (lang.includes('es')) return es;
        return enUS;
    };

    useEffect(() => {
        fetchEarnings();
    }, [userId]);

    const fetchEarnings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    start_date,
                    cleaner_pay_rate,
                    pay_status,
                    paid_at,
                    status,
                    customers ( name, address )
                `)
                .eq('assigned_to', userId)
                .eq('status', 'completed')
                .not('cleaner_pay_rate', 'is', null)
                .order('start_date', { ascending: false });

            if (error) throw error;
            setEarnings((data || []) as EarningEntry[]);
        } catch (err) {
            console.error('Error fetching earnings:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate summaries
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const filteredEarnings = earnings.filter(e => {
        if (filter === 'pending') return e.pay_status === 'pending';
        if (filter === 'paid') return e.pay_status === 'paid';
        return true;
    });

    const totalPending = earnings
        .filter(e => e.pay_status === 'pending')
        .reduce((sum, e) => sum + (e.cleaner_pay_rate || 0), 0);

    const totalReceived = earnings
        .filter(e => e.pay_status === 'paid')
        .reduce((sum, e) => sum + (e.cleaner_pay_rate || 0), 0);

    const thisWeekEarnings = earnings
        .filter(e => {
            const date = parseISO(e.start_date);
            return isWithinInterval(date, { start: weekStart, end: weekEnd });
        })
        .reduce((sum, e) => sum + (e.cleaner_pay_rate || 0), 0);

    const pendingCount = earnings.filter(e => e.pay_status === 'pending').length;
    const paidCount = earnings.filter(e => e.pay_status === 'paid').length;
    const thisWeekCount = earnings.filter(e => {
        const date = parseISO(e.start_date);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
    }).length;

    // Group entries by date
    const groupedByDate = filteredEarnings.reduce((acc, entry) => {
        const dateKey = format(parseISO(entry.start_date), 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(entry);
        return acc;
    }, {} as Record<string, EarningEntry[]>);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-amber-600" />
                        <span className="text-xs font-bold text-amber-600 uppercase">Pendente</span>
                    </div>
                    <p className="text-2xl font-black text-amber-700">${totalPending.toFixed(2)}</p>
                    <p className="text-xs text-amber-500">{pendingCount} jobs</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600 uppercase">Recebido</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-700">${totalReceived.toFixed(2)}</p>
                    <p className="text-xs text-emerald-500">{paidCount} jobs</p>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-600 uppercase">Semana</span>
                    </div>
                    <p className="text-2xl font-black text-indigo-700">${thisWeekEarnings.toFixed(2)}</p>
                    <p className="text-xs text-indigo-500">{thisWeekCount} jobs</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Histórico</h3>
                <div className="flex gap-2">
                    {(['all', 'pending', 'paid'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === f
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Pagos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Earnings List */}
            <div className="space-y-4">
                {Object.entries(groupedByDate).map(([dateKey, entries]) => (
                    <div key={dateKey}>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Calendar size={12} />
                            {format(parseISO(dateKey), 'EEEE, dd MMM', { locale: getDateLocale() })}
                        </p>
                        <div className="space-y-2">
                            {entries.map(entry => (
                                <div
                                    key={entry.id}
                                    className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 truncate">
                                                {entry.customers?.name || 'Cliente'}
                                            </h4>
                                            <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                                                <MapPin size={12} />
                                                {entry.customers?.address || 'Sem endereço'}
                                            </p>
                                        </div>
                                        <div className="text-right ml-3">
                                            <p className={`font-black text-lg ${entry.pay_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                                                }`}>
                                                ${entry.cleaner_pay_rate.toFixed(2)}
                                            </p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${entry.pay_status === 'paid'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {entry.pay_status === 'paid' ? '✓ PAGO' : 'PENDENTE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredEarnings.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Nenhum registro encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
};
