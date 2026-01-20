import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { Loader2, Monitor, Users, Building2, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { toast } from 'sonner';

interface TenantSessionSummary {
    tenant_id: string;
    tenant_name: string;
    active_count: number;
    users: {
        email: string;
        role: string;
        last_active: string;
        device: string;
    }[];
}

export const ActiveTenantsMonitor: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<TenantSessionSummary[]>([]);
    const supabase = createClient();

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            // Query the View
            const { data, error } = await supabase
                .from('admin_active_sessions_view')
                .select('*')
                .gt('last_active_at', fiveMinutesAgo)
                .order('last_active_at', { ascending: false });

            if (error) throw error;

            // Group by Tenant
            const grouped = (data || []).reduce((acc: any, session: any) => {
                const tid = session.tenant_id;
                if (!acc[tid]) {
                    acc[tid] = {
                        tenant_id: tid,
                        tenant_name: session.tenant_name || 'Desconhecido',
                        active_count: 0,
                        users: []
                    };
                }
                acc[tid].active_count++;
                acc[tid].users.push({
                    email: session.user_email,
                    role: session.user_role,
                    last_active: session.last_active_at,
                    device: session.device_fingerprint
                });
                return acc;
            }, {});

            setTenants(Object.values(grouped));
        } catch (err) {
            console.error("Monitor Error:", err);
            toast.error("Erro ao carregar sessões.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Monitor className="text-emerald-500" />
                        Tráfego por Tenant (Tempo Real)
                    </h3>
                    <p className="text-slate-500 text-sm">Visualizando sessões ativas nos últimos 5 minutos.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
                    <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            <div className="divide-y divide-slate-100">
                {loading && tenants.length === 0 ? (
                    <div className="p-12 flex justify-center text-slate-400">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : tenants.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        Nenhuma sessão ativa encontrada no momento.
                    </div>
                ) : (
                    tenants.map((tenant) => (
                        <div key={tenant.tenant_id} className="p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{tenant.tenant_name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                {tenant.active_count} Online
                                            </span>
                                            <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">
                                                ID: {tenant.tenant_id.slice(0, 8)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Users List */}
                            <div className="bg-slate-100/50 rounded-lg p-3 space-y-2">
                                {tenant.users.map((user, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-slate-400" />
                                            <span className="font-medium text-slate-700">
                                                {user.email || 'Usuário sem e-mail'}
                                            </span>
                                            <span className="text-xs text-slate-400">({user.role})</span>
                                        </div>
                                        <span className="text-xs font-mono text-slate-400 max-w-[200px] truncate" title={user.device}>
                                            {user.device}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
