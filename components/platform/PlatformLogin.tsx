import React, { useState, useEffect } from 'react';
import { createPlatformClient } from '../../lib/supabase/platform-client';
import { ShieldAlert, Loader2, Lock, Mail, Eye, EyeOff, UserCircle } from 'lucide-react';
import { LanguageFloatingWidget } from '../LanguageFloatingWidget';
import { useSessionManager } from '../../hooks/use-session-manager';
// import { useRole } from '../../hooks/use-role'; // REMOVED DEPENDENCY

interface PlatformLoginProps {
    onSuccess: () => void;
}

export const PlatformLogin: React.FC<PlatformLoginProps> = ({ onSuccess }) => {
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Isolated Session State
    const [currentSessionUser, setCurrentSessionUser] = useState<any>(null);
    const [currentSessionRole, setCurrentSessionRole] = useState<string | null>(null);

    const supabase = createPlatformClient(); // ISOLATED CLIENT
    const { saveSessionForRoute } = useSessionManager();

    // Check for existing isolated session on mount
    useEffect(() => {
        async function checkSession() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentSessionUser(session.user);
                // Check role
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .single();

                if (roleData) setCurrentSessionRole((roleData as any).role);
            }
        }
        checkSession();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (activeTab === 'register') {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                if (data.user) {
                    setSuccessMsg("Conta criada no Auth! Agora você precisa rodar o SQL para conceder a role super_admin a este ID.");
                }
            } else {
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (authError) throw authError;

                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', data.user.id)
                    .single();

                if (!roleData || (roleData as any).role !== 'super_admin') {
                    await supabase.auth.signOut();
                    throw new Error('Acesso Negado: Este portal é restrito a operadores da plataforma.');
                }

                // Save session to custom storage for Platform route
                if (data.session) {
                    saveSessionForRoute('platform', data.session);
                }

                // Success (No reload needed, auth listener will pick it up)
                onSuccess();

            }
        } catch (err: any) {
            console.error(err);
            let msg = err.message || 'Falha na autenticação';
            if (msg.includes('Invalid login credentials')) {
                msg = "Credenciais inválidas. Se você ainda não criou esta conta de Admin, mude para a aba 'Criar Conta'.";
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
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-mono">Restricted Access // Level 5</p>
                </div>

                {/* Session Awareness Block */}
                {currentSessionUser && (
                    <div className="mb-8 p-4 bg-slate-900/50 border border-slate-700 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-indigo-400">
                                <UserCircle size={24} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs text-slate-500 font-bold uppercase">Logado como</p>
                                <p className="text-sm text-slate-200 truncate font-medium">{currentSessionUser.email}</p>
                            </div>
                        </div>

                        {currentSessionRole === 'super_admin' ? (
                            <button
                                onClick={onSuccess}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition-all"
                            >
                                Continuar como Administrador
                            </button>
                        ) : (
                            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-[10px] text-red-400 leading-tight">
                                    Esta conta não possui privilégios de Administrador da Plataforma.
                                    Faça login ou crie uma conta autorizada abaixo.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex p-1 bg-slate-900/50 rounded-lg mb-6">
                    <button
                        onClick={() => { setActiveTab('login'); setError(null); setSuccessMsg(null); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'login' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setActiveTab('register'); setError(null); setSuccessMsg(null); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'register' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Criar Conta
                    </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Operator ID (Email)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 px-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="operator@cleanlydash.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Password</label>
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
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm text-center font-bold animate-in fade-in slide-in-from-top-2">
                            {successMsg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full font-bold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${activeTab === 'register' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                            } text-white`}
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (activeTab === 'register' ? 'Inicializar Acesso' : 'Autenticar Operador')}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
                        Cleanlydash Platform Security // Protocol 7-B
                    </p>
                </div>
            </div>
            <LanguageFloatingWidget />
        </div>
    );
};
