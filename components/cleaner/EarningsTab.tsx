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
    const [payrollEntries, setPayrollEntries] = useState<any[]>([]);
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
            // 1. Fetch Bookings (Work History)
            const { data: bookingsData, error: bookingsError } = await supabase
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

            if (bookingsError) throw bookingsError;
            setEarnings((bookingsData || []) as EarningEntry[]);

            // 2. Fetch Payroll Entries (Adjustments/History)
            // We need to find the member record for this user first
            const { data: memberData } = await supabase
                .from('team_members')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (memberData) {
                const { data: payrollData } = await supabase
                    .from('payroll_entries')
                    .select('*, payroll_periods(*)')
                    .eq('member_id', memberData.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                setPayrollEntries(payrollData || []);
            }

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

    const totalBonuses = payrollEntries
        .reduce((sum, p) => sum + (p.bonuses || 0), 0);

    const totalReceived = earnings
        .filter(e => e.pay_status === 'paid')
        .reduce((sum, e) => sum + (e.cleaner_pay_rate || 0), 0) + totalBonuses;

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
                        <span className="text-xs font-bold text-amber-600 uppercase">{t('payroll.summary.pending', 'Pending')}</span>
                    </div>
                    <p className="text-2xl font-black text-amber-700">${totalPending.toFixed(2)}</p>
                    <p className="text-xs text-amber-500">{t('payroll.work.jobs', '{{count}} jobs', { count: pendingCount })}</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600 uppercase">{t('payroll.summary.received', 'Received')}</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-700">${totalReceived.toFixed(2)}</p>
                    <p className="text-xs text-emerald-500">{t('payroll.work.jobs', '{{count}} jobs', { count: paidCount })}</p>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-600 uppercase">{t('payroll.summary.week', 'Week')}</span>
                    </div>
                    <p className="text-2xl font-black text-indigo-700">${thisWeekEarnings.toFixed(2)}</p>
                    <p className="text-xs text-indigo-500">{t('payroll.work.jobs', '{{count}} jobs', { count: thisWeekCount })}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700">History</h3>
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
                            {f === 'all' ? t('common.all', 'All') : f === 'pending' ? t('payroll.status.pending', 'Pending') : t('payroll.status.paid', 'Paid')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Earnings List */}
            <div className="space-y-4">
                {(Object.entries(groupedByDate) as [string, EarningEntry[]][]).map(([dateKey, entries]) => (
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
                                                {entry.customers?.name || t('payroll.table.customer', 'Customer')}
                                            </h4>
                                            <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                                                <MapPin size={12} />
                                                {entry.customers?.address || t('payroll.table.no_address', 'No address')}
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
                                                {entry.pay_status === 'paid' ? `✓ ${t('payroll.status.paid', 'PAID')}` : t('payroll.status.pending', 'PENDING')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Payroll history (Adjustments & Payouts) */}
            {payrollEntries.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 border-t pt-6">
                        <TrendingUp size={16} className="text-indigo-600" />
                        {t('payroll.history.title', 'Payout & Adjustment History')}
                    </h3>
                    <div className="space-y-2">
                        {payrollEntries.map(entry => (
                            <div key={entry.id} className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-indigo-600 uppercase">
                                            {entry.status === 'paid' ? t('payroll.history.payment_receipt', 'Payment Receipt') : t('payroll.history.adjustment', 'Payroll Adjustment')}
                                        </p>
                                        <p className="text-sm font-medium text-slate-700">
                                            {t('payroll.period.label', 'Period')}: {entry.payroll_periods?.period_start ? format(parseISO(entry.payroll_periods.period_start), 'MM/dd') : ''} -
                                            {entry.payroll_periods?.period_end ? format(parseISO(entry.payroll_periods.period_end), 'MM/dd') : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-indigo-700">
                                            +${(entry.bonuses || 0).toFixed(2)}
                                        </p>
                                        <span className="text-[10px] font-bold text-indigo-400">{t('payroll.history.bonus_extra', 'BONUS / EXTRA')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
