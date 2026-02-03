import React, { useEffect, useState } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, Play, Download, Brain, FileText, Smile, ShieldCheck, Globe, Loader2, Zap, Sparkles } from 'lucide-react';
import { createPlatformClient } from '../../../lib/supabase/platform-client';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { DialerWidget } from '../../telephony/dialer-widget';

export const TelephonyManager: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [provisioning, setProvisioning] = useState(false);
    const [diagnosis, setDiagnosis] = useState<any>(null);
    const supabase = createPlatformClient();

    const handleDiagnosis = async () => {
        setProvisioning(true);
        setDiagnosis(null);
        try {
            const { data, error } = await supabase.functions.invoke('provision_tenant', {
                body: { action: 'diagnosis' }
            });
            if (error) throw error;
            setDiagnosis(data.diagnosis);
            toast.success("Diagnóstico concluído!");
        } catch (e: any) {
            toast.error("Falha no Diagnóstico: " + e.message);
        } finally {
            setProvisioning(false);
        }
    };

    const handleResyncAll = async () => {
        if (!confirm("Isso iniciará uma auditoria inteligente em todos os recursos Telnyx. Continuar?")) return;
        setProvisioning(true);
        try {
            const { data, error } = await supabase.functions.invoke('provision_tenant', {
                body: { action: 'sync' } // Standardized action
            });
            if (error) throw error;
            toast.success("Resync concluído com sucesso!");
        } catch (e: any) {
            toast.error("Falha no Resync: " + e.message);
        } finally {
            setProvisioning(false);
        }
    };

    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [prices, setPrices] = useState({
        voice: '0.00',
        sms: '0.00',
        mms: '0.00',
        rcs: '0.00'
    });

    useEffect(() => {
        fetchLogs();
        fetchPlans();
    }, []);

    useEffect(() => {
        if (selectedPlanId) {
            fetchPricesForPlan(selectedPlanId);
        }
    }, [selectedPlanId]);

    const fetchPlans = async () => {
        const { data, error } = await supabase
            .from('plans')
            .select('id, name')
            .in('type', ['telephony', 'combo'])
            .order('name');

        if (!error && data) {
            setPlans(data);
            if (data.length > 0) setSelectedPlanId(data[0].id);
        }
    };

    const fetchPricesForPlan = async (planId: string) => {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', `TELEPHONY_PRICES:${planId}`)
            .single();

        if (!error && data) {
            try {
                const parsed = JSON.parse(data.value);
                setPrices({
                    voice: parsed.voice || '0.00',
                    sms: parsed.sms || '0.00',
                    mms: parsed.mms || '0.00',
                    rcs: parsed.rcs || '0.00'
                });
            } catch (e) {
                console.error("Error parsing prices for plan", planId, e);
            }
        } else {
            setPrices({ voice: '0.00', sms: '0.00', mms: '0.00', rcs: '0.00' });
        }
    };

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('call_logs')
            .select(`*, tenant_profiles(name)`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            toast.error('Erro ao buscar logs de chamadas');
        } else {
            setLogs(data as any || []);
        }
        setLoading(false);
    };

    const handleSavePrices = async () => {
        if (!selectedPlanId) return toast.error("Selecione um plano primeiro");
        setProvisioning(true);
        try {
            const key = `TELEPHONY_PRICES:${selectedPlanId}`;
            const value = JSON.stringify(prices);

            const { error } = await supabase
                .from('platform_settings')
                .upsert({ key, value }, { onConflict: 'key' });

            if (error) throw error;
            toast.success(`Preços atualizados!`);
        } catch (e: any) {
            toast.error("Erro ao salvar preços: " + e.message);
        } finally {
            setProvisioning(false);
        }
    };

    return (
        <div className="space-y-6 relative min-h-[500px]">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Telephony inspector</h2>
                    <p className="text-slate-500">Supervisão e gestão de consumo da plataforma.</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                        <span className="block text-xs text-slate-500 uppercase font-bold text-center">Chamadas (24h)</span>
                        <span className="text-xl font-bold text-slate-800 block text-center">{logs.length}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* UNIFIED CONNECTIVITY ENGINE SECTION */}
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col border border-indigo-500/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Brain className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-white">Self-Healing Engine</h3>
                            <p className="text-[10px] text-slate-400 font-bold">Resync & Automated Setup</p>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <div className="flex items-start gap-4">
                                <ShieldCheck className="text-emerald-400 h-5 w-5 mt-1" />
                                <div>
                                    <p className="text-xs font-bold text-slate-100 italic">"Management by Solution, not Repair"</p>
                                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                        A arquitetura unificada agora gerencia chaves mestras e provisionamento de forma transparente.
                                        O motor master audita automaticamente Messaging Profiles, conexões SIP e webhooks em tempo real.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleResyncAll}
                                disabled={provisioning}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-11 rounded-xl font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-indigo-500/20"
                            >
                                {provisioning ? <Loader2 className="animate-spin" size={18} /> : (
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={14} />
                                        Force Platform Resync
                                    </div>
                                )}
                            </Button>
                            <Button
                                onClick={handleDiagnosis}
                                disabled={provisioning}
                                variant="outline"
                                className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-300 h-11 rounded-xl font-bold text-[11px] uppercase tracking-wider"
                            >
                                {provisioning ? <Loader2 className="animate-spin" size={18} /> : (
                                    <div className="flex items-center gap-2">
                                        <Brain size={14} />
                                        Run Self-Diagnosis
                                    </div>
                                )}
                            </Button>
                        </div>

                        {diagnosis && (
                            <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 font-mono text-[9px] space-y-2">
                                <p className="text-indigo-400 font-bold uppercase tracking-widest border-b border-indigo-500/20 pb-1 mb-2">Diagnostic Data</p>
                                <div className="grid grid-cols-2 gap-x-4">
                                    <span className="text-slate-500">Number:</span>
                                    <span className="text-white">{diagnosis.phone_number}</span>
                                    <span className="text-slate-500">DB MP:</span>
                                    <span className="text-white truncate">{diagnosis.messaging_profile_id}</span>
                                    <span className="text-slate-500">Telnyx MP:</span>
                                    <span className={`truncate ${diagnosis.telnyx_resource?.messaging_profile_id === diagnosis.messaging_profile_id ? 'text-emerald-400' : 'text-red-400 font-bold'}`}>
                                        {diagnosis.telnyx_resource?.messaging_profile_id || 'NOT LINKED'}
                                    </span>
                                </div>
                                {diagnosis.telnyx_resource?.messaging_profile_id !== diagnosis.messaging_profile_id && (
                                    <p className="text-red-400 animate-pulse mt-2 uppercase font-black">⚠️ ASSOCIATION MISMATCH DETECTED</p>
                                )}
                            </div>
                        )}

                        <p className="text-[9px] text-center text-slate-500 font-mono">
                            SECURE SESSION ACTIVE • MASTER KEY RESOLVED FROM PLATFORM_SETTINGS
                        </p>
                    </div>
                </div>

                {/* PRICE MANAGEMENT SECTION */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <Globe size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800">Preços por Plano</h3>
                            <p className="text-xs text-slate-500">Defina os custos de consumo para cada nível de assinatura.</p>
                        </div>
                    </div>

                    <div className="mb-6 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar Plano</label>
                        <select
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            {plans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voz (por minuto)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                <input
                                    type="number" step="0.01" value={prices.voice}
                                    onChange={(e) => setPrices({ ...prices, voice: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SMS (unidade)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                <input
                                    type="number" step="0.01" value={prices.sms}
                                    onChange={(e) => setPrices({ ...prices, sms: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MMS (unidade)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                <input
                                    type="number" step="0.01" value={prices.mms}
                                    onChange={(e) => setPrices({ ...prices, mms: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RCS (unidade)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                <input
                                    type="number" step="0.01" value={prices.rcs}
                                    onChange={(e) => setPrices({ ...prices, rcs: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        disabled={provisioning}
                        className="mt-6 bg-slate-900 hover:bg-black text-white w-full rounded-xl h-11 font-bold"
                        onClick={handleSavePrices}
                    >
                        {provisioning ? <Loader2 className="animate-spin" size={18} /> : "Salvar Preços do Plano"}
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Tenant</th>
                            <th className="px-6 py-4">Direction</th>
                            <th className="px-6 py-4">From / To</th>
                            <th className="px-6 py-4">Duration</th>
                            <th className="px-6 py-4">Recording</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">No calls recorded yet.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${log.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {log.status === 'completed' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                                            {log.status || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {log.tenant_profiles?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            {log.direction === 'inbound' ? <PhoneIncoming size={16} className="text-blue-500" /> : <PhoneOutgoing size={16} className="text-purple-500" />}
                                            <span className="capitalize">{log.direction}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                        <div>{log.from_number}</div>
                                        <div className="text-slate-400">↓</div>
                                        <div>{log.to_number}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {log.duration_seconds}s
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.recording_url ? (
                                            <button className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-bold">
                                                <Play size={14} /> Play
                                            </button>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic">No Audio</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Test Dialer: Only visible here for validation */}
            <DialerWidget />
        </div>
    );
};
