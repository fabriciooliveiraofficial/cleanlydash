import React, { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { AcceptInvite } from './AcceptInvite';

const supabase = createClient();
import { Loader2, AlertOctagon } from 'lucide-react';

export const TenantOnboarding: React.FC<{ onLoginRequest: () => void }> = ({ onLoginRequest }) => {
    // Manual URL parsing
    const pathParts = window.location.pathname.split('/').filter(p => p !== '');
    // Support /:slug and /:slug/join
    const slug = pathParts.length > 0 ? pathParts[0] : null;

    const [status, setStatus] = useState<'loading' | 'found' | 'error'>('loading');
    const [tenantName, setTenantName] = useState<string>('');
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);

    useEffect(() => {
        const fetchTenantProfile = async () => {
            if (!slug) return;

            try {
                const { data, error } = await supabase
                    .from('tenant_profiles')
                    .select('name, logo_url')
                    .eq('slug', slug)
                    .single();

                if (error || !data) {
                    setStatus('error');
                } else {
                    const profile = data as any;
                    setTenantName(profile.name);
                    setTenantLogo(profile.logo_url);
                    setStatus('found');
                }
            } catch (err) {
                console.error("Error fetching tenant profile:", err);
                setStatus('error');
            }
        };

        fetchTenantProfile();
    }, [slug]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
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
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Empresa não encontrada</h1>
                    <p className="text-slate-500 mb-6">Não conseguimos encontrar a empresa <strong>{slug}</strong>.</p>
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
        <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-20 px-4">
            <div className="mb-8 text-center animate-in slide-in-from-top-4 fade-in duration-500">
                {tenantLogo ? (
                    <img src={tenantLogo} alt={tenantName} className="h-20 mx-auto mb-4 object-contain" />
                ) : (
                    <div className="h-20 w-20 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold uppercase shadow-lg shadow-indigo-200">
                        {tenantName.substring(0, 2)}
                    </div>
                )}
                <h1 className="text-3xl font-bold text-slate-900">Bem-vindo à {tenantName}</h1>
                <p className="text-slate-500 mt-2">Complete seu registro para acessar a plataforma.</p>
            </div>

            {/* Reuse Login/Register Logic from AcceptInvite, passing context */}
            <AcceptInvite
                onSuccess={() => {
                    // Redirect logic is handled inside AcceptInvite
                }}
                onLoginRequest={onLoginRequest}
            />
        </div>
    );
};
