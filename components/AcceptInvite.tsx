import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle, AlertOctagon, ArrowRight, Loader2, Copy, Check } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { toast } from 'sonner';

interface AcceptInviteProps {
    onSuccess: () => void;
    onLoginRequest: () => void;
}

export const AcceptInvite: React.FC<AcceptInviteProps> = ({ onSuccess, onLoginRequest }) => {
    const supabase = createClient();

    // States
    const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Validando sua sessão...');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const isInvited = params.get('invited') === 'true';
    const legacyToken = params.get('token'); // For backwards compatibility

    useEffect(() => {
        handleInviteFlow();
    }, []);

    const handleInviteFlow = async () => {
        try {
            // Supabase Magic Link already authenticated the user via URL hash
            // We just need to get the session and complete the onboarding
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                // No session - Magic Link might have expired or failed
                setStatus('error');
                setMessage('Sessão expirada. Por favor, solicite um novo convite.');
                return;
            }

            const user = session.user;
            setUserEmail(user.email || 'Usuário');
            setStatus('processing');
            setMessage('Configurando suas permissões...');

            // Get invite metadata from user_metadata (set by inviteUserByEmail)
            const invitedBy = user.user_metadata?.invited_by;
            const roleId = user.user_metadata?.role_id;
            const roleName = user.user_metadata?.role_name || 'Staff';
            const tenantId = user.user_metadata?.tenant_id || invitedBy;

            setUserRole(roleName);

            // Link user to team_members table
            if (tenantId) {
                const { error: linkError } = await supabase
                    .from('team_members')
                    .upsert({
                        user_id: user.id,
                        tenant_id: tenantId,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Novo Membro',
                        role_id: roleId || null,
                        role: roleName.toLowerCase() === 'cleaner' ? 'cleaner' : 'staff',
                        status: 'active'
                    }, { onConflict: 'user_id, tenant_id' });

                if (linkError) {
                    console.error("Link Error:", linkError);
                    // Don't fail completely - user is still authenticated
                }
            }

            // Update any pending invites to accepted
            if (user.email) {
                await supabase
                    .from('team_invites')
                    .update({ status: 'accepted' })
                    .eq('email', user.email)
                    .eq('status', 'pending');
            }

            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);

            setStatus('success');
            setMessage('Conta configurada com sucesso!');

            // Redirect after delay
            setTimeout(() => {
                if (roleName.toLowerCase() === 'cleaner') {
                    window.location.href = '/#cleaner';
                } else {
                    window.location.href = '/';
                }
            }, 2000);

        } catch (err: any) {
            console.error("Invite Flow Error:", err);
            setStatus('error');
            setMessage(err.message || 'Erro ao processar convite.');
        }
    };

    if (status === 'loading' || status === 'processing') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center max-w-sm">
                    <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
                    <p className="text-slate-700 font-medium text-lg">{message}</p>
                    {userEmail && (
                        <p className="text-slate-500 mt-2">{userEmail}</p>
                    )}
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                        <AlertOctagon size={40} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Erro no Convite</h1>
                    <p className="text-slate-500 mb-6">{message}</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                    <CheckCircle size={40} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Tudo pronto!</h1>
                <p className="text-slate-500 mb-2">{message}</p>
                {userRole && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold uppercase tracking-wide">
                        {userRole}
                    </div>
                )}
                <p className="text-slate-400 text-sm mt-4">Redirecionando...</p>
            </div>
        </div>
    );
};
