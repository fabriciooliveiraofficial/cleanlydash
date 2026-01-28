import React, { useState, useEffect } from 'react';
import { createPlatformClient } from '../../../lib/supabase/platform-client';
import {
    Search,
    LogIn,
    Shield,
    Trash2,
    ExternalLink,
    Filter,
    Download,
    Ban,
    CheckCircle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { PortalTransition } from '../../support/PortalTransition';
import { useSessionManager } from '../../../hooks/use-session-manager';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    subscription?: {
        plan_id: string;
        status: string;
    };
}

export const TenantManager: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [isPortaling, setIsPortaling] = useState(false);
    const supabase = createPlatformClient();

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tenant_profiles')
                .select('*, subscription:tenant_subscriptions(plan_id, status)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map single subscription lookup (assuming 1 active sub per tenant usually)
            const formatted: Tenant[] = (data || []).map((t: any) => ({
                ...t,
                subscription: t.subscription?.[0] || null
            }));

            setTenants(formatted);
        } catch (err: any) {
            toast.error('Failed to load tenants: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = async (tenantId: string, tenantName: string) => {
        setIsPortaling(true);
        toast.loading("Iniciando Portal de Suporte...");

        try {
            // 1. Save config to session storage
            const { data: { user } } = await supabase.auth.getUser();

            const config = {
                targetTenantId: tenantId,
                targetTenantName: tenantName,
                impersonatorId: user?.id,
                startTime: new Date().toISOString()
            };
            sessionStorage.setItem('portal_mode_config', JSON.stringify(config));

            // 2. Redirect to dashboard root
            // The RoleContext will detect this and override the tenant_id
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } catch (err) {
            console.error(err);
            setIsPortaling(false);
            toast.error("Erro ao abrir portal");
        }
    };

    const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        toast.loading(`${newStatus === 'active' ? 'Activating' : 'Suspending'} tenant...`);
        try {
            // Update subscription status
            const { error } = await supabase
                .from('tenant_subscriptions')
                .update({ status: newStatus } as any)
                .eq('tenant_id', tenantId);

            if (error) throw error;

            toast.dismiss();
            toast.success(`Tenant ${newStatus === 'active' ? 'activated' : 'suspended'} successfully.`);
            fetchTenants();

            // Log Audit
            //  await supabase.rpc('log_audit', ...); 
        } catch (err: any) {
            toast.dismiss();
            toast.error("Status update failed: " + err.message);
        }
    };

    const handleDelete = async (tenantId: string) => {
        if (!confirm("Are you sure? This action is irreversible and deletes ALL tenant data.")) return;

        toast.loading("Deleting tenant...");
        try {
            // Delete profile (Cascade should handle the rest if tables set up correctly, 
            // else we manually delete foreign keys. Setup says Cascade.)
            const { error } = await supabase.from('tenant_profiles').delete().eq('id', tenantId);
            if (error) throw error;

            toast.dismiss();
            toast.success("Tenant deleted permanently.");
            fetchTenants();
        } catch (err: any) {
            toast.dismiss();
            toast.error("Delete failed: " + err.message);
        }
    };

    const filteredTenants = tenants.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.slug.toLowerCase().includes(search.toLowerCase()) ||
            (t.email && t.email.toLowerCase().includes(search.toLowerCase()));

        if (filter === 'all') return matchesSearch;
        return matchesSearch && t.subscription?.status === filter;
    });

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></div>;

    return (
        <div className="space-y-6">
            <PortalTransition active={isPortaling} />

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Global Tenant Registry</h2>
                    <p className="text-slate-500">Manage all registered companies and access levels.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <Download size={16} />
                        Export CSV
                    </button>
                    <button onClick={() => toast.info('Use /register page to create new tenant')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                        <Shield size={16} />
                        Create Tenant
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, slug, or admin email..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 text-slate-700"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="past_due">Past Due</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Tenant Entity</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Subscription</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Joined</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTenants.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10 text-slate-500">No tenants found matching criteria.</td></tr>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold uppercase">
                                                {tenant.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{tenant.name}</p>
                                                <p className="text-xs text-slate-500 font-mono">/{tenant.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {tenant.subscription?.plan_id || 'No Plan'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                               ${tenant.subscription?.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                                tenant.subscription?.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {tenant.subscription?.status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(tenant.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleImpersonate(tenant.id, tenant.name)}
                                                className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                                title="Impersonate"
                                            >
                                                <LogIn size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(tenant.id, tenant.subscription?.status || 'active')}
                                                className={`p-2 rounded-lg transition-colors ${tenant.subscription?.status === 'suspended' ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-amber-50 text-amber-500'}`}
                                                title={tenant.subscription?.status === 'suspended' ? "Activate" : "Suspend"}
                                            >
                                                {tenant.subscription?.status === 'suspended' ? <CheckCircle size={18} /> : <Ban size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tenant.id)}
                                                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                                title="Hard Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
