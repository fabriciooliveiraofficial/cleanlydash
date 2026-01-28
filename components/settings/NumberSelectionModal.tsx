
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Search, Phone, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';

interface NumberSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (phoneNumber: string) => void;
    isSandbox: boolean;
}

interface SearchFormData {
    country_code: string;
    state: string;
    city: string;
    area_code: string;
}

interface AvailableNumber {
    phone_number: string;
    national_destination_code: string;
    region_information: {
        region_name: string;
        region_code: string;
    };
    cost_information: {
        upfront_cost: string;
        monthly_cost: string;
        currency: string;
    };
}

const NumberSelectionModal: React.FC<NumberSelectionModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    isSandbox
}) => {
    const [step, setStep] = useState<'search' | 'confirm'>('search');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<AvailableNumber[]>([]);
    const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null);
    const { register, handleSubmit, formState: { errors } } = useForm<SearchFormData>({
        defaultValues: { country_code: 'US' }
    });

    const supabase = createClient();

    const onSearch = async (data: SearchFormData) => {
        setLoading(true);
        setResults([]);
        try {
            const { data: numbers, error } = await supabase.functions.invoke('search_numbers', {
                body: { ...data, sandbox: isSandbox }
            });

            if (error) throw error;

            // LOG DIAGNOSTICS
            if (numbers?.debug) {
                console.log("=== SEARCH DIAGNOSTICS ===");
                console.log(numbers.debug);
                if (numbers.message) console.log("Message:", numbers.message);
            }

            setResults(numbers?.data || []);

            if (numbers?.data?.length === 0) {
                toast.info('Nenhum número encontrado com estes filtros.');
            }
        } catch (err: any) {
            console.error('Search failed:', err);

            let errorMessage = err.message;
            if (err.context && typeof err.context.json === 'function') {
                try {
                    const errorBody = await err.context.json();
                    errorMessage = errorBody.error || errorBody.message || JSON.stringify(errorBody);
                    if (errorBody.debug) console.log("Search Debug Info (Error Path):", errorBody.debug);
                    if (errorBody.telnyx_error) console.log("Telnyx Raw Error:", errorBody.telnyx_error);
                } catch (e) { /* ignore */ }
            }

            toast.error('Erro ao buscar números: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectNumber = (num: AvailableNumber) => {
        setSelectedNumber(num);
        setStep('confirm');
    };

    const handleConfirmPurchase = async () => {
        if (!selectedNumber) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('buy_number', {
                body: {
                    phone_number: selectedNumber.phone_number,
                    sandbox: isSandbox
                }
            });

            if (error) throw error;

            toast.success(isSandbox ? 'Número adquirido (Modo Sandbox)' : 'Número comprado com sucesso!');

            onSuccess(selectedNumber.phone_number);
            onClose();
        } catch (err: any) {
            console.error('Purchase failed:', err);
            let errorMessage = err.message;
            if (err.context && typeof err.context.json === 'function') {
                try {
                    const errorBody = await err.context.json();
                    errorMessage = errorBody.error || errorBody.message || JSON.stringify(errorBody);
                    console.log("=== PURCHASE FAILURE DETAILS ===");
                    console.log("Error Message:", errorMessage);
                    if (errorBody.debug) {
                        console.log("Debug Info (JSON):", JSON.stringify(errorBody.debug, null, 2));
                    }
                    if (errorBody.telnyx_error) {
                        console.log("Telnyx Raw Response (JSON):", JSON.stringify(errorBody.telnyx_error, null, 2));
                    }
                } catch (e) { /* ignore */ }
            }
            toast.error('Partiu! Erro ao comprar: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center ${isSandbox ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-indigo-600" />
                            Nova Linha Telefônica
                        </h2>
                        {isSandbox && (
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3" /> Modo de Teste Ativo
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'search' ? (
                        <div className="space-y-6">
                            {/* Search Form */}
                            <form onSubmit={handleSubmit(onSearch)} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">País</label>
                                    <select {...register('country_code')} className="w-full h-10 rounded-md border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="US">Estados Unidos (US)</option>
                                        <option value="CA">Canadá (CA)</option>
                                        <option value="BR">Brasil (BR)</option>
                                        <option value="GB">Reino Unido (GB)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Estado / Região</label>
                                    <input {...register('state')} placeholder="Ex: NY, FL, SP" className="w-full h-10 rounded-md border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">DDD / Area Code</label>
                                    <input {...register('area_code')} placeholder="Ex: 212, 11" className="w-full h-10 rounded-md border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1 flex items-end">
                                    <button type="submit" disabled={loading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        Buscar
                                    </button>
                                </div>
                            </form>

                            {/* Results List */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-slate-900">Resultados Disponíveis</h3>
                                {results.length === 0 && !loading && (
                                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                        Faça uma busca para ver números disponíveis
                                    </div>
                                )}
                                <div className="grid gap-3">
                                    {results.map((num, idx) => (
                                        <div key={`${num.phone_number}-${idx}`} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                                    {num.national_destination_code}
                                                </div>
                                                <div>
                                                    <p className="text-lg font-mono font-medium text-slate-900">{num.phone_number}</p>
                                                    <p className="text-xs text-slate-500">{num.region_information?.region_name}, {num.region_information?.region_code}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div className="hidden md:block">
                                                    <p className="text-sm font-medium text-slate-900">$1.00 <span className="text-xs font-normal text-slate-500">/mês</span></p>
                                                    {isSandbox && <p className="text-xs text-amber-600 font-bold">Grátis (Sandbox)</p>}
                                                </div>
                                                <button
                                                    onClick={() => handleSelectNumber(num)}
                                                    className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 font-medium transition-colors text-sm"
                                                >
                                                    Selecionar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6">
                            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-slate-900">Confirmar Compra</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">
                                    Você está prestes a adquirir o número <strong className="text-slate-900">{selectedNumber?.phone_number}</strong>.
                                </p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 w-full max-w-sm space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Número</span>
                                    <span className="font-mono font-medium text-slate-900">{selectedNumber?.phone_number}</span>
                                </div>
                                <div className="border-t border-slate-200 my-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-slate-900">Mensalidade</span>
                                    <span className={`font-bold ${isSandbox ? 'text-amber-600' : 'text-slate-900'}`}>
                                        {isSandbox ? '$0.00' : '$1.00'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-4 w-full max-w-sm">
                                <button onClick={() => setStep('search')} className="flex-1 h-12 bg-white text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors">Voltar</button>
                                <button onClick={handleConfirmPurchase} disabled={loading} className="flex-1 h-12 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Compra'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export { NumberSelectionModal };
