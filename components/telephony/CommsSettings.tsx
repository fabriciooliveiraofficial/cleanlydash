
import React, { useState } from 'react';
import {
    BarChart3,
    Smartphone,
    CreditCard,
    Plus,
    Activity,
    MoreHorizontal,
    ShieldCheck,
    Zap,
    Phone
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { toast } from 'sonner';

export const CommsSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'numbers' | 'billing'>('overview');

    // Mock Data
    const usageStats = {
        minutes_used: 342,
        minutes_limit: 1000,
        sms_sent: 1250,
        sms_limit: 5000,
        balance: 45.50
    };

    const activeNumbers = [
        { id: 1, number: '+1 (555) 123-4567', region: 'US', type: 'Local', status: 'Active' },
        { id: 2, number: '+1 (555) 987-6543', region: 'US', type: 'Toll-Free', status: 'Active' }
    ];

    return (
        <div className="flex-1 glass-panel rounded-3xl overflow-hidden flex flex-col border-white/50 p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Comunicação</h2>
                    <p className="text-slate-500">Controle minutos, números e faturamento.</p>
                </div>
                <div className="flex gap-2 p-1 bg-white/50 rounded-xl border border-white/60">
                    <Button
                        variant={activeTab === 'overview' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('overview')}
                        className={`rounded-lg text-sm ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}
                    >
                        <Activity size={16} className="mr-2" /> Visão Geral
                    </Button>
                    <Button
                        variant={activeTab === 'numbers' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('numbers')}
                        className={`rounded-lg text-sm ${activeTab === 'numbers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}
                    >
                        <Smartphone size={16} className="mr-2" /> Números
                    </Button>
                    <Button
                        variant={activeTab === 'billing' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('billing')}
                        className={`rounded-lg text-sm ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}
                    >
                        <CreditCard size={16} className="mr-2" /> Planos
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1 */}
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-white/20 p-2.5 rounded-xl"><Zap size={20} className="text-white" /></span>
                                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">+12% vs last mo</span>
                                </div>
                                <h3 className="text-3xl font-black mb-1">{usageStats.minutes_used}</h3>
                                <p className="text-indigo-100 text-sm font-medium">Minutos de Voz Usados</p>
                                <div className="mt-4 h-1.5 bg-black/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/90 w-[34%] rounded-full"></div>
                                </div>
                                <p className="text-[10px] opacity-70 mt-2 text-right">34% do plano básico</p>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-6 text-slate-800 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-emerald-100 p-2.5 rounded-xl"><Send size={20} className="text-emerald-600" /></span>
                                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Healthy</span>
                                </div>
                                <h3 className="text-3xl font-black mb-1 text-slate-800">{usageStats.sms_sent}</h3>
                                <p className="text-slate-500 text-sm font-medium">Mensagens Enviadas</p>
                                <div className="mt-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[25%] rounded-full"></div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-right">25% do limite mensal</p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-6 text-slate-800 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-amber-100 p-2.5 rounded-xl"><CreditCard size={20} className="text-amber-600" /></span>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100">Recarregar</Button>
                                </div>
                                <h3 className="text-3xl font-black mb-1 text-slate-800">${usageStats.balance.toFixed(2)}</h3>
                                <p className="text-slate-500 text-sm font-medium">Créditos Disponíveis</p>
                                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                                    A recarga automática ocorre quando o saldo chega a $10.00.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-white/40 border border-white/60 rounded-3xl">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 size={18} /> Histórico de Consumo</h3>
                            <div className="h-48 flex items-end justify-between gap-2 px-2 pb-2">
                                {[45, 60, 35, 78, 52, 65, 80, 55, 62, 48, 70, 66].map((h, i) => (
                                    <div key={i} className="w-full bg-indigo-500/10 hover:bg-indigo-500/30 transition-colors rounded-t-lg relative group" style={{ height: `${h}%` }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            {h} calls
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                                <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* NUMBERS TAB */}
                {activeTab === 'numbers' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-indigo-50/50 p-6 rounded-3xl border border-indigo-50">
                            <div>
                                <h3 className="font-bold text-indigo-900 text-lg">Adquirir Novo Número</h3>
                                <p className="text-indigo-700/70 text-sm">Expanda sua presença local ou internacional.</p>
                            </div>
                            <Button onClick={() => toast.info("Number provisioning dialog coming soon!")} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 text-white rounded-xl h-12 px-6">
                                <Plus size={18} className="mr-2" /> Comprar Número
                            </Button>
                        </div>

                        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/50 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200/50 text-slate-500 font-bold text-[10px] uppercase tracking-wider bg-slate-50/30">
                                        <th className="px-6 py-4">Número</th>
                                        <th className="px-6 py-4">Região</th>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4">Capabilities</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {activeNumbers.map(n => (
                                        <tr key={n.id} className="hover:bg-white/80 transition-colors">
                                            <td className="px-6 py-5 font-bold text-slate-700 flex items-center gap-3">
                                                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Phone size={14} /></div>
                                                {n.number}
                                            </td>
                                            <td className="px-6 py-5 text-slate-600">{n.region}</td>
                                            <td className="px-6 py-5"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] uppercase font-bold">{n.type}</span></td>
                                            <td className="px-6 py-5 text-slate-400 text-xs flex gap-2">
                                                <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">Voice</span>
                                                <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">SMS</span>
                                                <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">WhatsApp</span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><MoreHorizontal size={18} /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* BILLING TAB */}
                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        <div className="flex gap-6">
                            <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-6">
                                        <ShieldCheck className="text-emerald-400" />
                                        <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Enterprise Plan</span>
                                    </div>
                                    <h2 className="text-3xl font-bold mb-2">Unlimited Pro</h2>
                                    <p className="text-slate-400 text-sm mb-8">Next billing date: <strong>Feb 01, 2026</strong></p>

                                    <div className="flex items-end gap-1 mb-8">
                                        <span className="text-4xl font-light">$</span>
                                        <span className="text-5xl font-bold">299</span>
                                        <span className="text-slate-400 mb-1">/mo</span>
                                    </div>

                                    <Button className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl py-6">Gerenciar Assinatura</Button>
                                </div>
                            </div>

                            <div className="w-[300px] flex flex-col gap-4">
                                <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-5 flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><CreditCard size={24} /></div>
                                    <div>
                                        <p className="font-bold text-slate-700">Visa •••• 4242</p>
                                        <p className="text-xs text-slate-500">Expires 12/28</p>
                                    </div>
                                </div>
                                <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-5 flex items-center gap-4">
                                    <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Plus size={24} /></div>
                                    <div>
                                        <p className="font-bold text-slate-700">Add Method</p>
                                        <p className="text-xs text-slate-500">Credit or Debit</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
