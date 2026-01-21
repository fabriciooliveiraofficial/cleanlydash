import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../../ui/button';

export const PlatformCallback: React.FC = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state'); // In index.ts it was user.id
            const error = params.get('error');

            if (error) {
                setStatus('error');
                setErrorMsg(params.get('error_description') || "Ocorreu um erro na autenticação com a Stripe.");
                return;
            }

            if (!code) {
                setStatus('error');
                setErrorMsg("Código de autorização não encontrado.");
                return;
            }

            try {
                // Call the Edge Function to exchange the token
                const { data, error: functionError } = await supabase.functions.invoke('stripe-connect-oauth', {
                    body: { action: 'exchange_token', code }
                });

                if (functionError || data.error) {
                    throw new Error(functionError?.message || data.error);
                }

                setStatus('success');
                // Auto redirect after 3 seconds for better UX
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 3000);
            } catch (err: any) {
                console.error("Callback Error:", err);
                setStatus('error');
                setErrorMsg(err.message || "Falha ao vincular conta Stripe.");
            }
        };

        handleCallback();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 text-center animate-in fade-in zoom-in duration-300">
                {status === 'loading' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <Loader2 size={64} className="text-indigo-600 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Processando Conexão...</h2>
                        <p className="text-slate-500 font-medium">Estamos vinculando sua conta da Stripe ao Cleanlydash. Não feche esta janela.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                                <CheckCircle2 size={48} />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900">Tudo Pronto!</h2>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed">
                            Sua conta Stripe foi vinculada com sucesso. Agora você já pode receber pagamentos e criar faturas para seus hóspedes.
                        </p>
                        <Button
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-indigo-100 mt-4 group"
                        >
                            Ir para Dashboard <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="h-20 w-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shadow-inner">
                                <XCircle size={48} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Ops! Algo deu errado.</h2>
                        <p className="text-rose-500 font-medium">{errorMsg}</p>
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full h-12 border-slate-200 text-slate-600 font-bold rounded-xl mt-4"
                        >
                            Tentar mais tarde
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
