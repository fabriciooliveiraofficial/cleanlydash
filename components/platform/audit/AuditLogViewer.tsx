import React from 'react';
import { Activity, Shield, User, Globe, Clock } from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
    // Mock Logs
    const logs = [
        { id: 1, action: 'IMPERSONATE_SESSION', actor: 'admin@cleanlydash.com', target: 'Tenant #492', ip: '192.168.1.1', time: '2 mins ago' },
        { id: 2, action: 'MANUAL_CREDIT_GRANT', actor: 'admin@cleanlydash.com', target: 'Wallet #992 ($10.00)', ip: '192.168.1.1', time: '15 mins ago' },
        { id: 3, action: 'FEATURE_FLAG_TOGGLE', actor: 'System', target: 'Flag: Maintenance Mode', ip: 'internal', time: '1 hour ago' },
        { id: 4, action: 'PLAN_OVERRIDE', actor: 'fabricio@cleanlydash.com', target: 'Tenant #101 -> Enterprise', ip: '201.44.22.11', time: 'Yesterday' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Security Audit Logs</h2>
                <p className="text-slate-500">Immutable record of all Platform Operations.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Action Type</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Actor</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Target Detail</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Metadata</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${log.action.includes('IMPERSONATE') ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                            <Activity size={16} />
                                        </div>
                                        <span className="font-mono text-xs font-bold text-slate-700">{log.action}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Shield size={14} className="text-indigo-500" />
                                        {log.actor}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-800">
                                    {log.target}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1"><Globe size={10} /> {log.ip}</div>
                                        <div className="flex items-center gap-1"><Clock size={10} /> {log.time}</div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
