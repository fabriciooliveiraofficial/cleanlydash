import React, { useState } from 'react';
import { CheckCircle, Copy, Check, X, MessageCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

interface CredentialsModalProps {
    isOpen: boolean;
    onClose: () => void;
    credentials: {
        app_url: string;
        email: string;
        password: string;
        expires_in: string;
    };
    memberName: string;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({
    isOpen,
    onClose,
    credentials,
    memberName
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // Clean format for WhatsApp - no problematic emojis
    const credentialsText = `*ACESSO CLEANLYDASH*

Ola ${memberName}!

Suas credenciais de acesso:

*Link:* ${credentials.app_url}
*Email:* ${credentials.email}
*Senha:* ${credentials.password}

IMPORTANTE: Troque sua senha apos o primeiro login.
A senha temporaria expira em ${credentials.expires_in}.`;

    const handleCopy = () => {
        navigator.clipboard.writeText(credentialsText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        const encoded = encodeURIComponent(credentialsText);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900">Membro Criado!</h3>
                            <p className="text-sm text-slate-500">{memberName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <p className="text-slate-600 text-sm text-center">
                        Envie essas credenciais para <span className="font-bold">{memberName}</span>:
                    </p>

                    {/* Credentials Card */}
                    <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-100">
                        <div className="flex items-center gap-3">
                            <ExternalLink size={16} className="text-slate-400" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Link</p>
                                <a
                                    href={credentials.app_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-indigo-600 truncate hover:underline flex items-center gap-1"
                                >
                                    {credentials.app_url}
                                    <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-slate-400">📧</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email</p>
                                <p className="text-sm font-bold text-slate-800">{credentials.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-slate-400">🔑</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Senha Temporária</p>
                                <p className="text-sm font-bold text-slate-800 font-mono">{credentials.password}</p>
                            </div>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                            Senha expira em <span className="font-bold">{credentials.expires_in}</span>.
                            O membro deve trocar a senha após o primeiro login.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCopy}
                            className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all ${copied
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                        >
                            {copied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
                            {copied ? 'Copiado!' : 'Copiar Tudo'}
                        </Button>
                        <Button
                            onClick={handleWhatsApp}
                            className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm"
                        >
                            <MessageCircle size={18} className="mr-2" />
                            WhatsApp
                        </Button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 pb-8">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="w-full h-12 rounded-xl text-slate-500 font-bold"
                    >
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
};
