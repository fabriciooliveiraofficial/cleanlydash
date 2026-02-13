import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

export const PaymentSuccessPage: React.FC = () => {
    const { t } = useTranslation();
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
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">{t('finance.payment_success.title')}</h1>
                        <p className="text-emerald-100 font-medium text-lg">{t('finance.payment_success.subtitle')}</p>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('finance.payment_success.status')}</span>
                            <span className="font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full text-xs uppercase tracking-wide">{t('finance.payment_success.approved')}</span>
                        </div>
                        {sessionId && (
                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('finance.payment_success.session_id')}</span>
                                <span className="font-mono text-xs font-bold text-slate-600 truncate max-w-[150px]">{sessionId.slice(-8)}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl text-center">
                        <p className="text-slate-500 text-sm leading-relaxed">
                            {t('finance.payment_success.receipt_sent')}
                        </p>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-slate-300 font-bold uppercase tracking-widest">Cleanlydash Payments</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
