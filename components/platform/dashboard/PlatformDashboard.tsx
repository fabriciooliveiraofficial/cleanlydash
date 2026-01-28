import React, { useEffect, useState } from 'react';
import {
    DollarSign,
    Users,
    Activity,
    Server,
    TrendingUp,
    AlertTriangle,
    Globe,
    Zap,
    Loader2
} from 'lucide-react';
import { createPlatformClient } from '../../../lib/supabase/platform-client';
import { ActiveTenantsMonitor } from '../system/ActiveTenantsMonitor';

// Price Map from SQL (20240111_pricing_schema.sql)
const PRICES: Record<string, number> = {
    'system_essentials': 29.00,
    'system_business': 59.00,
    'system_enterprise': 299.00,
    'voice_starter': 14.99,
    'voice_pro': 34.99,
    'voice_scale': 89.99,
    'founders_combo': 29.90,
    'solopreneur_combo': 39.00,
    'growth_team_combo': 89.00
};

export const PlatformDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState({
        mrr: 0,
        activeTenants: 0,
        aiTokens: 0,
        activeSessions: 0,
        loading: true
    });
    const supabase = createPlatformClient(); // ISOLATED CLIENT

    useEffect(() => {
        fetchRealData();
    }, []);

    const fetchRealData = async () => {
        try {
            // 1. Fetch Active Tenants Count
            const { count: tenantCount, error: tenantError } = await supabase
                .from('tenant_profiles')
                .select('*', { count: 'exact', head: true });

            if (tenantError) console.error('Tenant Count Error:', tenantError);

            // 2. Fetch Active Sessions Count (Real-time)
            // Filter for sessions active in the last 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            const { count: sessionCount, error: sessionError } = await supabase
                .from('active_sessions')
                .select('*', { count: 'exact', head: true })
                .gt('last_active_at', fiveMinutesAgo);

            if (sessionError) console.error('Session Count Error:', sessionError);

            // 3. Calc MRR
            const { data: subs, error: subError } = await supabase
                .from('tenant_subscriptions')
                .select('plan_id, combo_id')
                .eq('status', 'active');

            if (subError) console.error('Subscription Error:', subError);

            let mrr = 0;
            (subs as any[])?.forEach(sub => {
                if (sub.plan_id) mrr += PRICES[sub.plan_id] || 0;
                if (sub.combo_id) mrr += PRICES[sub.combo_id] || 0;
            });

            setMetrics({
                mrr,
                activeTenants: tenantCount || 0,
                aiTokens: 0, // No data source yet
                activeSessions: sessionCount || 0,
                loading: false
            });

        } catch (err) {
            console.error("Dashboard Global Fetch Error:", err);
            setMetrics(prev => ({ ...prev, loading: false }));
        }
    };

    if (metrics.loading) {
        return (
            <div className="flex w-full h-96 items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* MRR Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                                <DollarSign size={24} />
                            </div>
                            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                <TrendingUp size={12} className="mr-1" /> Real
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800">
                            ${metrics.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">Total MRR (Active Subs)</p>
                    </div>
                </div>

                {/* Active Tenants Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                                <Users size={24} />
                            </div>
                            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                Live
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800">{metrics.activeTenants}</h3>
                        <p className="text-slate-500 text-sm mt-1">Active Tenants</p>
                    </div>
                </div>

                {/* AI Usage Card (Placeholder) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                                <Activity size={24} />
                            </div>
                            <span className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                Beta
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800">{metrics.aiTokens}</h3>
                        <p className="text-slate-500 text-sm mt-1">AI Token Usage</p>
                    </div>
                </div>

                {/* System Health Card (Placeholder) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                                <Zap size={24} />
                            </div>
                            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                100%
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800">Stable</h3>
                        <p className="text-slate-500 text-sm mt-1">System Health</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-time Map Block */}
                <div className="lg:col-span-2 bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center pointer-events-none"></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <Globe className="text-indigo-400" />
                            <h3 className="font-bold text-lg">Live Global Traffic</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-mono text-emerald-400">Live</span>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <h2 className="text-6xl font-bold text-white tracking-tight">{metrics.activeSessions}</h2>
                        <p className="text-slate-400 mt-2">Active Sessions Now</p>
                    </div>
                </div>

                {/* Recent Alerts (Placeholder for now) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" /> Recent Alerts
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                            No recent critical alerts.
                        </div>
                    </div>
                    <button className="w-full mt-4 text-xs text-slate-500 hover:text-slate-800 text-center block">View System Logs</button>
                </div>
            </div>

            {/* Active Tenants Monitor (Spy Mode) */}
            <ActiveTenantsMonitor />
        </div>
    );
};
