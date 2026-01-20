import React, { useEffect, useState } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, Play, Download, Brain, FileText, Smile } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import { toast } from 'sonner';

import { DialerWidget } from '../../telephony/dialer-widget';

export const TelephonyManager: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('call_logs')
            .select(`
                *,
                *,
                tenant_profiles (name),
                call_intelligence (transcript, sentiment_label, summary)
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

    return (
        <div className="space-y-6 relative min-h-[500px]">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Telephony Inspector</h2>
                    <p className="text-slate-500">Real-time supervision of Telnyx/OpenAI calls.</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                        <span className="block text-xs text-slate-500 uppercase font-bold">Total Calls (24h)</span>
                        <span className="text-xl font-bold text-slate-800">{logs.length}</span>
                    </div>
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
                            <th className="px-6 py-4">AI Intelligence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-400">No calls recorded yet.</td></tr>
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
                                    <td className="px-6 py-4">
                                        {log.call_intelligence?.[0] ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${log.call_intelligence[0].sentiment_label === 'positive' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            log.call_intelligence[0].sentiment_label === 'negative' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                'bg-slate-50 text-slate-600 border-slate-200'
                                                        }`}>
                                                        {log.call_intelligence[0].sentiment_label}
                                                    </span>
                                                </div>
                                                {log.call_intelligence[0].summary && (
                                                    <p className="text-xs text-slate-500 line-clamp-2 w-48" title={log.call_intelligence[0].summary}>
                                                        {log.call_intelligence[0].summary}
                                                    </p>
                                                )}
                                                {log.call_intelligence[0].transcript && (
                                                    <button
                                                        className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                                                        onClick={() => toast(<div className="text-xs max-h-60 overflow-y-auto">{log.call_intelligence[0].transcript}</div>, { duration: 10000 })}
                                                    >
                                                        <FileText size={12} /> View Transcript
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic">Processing...</span>
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
