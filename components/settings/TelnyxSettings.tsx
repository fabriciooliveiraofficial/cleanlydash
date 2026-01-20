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

            // Load Telnyx config
            const { data: telnyxData, error: telnyxError } = await supabase
                .from('telnyx_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (telnyxData) {
                setConfig(telnyxData);
            } else if (telnyxError) {
                console.error("Error fetching settings:", telnyxError);
            }

            // Load KYC status
            const { data: kycData, error: kycError } = await supabase
                .from('kyc_verifications')
                .select('status, rejection_reason')
                .eq('user_id', user.id)
                .maybeSingle();

            if (kycData) {
                setKycStatus(kycData);
            } else if (kycError) {
                console.error("Error fetching KYC:", kycError);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleProvision = async () => {
        // Check KYC status first (Skip if Sandbox?) - No, KYC is foundational.
        if (!kycStatus || kycStatus.status !== 'approved') {
            toast.error('Verificação KYC necessária', {
                description: 'Complete a verificação de identidade antes de ativar a telefonia.',
                action: {
                    label: 'Iniciar Verificação',
                    onClick: () => setShowKYCModal(true)
                },
                duration: 8000
            });
            return;
        }

        setProvisioning(true);
        try {
            const { data, error } = await supabase.functions.invoke('provision_tenant', {
                body: { sandbox: isSandbox } // Pass Sandbox Flag
            });

            if (error) throw error;

            toast.success(isSandbox ? 'Conta Telnyx SIMULADA com sucesso!' : 'Conta Telnyx configurada com sucesso!');
            loadSettings();
        } catch (err: any) {
            console.error("Provision Error", err);
            toast.error(err.message || "Erro ao provisionar.");
        } finally {
            setProvisioning(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" />Carregando...</div>;

    const isProvisioned = config?.managed_account_id;
    const isKYCApproved = kycStatus?.status === 'approved';
    const isKYCPending = kycStatus?.status === 'submitted';
    const isKYCRejected = kycStatus?.status === 'rejected';

    const renderKYCStatus = () => {
        if (isKYCApproved) {
            return (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-3">
                    <ShieldCheck size={20} />
                    <div>
                        <div className="font-medium">Verificação KYC Aprovada</div>
                        <div className="text-xs text-green-600">Você pode ativar os recursos de telefonia.</div>
                    </div>
                </div>
            );
        }

        if (isKYCPending) {
            return (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin" />
                    <div>
                        <div className="font-medium">Verificação em Análise</div>
                        <div className="text-xs text-amber-600">Aguarde a aprovação (até 48h úteis).</div>
                    </div>
                </div>
            );
        }

        if (isKYCRejected) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle size={20} />
                        <div className="font-medium">Verificação Rejeitada</div>
                    </div>
                    {kycStatus?.rejection_reason && (
                        <div className="text-xs text-red-600 mb-2">Motivo: {kycStatus.rejection_reason}</div>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setShowKYCModal(true)}>
                        Reenviar Documentos
                    </Button>
                </div>
            );
        }

        return (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm">
                <div className="flex items-center gap-3 mb-3">
                    <ShieldCheck size={20} className="text-slate-400" />
                    <div>
                        <div className="font-medium">Verificação KYC Necessária</div>
                        <div className="text-xs text-slate-500">
                            Para cumprir requisitos legais da Telnyx/FCC, você deve verificar sua identidade.
                        </div>
                    </div>
                </div>
                <Button size="sm" onClick={() => setShowKYCModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    Iniciar Verificação
                </Button>
            </div>
        );
    };

    return (
        <>
            <div className="max-w-2xl mx-auto p-6 space-y-8">

                {/* Header & Sandbox Switch */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-900">Configuração de Telefonia</h2>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isSandbox}
                                onChange={(e) => setIsSandbox(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                            <span className="ml-2 text-xs font-medium text-slate-600">
                                {isSandbox ? 'Modo Sandbox' : 'Modo Produção'}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Banner when Sandbox is active */}
                {isSandbox && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-amber-700">
                                    <span className="font-bold">Modo de Teste Ativo:</span> Nenhuma cobrança será realizada e comunicações não serão enviadas para redes reais. Use para validar fluxos.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center relative overflow-hidden ${isSandbox ? 'opacity-90' : ''}`}>
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl z-10">
                        <MessageSquare size={24} />
                    </div>
                    <div className="z-10">
                        <h2 className="text-lg font-bold text-slate-900">Integração Telnyx (Managed)</h2>
                        <p className="text-sm text-slate-600">
                            {isProvisioned
                                ? "Sua conta de telefonia está ativa e gerenciada pela plataforma."
                                : "Configure sua conta para enviar SMS e realizar chamadas."}
                        </p>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl"></div>
                </div>

                {/* KYC Status Section */}
                {!isProvisioned && renderKYCStatus()}

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                    {!isProvisioned ? (
                        <div className="text-center py-8">
                            <div className="mb-4 text-slate-500">
                                {isKYCApproved
                                    ? "Sua verificação foi aprovada! Clique abaixo para ativar a telefonia."
                                    : "Complete a verificação KYC para habilitar a telefonia."}
                            </div>
                            <Button
                                onClick={handleProvision}
                                disabled={provisioning || !isKYCApproved}
                                className={`w-full sm:w-auto ${isKYCApproved ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}
                            >
                                {provisioning ? <><Loader2 className="animate-spin mr-2" size={16} />Configurando...</> : (isSandbox ? 'Simular Ativação (Sandbox)' : 'Ativar Telefonia')}
                            </Button>
                            {!isKYCApproved && (
                                <p className="mt-2 text-xs text-slate-400">
                                    Requer aprovação KYC para prosseguir.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                                <div className="text-green-700 text-sm font-medium flex items-center gap-2">
                                    ✓ Conta Ativa: {config?.managed_account_id}
                                    {config?.managed_account_id?.includes("TEST") && <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full">SANDBOX</span>}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={provisioning}
                                    onClick={async () => {
                                        if (!confirm('Tem certeza? Isso irá apagar sua integração e número configurado. Você terá que configurar novamente.')) return;
                                        setProvisioning(true);
                                        try {
                                            const { error } = await supabase.functions.invoke('provision_tenant', {
                                                body: { reset: true }
                                            });
                                            if (error) throw error;
                                            toast.success('Reset realizado com sucesso.');
                                            setConfig(null); // Reset local state
                                        } catch (e: any) {
                                            toast.error(e.message);
                                        } finally {
                                            setProvisioning(false);
                                        }
                                    }}
                                >
                                    Resetar Integração
                                </Button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Seu Número (From)
                                </label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={config?.phone_number || 'Nenhum número adquirido'}
                                        readOnly
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                                    />
                                </div>
                                <div className="mt-2 text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setShowNumberModal(true)}
                                        disabled={provisioning}
                                    >
                                        {config?.phone_number ? 'Trocar Número' : 'Adquirir Novo Número'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-indigo-600 ml-2"
                                        onClick={() => setShowPortingModal(true)}
                                        disabled={provisioning}
                                    >
                                        Portabilidade
                                    </Button>
                                </div>
                            </div>

                            {/* Test SMS Section */}
                            {config?.phone_number && (
                                <div className={`mt-6 pt-6 border-t border-slate-100 ${isSandbox ? 'bg-amber-50/50 p-4 rounded-lg' : ''}`}>
                                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        Testar Envio de SMS
                                        {isSandbox && <span className="text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Simulação</span>}
                                    </h3>
                                    <div className="space-y-3">
                                        <input
                                            placeholder="Para: +5511999999999"
                                            id="test-sms-to"
                                            className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200"
                                        />
                                        <textarea
                                            placeholder="Mensagem de teste..."
                                            id="test-sms-msg"
                                            className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 h-20 resize-none"
                                        />
                                        <Button
                                            size="sm"
                                            className="w-full bg-slate-900 text-white hover:bg-slate-800"
                                            onClick={async () => {
                                                const to = (document.getElementById('test-sms-to') as HTMLInputElement).value;
                                                const msg = (document.getElementById('test-sms-msg') as HTMLTextAreaElement).value;
                                                if (!to || !msg) return toast.error('Preencha destinatário e mensagem');

                                                try {
                                                    const { error } = await supabase.functions.invoke('send_sms', {
                                                        body: { to, message: msg, sandbox: isSandbox }
                                                    });
                                                    if (error) throw error;
                                                    toast.success(isSandbox ? 'SMS Simulado com sucesso!' : 'SMS enviado!');
                                                    (document.getElementById('test-sms-msg') as HTMLTextAreaElement).value = '';
                                                } catch (e: any) {
                                                    toast.error('Erro ao enviar: ' + e.message);
                                                }
                                            }}
                                        >
                                            Enviar Teste
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <KYCVerificationModal
                isOpen={showKYCModal}
                onClose={() => setShowKYCModal(false)}
                onComplete={() => {
                    setShowKYCModal(false);
                    loadSettings();
                }}
            />

            <NumberSelectionModal
                isOpen={showNumberModal}
                onClose={() => setShowNumberModal(false)}
                onSuccess={(num) => {
                    loadSettings();
                    // Optional: Auto-close after success is handled by modal logic or here
                }}
                isSandbox={isSandbox}
            />

            <PortingRequestModal
                isOpen={showPortingModal}
                onClose={() => setShowPortingModal(false)}
                isSandbox={isSandbox}
            />
        </>
    );
};

