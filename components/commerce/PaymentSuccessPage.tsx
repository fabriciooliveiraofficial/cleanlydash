import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';

export const PaymentSuccessPage: React.FC = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setSessionId(params.get('session_id'));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="bg-emerald-500 p-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-30 pattern-grid-lg"></div>
                    <div className="relative z-10">
                        <div className="h-24 w-24 bg-white text-emerald-500 rounded-full flex items-center justify-center shadow-xl mx-auto mb-6">
                            <CheckCircle2 size={48} strokeWidth={3} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Pagamento Confirmado!</h1>
                        <p className="text-emerald-100 font-medium text-lg">Obrigado pela sua confiança.</p>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Status</span>
                            <span className="font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full text-xs uppercase tracking-wide">Aprovado</span>
                        </div>
                        {sessionId && (
                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">ID da Sessão</span>
                                <span className="font-mono text-xs font-bold text-slate-600 truncate max-w-[150px]">{sessionId.slice(-8)}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl text-center">
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Um comprovante foi enviado para o seu e-mail.
                            Se tiver dúvidas, entre em contato com o anfitrião.
                        </p>
                    </div>

                    {/* Ideally this button might close the window or go to a generic landing page */}
                    <div className="text-center">
                        <p className="text-xs text-slate-300 font-bold uppercase tracking-widest">Cleanlydash Payments</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
