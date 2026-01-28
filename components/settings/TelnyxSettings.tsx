
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { MessageSquare, Phone, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { KYCVerificationModal } from './KYCVerificationModal';
import { NumberSelectionModal } from './NumberSelectionModal';
import { PortingRequestModal } from './PortingRequestModal';

interface TelnyxConfig {
    id?: string;
    managed_account_id?: string;
    phone_number?: string;
    is_active: boolean;
}

interface KYCStatus {
    status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
    rejection_reason?: string;
}

export const TelnyxSettings: React.FC = () => {
    const [config, setConfig] = useState<TelnyxConfig | null>(null);
    const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [provisioning, setProvisioning] = useState(false);
    const [showKYCModal, setShowKYCModal] = useState(false);

    // Sandbox State
    const [isSandbox, setIsSandbox] = useState(false);
    const [showNumberModal, setShowNumberModal] = useState(false);
    const [showPortingModal, setShowPortingModal] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: telnyxData } = await supabase
                .from('telnyx_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (telnyxData) setConfig(telnyxData);

            const { data: kycData } = await supabase
                .from('kyc_verifications')
                .select('status, rejection_reason')
                .eq('user_id', user.id)
                .maybeSingle();

            if (kycData) setKycStatus(kycData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleProvision = async () => {
        if (!kycStatus || kycStatus.status !== 'approved') {
            toast.error('Verificação KYC necessária');
            return;
        }

        setProvisioning(true);
        try {
            const { error } = await supabase.functions.invoke('provision_tenant', {
                body: { sandbox: isSandbox }
            });
            if (error) throw error;
            toast.success('Habilitado com sucesso!');
            loadSettings();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setProvisioning(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" />Carregando...</div>;

    const isProvisioned = config?.managed_account_id;
    const isKYCApproved = kycStatus?.status === 'approved';

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Telefonia</h2>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs text-slate-500">
                    <input type="checkbox" checked={isSandbox} onChange={e => setIsSandbox(e.target.checked)} id="sandbox-check" className="cursor-pointer" />
                    <label htmlFor="sandbox-check" className="cursor-pointer">Modo Sandbox</label>
                </div>
            </div>

            <div className={`bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center relative overflow-hidden ${isSandbox ? 'opacity-90' : ''}`}>
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl z-10">
                    <MessageSquare size={24} />
                </div>
                <div className="z-10">
                    <h2 className="text-lg font-bold text-slate-900">Configuração de Conta</h2>
                    <p className="text-sm text-slate-600">
                        Configure seu número para enviar SMS e realizar chamadas através da infraestrutura Cleanlydash.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                {!isProvisioned ? (
                    <div className="text-center py-8 space-y-4">
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${isKYCApproved ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">
                                {isKYCApproved ? "Identidade Verificada!" : "Aguardando Verificação de Identidade"}
                            </p>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                                {isKYCApproved
                                    ? "Sua conta está pronta. Clique abaixo para ativar seus serviços de telefonia."
                                    : "Para cumprir normas de telecomunicação, precisamos verificar seus dados antes de liberar um número."}
                            </p>
                        </div>
                        <Button
                            onClick={handleProvision}
                            disabled={!isKYCApproved || provisioning}
                            className="w-full sm:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 min-w-[200px]"
                        >
                            {provisioning ? <Loader2 className="animate-spin mr-2" size={18} /> : (isSandbox ? "Simular Ativação (Sandbox)" : "Ativar Meus Serviços")}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-green-800 uppercase tracking-tighter">Status da Conta</p>
                                    <p className="text-sm font-medium text-green-700">Ativa e Configurada</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost" size="sm" className="text-[10px] text-red-500 hover:bg-red-50"
                                onClick={async () => {
                                    if (!confirm("Tem certeza que deseja resetar sua configuração de telefonia?")) return;
                                    setProvisioning(true);
                                    await supabase.functions.invoke('provision_tenant', { body: { reset: true } });
                                    loadSettings();
                                    setProvisioning(false);
                                }}
                            >
                                Resetar Integração
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Número Atribuído</label>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    <input
                                        value={config.phone_number || 'Nenhum número adquirido'}
                                        readOnly
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-base"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={() => setShowNumberModal(true)}
                                    className="flex-1 sm:flex-none bg-indigo-600 text-white"
                                >
                                    {config.phone_number ? 'Trocar meu Número' : 'Buscar meu Primeiro Número'}
                                </Button>
                                <Button
                                    onClick={() => setShowPortingModal(true)}
                                    variant="outline"
                                    className="flex-1 sm:flex-none border-slate-200 text-slate-600"
                                >
                                    Portabilidade
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Test SMS */}
            {isProvisioned && config.phone_number && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <MessageSquare size={16} className="text-indigo-600" />
                        Testar Envio de Mensagem
                    </h3>
                    <div className="space-y-3">
                        <input id="t-sms-to" placeholder="Destinatário: +5511..." className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500" />
                        <textarea id="t-sms-msg" placeholder="Sua mensagem..." className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 h-20 outline-none focus:ring-1 focus:ring-indigo-500" />
                        <Button
                            className="w-full bg-slate-900 text-white"
                            onClick={async () => {
                                const to = (document.getElementById('t-sms-to') as HTMLInputElement).value;
                                const msg = (document.getElementById('t-sms-msg') as HTMLTextAreaElement).value;
                                if (!to || !msg) return toast.error("Preencha todos os campos");
                                try {
                                    await supabase.functions.invoke('send_sms', { body: { to, message: msg, sandbox: isSandbox } });
                                    toast.success("Mensagem enviada!");
                                } catch (e: any) {
                                    toast.error(e.message);
                                }
                            }}
                        >
                            Enviar Teste
                        </Button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <KYCVerificationModal isOpen={showKYCModal} onClose={() => setShowKYCModal(false)} onComplete={loadSettings} />
            <NumberSelectionModal isOpen={showNumberModal} onClose={() => setShowNumberModal(false)} onSuccess={loadSettings} isSandbox={isSandbox} />
            <PortingRequestModal isOpen={showPortingModal} onClose={() => setShowPortingModal(false)} isSandbox={isSandbox} />
        </div>
    );
};
