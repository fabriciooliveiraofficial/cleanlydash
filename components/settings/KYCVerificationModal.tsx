import React, { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { X, Building2, User, MapPin, FileText, Check, Loader2, Bot } from 'lucide-react';
import { useAICredits } from '../../hooks/use-ai-credits';
import { AIChatAssistant } from './AIChatAssistant';

interface KYCData {
    company_name: string;
    company_type: 'individual' | 'llc' | 'corporation' | 'nonprofit' | 'other';
    tax_id: string;
    country: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
}

interface KYCVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    existingData?: Partial<KYCData>;
}

const STEPS = [
    { id: 1, title: 'Empresa', icon: Building2 },
    { id: 2, title: 'Contato', icon: User },
    { id: 3, title: 'Endereço', icon: MapPin },
    { id: 4, title: 'Documentos', icon: FileText },
    { id: 5, title: 'Revisão', icon: Check },
];

export const KYCVerificationModal: React.FC<KYCVerificationModalProps> = ({
    isOpen,
    onClose,
    onComplete,
    existingData
}) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showAssistant, setShowAssistant] = useState(false);
    const [data, setData] = useState<KYCData>({
        company_name: existingData?.company_name || '',
        company_type: existingData?.company_type || 'individual',
        tax_id: existingData?.tax_id || '',
        country: existingData?.country || 'BR',
        contact_name: existingData?.contact_name || '',
        contact_email: existingData?.contact_email || '',
        contact_phone: existingData?.contact_phone || '',
        address_line1: existingData?.address_line1 || '',
        address_line2: existingData?.address_line2 || '',
        city: existingData?.city || '',
        state: existingData?.state || '',
        postal_code: existingData?.postal_code || '',
    });
    const [files, setFiles] = useState<{
        id?: File;
        address?: File;
        company?: File;
    }>({});

    const supabase = createClient();
    const { checkCredits } = useAICredits();

    if (!isOpen) return null;

    const updateField = (field: keyof KYCData, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (type: 'id' | 'address' | 'company', file: File | undefined) => {
        setFiles(prev => ({ ...prev, [type]: file }));
    };

    const uploadDocument = async (file: File, folder: string): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const ext = file.name.split('.').pop();
        const path = `${user.id}/${folder}/${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from('kyc-documents')
            .upload(path, file);

        if (error) {
            console.error('Upload error:', error);
            return null;
        }

        return path;
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Upload documents
            let docPaths: { id?: string; address?: string; company?: string } = {};

            if (files.id) {
                docPaths.id = await uploadDocument(files.id, 'id') || undefined;
            }
            if (files.address) {
                docPaths.address = await uploadDocument(files.address, 'address') || undefined;
            }
            if (files.company) {
                docPaths.company = await uploadDocument(files.company, 'company') || undefined;
            }

            // Save KYC data
            const { error } = await supabase.from('kyc_verifications').upsert({
                user_id: user.id,
                ...data,
                document_id_path: docPaths.id,
                document_address_path: docPaths.address,
                document_company_path: docPaths.company,
                status: 'in_progress',
                submitted_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

            if (error) throw error;

            // Call verify_kyc edge function to submit to Telnyx
            const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify_kyc');

            if (verifyError) {
                console.error('Verify KYC Error:', verifyError);
                toast.warning('Dados salvos. Verificação será processada em breve.');
            } else if (verifyResult?.status === 'approved') {
                toast.success('🎉 Verificação aprovada! Você pode ativar a telefonia agora.');
            } else {
                toast.success('Verificação enviada! Aguarde aprovação (até 48h).');
            }

            onComplete();
        } catch (err: any) {
            console.error('KYC Submit Error:', err);
            toast.error(err.message || 'Erro ao enviar verificação');
        } finally {
            setLoading(false);
        }
    };

    const handleAIAssist = () => {
        if (checkCredits()) {
            setShowAssistant(true);
        }
    };

    const getContextForStep = () => {
        const baseContext = `You are a helpful KYC verification assistant for Cleanlydash. 
        Current Step: ${step} of 5.
        Current Data: ${JSON.stringify(data)}.
        User needs help with: `;

        switch (step) {
            case 1: return baseContext + "Company Information (Business Name, Type, Tax ID/CNPJ). Explain document requirements for the selected company type.";
            case 2: return baseContext + "Contact Information. Assist with email or phone format issues.";
            case 3: return baseContext + "Address. Help with postal code or address format.";
            case 4: return baseContext + "Document Upload. Explain accepted file formats (PDF, Image), max size, and validity requirements for IDs and Proof of Address.";
            case 5: return baseContext + "Review. User is reviewing data before submission.";
            default: return baseContext + "General KYC questions.";
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">País de Origem *</label>
                            <select
                                value={data.country}
                                onChange={e => {
                                    const c = e.target.value;
                                    setData(prev => ({
                                        ...prev,
                                        country: c,
                                        // Reset company types when switching countries as they might differ in future
                                        company_type: 'individual'
                                    }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="BR">Brasil 🇧🇷</option>
                                <option value="US">Estados Unidos 🇺🇸</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {data.country === 'BR' ? 'Razão Social *' : 'Legal Business Name *'}
                            </label>
                            <input
                                type="text"
                                value={data.company_name}
                                onChange={e => updateField('company_name', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder={data.country === 'BR' ? "Ex: Minha Empresa LTDA" : "Ex: My Company LLC"}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Empresa *</label>
                            <select
                                value={data.company_type}
                                onChange={e => updateField('company_type', e.target.value as any)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                            >
                                {data.country === 'BR' ? (
                                    <>
                                        <option value="individual">Pessoa Física / MEI</option>
                                        <option value="llc">Limitada (LTDA)</option>
                                        <option value="corporation">Sociedade Anônima (S.A.)</option>
                                        <option value="nonprofit">ONG / Associação</option>
                                        <option value="other">Outro</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="individual">Sole Proprietorship</option>
                                        <option value="llc">LLC (Limited Liability Company)</option>
                                        <option value="corporation">Corporation (C-Corp, S-Corp)</option>
                                        <option value="nonprofit">Non-Profit Organization</option>
                                        <option value="other">Other</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {data.country === 'BR' ? 'CNPJ / CPF *' : 'EIN / Tax ID *'}
                            </label>
                            <input
                                type="text"
                                value={data.tax_id}
                                onChange={e => updateField('tax_id', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                                placeholder={data.country === 'BR' ? "00.000.000/0001-00" : "00-0000000"}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {data.country === 'BR'
                                    ? 'Informe o documento conforme cadastro na Receita Federal.'
                                    : 'Provide your 9-digit Employer Identification Number (EIN).'}
                            </p>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Responsável *</label>
                            <input
                                type="text"
                                value={data.contact_name}
                                onChange={e => updateField('contact_name', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail de Contato *</label>
                            <input
                                type="email"
                                value={data.contact_email}
                                onChange={e => updateField('contact_email', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone *</label>
                            <input
                                type="tel"
                                value={data.contact_phone}
                                onChange={e => updateField('contact_phone', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                                placeholder="+55 11 99999-9999"
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço *</label>
                            <input
                                type="text"
                                value={data.address_line1}
                                onChange={e => updateField('address_line1', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                                placeholder="Rua, número"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                            <input
                                type="text"
                                value={data.address_line2}
                                onChange={e => updateField('address_line2', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                                placeholder="Apto, Sala, etc."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade *</label>
                                <input
                                    type="text"
                                    value={data.city}
                                    onChange={e => updateField('city', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Estado *</label>
                                <input
                                    type="text"
                                    value={data.state}
                                    onChange={e => updateField('state', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                                    placeholder="SP"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CEP *</label>
                            <input
                                type="text"
                                value={data.postal_code}
                                onChange={e => updateField('postal_code', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                                placeholder="00000-000"
                            />
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                            <strong>{data.country === 'BR' ? 'Documentos Necessários:' : 'Required Documents:'}</strong>
                            <ul className="mt-2 space-y-1 list-disc list-inside">
                                {data.country === 'BR' ? (
                                    <>
                                        <li>Documento de identidade (RG/CNH/Passaporte)</li>
                                        <li>Comprovante de endereço (até 90 dias)</li>
                                        <li>Contrato social ou MEI (se aplicável)</li>
                                    </>
                                ) : (
                                    <>
                                        <li>Government ID (Driver's License / Passport)</li>
                                        <li>SS-4 Confirmation Letter (IRS) or Business Registration</li>
                                        <li>Proof of Address (Utility Bill, Bank Statement)</li>
                                    </>
                                )}
                            </ul>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {data.country === 'BR' ? 'Documento de Identidade *' : 'Authorized Rep ID (Passport/DL) *'}
                            </label>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={e => handleFileChange('id', e.target.files?.[0])}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {data.country === 'BR' ? 'Comprovante de Endereço *' : 'Proof of Address *'}
                            </label>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={e => handleFileChange('address', e.target.files?.[0])}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {data.country === 'BR' ? 'Registro da Empresa (opcional)' : 'Business Registration / SS-4 (Optional)'}
                            </label>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={e => handleFileChange('company', e.target.files?.[0])}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600"
                            />
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">País / Região:</span>
                                <span className="font-medium flex items-center gap-2">
                                    {data.country === 'BR' ? '🇧🇷 Brasil' : '🇺🇸 Estados Unidos'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{data.country === 'BR' ? 'Empresa:' : 'Company:'}</span>
                                <span className="font-medium">{data.company_name || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{data.country === 'BR' ? 'CNPJ/CPF:' : 'EIN/Tax ID:'}</span>
                                <span className="font-medium">{data.tax_id || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{data.country === 'BR' ? 'Responsável:' : 'Representative:'}</span>
                                <span className="font-medium">{data.contact_name || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">E-mail:</span>
                                <span className="font-medium">{data.contact_email || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{data.country === 'BR' ? 'Cidade:' : 'City:'}</span>
                                <span className="font-medium">{data.city}, {data.state}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Documentos:</span>
                                <span className="font-medium text-green-600">
                                    {[files.id, files.address, files.company].filter(Boolean).length} anexados
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-700 text-sm">
                            {data.country === 'BR'
                                ? 'Ao enviar, você declara que as informações são verdadeiras e autoriza a verificação.'
                                : 'By submitting, you certify that the information is accurate and authorize verification.'}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Verificação KYC</h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAIAssist}
                                className="text-indigo-600"
                            >
                                <Bot size={16} className="mr-1" />
                                Assistente IA
                            </Button>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="px-6 py-4 border-b border-slate-100">
                        <div className="flex justify-between">
                            {STEPS.map((s, i) => (
                                <div key={s.id} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= s.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {step > s.id ? <Check size={16} /> : s.id}
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`w-12 h-0.5 mx-1 ${step > s.id ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 text-center text-sm font-medium text-slate-600">
                            {STEPS[step - 1].title}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {renderStep()}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            disabled={step === 1}
                        >
                            Voltar
                        </Button>
                        {step < 5 ? (
                            <Button
                                onClick={() => setStep(s => Math.min(5, s + 1))}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                Próximo
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                Enviar Verificação
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <AIChatAssistant
                isOpen={showAssistant}
                onClose={() => setShowAssistant(false)}
                context={getContextForStep()}
                initialMessage={`Olá! Vejo que você está na etapa de ${STEPS[step - 1].title}. Como posso ajudar?`}
            />
        </>
    );
};
