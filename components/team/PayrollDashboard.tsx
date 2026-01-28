import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import {
    DollarSign,
    Calendar,
    Download,
    CheckCircle,
    Clock,
    Users,
    Filter,
    ChevronLeft,
    ChevronRight,
    FileText,
    Send,
    Plus,
    Minus,
    Edit
} from 'lucide-react';
import { Button } from '../ui/button';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
    id: string;
    user_id?: string; // The auth.users.id - used for matching bookings.assigned_to
    name: string;
    color: string;
    pay_type: string;
    pay_rate: number;
    commission_percent: number;
}

interface PayrollEntry {
    id: string;
    member_id: string;
    member?: TeamMember;
    hours_worked: number;
    days_worked: number;
    jobs_completed: number;
    booking_value_total: number;
    pay_type: string;
    pay_rate: number;
    gross_amount: number;
    bonuses: number;
    deductions: number;
    net_amount: number;
    status: string;
    notes: string;
}

interface PayrollPeriod {
    id: string;
    period_type: string;
    period_start: string;
    period_end: string;
    status: string;
}

type PeriodType = 'weekly' | 'biweekly' | 'monthly';

export const PayrollDashboard: React.FC = () => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [entries, setEntries] = useState<PayrollEntry[]>([]);
    const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
    const [loading, setLoading] = useState(true);

    const [periodType, setPeriodType] = useState<PeriodType>('biweekly');
    const [periodDate, setPeriodDate] = useState(new Date());

    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
    const [adjustmentType, setAdjustmentType] = useState<'bonus' | 'deduction'>('bonus');
    const [adjustmentAmount, setAdjustmentAmount] = useState(0);
    const [adjustmentNotes, setAdjustmentNotes] = useState('');

    const supabase = createClient();

    const getPeriodRange = () => {
        if (periodType === 'weekly') {
            return {
                start: startOfWeek(periodDate, { locale: ptBR }),
                end: endOfWeek(periodDate, { locale: ptBR })
            };
        } else if (periodType === 'biweekly') {
            const weekStart = startOfWeek(periodDate, { locale: ptBR });
            return {
                start: weekStart,
                end: endOfWeek(addWeeks(weekStart, 1), { locale: ptBR })
            };
        } else {
            return {
                start: startOfMonth(periodDate),
                end: endOfMonth(periodDate)
            };
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log('[Payroll DEBUG] Current user:', user?.id);
            if (!user) return;

            // Fetch team members - include user_id for matching bookings.assigned_to
            const { data: membersData, error: membersError } = await supabase
                .from('team_members')
                .select('id, user_id, name, color, pay_type, pay_rate, commission_percent, status, tenant_id')
                .eq('tenant_id', user.id)
                .eq('status', 'active');

            console.log('[Payroll DEBUG] Members query result:', membersData, 'Error:', membersError);

            // Also try without status filter to see all members
            const { data: allMembers } = await supabase
                .from('team_members')
                .select('id, name, tenant_id, status')
                .eq('tenant_id', user.id);
            console.log('[Payroll DEBUG] All members for tenant:', allMembers);

            setMembers((membersData || []) as TeamMember[]);

            // Fetch current period if exists
            const { start, end } = getPeriodRange();
            const { data: periodData } = await supabase
                .from('payroll_periods')
                .select('*')
                .eq('tenant_id', user.id)
                .gte('period_start', format(start, 'yyyy-MM-dd'))
                .lte('period_end', format(end, 'yyyy-MM-dd'))
                .maybeSingle();

            if (periodData) {
                setCurrentPeriod(periodData as PayrollPeriod);

                // Fetch entries for this period
                const { data: entriesData } = await supabase
                    .from('payroll_entries')
                    .select('*')
                    .eq('period_id', periodData.id);

                // Enrich entries with member info
                const enriched = ((entriesData || []) as PayrollEntry[]).map(entry => ({
                    ...entry,
                    member: (membersData || []).find((m: TeamMember) => m.id === entry.member_id)
                }));
                setEntries(enriched);
            } else {
                setCurrentPeriod(null);
                // Generate preview entries
                await generatePreviewEntries(membersData as TeamMember[]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const generatePreviewEntries = async (membersList: TeamMember[]) => {
        const { start, end } = getPeriodRange();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('[Payroll DEBUG] generatePreviewEntries called with', membersList?.length, 'members');
        console.log('[Payroll DEBUG] Period range:', format(start, 'yyyy-MM-dd'), 'to', format(end, 'yyyy-MM-dd'));

        // Fetch bookings in this period to calculate work
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, assigned_to, start_date, end_date, price, cleaner_pay_rate')
            .gte('start_date', start.toISOString())
            .lte('end_date', end.toISOString());

        console.log('[Payroll DEBUG] Bookings in period:', bookings, 'Error:', bookingsError);

        const previewEntries: PayrollEntry[] = membersList.map(member => {
            // Match bookings by user_id (auth.users.id) since assigned_to references auth.users
            const memberBookings = (bookings || []).filter((b: any) =>
                b.assigned_to === member.user_id || b.assigned_to === member.id
            );
            console.log('[Payroll DEBUG] Member', member.name, 'user_id:', member.user_id, 'id:', member.id, 'has', memberBookings.length, 'bookings');

            const jobCount = memberBookings.length;
            const totalValue = memberBookings.reduce((sum: number, b: any) => sum + (b.price || 0), 0);

            // Calculate hours (estimate 2hrs per job if not tracked)
            const hoursWorked = jobCount * 2;
            const daysWorked = new Set(memberBookings.map((b: any) => format(new Date(b.start_date), 'yyyy-MM-dd'))).size;

            // Calculate gross based on pay type
            let grossAmount = 0;
            switch (member.pay_type) {
                case 'hourly':
                    grossAmount = hoursWorked * member.pay_rate;
                    break;
                case 'daily':
                    grossAmount = daysWorked * member.pay_rate;
                    break;
                case 'per_job':
                    // Prioritize cleaner_pay_rate from each booking, fallback to member.pay_rate
                    grossAmount = memberBookings.reduce((sum: number, b: any) =>
                        sum + (b.cleaner_pay_rate !== null && b.cleaner_pay_rate > 0 ? b.cleaner_pay_rate : member.pay_rate), 0);
                    break;
                case 'salary':
                    grossAmount = member.pay_rate;
                    break;
                case 'commission':
                    grossAmount = memberBookings.reduce((sum: number, b: any) => {
                        if (b.cleaner_pay_rate > 0) return sum + b.cleaner_pay_rate;
                        return sum + (b.price * (member.commission_percent / 100));
                    }, 0);
                    break;
            }

            return {
                id: `preview-${member.id}`,
                member_id: member.id,
                member,
                hours_worked: hoursWorked,
                days_worked: daysWorked,
                jobs_completed: jobCount,
                booking_value_total: totalValue,
                pay_type: member.pay_type,
                pay_rate: member.pay_type === 'commission' ? member.commission_percent : member.pay_rate,
                gross_amount: grossAmount,
                bonuses: 0,
                deductions: 0,
                net_amount: grossAmount,
                status: 'preview',
                notes: ''
            };
        });

        console.log('[Payroll DEBUG] Generated entries:', previewEntries);
        setEntries(previewEntries);
    };

    useEffect(() => {
        fetchData();
    }, [periodType, periodDate]);

    const navigatePeriod = (direction: 'prev' | 'next') => {
        if (periodType === 'weekly') {
            setPeriodDate(d => direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1));
        } else if (periodType === 'biweekly') {
            setPeriodDate(d => direction === 'next' ? addWeeks(d, 2) : subWeeks(d, 2));
        } else {
            setPeriodDate(d => direction === 'next' ? addMonths(d, 1) : subMonths(d, 1));
        }
    };

    const createPeriod = async () => {
        const { start, end } = getPeriodRange();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // Create period
            const { data: periodData, error: periodError } = await supabase
                .from('payroll_periods')
                .insert({
                    tenant_id: user.id,
                    period_type: periodType,
                    period_start: format(start, 'yyyy-MM-dd'),
                    period_end: format(end, 'yyyy-MM-dd'),
                    status: 'open'
                } as any)
                .select()
                .single();

            if (periodError) throw periodError;

            // Create entries
            const entriesToInsert = entries.map(entry => ({
                period_id: periodData.id,
                member_id: entry.member_id,
                hours_worked: entry.hours_worked,
                days_worked: entry.days_worked,
                jobs_completed: entry.jobs_completed,
                booking_value_total: entry.booking_value_total,
                pay_type: entry.pay_type,
                pay_rate: entry.pay_rate,
                gross_amount: entry.gross_amount,
                bonuses: entry.bonuses,
                deductions: entry.deductions,
                status: 'pending'
            }));

            await supabase.from('payroll_entries').insert(entriesToInsert as any);

            toast.success('Período criado com sucesso!');
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao criar período');
        }
    };

    const approvePeriod = async () => {
        if (!currentPeriod) return;

        try {
            await supabase
                .from('payroll_periods')
                .update({ status: 'approved', approved_at: new Date().toISOString() } as any)
                .eq('id', currentPeriod.id);

            await supabase
                .from('payroll_entries')
                .update({ status: 'approved' } as any)
                .eq('period_id', currentPeriod.id);

            toast.success('Período aprovado!');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const markAsPaid = async () => {
        if (!currentPeriod) return;

        try {
            await supabase
                .from('payroll_periods')
                .update({ status: 'paid', paid_at: new Date().toISOString() } as any)
                .eq('id', currentPeriod.id);

            await supabase
                .from('payroll_entries')
                .update({ status: 'paid' } as any)
                .eq('period_id', currentPeriod.id);

            toast.success('Marcado como pago!');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleAdjustment = async () => {
        if (!selectedEntry || !currentPeriod) return;

        const update: any = {};
        if (adjustmentType === 'bonus') {
            update.bonuses = (selectedEntry.bonuses || 0) + adjustmentAmount;
            update.bonus_notes = adjustmentNotes;
        } else {
            update.deductions = (selectedEntry.deductions || 0) + adjustmentAmount;
            update.deduction_notes = adjustmentNotes;
        }

        try {
            await supabase
                .from('payroll_entries')
                .update(update)
                .eq('id', selectedEntry.id);

            toast.success('Ajuste aplicado!');
            setShowAdjustModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const exportCSV = () => {
        const { start, end } = getPeriodRange();
        const headers = ['Nome', 'Tipo Pagamento', 'Horas', 'Dias', 'Jobs', 'Taxa', 'Bruto', 'Bônus', 'Deduções', 'Líquido'];
        const rows = entries.map(e => [
            e.member?.name || '',
            e.pay_type,
            e.hours_worked,
            e.days_worked,
            e.jobs_completed,
            e.pay_rate,
            e.gross_amount.toFixed(2),
            e.bonuses.toFixed(2),
            e.deductions.toFixed(2),
            e.net_amount.toFixed(2)
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payroll_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.csv`;
        link.click();
        toast.success('CSV exportado!');
    };

    const { start, end } = getPeriodRange();
    const totalGross = entries.reduce((sum, e) => sum + e.gross_amount, 0);
    const totalNet = entries.reduce((sum, e) => sum + e.net_amount, 0);
    const totalBonuses = entries.reduce((sum, e) => sum + e.bonuses, 0);
    const totalDeductions = entries.reduce((sum, e) => sum + e.deductions, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Folha de Pagamento</h1>
                    <p className="text-slate-500">Gerencie pagamentos da sua equipe</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportCSV} className="gap-2">
                        <Download size={16} />
                        <span className="hidden sm:inline">Exportar CSV</span>
                    </Button>
                    {currentPeriod?.status === 'approved' && (
                        <Button onClick={markAsPaid} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle size={16} />
                            Marcar Pago
                        </Button>
                    )}
                </div>
            </div>

            {/* Period Selector */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Period Type */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        {(['weekly', 'biweekly', 'monthly'] as PeriodType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setPeriodType(type)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodType === type
                                    ? 'bg-white shadow text-slate-900'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {type === 'weekly' && 'Semanal'}
                                {type === 'biweekly' && 'Quinzenal'}
                                {type === 'monthly' && 'Mensal'}
                            </button>
                        ))}
                    </div>

                    {/* Period Navigation */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigatePeriod('prev')} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center min-w-[200px]">
                            <p className="text-sm font-semibold text-slate-900">
                                {format(start, 'd MMM', { locale: ptBR })} - {format(end, 'd MMM yyyy', { locale: ptBR })}
                            </p>
                            {currentPeriod && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${currentPeriod.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                    currentPeriod.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                    {currentPeriod.status === 'paid' && 'Pago'}
                                    {currentPeriod.status === 'approved' && 'Aprovado'}
                                    {currentPeriod.status === 'open' && 'Aberto'}
                                </span>
                            )}
                        </div>
                        <button onClick={() => navigatePeriod('next')} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Funcionários</p>
                            <p className="text-xl font-bold text-slate-900">{entries.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Total Bruto</p>
                            <p className="text-xl font-bold text-slate-900">R$ {totalGross.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <Plus size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Bônus</p>
                            <p className="text-xl font-bold text-emerald-600">+R$ {totalBonuses.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <CheckCircle size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Total Líquido</p>
                            <p className="text-xl font-bold text-indigo-600">R$ {totalNet.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase">Funcionário</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase hidden md:table-cell">Tipo</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-slate-400 uppercase hidden lg:table-cell">Trabalho</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-slate-400 uppercase">Bruto</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-slate-400 uppercase hidden sm:table-cell">Ajustes</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-slate-400 uppercase">Líquido</th>
                                <th className="text-center py-4 px-6 text-xs font-bold text-slate-400 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {entries.map(entry => (
                                <tr key={entry.id} className="hover:bg-slate-50">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                                style={{ backgroundColor: entry.member?.color || '#6366f1' }}
                                            >
                                                {entry.member?.name?.[0] || '?'}
                                            </div>
                                            <span className="font-medium text-slate-900">{entry.member?.name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 hidden md:table-cell">
                                        <span className="text-sm text-slate-600 capitalize">{entry.pay_type}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right hidden lg:table-cell">
                                        <div className="text-xs text-slate-500 space-y-0.5">
                                            {entry.pay_type === 'hourly' && <div>{entry.hours_worked}h</div>}
                                            {entry.pay_type === 'daily' && <div>{entry.days_worked} dias</div>}
                                            {entry.pay_type === 'per_job' && <div>{entry.jobs_completed} jobs</div>}
                                            {entry.pay_type === 'commission' && <div>R$ {entry.booking_value_total.toFixed(0)}</div>}
                                            {entry.pay_type === 'salary' && <div>Fixo</div>}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className="font-medium text-slate-900">R$ {entry.gross_amount.toFixed(2)}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right hidden sm:table-cell">
                                        <div className="space-y-0.5">
                                            {entry.bonuses > 0 && (
                                                <div className="text-xs text-emerald-600">+R$ {entry.bonuses.toFixed(2)}</div>
                                            )}
                                            {entry.deductions > 0 && (
                                                <div className="text-xs text-red-600">-R$ {entry.deductions.toFixed(2)}</div>
                                            )}
                                            {entry.bonuses === 0 && entry.deductions === 0 && (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className="font-bold text-indigo-600">R$ {entry.net_amount.toFixed(2)}</span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {currentPeriod && currentPeriod.status === 'open' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedEntry(entry);
                                                    setShowAdjustModal(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                title="Ajustar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-end gap-3">
                {!currentPeriod && entries.length > 0 && (
                    <Button onClick={createPeriod} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <FileText size={16} />
                        Criar Período
                    </Button>
                )}
                {currentPeriod?.status === 'open' && (
                    <Button onClick={approvePeriod} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <CheckCircle size={16} />
                        Aprovar Período
                    </Button>
                )}
            </div>

            {/* Adjustment Modal */}
            {showAdjustModal && selectedEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Ajustar Pagamento</h2>
                        <p className="text-sm text-slate-500 mb-4">Funcionário: <strong>{selectedEntry.member?.name}</strong></p>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={() => setAdjustmentType('bonus')}
                                className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${adjustmentType === 'bonus'
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 text-slate-600'
                                    }`}
                            >
                                <Plus size={18} className="mx-auto mb-1" />
                                Bônus
                            </button>
                            <button
                                onClick={() => setAdjustmentType('deduction')}
                                className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${adjustmentType === 'deduction'
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-200 text-slate-600'
                                    }`}
                            >
                                <Minus size={18} className="mx-auto mb-1" />
                                Dedução
                            </button>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    value={adjustmentAmount}
                                    onChange={e => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo/Notas</label>
                                <input
                                    type="text"
                                    value={adjustmentNotes}
                                    onChange={e => setAdjustmentNotes(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                                    placeholder="Ex: Hora extra, Adiantamento..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowAdjustModal(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button onClick={handleAdjustment} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                Aplicar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
