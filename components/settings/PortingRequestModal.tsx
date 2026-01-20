
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Upload, Loader2, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';

interface PortingRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    isSandbox: boolean;
}

interface PortingFormData {
    phone_numbers: string; // Comma separated
    auth_name: string;
    account_number: string;
    pin: string;
    billing_phone: string;
    address_line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export const PortingRequestModal: React.FC<PortingRequestModalProps> = ({
    isOpen,
    onClose,
    isSandbox
}) => {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [loaFile, setLoaFile] = useState<File | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<PortingFormData>();
    const supabase = createClient();

    const onSubmit = async (data: PortingFormData) => {
        if (!loaFile || !invoiceFile) {
            toast.error("Por favor, faça upload da LOA e da Fatura.");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Files to Storage
            const timestamp = Date.now();
            const loaPath = `porting/${timestamp}_loa_${loaFile.name}`;
            const invoicePath = `porting/${timestamp}_invoice_${invoiceFile.name}`;

            // Create bucket if not exists (handled by policies usually, assuming 'telephony-docs' exists)
            // For MVP, we presume successful upload or create bucket logic elsewhere. 
            // Here we assume a private bucket 'telephony-docs'.

            const { error: uploadError1 } = await supabase.storage
                .from('telephony-docs')
                .upload(loaPath, loaFile);

            if (uploadError1) throw new Error("Erro ao enviar LOA: " + uploadError1.message);

            const { error: uploadError2 } = await supabase.storage
                .from('telephony-docs')
                .upload(invoicePath, invoiceFile);

            if (uploadError2) throw new Error("Erro ao enviar Fatura: " + uploadError2.message);

            // 2. Call Edge Function
            const numbers = data.phone_numbers.split(',').map(n => n.trim());
            const address = {
                line1: data.address_line1,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country
            };

            const { data: resData, error: funcError } = await supabase.functions.invoke('create_porting_order', {
                body: {
                    phone_numbers: numbers,
                    auth_name: data.auth_name,
                    billing_phone: data.billing_phone,
                    account_number: data.account_number,
                    pin: data.pin,
                    address,
                    documents: { loa: loaPath, invoice: invoicePath },
                    sandbox: isSandbox
                }
            });

            if (funcError) throw funcError;

            toast.success("Solicitação de portabilidade enviada!");
            setStep('success');

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Falha ao enviar solicitação.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Solicitar Portabilidade (LNP)</h2>
                        <p className="text-xs text-slate-500">Traga seus números existentes para a plataforma.</p>
                    </div>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {step === 'form' ? (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            {/* Numbers */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Números para Portabilidade</label>
                                <textarea
                                    {...register('phone_numbers', { required: true })}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm h-24 font-mono"
                                    placeholder="+5511999999999, +5511888888888"
                                />
                                <p className="text-xs text-slate-500">Separe múltiplos números por vírgula. Formato E.164.</p>
                            </div>

                            {/* Auth Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Nome Autorizado (na Fatura)</label>
                                    <input {...register('auth_name', { required: true })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Telefone de Contato</label>
                                    <input {...register('billing_phone', { required: true })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                </div>
                            </div>

                            {/* ACCOUNT AND PIN (New Section) */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Conta (Account #)</label>
                                    <input {...register('account_number')} placeholder="Opcional se na LOA" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">PIN / Passcode</label>
                                    <input {...register('pin')} placeholder="Opcional se na LOA" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div className="col-span-2 text-xs text-slate-500">
                                    *Normalmente exigido para números VoIP ou Móveis.
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Endereço de Cobrança (Atual)</label>
                                <input {...register('address_line1', { required: true })} placeholder="Rua, Número, Comp." className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                <div className="grid grid-cols-3 gap-2">
                                    <input {...register('city', { required: true })} placeholder="Cidade" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                    <input {...register('state', { required: true })} placeholder="Estado" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                    <input {...register('zip', { required: true })} placeholder="CEP/Zip" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <input {...register('country', { required: true })} placeholder="País (ex: BR, US)" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" defaultValue="BR" />
                            </div>

                            {/* Documents */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900">Documentação Obrigatória</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* LOA */}
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
                                        <FileText className="w-8 h-8 text-indigo-400 mb-2" />
                                        <span className="text-sm font-bold text-slate-700 mb-1">Carta de Autorização (LOA)</span>
                                        <span className="text-xs text-slate-400 mb-2">Assinada pelo titular</span>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setLoaFile(e.target.files?.[0] || null)}
                                            accept=".pdf,.jpg,.png"
                                        />
                                        {loaFile ? (
                                            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full">{loaFile.name}</span>
                                        ) : (
                                            <span className="text-xs text-indigo-600 font-bold">Selecionar Arquivo</span>
                                        )}
                                    </div>

                                    {/* Invoice */}
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
                                        <FileText className="w-8 h-8 text-indigo-400 mb-2" />
                                        <span className="text-sm font-bold text-slate-700 mb-1">Fatura Recente</span>
                                        <span className="text-xs text-slate-400 mb-2">Comprovante de titularidade</span>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                                            accept=".pdf,.jpg,.png"
                                        />
                                        {invoiceFile ? (
                                            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full">{invoiceFile.name}</span>
                                        ) : (
                                            <span className="text-xs text-indigo-600 font-bold">Selecionar Arquivo</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                                    Enviar Solicitação
                                </button>
                            </div>

                        </form>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Solicitação Enviada!</h3>
                            <p className="text-slate-500 max-w-sm">
                                Sua portabilidade foi iniciada. O processo pode levar de 1 a 4 semanas dependendo da operadora de origem. Você será notificado por email.
                            </p>
                            <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl">
                                Fechar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
