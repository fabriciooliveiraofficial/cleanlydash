import React, { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { ShieldAlert, Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useRole } from '../../hooks/use-role';

interface PlatformLoginProps {
    onSuccess: () => void;
}

export const PlatformLogin: React.FC<PlatformLoginProps> = ({ onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const [isRegister, setIsRegister] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegister) {
                // Registration Logic
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                if (data.user) {
                    setError("Conta criada! Agora RODE O SQL no banco para virar Super Admin, depois faça login.");
                    setIsRegister(false); // Switch back to login
                }
            } else {
                // Login Logic
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (authError) throw authError;

                // Verify Role
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', data.user.id)
                    .single();

                if (!roleData) throw new Error('No role assigned.');
                const role = (roleData as any).role;

                if (role !== 'super_admin') {
                    await supabase.auth.signOut();
                    throw new Error('Access Denied: This portal is restricted to Platform Operators.');
                }

                onSuccess();
            }
        } catch (err: any) {
            console.error(err);
            let msg = err.message || 'Authentication failed';
            if (msg.includes('Invalid login credentials')) {
                msg = "Credenciais inválidas. Se ainda não criou a conta, clique em 'Inicializar Acesso'.";
            } else if (msg.includes('Email not confirmed')) {
                msg = "Email não confirmado! Verifique sua caixa de entrada OU rode o SQL de confirmação.";
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-700">
                <div className="flex flex-col items-center mb-8">
                    <div className="h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 ring-2 ring-indigo-500">
                        <ShieldAlert className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Platform Ops Center</h1>
                    <p className="text-slate-400 text-sm mt-1">Restricted Access // Level 5 Clearance</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Operator ID</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 px-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="admin@cleanlydash.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Secure Token (Password)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-10 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-500 hover:text-indigo-400 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className={`bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center ${error.includes('RODE O SQL') ? 'text-green-400 border-green-500/20 bg-green-500/10' : ''}`}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full font-bold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isRegister ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                            } text-white`}
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (isRegister ? 'Initialize Account' : 'Authenticate Session')}
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => { setIsRegister(!isRegister); setError(null); }}
                            className="text-xs text-slate-500 hover:text-indigo-400 transition-colors underline"
                        >
                            {isRegister ? 'Back to Login' : 'First time? Initialize Access'}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-600 font-mono">
                        System ID: CD-OPS-V2 // IP Logged
                    </p>
                </div>
            </div>
        </div>
    );
};
