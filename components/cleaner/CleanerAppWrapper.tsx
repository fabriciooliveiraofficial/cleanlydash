import React, { useState, useEffect } from 'react';
import { createCleanerClient } from '../../lib/supabase/cleaner-client';
import { useSessionManager } from '../../hooks/use-session-manager';
import { CleanerApp } from './CleanerApp';
import { Loader2, Key, Mail, Lock } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { ReleaseGuard } from '../system/ReleaseGuard';

export const CleanerAppWrapper: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    const supabase = createCleanerClient();
    const { saveSessionForRoute } = useSessionManager();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Verify Role and Access
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .single();

                // Also check team_members for custom_roles/app_access
                const { data: member } = await supabase
                    .from('team_members')
                    .select('role, custom_roles(app_access)')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                const dbRole = (member as any)?.role || (roleData as any)?.role;
                const dbAppAccess = (member as any)?.custom_roles?.app_access || (dbRole === 'cleaner' ? 'cleaner_app' : 'dashboard');

                if (dbAppAccess === 'cleaner_app') {
                    setUser(session.user);
                } else {
                    console.warn('CleanerApp: Unauthorized user access blocked');
                    // We don't sign out from Supabase (to keep other app sessions), 
                    // we just don't set the local user state for this client.
                    setUser(null);
                    if (session.user) toast.error("Acesso Negado: Esta conta não possui acesso ao App do Cleaner.");
                }
            }
            setLoading(false);
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if (session?.user) {
                // Re-verify on sign in or session update
                checkSession();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;

            // Save session to custom storage for Cleaner route
            if (data.session) {
                saveSessionForRoute('cleaner', data.session);
            }
        } catch (err: any) {
            toast.error(err.message || 'Login failed');
        } finally {
            setAuthLoading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl">
                    <div className="text-center mb-6">
                        <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600">
                            <Key size={24} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">Cleaner Portal</h1>
                        <p className="text-slate-500 text-sm">Access your assigned tasks</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="cleaner@example.com"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {authLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Sign In'}
                        </button>
                    </form>
                </div>
                <Toaster position="top-center" />
            </div>
        );
    }

    // Determine user name (placeholder or fetch profile)
    // For simplicity, use metadata or email
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0];

    return (
        <>
            <ReleaseGuard />
            <CleanerApp
                userId={user.id}
                userName={userName}
            />
            <Toaster position="top-center" richColors expand visibleToasts={5} gap={8} />
        </>
    );
};
