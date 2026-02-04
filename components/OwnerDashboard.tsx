import React from 'react';
import { Building, DollarSign, CalendarCheck, Clock, MapPin } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import { createClient } from '../lib/supabase/client.ts';
import { useRole } from '../hooks/use-role.ts';
import { cn } from '../lib/utils.ts';
import { useEffect, useState, useRef } from 'react';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimezone } from '../contexts/TimezoneContext';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";

export const OwnerDashboard: React.FC = () => {
    const [stats, setStats] = useState([
        { label: 'Minhas Propriedades', value: '0', icon: Building, color: 'text-indigo-500' },
        { label: 'Ocupação (Mês)', value: '0%', icon: CalendarCheck, color: 'text-emerald-500' },
        { label: 'Repasse Estimado', value: 'R$ 0,00', icon: DollarSign, color: 'text-amber-500' },
    ]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [todayBookings, setTodayBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const { timezone, now: zonedNow, formatTime } = useTimezone();

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            if (!entries.length) return;
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                setDimensions({ width, height });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        async function fetchOwnerData() {
            try {
                const monthStart = startOfMonth(zonedNow);
                const monthEnd = endOfMonth(zonedNow);

                const startOfMonthISO = monthStart.toISOString();
                const endOfMonthISO = monthEnd.toISOString();

                // 1. Fetch My Properties (RLS Filtered)
                const { data: properties } = await supabase
                    .from('properties')
                    .select('id');

                const propertyCount = properties?.length || 0;

                // 2. Fetch My Bookings (RLS Filtered) for Month
                const { data: bookings } = await supabase
                    .from('bookings')
                    .select('price, start_date, end_date')
                    .gte('start_date', startOfMonthISO)
                    .lte('start_date', endOfMonthISO);

                const validBookings = (bookings || []) as any[];

                // 3. Calculate Revenue (Estimated Payout)
                const revenue = validBookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);

                // 4. Calculate Occupancy
                let occupancyRate = 0;
                if (propertyCount > 0) {
                    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
                    const totalCapacityDays = propertyCount * daysInMonth;

                    const totalBookedDays = validBookings.reduce((acc, b) => {
                        const start = new Date(b.start_date);
                        const end = new Date(b.end_date);
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return acc + diffDays;
                    }, 0);

                    occupancyRate = Math.min(Math.round((totalBookedDays / totalCapacityDays) * 100), 100);
                }

                setStats([
                    { label: 'Minhas Propriedades', value: propertyCount.toString(), icon: Building, color: 'text-indigo-500' },
                    { label: 'Ocupação (Mês)', value: `${occupancyRate}%`, icon: CalendarCheck, color: 'text-emerald-500' },
                    { label: 'Repasse Estimado', value: `R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-amber-500' },
                ]);

                // 5. Build Chart Data (Weekly)
                const weeks = [0, 0, 0, 0];
                validBookings.forEach(b => {
                    const day = toZonedTime(parseISO(b.start_date), timezone).getDate();
                    const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
                    weeks[weekIndex] += Number(b.price) || 0;
                });

                setChartData([
                    { name: 'Sem 1', value: weeks[0] },
                    { name: 'Sem 2', value: weeks[1] },
                    { name: 'Sem 3', value: weeks[2] },
                    { name: 'Sem 4', value: weeks[3] },
                ]);

                // 6. Filter Today's Bookings
                const today = new Date();
                const todayList = validBookings.filter(b => isSameDay(toZonedTime(parseISO(b.start_date), timezone), zonedNow));
                setTodayBookings(todayList);

            } catch (err) {
                console.error('Owner Dashboard Error:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchOwnerData();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Portal do Investidor</h2>
                <p className="text-[var(--text-secondary)] text-sm">Visão consolidada do seu portfólio.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-bold">{stat.label}</span>
                            <stat.icon size={18} className={stat.color} />
                        </div>
                        <span className="text-3xl font-bold text-[var(--text-primary)]">{stat.value}</span>
                    </div>
                ))}
            </div>

            <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-6">Tendência de Receita</h3>
                <div ref={containerRef} className="h-64 w-full min-w-0 bg-slate-50/50 rounded-2xl overflow-hidden relative"
                    style={{ minHeight: '256px' }}>
                    {(dimensions.width > 0 && chartData.length > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400 font-medium h-64">
                            {loading ? 'Carregando dados...' : 'Sem dados para o período'}
                        </div>
                    )}
                </div>
            </div>

            {/* Today's Bookings Table */}
            <div className="glass-panel p-6 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Agendamentos de Hoje</h3>
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-1">
                            {formatInTimeZone(zonedNow, timezone, "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>
                    <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-100">
                        {todayBookings.length} Ativo(s)
                    </Badge>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white/40">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 border-none">
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Propriedade</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-center">Horário</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-center">Status</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {todayBookings.length > 0 ? (
                                todayBookings.map((booking) => (
                                    <TableRow key={booking.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <Building size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{booking.summary || 'Residência'}</p>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                        <MapPin size={10} />
                                                        <span className="truncate max-w-[150px]">Check-in/out hoje</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                    <Clock size={10} />
                                                    {format(parseISO(booking.start_date), 'HH:mm')}
                                                </div>
                                                <span className="text-[9px] text-slate-400">até {format(parseISO(booking.end_date), 'HH:mm')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "text-[9px] px-2 py-0.5",
                                                    booking.status === 'confirmed' && "bg-blue-100 text-blue-700",
                                                    booking.status === 'in_progress' && "bg-amber-100 text-amber-700",
                                                    booking.status === 'completed' && "bg-emerald-100 text-emerald-700"
                                                )}
                                            >
                                                {booking.status === 'confirmed' && 'Confirmado'}
                                                {booking.status === 'in_progress' && 'Em Andamento'}
                                                {booking.status === 'completed' && 'Concluído'}
                                                {booking.status !== 'confirmed' && booking.status !== 'in_progress' && booking.status !== 'completed' && booking.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-xs font-black text-slate-900">
                                                R$ {Number(booking.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-slate-400 text-xs font-medium italic">
                                        Nenhum agendamento para hoje.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};
