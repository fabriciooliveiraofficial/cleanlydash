import React, { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export const SystemDiagnostics = () => {
    const [status, setStatus] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const runDiagnostics = async () => {
        setLoading(true);
        const report: any = {};

        try {
            // 1. Auth User
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            report.auth = { user, error: authError };

            if (user) {
                // 2. User Roles
                const { data: roles, error: rolesError } = await supabase
                    .from('user_roles')
                    .select('*')
                    .eq('user_id', user.id);
                report.user_roles = { data: roles, error: rolesError };

                // 3. Tenant Profile
                const { data: tenant, error: tenantError } = await supabase
                    .from('tenant_profiles')
                    .select('*')
                    .eq('id', user.id); // Assuming owner has same ID, or check metadata
                report.tenant_profiles = { data: tenant, error: tenantError };

                // 4. Team Members
                // Try to find if user is part of any team
                const { data: team, error: teamError } = await supabase
                    .from('team_members')
                    .select('*')
                    .eq('user_id', user.id);
                report.team_members = { data: team, error: teamError };

                // 5. Local Storage (Session)
                report.localStorage = {
                    keys: Object.keys(localStorage).filter(k => k.includes('sb-'))
                };
            }

        } catch (e: any) {
            report.crash = e.message;
        }

        setStatus(report);
        setLoading(false);
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    const fixMissingRole = async () => {
        if (!status.auth?.user?.id) return;

        try {
            // Attempt to insert property_owner role
            const { error } = await (supabase.from('user_roles') as any).insert({
                user_id: status.auth.user.id,
                role: 'property_owner'
            });
            if (error) alert('Fix failed: ' + error.message);
            else {
                alert('Role inserted! Refreshing...');
                window.location.reload();
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">System Diagnostics</h1>
                <Button onClick={runDiagnostics} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Authentication Status</CardTitle>
                </CardHeader>
                <CardContent>
                    {status.auth?.user ? (
                        <div className="space-y-2">
                            <div className="flex items-center text-green-600 gap-2">
                                <CheckCircle size={16} />
                                <span className="font-mono">{status.auth.user.email}</span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                                ID: {status.auth.user.id}
                            </div>
                            <pre className="bg-slate-100 p-2 rounded text-xs mt-2 overflow-auto">
                                Meta: {JSON.stringify(status.auth.user.user_metadata, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div className="flex items-center text-red-600 gap-2">
                            <AlertCircle size={16} />
                            Not Authenticated
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle className="text-sm">User Roles (Table)</CardTitle></CardHeader>
                    <CardContent>
                        {status.user_roles?.error ? (
                            <div className="text-red-500 text-xs">{status.user_roles.error.message}</div>
                        ) : (
                            <pre className="text-xs bg-slate-50 p-2 rounded">
                                {JSON.stringify(status.user_roles?.data, null, 2)}
                            </pre>
                        )}
                        {!status.user_roles?.data?.length && (
                            <Button size="sm" variant="destructive" className="w-full mt-4" onClick={fixMissingRole}>
                                Force Insert 'Property Owner' Role
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-sm">Tenant Profile</CardTitle></CardHeader>
                    <CardContent>
                        {status.tenant_profiles?.error ? (
                            <div className="text-red-500 text-xs">{status.tenant_profiles.error.message}</div>
                        ) : (
                            <pre className="text-xs bg-slate-50 p-2 rounded">
                                {JSON.stringify(status.tenant_profiles?.data, null, 2)}
                            </pre>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
