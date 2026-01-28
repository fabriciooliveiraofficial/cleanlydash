import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MapPin, Camera, CheckSquare, Clock, AlertTriangle, Navigation } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getDistance } from '../../lib/route-optimizer';
import { useTranslation } from 'react-i18next';
import { createCleanerClient } from '../../lib/supabase/cleaner-client';

interface ActiveJobViewProps {
    job: any;
    onBack: () => void;
}

export const ActiveJobView: React.FC<ActiveJobViewProps> = ({ job, onBack }) => {
    const getInitialStep = () => {
        console.log('[ActiveJobView] Job status:', job.status);
        if (job.status === 'in_progress') {
            console.log('[ActiveJobView] Starting at: inspect (skipping check-in)');
            return 'inspect';
        }
        if (job.status === 'completed') {
            console.log('[ActiveJobView] Starting at: finish');
            return 'finish';
        }
        console.log('[ActiveJobView] Starting at: arrive (check-in)');
        return 'arrive';
    };

    const [step, setStep] = useState<'arrive' | 'inspect' | 'clean' | 'finish'>(getInitialStep());
    const [loadingLocation, setLoadingLocation] = useState(false);
    const { t } = useTranslation();
    const supabase = createCleanerClient(); // Use Cleaner's isolated client
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [fetchingInventory, setFetchingInventory] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [geoPermission, setGeoPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

    // Check geolocation permission on mount
    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                console.log('[Geo] Permission status:', result.state);
                setGeoPermission(result.state as any);
                result.onchange = () => {
                    console.log('[Geo] Permission changed to:', result.state);
                    setGeoPermission(result.state as any);
                };
            }).catch(() => setGeoPermission('unknown'));
        }
    }, []);

    // Timer effect - starts when entering 'clean' step
    useEffect(() => {
        if (step === 'clean') {
            console.log('[Timer] Starting timer...');
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                console.log('[Timer] Stopping timer. Elapsed:', elapsedSeconds, 'seconds');
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step]);

    // Format seconds to HH:MM:SS
    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const fetchInventory = async () => {
            if (!job?.id) return;
            setFetchingInventory(true);
            try {
                // 1. Try fetching booking-specific inventory
                const { data: bInv } = await supabase
                    .from('booking_inventory')
                    .select('quantity, inventory_items(name, unit)')
                    .eq('booking_id', job.id);

                if (bInv && bInv.length > 0) {
                    setInventory(bInv.map((bi: any) => ({
                        name: bi.inventory_items?.name,
                        quantity: bi.quantity,
                        unit: bi.inventory_items?.unit
                    })));
                    return;
                }

                // 2. Fallback to service-level defaults
                if (job.service_id) {
                    const { data: sInv } = await supabase
                        .from('service_inventory')
                        .select('quantity, inventory_items(name, unit)')
                        .eq('service_id', job.service_id);

                    if (sInv && sInv.length > 0) {
                        setInventory(sInv.map((si: any) => ({
                            name: si.inventory_items?.name,
                            quantity: si.quantity,
                            unit: si.inventory_items?.unit
                        })));
                        return;
                    }

                    // 3. Last fallback: Historical task-based requirements
                    const { data: tInv } = await supabase
                        .from('service_def_tasks')
                        .select(`
                            tasks (
                                task_inventory_requirements (
                                    quantity_needed,
                                    inventory_items ( name, unit )
                                )
                            )
                        `)
                        .eq('service_id', job.service_id);

                    const itemsMap = new Map();
                    tInv?.forEach((dt: any) => {
                        dt.tasks?.task_inventory_requirements?.forEach((req: any) => {
                            const name = req.inventory_items?.name;
                            if (name) {
                                const existing = itemsMap.get(name) || { quantity: 0, unit: req.inventory_items?.unit };
                                itemsMap.set(name, {
                                    name: name,
                                    quantity: existing.quantity + req.quantity_needed,
                                    unit: req.inventory_items?.unit
                                });
                            }
                        });
                    });
                    setInventory(Array.from(itemsMap.values()));
                }
            } catch (err) {
                console.error('Error fetching inventory:', err);
            } finally {
                setFetchingInventory(false);
            }
        };

        fetchInventory();
    }, [job?.id, job?.service_id]);

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
        toast.loading(t('cleaner.active_job.uploading'));
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
            toast.success(t('cleaner.active_job.photo_sent'));
        }, 1500);
    };

    const handleCheckIn = () => {
        console.log('[CheckIn] Button clicked');
        console.log('[CheckIn] Job data:', job);
        console.log('[CheckIn] Customer coords:', job.customers?.latitude, job.customers?.longitude);

        // Prevent duplicate calls while loading
        if (loadingLocation) {
            console.log('[CheckIn] Already loading, ignoring duplicate call');
            return;
        }

        if (!navigator.geolocation) {
            console.error('[CheckIn] Geolocation not supported');
            toast.error(t('geo.error_support', { defaultValue: "GPS not supported by this browser." }));
            return;
        }

        setLoadingLocation(true);
        console.log('[CheckIn] Requesting geolocation...');

        // No need for toast here - UI shows loading state
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log('[CheckIn] User location:', latitude, longitude);

                // Target coordinates
                const targetLat = job.customers?.latitude;
                const targetLng = job.customers?.longitude;

                if (!targetLat || !targetLng) {
                    console.warn('[CheckIn] No geofence coordinates for this property');
                    toast.error(t('geo.no_coordinates', {
                        defaultValue: "This property has no Geofence set. Please use the Manual Check-in option below for audit purposes."
                    }));
                    setLoadingLocation(false);
                    return;
                }

                const distance = getDistance(latitude, longitude, targetLat, targetLng);
                console.log(`[CheckIn] Distance to target: ${distance.toFixed(2)} meters`);

                const MAX_DISTANCE_METERS = job.customers?.geofence_radius || 60; // Geofence Radius (Default: 60m ~ 200ft)
                console.log(`[CheckIn] Max allowed distance: ${MAX_DISTANCE_METERS} meters`);

                if (distance <= MAX_DISTANCE_METERS) {
                    toast.success(t('geo.success', { defaultValue: "You are at the property!" }));

                    // Update Status in DB
                    const { error } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', job.id);
                    if (error) {
                        console.error('[CheckIn] DB update error:', error);
                        toast.error('Erro ao atualizar status: ' + error.message);
                    } else {
                        console.log('[CheckIn] Status updated to in_progress');
                        notifyClient('CHECK_IN');
                        setStep('inspect');
                    }
                } else {
                    console.warn(`[CheckIn] Too far: ${distance}m > ${MAX_DISTANCE_METERS}m`);
                    const distanceKm = (distance / 1000).toFixed(2);
                    const toastMsg = `📍 Você está a ${distanceKm}km da propriedade. Use o "Check-in Manual" abaixo.`;
                    console.log('[CheckIn] Showing toast:', toastMsg);
                    toast.error(toastMsg, { duration: 8000, id: 'checkin-too-far' });
                }
                setLoadingLocation(false);
            },
            (error) => {
                console.error("[CheckIn] Geo Error:", error);
                let msg = "Erro de GPS desconhecido";
                // GeolocationPositionError codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
                switch (error.code) {
                    case 1: msg = "📍 Localização negada. Ative o GPS nas configurações do navegador."; break;
                    case 2: msg = "📍 Sinal de localização indisponível. Tente novamente."; break;
                    case 3: msg = "📍 Tempo esgotado ao buscar localização. Tente novamente."; break;
                }
                toast.error(msg, { id: 'geo-error', duration: 6000 });
                setLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleInspectionDone = () => {
        setStep('clean');
    };

    const handleFinish = async () => {
        console.log('[Finish] Attempting to complete job:', job.id);

        try {
            const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', job.id);

            if (error) {
                console.error('[Finish] DB error:', error);
                toast.error('Erro ao finalizar: ' + error.message);
                return;
            }

            console.log('[Finish] Success! Status updated to completed');
            notifyClient('JOB_COMPLETED');
            toast.success(t('cleaner.active_job.completed_success', { defaultValue: 'Tarefa finalizada com sucesso!' }));

            setTimeout(() => {
                onBack();
            }, 1500);
        } catch (err: any) {
            console.error('[Finish] Unexpected error:', err);
            toast.error('Erro inesperado: ' + err.message);
        }
    };

    // Legacy toast.promise version (removed)
    const _handleFinishLegacy = async () => {
        toast.promise(
            async () => {
                await supabase.from('bookings').update({ status: 'completed' }).eq('id', job.id);
                notifyClient('JOB_COMPLETED');
                setTimeout(() => {
                    onBack();
                }, 1000);
            },
            {
                loading: t('cleaner.active_job.syncing'),
                success: t('cleaner.active_job.completed_success'),
                error: t('cleaner.active_job.completed_error')
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
                            <h3 className="text-2xl font-black text-slate-900">{t('cleaner.active_job.arrive_title')}</h3>
                            <p className="text-slate-500 max-w-[200px] mx-auto mt-2">{t('cleaner.active_job.arrive_subtitle')}</p>
                        </div>
                        <Button
                            onClick={handleCheckIn}
                            disabled={loadingLocation}
                            className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-200 disabled:opacity-50"
                        >
                            {loadingLocation ? t('cleaner.active_job.locating') : t('cleaner.active_job.check_in_button')}
                        </Button>
                        {loadingLocation && <p className="text-sm text-slate-400 animate-pulse">{t('cleaner.active_job.locating')}</p>}

                        {/* Manual Check-in - Always visible as fail-safe */}
                        <div className="pt-4 border-t border-slate-100 w-full">
                            <p className="text-xs text-slate-400 mb-2">Problemas com GPS? Use a opção manual:</p>
                            <button
                                onClick={() => {
                                    toast(
                                        '⚠️ Check-in Manual',
                                        {
                                            description: 'Tem certeza que está no local? O uso desta opção será auditado.',
                                            duration: 10000,
                                            id: 'manual-checkin-confirm',
                                            actionButtonStyle: { backgroundColor: '#4f46e5', color: 'white' },
                                            cancelButtonStyle: { backgroundColor: '#f1f5f9', color: '#475569' },
                                            action: {
                                                label: 'Confirmar',
                                                onClick: async () => {
                                                    const { error } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', job.id);
                                                    if (error) {
                                                        toast.error('Erro no check-in: ' + error.message);
                                                        return;
                                                    }
                                                    notifyClient('CHECK_IN_BYPASS');
                                                    toast.success('✅ Check-in manual realizado!');
                                                    setStep('inspect');
                                                }
                                            },
                                            cancel: { label: 'Cancelar', onClick: () => { } }
                                        }
                                    );
                                }}
                                className="text-xs font-semibold text-slate-400 underline hover:text-indigo-600"
                            >
                                Check-in Manual (será auditado)
                            </button>
                        </div>
                    </div>
                )}

                {step === 'inspect' && (
                    <div className="flex-1 flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {inventory.length > 0 && (
                            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                                <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><CheckSquare size={18} /> {t('booking_modal.tab_inventory')}</h3>
                                <div className="space-y-3">
                                    {inventory.map((item, i) => (
                                        <label key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-orange-100 cursor-pointer">
                                            <input type="checkbox" className="h-5 w-5 text-orange-600 rounded" />
                                            <span className="font-medium text-slate-700">
                                                {item.name} ({item.quantity}x)
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
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
                            <Camera size={20} /> {t('cleaner.active_job.report_damage')}
                        </Button>
                        <Button onClick={handleInspectionDone} className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700 rounded-2xl shadow-xl shadow-orange-200 mt-auto">
                            {t('cleaner.active_job.ready_button')}
                        </Button>
                    </div>
                )}

                {step === 'clean' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="h-40 w-40 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border-4 border-emerald-100">
                            <Clock size={64} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">{t('cleaner.active_job.in_progress_title')}</h3>
                            <p className="text-slate-500">{t('cleaner.active_job.timer_running')}</p>
                        </div>
                        <div className="bg-slate-50 px-6 py-3 rounded-xl font-mono text-2xl font-bold text-slate-700">
                            {formatTime(elapsedSeconds)}
                        </div>
                        <Button onClick={handleFinish} className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-xl shadow-emerald-200 mt-auto">
                            {t('cleaner.active_job.finish_button')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
