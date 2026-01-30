
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Phone,
    MessageSquare,
    BarChart3,
    History,
    Settings as SettingsIcon,
    DollarSign,
    ArrowUpRight,
    ArrowDownLeft,
    Zap,
    Users
} from 'lucide-react';
import { UnifiedInbox } from './UnifiedInbox';
import { CommsSettings } from './CommsSettings';
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';
import { useEffect } from 'react';

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from 'recharts';

type TelephonyTab = 'dashboard' | 'inbox' | 'logs' | 'settings';

// MOCK_DATA_CHART removed
const COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'];

export const TelephonyHub: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TelephonyTab>('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <TelephonyDashboard />;
            case 'inbox':
                return <UnifiedInbox />;
            case 'logs':
                return <TelephonyLogs />;
            case 'settings':
                return <CommsSettings />;
            default:
                return <TelephonyDashboard />;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between bg-white/40 p-6 rounded-3xl border border-white/60 backdrop-blur-xl shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <Phone size={24} />
                        </div>
                        Telephony Hub
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Sua central de comando World-Class Call Center.</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200/50">
                    {(['dashboard', 'inbox', 'logs', 'settings'] as TelephonyTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab
                                ? 'bg-white text-indigo-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)] scale-105'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
};

const TelephonyDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        callsCount: 0,
        callsDuration: 0,
        smsCount: 0,
        totalCost: 0,
        chartData: [] as any[]
    });
    const [prices, setPrices] = useState({
        voice: '0.08',
        sms: '0.05',
        mms: '0.10',
        rcs: '0.07'
    });
    const [activeNumber, setActiveNumber] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Prices
            let currentPrices = { voice: 0.08, sms: 0.05 };
            const { data: sub } = await supabase.from('tenant_subscriptions').select('plan_id').eq('tenant_id', user.id).maybeSingle();
            const planId = sub?.plan_id || 'system_essentials';

            const { data: settings } = await supabase.from('platform_settings').select('value').eq('key', `TELEPHONY_PRICES:${planId}`).maybeSingle();
            if (settings) {
                try {
                    const parsed = JSON.parse(settings.value);
                    setPrices(parsed);
                    currentPrices = {
                        voice: parseFloat(parsed.voice || '0.08'),
                        sms: parseFloat(parsed.sms || '0.05')
                    };
                } catch (e) { }
            }

            // 2. Fetch Logs (Last 30 Days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const isoDate = thirtyDaysAgo.toISOString();

            const { data: callLogs } = await supabase
                .from('call_logs')
                .select('created_at, duration_seconds')
                .gte('created_at', isoDate)
                .eq('tenant_id', user.id);

            const { data: smsLogs } = await supabase
                .from('sms_logs')
                .select('created_at, direction')
                .gte('created_at', isoDate)
                .eq('tenant_id', user.id);

            // 3. Process Stats
            const calls = callLogs || [];
            const sms = smsLogs || [];

            const callsCount = calls.length;
            const callsDuration = calls.reduce((acc: number, c: any) => acc + (c.duration_seconds || 0), 0);
            const callsCost = (callsDuration / 60) * currentPrices.voice;

            const smsCount = sms.length;
            const smsCost = smsCount * currentPrices.sms;

            const totalCost = callsCost + smsCost;

            // 4. Generate Chart Data (Group by Day)
            const dailyMap = new Map();
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const k = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                dailyMap.set(k, 0);
            }

            [...calls, ...sms].forEach((item: any) => {
                const date = new Date(item.created_at);
                const k = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                if (dailyMap.has(k)) {
                    let cost = 0;
                    if ('duration_seconds' in item) {
                        cost = (item.duration_seconds / 60) * currentPrices.voice;
                    } else {
                        cost = currentPrices.sms;
                    }
                    dailyMap.set(k, dailyMap.get(k) + cost);
                }
            });

            const chartData = Array.from(dailyMap.entries()).map(([name, cost]: any) => ({ name, cost: parseFloat(cost.toFixed(2)) }));

            setStats({
                callsCount,
                callsDuration,
                smsCount,
                totalCost,
                chartData
            });

            // 5. Fetch Active Number
            const { data: telnyx } = await supabase.from('telnyx_settings').select('phone_number').eq('user_id', user.id).maybeSingle();
            if (telnyx?.phone_number) setActiveNumber(telnyx.phone_number);
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-6 overflow-y-auto h-full pr-2 pb-10 custom-scrollbar">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Chamadas Efetivas"
                    value={stats.callsCount.toLocaleString()}
                    trend="Atividade"
                    icon={Phone}
                    iconBg="bg-blue-600 shadow-blue-100"
                    description={`${(stats.callsDuration / 60).toFixed(0)} min consumidos`}
                />
                <StatCard
                    title="SMS & RCS"
                    value={stats.smsCount.toLocaleString()}
                    trend="Mensagens"
                    icon={MessageSquare}
                    iconBg="bg-indigo-600 shadow-indigo-100"
                    description="Total enviado/recebido"
                />
                <StatCard
                    title="Custo Acumulado"
                    value={`$ ${stats.totalCost.toFixed(2)}`}
                    trend="USD"
                    icon={DollarSign}
                    iconBg="bg-emerald-600 shadow-emerald-100"
                    description="Este ciclo"
                />
                <StatCard
                    title="Sessões de Suporte"
                    value="0"
                    trend="--"
                    icon={Zap}
                    iconBg="bg-amber-500 shadow-amber-100"
                    description="Tempo real"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Graph */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <div>
                            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-xs">
                                <BarChart3 size={16} className="text-indigo-600" />
                                Fluxo de Custos Operacionais
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Visualização diária (USD)</p>
                        </div>
                    </div>
                    <div className="p-8 h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                    formatter={(v: any) => [`$ ${v}`, 'Custo']}
                                />
                                <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCost)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sub-costs Pie */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col h-full">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-xs mb-8">
                        <Zap size={16} className="text-amber-500" />
                        Repartição por Serviço
                    </h3>
                    {stats.totalCost > 0 ? (
                        <div className="flex-1 flex flex-col">
                            <div className="h-48 w-full mb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Chamadas', value: (stats.callsDuration / 60) * parseFloat(prices.voice) },
                                                { name: 'SMS', value: stats.smsCount * parseFloat(prices.sms) },
                                            ]}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill={COLORS[0]} />
                                            <Cell fill={COLORS[1]} />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-4">
                                <CostProgressBar label="Chamadas" value={(stats.callsDuration / 60) * parseFloat(prices.voice)} percentage={50} color="bg-indigo-500" />
                                <CostProgressBar label="SMS" value={stats.smsCount * parseFloat(prices.sms)} percentage={50} color="bg-purple-500" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Sem dados recentes</div>
                    )}
                </div>
            </div>

            {/* Bottom Section: Active Numbers & Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                        <Phone size={120} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 italic">Seu Plano de Telefonia</h4>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                <span className="text-sm font-bold opacity-60">Mensalidade do Plano</span>
                                <span className="text-lg font-black font-mono">$ 99.00/mês</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Custo Chamada Out</p>
                                    <p className="text-sm font-black italic">$ {parseFloat(prices.voice).toFixed(2)} / min</p>
                                </div>
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Custo SMS / RCS</p>
                                    <p className="text-sm font-black italic">$ {parseFloat(prices.sms).toFixed(2)} / msg</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col justify-between shadow-sm">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Números Ativos</h4>
                        {activeNumber ? (
                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <Phone size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-base font-black text-slate-900">{activeNumber}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Universal Voice/SMS</p>
                                </div>
                                <Button variant="ghost" size="sm" className="text-emerald-600 font-bold hover:bg-emerald-50">Online</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <Phone size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-base font-black text-slate-900">Nenhum número ativo</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Verifique Configurações</p>
                                </div>
                                <Button variant="ghost" size="sm" className="text-indigo-600 font-bold hover:bg-indigo-50">Configurar</Button>
                            </div>
                        )}
                    </div>
                    <Button className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs mt-6 rounded-2xl shadow-xl shadow-slate-100">
                        Gerenciar Assinatua & Checkout
                    </Button>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, trend, icon: Icon, iconBg, description }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${iconBg} transition-transform group-hover:scale-110`}>
                <Icon size={20} />
            </div>
            <span className={`text-xs font-black px-2 py-1 rounded-lg ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {trend}
            </span>
        </div>
        <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</h4>
            <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
            <p className="text-xs text-slate-500 font-medium">{description}</p>
        </div>
    </div>
);

const CostProgressBar = ({ label, value, percentage, color }: any) => (
    <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
            <span className="font-bold text-slate-700">{label}</span>
            <span className="font-black text-slate-900 text-xs">$ {value.toFixed(2)}</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className={`h-full transition-all duration-1000 ${color}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    </div>
);

const ActivityItem = ({ type, title, subtitle, time, pulse, urgent }: any) => (
    <div className="flex gap-4 group cursor-default">
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${urgent ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-slate-400'
            }`}>
            {type === 'call' ? <Phone size={18} /> : <MessageSquare size={18} />}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline gap-2">
                <h5 className="text-sm font-bold truncate">{title}</h5>
                <span className={`text-[10px] font-medium shrink-0 ${pulse ? 'text-amber-400' : 'text-slate-500'}`}>{time}</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate tracking-tight">{subtitle}</p>
        </div>
    </div>
);

import { CallRecapCard } from './call-recap-card';
import { ContactActionMenu } from './ContactActionMenu';
import { QuickSmsModal } from './QuickSmsModal';

const TelephonyLogs: React.FC = () => {
    const [selectedCall, setSelectedCall] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [smsModalOpen, setSmsModalOpen] = useState(false);
    const [smsTargetNumber, setSmsTargetNumber] = useState('');

    // Listen for quick-sms events
    useEffect(() => {
        const handleQuickSms = (e: CustomEvent<{ number: string }>) => {
            if (e.detail?.number) {
                setSmsTargetNumber(e.detail.number);
                setSmsModalOpen(true);
            }
        };
        window.addEventListener('quick-sms', handleQuickSms as EventListener);
        return () => window.removeEventListener('quick-sms', handleQuickSms as EventListener);
    }, []);

    useEffect(() => {
        const fetchLogs = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: calls } = await supabase.from('call_logs').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }).limit(20);
            const { data: sms } = await supabase.from('sms_logs').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }).limit(20);
            const merged = [
                ...(calls || []).map((c: any) => ({ ...c, type: 'call' })),
                ...(sms || []).map((s: any) => ({ ...s, type: 'sms' }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setLogs(merged);
            setLoading(false);
        };
        fetchLogs();
    }, []);

    return (
        <div className="flex gap-6 h-full">
            <div className={`bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-500 ${selectedCall ? 'w-1/2' : 'w-full'}`}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                        <History size={16} className="text-indigo-600" />
                        Histórico Detalhado
                    </h3>
                    <div className="flex gap-2">
                        <select className="bg-white border border-slate-200 text-[10px] font-bold uppercase py-1 px-3 rounded-lg outline-none cursor-pointer hover:border-indigo-300">
                            <option>Hoje</option>
                            <option>Ontem</option>
                            <option>Últimos 7 dias</option>
                        </select>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm z-10">
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">De/Para</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? <tr><td colSpan={5} className="p-4 text-center text-slate-400">Carregando...</td></tr> :
                                logs.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-slate-400">Nenhum registro encontrado</td></tr> :
                                    logs.map((log: any) => {
                                        const otherPartyNumber = log.direction === 'outbound' ? log.to_number : log.from_number;
                                        return (
                                            <tr
                                                key={log.id}
                                                onClick={() => log.type === 'call' && setSelectedCall(log)}
                                                className={`hover:bg-indigo-50/30 transition-colors group cursor-pointer ${selectedCall?.id === log.id ? 'bg-indigo-50/50' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {log.type === 'call' ? (
                                                            <>
                                                                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                                    <Phone size={14} />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-600">Ligação</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                                    <MessageSquare size={14} />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-600">SMS</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-start">
                                                        <ContactActionMenu phoneNumber={otherPartyNumber} customerName={otherPartyNumber}>
                                                            <button
                                                                className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline transition-all text-left"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {otherPartyNumber || 'Desconhecido'}
                                                            </button>
                                                        </ContactActionMenu>
                                                        <span className="text-[10px] text-slate-400 font-medium">{log.direction === 'outbound' ? 'Enviada' : 'Recebida'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-black text-indigo-600">
                                                        $ {(log.type === 'call' ? ((log.duration_seconds || 0) / 60 * 0.08) : 0.05).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-slate-400 tracking-tight">
                                                        {new Date(log.created_at).toLocaleString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Trigger call via Telnyx context
                                                                window.dispatchEvent(new CustomEvent('quick-call', { detail: { number: otherPartyNumber } }));
                                                            }}
                                                            title="Ligar"
                                                        >
                                                            <Phone size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.dispatchEvent(new CustomEvent('quick-sms', { detail: { number: otherPartyNumber } }));
                                                            }}
                                                            title="Enviar SMS"
                                                        >
                                                            <MessageSquare size={14} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{logs.length} registros</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled className="h-8 text-xs font-bold border-slate-200 opacity-50 cursor-not-allowed">Ant</Button>
                        <Button variant="outline" size="sm" disabled className="h-8 text-xs font-bold border-slate-200 opacity-50 cursor-not-allowed">Próx</Button>
                    </div>
                </div>
            </div>

            {selectedCall && (
                <div className="w-1/2 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-500">
                    <div className="bg-white/40 backdrop-blur-md p-2 rounded-[2rem] border border-white/60 mb-4 sticky top-0 z-20 flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-4">Call Intelligence</h4>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCall(null)} className="h-8 w-8 p-0 rounded-full">
                            ✕
                        </Button>
                    </div>
                    <CallRecapCard log={selectedCall} />

                    <div className="mt-6 bg-slate-900 rounded-[2rem] p-8 text-white">
                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 mb-4">Playback da Gravação</h5>
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/5">
                            <Button size="sm" className="h-10 w-10 bg-white text-slate-900 rounded-full">▶</Button>
                            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 w-1/3" />
                            </div>
                            <span className="text-[10px] font-bold font-mono">01:12 / 04:22</span>
                        </div>
                    </div>
                </div>
            )}

            <QuickSmsModal
                isOpen={smsModalOpen}
                onClose={() => setSmsModalOpen(false)}
                phoneNumber={smsTargetNumber}
                customerName={smsTargetNumber}
            />
        </div>
    );
};
