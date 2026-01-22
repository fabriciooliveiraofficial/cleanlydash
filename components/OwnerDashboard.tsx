import React from 'react';
import { Building, DollarSign, CalendarCheck } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import { createClient } from '../lib/supabase/client.ts';
import { useRole } from '../hooks/use-role.ts';
import { useEffect, useState } from 'react';

export const OwnerDashboard: React.FC = () => {
    const [stats, setStats] = useState([
        { label: 'Minhas Propriedades', value: '0', icon: Building, color: 'text-indigo-500' },
        { label: 'Ocupação (Mês)', value: '0%', icon: CalendarCheck, color: 'text-emerald-500' },
        { label: 'Repasse Estimado', value: 'R$ 0,00', icon: DollarSign, color: 'text-amber-500' },
    ]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const { user } = useRole(); // Get current user (Owner)

    useEffect(() => {
        async function fetchOwnerData() {
            try {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

                // 1. Fetch My Properties (RLS Filtered)
                // Note: If 'properties' table doesn't support Owner RLS yet, this might return 0. 
                // We rely on the platform RLS policies being correctly set up for the 'owner' role.
                const { data: properties, error: propError } = await supabase
                    .from('properties')
                    .select('id');

                // If properties fetch fails or returns empty, we might try counting unique calendars from bookings as fallback?
                // For now, adhere to schema.
                const propertyCount = properties?.length || 0;

                // 2. Fetch My Bookings (RLS Filtered) for Month
                const { data: bookings } = await supabase
                    .from('bookings')
                    .select('price, start_date, end_date')
                    .gte('start_date', startOfMonth)
                    .lte('start_date', endOfMonth);

                const validBookings = bookings || [];

                // 3. Calculate Revenue (Estimated Payout)
                const revenue = validBookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);

                // 4. Calculate Occupancy
                // Total Capacity = Properties * Days in Month
                // Booked Days = Sum of (End - Start) overlapping this month
                let occupancyRate = 0;
                if (propertyCount > 0) {
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    const totalCapacityDays = propertyCount * daysInMonth;

                    const totalBookedDays = validBookings.reduce((acc, b) => {
                        const start = new Date(b.start_date);
                        const end = new Date(b.end_date);
                        // Simple difference in days
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
                    const day = new Date(b.start_date).getDate();
                    const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
                    weeks[weekIndex] += Number(b.price) || 0;
                });

                setChartData([
                    { name: 'Sem 1', value: weeks[0] },
                    { name: 'Sem 2', value: weeks[1] },
                    { name: 'Sem 3', value: weeks[2] },
                    { name: 'Sem 4', value: weeks[3] },
                ]);

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
                <div className="h-64 w-full min-w-0">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
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
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                            Sem dados para o período
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
