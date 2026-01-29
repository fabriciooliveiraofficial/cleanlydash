import React, { useState } from 'react';
import {
    Database,
    Flag,
    Terminal,
    Lock,
    Save,
    RefreshCcw,
    Megaphone,
    Webhook,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { createPlatformClient } from '../../../lib/supabase/platform-client';

export const SystemTools: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'sql' | 'flags' | 'settings' | 'webhooks' | 'releases'>('releases');
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM tenant_profiles LIMIT 10;');
    const [queryResult, setQueryResult] = useState<any>(null);

    // Custom Alert State for SQL Runner
    const [alertState, setAlertState] = useState<{ type: 'success' | 'error'; message: string; details?: any } | null>(null);

    const handleRunQuery = async () => {
        const supabase = createPlatformClient();
        const start = performance.now();
        try {
            const { data, error } = await (supabase as any).rpc('exec_sql', { query: sqlQuery });

            const duration = Math.round(performance.now() - start);

            if (error) {
                setAlertState({ type: 'error', message: `Execution failed: ${error.message}`, details: error.details });
                setQueryResult({ error: error.message, details: error.details });
            } else if (data && data.error) {
                // Caught internal exception from RPC
                setAlertState({ type: 'error', message: `SQL Error: ${data.error}` });
                setQueryResult(data);
            } else {
                setAlertState({ type: 'success', message: `Query executed successfully in ${duration}ms` });
                setQueryResult(data);
            }
        } catch (err: any) {
            setAlertState({ type: 'error', message: "RPC Connection Failed" });
            console.error(err);
        }
    };

    const handleAcknowledge = () => {
        if (alertState?.type === 'success') {
            setSqlQuery(''); // Clear prompt on success
        }
        setAlertState(null); // Close alert
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Password update request sent to Auth Provider.");
    };

    const handleQuickRelease = async () => {
        const supabase = createPlatformClient();
        const version = `v${new Date().toISOString().split('T')[0]}.${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

        const toastId = toast.loading("Broadcasting new release to all users...");

        try {
            const channel = supabase.channel('app-releases');
            await channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'new_release',
                        payload: {
                            version,
                            message: 'Uma nova atualização do Cleanlydash foi publicada. Clique em atualizar para carregar as melhorias!',
                            timestamp: new Date().toISOString()
                        }
                    });
                    toast.success(`Release ${version} transmitida com sucesso!`, { id: toastId });
                    supabase.removeChannel(channel);
                }
            });
        } catch (err: any) {
            toast.error(`Erro ao transmitir release: ${err.message}`, { id: toastId });
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Custom Alert Modal Overlay */}
            {alertState && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-4 rounded-full ${alertState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {alertState.type === 'success' ? <CheckCircle size={32} /> : <XCircle size={32} />}
                            </div>

                            <div>
                                <h3 className={`text-xl font-bold ${alertState.type === 'success' ? 'text-slate-900' : 'text-red-700'}`}>
                                    {alertState.type === 'success' ? 'Success!' : 'Execution Error'}
                                </h3>
                                <p className="text-slate-600 mt-2 font-medium">
                                    {alertState.message}
                                </p>
                                {alertState.details && (
                                    <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-50 p-2 rounded">
                                        {JSON.stringify(alertState.details)}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handleAcknowledge}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-transform active:scale-95 ${alertState.type === 'success'
                                    ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200'
                                    : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200'
                                    }`}
                            >
                                {alertState.type === 'success' ? 'Acknowledge & Clear' : 'Dismiss Error'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">System & Configuration</h2>
                    <p className="text-slate-500">Advanced tools, feature flags, and admin settings.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('flags')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'flags' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Feature Flags
                </button>
                <button
                    onClick={() => setActiveTab('sql')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'sql' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    SQL Runner (Danger)
                </button>
                <button
                    onClick={() => setActiveTab('webhooks')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'webhooks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Webhook Inspector
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Admin Settings
                </button>
                <button
                    onClick={() => setActiveTab('releases')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'releases' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Releases
                </button>

            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                {/* Feature Flags Tab */}
                {activeTab === 'flags' && (
                    <div className="p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Flag size={18} className="text-purple-500" /> Global Feature Toggles
                        </h3>
                        <div className="space-y-4 max-w-2xl">
                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50">
                                <div>
                                    <p className="font-medium text-slate-800">AI Voice Assistant (Beta)</p>
                                    <p className="text-xs text-slate-500">Enable v2.0 voice models for eligible tenants.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked readOnly />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-offset-white rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50">
                                <div>
                                    <p className="font-medium text-slate-800">Global Maintenance Mode</p>
                                    <p className="text-xs text-slate-500">Show maintenance banner to all 10k users.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-offset-white rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* SQL Runner Tab */}
                {activeTab === 'sql' && (
                    <div className="flex flex-col h-[500px]">
                        <div className="bg-slate-900 p-4 flex items-center justify-between text-white border-b border-slate-700 rounded-t-xl">
                            <div className="flex items-center gap-2">
                                <Terminal size={18} className="text-green-400" />
                                <span className="font-mono text-sm">postgres@primary:5432</span>
                            </div>
                            <button onClick={handleRunQuery} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
                                Execute (Ctrl+Enter)
                            </button>
                        </div>
                        <textarea
                            className="flex-1 bg-slate-950 text-slate-300 font-mono p-4 outline-none resize-none"
                            value={sqlQuery}
                            onChange={(e) => setSqlQuery(e.target.value)}
                            spellCheck={false}
                            placeholder="-- Enter SQL..."
                        />
                        {queryResult && (
                            <div className="h-1/2 bg-white border-t border-slate-200 overflow-auto p-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Query Result</h4>
                                <pre className="text-xs font-mono text-slate-800 bg-slate-50 p-2 rounded">
                                    {JSON.stringify(queryResult, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Webhooks Tab */}
                {activeTab === 'webhooks' && (
                    <div className="p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Webhook size={18} className="text-pink-500" /> Webhook Events Stream
                        </h3>
                        {/* Placeholder Content */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                            <Webhook size={48} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-500 font-medium">No webhook events recorded yet.</p>
                            <p className="text-xs text-slate-400 mt-1">Events from Stripe & Telnyx will appear here in real-time.</p>
                        </div>
                    </div>
                )}

                {/* Admin Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="p-6 max-w-xl">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Lock size={18} className="text-slate-500" /> Admin Security Profile
                        </h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const current = (document.getElementById('pwd-current') as HTMLInputElement).value;
                            const newPwd = (document.getElementById('pwd-new') as HTMLInputElement).value;
                            const confirmPwd = (document.getElementById('pwd-confirm') as HTMLInputElement).value;

                            if (!newPwd || !confirmPwd) return toast.error("Please fill in the new password fields.");
                            if (newPwd !== confirmPwd) return toast.error("New passwords do not match.");
                            if (newPwd.length < 6) return toast.error("Password must be at least 6 characters.");

                            const toastId = toast.loading("Updating credentials...");

                            try {
                                const supabase = createPlatformClient();
                                const { data: { user } } = await supabase.auth.getUser();

                                if (!user || !user.email) throw new Error("No active session.");

                                // Optional: Verify current password if provided (Re-auth)
                                if (current) {
                                    const { error: signInError } = await supabase.auth.signInWithPassword({
                                        email: user.email,
                                        password: current
                                    });
                                    if (signInError) throw new Error("Current password is incorrect.");
                                }

                                const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
                                if (updateError) throw updateError;

                                toast.success("Password updated successfully!", { id: toastId });
                                (document.getElementById('pwd-current') as HTMLInputElement).value = '';
                                (document.getElementById('pwd-new') as HTMLInputElement).value = '';
                                (document.getElementById('pwd-confirm') as HTMLInputElement).value = '';
                            } catch (err: any) {
                                toast.error(err.message, { id: toastId });
                            }
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password (Verify)</label>
                                <input id="pwd-current" type="password" placeholder="Optional - for security" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                <input id="pwd-new" type="password" required className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                <input id="pwd-confirm" type="password" required className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
                                    <Save size={18} /> Update Credentials
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Quick Release Tab */}
                {activeTab === 'releases' && (
                    <div className="p-8 max-w-2xl">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-200">
                                    <Zap size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-indigo-900 tracking-tight">Quick Release Hub</h3>
                                    <p className="text-indigo-700/70 text-sm leading-relaxed">
                                        Esta ferramenta força uma notificação de "Nova Versão" para **todos os usuários** atualmente online em
                                        todas as plataformas (Admin, Tenant e Cleaner). Use isto após fazer um `git push` ou deploy.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center space-y-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 inline-block">
                                    <code className="text-indigo-600 font-bold">EVENT: app-releases {"->"} new_release</code>
                                </div>

                                <p className="text-slate-500 text-sm max-w-md mx-auto">
                                    Ao clicar no botão abaixo, um sinal de broadcast será enviado via Supabase Realtime.
                                    Os usuários verão um banner solicitando o refresh da página.
                                </p>

                                <button
                                    onClick={handleQuickRelease}
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                                >
                                    <Megaphone size={20} />
                                    DISPARAR ATUALIZAÇÃO GLOBAL
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-100 italic text-sm">
                                <AlertTriangle size={16} />
                                <span>Atenção: Use apenas após a conclusão do deploy no servidor de hospedagem.</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
