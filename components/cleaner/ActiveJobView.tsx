import React, { useState, useRef } from 'react';
import { ArrowLeft, MapPin, Camera, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getDistance } from '../../lib/route-optimizer';
import { useTranslation } from 'react-i18next';
import { createClient } from '../../lib/supabase/client';

interface ActiveJobViewProps {
    job: any;
    onBack: () => void;
}

export const ActiveJobView: React.FC<ActiveJobViewProps> = ({ job, onBack }) => {
    const getInitialStep = () => {
        if (job.status === 'in_progress') return 'inspect';
        if (job.status === 'completed') return 'finish';
        return 'arrive';
    };

    const [step, setStep] = useState<'arrive' | 'inspect' | 'clean' | 'finish'>(getInitialStep());
    const [loadingLocation, setLoadingLocation] = useState(false);
    const { t } = useTranslation();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const notifyClient = (type: string, payload?: any) => {
        // Simulação de Gatilho de Notificação (Webhooks)
        console.log(`[Notification Trigger] Sending ${type} to owner/client for booking ${job.id}`, payload);
        toast.info(t('notify.sent', { defaultValue: "Notification sent to client." }));
    };

    const handleReportDamage = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.loading("Uploading evidence...");

        // Simulating upload delay
        setTimeout(async () => {
            // In a real scenario, we upload to Supabase Storage:
            // const { data, error } = await supabase.storage.from('evidence').upload(...)

            // For now, mock URL
            const mockUrl = URL.createObjectURL(file);

            // Log entry in job_evidence table
            await (supabase.from('job_evidence') as any).insert({
                tenant_id: job.tenant_id,
                booking_id: job.id,
                type: 'damage_report',
                url: 'https://mock-storage.com/damage-123.jpg',
                notes: 'Reported by Cleaner via App'
            });

            notifyClient('DAMAGE_REPORT', { url: mockUrl });
            toast.success("Foto enviada! O proprietário foi notificado.");
        }, 1500);
    };

    const handleCheckIn = () => {
        if (!navigator.geolocation) {
            toast.error(t('geo.error_support', { defaultValue: "GPS not supported by this browser." }));
            return;
        }

        setLoadingLocation(true);
        toast.info(t('geo.requesting', { defaultValue: "Requesting location access..." }));

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                // Target coordinates
                const targetLat = job.customers?.latitude;
                const targetLng = job.customers?.longitude;

                if (!targetLat || !targetLng) {
                    toast.error(t('geo.no_coordinates', {
                        defaultValue: "This property has no Geofence set. Please use the Manual Check-in option below for audit purposes."
                    }));
                    setLoadingLocation(false);
                    return;
                }

                const distance = getDistance(latitude, longitude, targetLat, targetLng);
                console.log(`Distance to target: ${distance.toFixed(2)} meters`);

                const MAX_DISTANCE_METERS = job.customers?.geofence_radius || 60; // Geofence Radius (Default: 60m ~ 200ft)

                if (distance <= MAX_DISTANCE_METERS) {
                    toast.success(t('geo.success', { defaultValue: "You are at the property!" }));

                    // Update Status in DB
                    await (supabase.from('bookings') as any).update({ status: 'in_progress' }).eq('id', job.id);
                    notifyClient('CHECK_IN');

                    setStep('inspect');
                } else {
                    toast.error(t('geo.too_far', {
                        defaultValue: `You are ${(distance / 1000).toFixed(2)}km away. Please go to the property.`,
                        distance: (distance / 1000).toFixed(2)
                    }));
                }
                setLoadingLocation(false);
            },
            (error) => {
                console.error("Geo Error:", error);
                let msg = "Unknown GPS Error";
                switch (error.code) {
                    case error.PERMISSION_DENIED: msg = t('geo.denied', { defaultValue: "Please enable Location Services." }); break;
                    case error.POSITION_UNAVAILABLE: msg = t('geo.unavailable', { defaultValue: "Location signal unavailable." }); break;
                    case error.TIMEOUT: msg = t('geo.timeout', { defaultValue: "Location request timed out." }); break;
                }
                toast.error(msg);
                setLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleInspectionDone = () => {
        setStep('clean');
    };

    const handleFinish = async () => {
        toast.promise(
            async () => {
                await (supabase.from('bookings') as any).update({ status: 'completed' }).eq('id', job.id);
                notifyClient('JOB_COMPLETED');
                setTimeout(() => {
                    onBack();
                }, 1000);
            },
            {
                loading: 'Syncing with HQ...',
                success: 'Job Completed Successfully!',
                error: 'Failed to update status.'
            }
        );
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center gap-3 border-b sticky top-0 bg-white z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="font-bold text-slate-800 leading-none">{job.customers?.name}</h2>
                    <p className="text-xs text-slate-500">{job.customers?.address}</p>
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                {/* Progress Stepper */}
                <div className="flex justify-between px-4 pb-4">
                    {['arrive', 'inspect', 'clean', 'finish'].map((s, i) => (
                        <div key={s} className={`h-2 rounded-full flex-1 mx-1 transition-colors ${['arrive', 'inspect', 'clean', 'finish'].indexOf(step) >= i ? 'bg-indigo-600' : 'bg-slate-100'
                            }`} />
                    ))}
                </div>

                {step === 'arrive' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="h-32 w-32 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 animate-pulse">
                            <MapPin size={48} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Cheguei</h3>
                            <p className="text-slate-500 max-w-[200px] mx-auto mt-2">Valide sua localização via GPS para liberar o acesso.</p>
                        </div>
                        <Button onClick={handleCheckIn} className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-200">
                            Fazer Check-in
                        </Button>

                        {loadingLocation && <p className="text-sm text-slate-400 animate-pulse">Consultando satélites...</p>}

                        {/* Fallback / Fail-safe */}
                        <div className={`transition-opacity duration-500 ${step === 'arrive' ? 'opacity-100' : 'opacity-0'}`}>
                            <button
                                onClick={async () => {
                                    if (confirm("Tem certeza que está no local? O uso desta opção será auditado.")) {
                                        await (supabase.from('bookings') as any).update({ status: 'in_progress' }).eq('id', job.id);
                                        notifyClient('CHECK_IN_BYPASS');
                                        toast.warning("Check-in manual registrado via Bypass.");
                                        setStep('inspect');
                                    }
                                }}
                                className="text-xs font-semibold text-slate-400 underline mt-4 hover:text-indigo-600"
                            >
                                Problemas com GPS? Check-in Manual
                            </button>
                        </div>
                    </div>
                )}

                {step === 'inspect' && (
                    <div className="flex-1 flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                            <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><CheckSquare size={18} /> Inventário</h3>
                            <div className="space-y-3">
                                {['Toalhas (4x)', 'Papel Higiênico (2x)', 'Shampoo'].map((item, i) => (
                                    <label key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-orange-100 cursor-pointer">
                                        <input type="checkbox" className="h-5 w-5 text-orange-600 rounded" />
                                        <span className="font-medium text-slate-700">{item}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <Button
                            onClick={handleReportDamage}
                            variant="outline"
                            className="w-full py-6 border-dashed border-2 border-slate-300 text-slate-500 gap-2 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                            <Camera size={20} /> Reportar Dano (Foto)
                        </Button>
                        <Button onClick={handleInspectionDone} className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700 rounded-2xl shadow-xl shadow-orange-200 mt-auto">
                            Tudo Pronto
                        </Button>
                    </div>
                )}

                {step === 'clean' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="h-40 w-40 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border-4 border-emerald-100">
                            <Clock size={64} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Em Progresso</h3>
                            <p className="text-slate-500">O cronômetro está rodando.</p>
                        </div>
                        <div className="bg-slate-50 px-6 py-3 rounded-xl font-mono text-2xl font-bold text-slate-700">
                            00:15:23
                        </div>
                        <Button onClick={handleFinish} className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-xl shadow-emerald-200 mt-auto">
                            Finalizar Serviço
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
