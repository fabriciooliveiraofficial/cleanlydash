
import React, { useEffect, useState } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, Play, Download, Brain, FileText, Smile, ShieldCheck, Globe, Loader2 } from 'lucide-react';
import { createPlatformClient } from '../../../lib/supabase/platform-client';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { DialerWidget } from '../../telephony/dialer-widget';

export const TelephonyManager: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [provisioning, setProvisioning] = useState(false);
    const supabase = createPlatformClient();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('call_logs')
            .select(`
                *,
                tenant_profiles (name)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            toast.error('Failed to fetch call logs');
        } else {
            setLogs(data as any || []);
        }
        setLoading(false);
    };

    const handleSavePlatformConfig = async () => {
        const key = (document.getElementById('p-api-key') as HTMLInputElement).value;
        const sip = (document.getElementById('p-sip-id') as HTMLInputElement).value;
        if (!key) return toast.error("Provider API Key is required");

        setProvisioning(true);
        try {
            const { error } = await supabase.functions.invoke('provision_tenant', {
                body: {
                    action: 'save_key',
                    is_platform_key: true,
                    api_key: key.trim(),
                    sip_id: sip.trim()
                }
            });
            if (error) throw error;
            toast.success("Master Configuration Saved!");
            (document.getElementById('p-api-key') as HTMLInputElement).value = '';
        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setProvisioning(false);
        }
    };

    return (
        <div className="space-y-6 relative min-h-[500px]">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Telephony inspector</h2>
                    <p className="text-slate-500">Real-time supervision & Platform management.</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                        <span className="block text-xs text-slate-500 uppercase font-bold text-center">Calls (24h)</span>
                        <span className="text-xl font-bold text-slate-800 block text-center">{logs.length}</span>
                    </div>
                </div>
            </div>

            {/* PLATFORM CONFIGURATION SECTION */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Global Provider Configuration (Cleanlydash Master)</h3>
                        <p className="text-xs text-slate-400">Essential credentials for reselling Telnyx services to all tenants.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telnyx Master API Key</label>
                        <input
                            type="password" id="p-api-key" placeholder="KEY..."
                            className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Master SIP Credential ID</label>
                        <input
                            type="text" id="p-sip-id" placeholder="Ex: 278139..."
                            className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>

                <Button
                    disabled={provisioning}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto px-10 transition-all active:scale-95"
                    onClick={handleSavePlatformConfig}
                >
                    {provisioning ? <Loader2 className="animate-spin" size={18} /> : "Save Master Settings"}
                </Button>
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
