import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createCleanerClient } from '../../lib/supabase/cleaner-client';
import { JobCard } from './JobCard';
import { ActiveJobView } from './ActiveJobView';
import { EarningsTab } from './EarningsTab';
import { LogOut, RefreshCw, UserCheck, Settings, Key, Briefcase, DollarSign, BellOff, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../language-switcher';
import { LanguageFloatingWidget } from '../LanguageFloatingWidget';
import { ChangePasswordModal } from './ChangePasswordModal';
import { BookingDetailsDrawer } from './BookingDetailsDrawer';
import { CleanerNotificationsDrawer } from './CleanerNotificationsDrawer';
import { DelayModal } from './DelayModal';
import { Bell } from 'lucide-react';
import { PWAInstallPrompt } from '../PWAInstallPrompt';
import { useNotifications } from '../../hooks/use-notifications';
import { Button } from '../ui/button';

interface CleanerAppProps {
    userName?: string;
    userId?: string;
}

export const CleanerApp: React.FC<CleanerAppProps> = ({ userName, userId: initialUserId }) => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeJob, setActiveJob] = useState<any | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [activeTab, setActiveTab] = useState<'jobs' | 'earnings'>('jobs');
    const [userId, setUserId] = useState<string | null>(initialUserId || null);
    const [detailsJob, setDetailsJob] = useState<any | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedDelayJob, setSelectedDelayJob] = useState<any>(null);
    const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

    // Check browser geolocation permission on mount and listen for changes
    useEffect(() => {
        const checkPermission = async () => {
            if (!navigator.permissions) {
                // Fallback for browsers without Permissions API
                setLocationPermission('unknown');
                return;
            }
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');

                // Listen for permission changes
                result.addEventListener('change', () => {
                    setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
                    if (result.state === 'granted') {
                        toast.success('📍 Localização ativada!', { id: 'loc-granted' });
                    } else if (result.state === 'denied') {
                        toast.error('📍 Localização bloqueada pelo navegador.', { id: 'loc-denied' });
                    }
                });
            } catch (e) {
                console.error('[Permissions] Error checking geolocation:', e);
                setLocationPermission('unknown');
            }
        };
        checkPermission();
    }, []);

    const supabase = createCleanerClient(); // ISOLATED CLEANER CLIENT
    const { t, i18n } = useTranslation();
    const { isSubscribed, subscribe, checkSubscription, loading: notifLoading } = useNotifications({ supabaseClient: supabase });

    const handleNotifyDelay = async (minutes: number) => {
        if (!selectedDelayJob) return;

        try {
            // 1. Fetch Notification Preference (SMS vs Email) - Using tenant_notification_settings
            const { data: settings } = await supabase
                .from('tenant_notification_settings')
                .select('sms_enabled, email_enabled')
                .eq('tenant_id', selectedDelayJob.tenant_id)
                .single();

            // Default to Email if nothing set, or prioritize SMS if enabled
            const channel = settings && (settings as any).sms_enabled ? 'sms' : 'email';

            // 2. Mock Edge Function Call
            console.log(`[Edge Function] Triggering DELAY_NOTIFICATION via ${channel.toUpperCase()}`, {
                booking_id: selectedDelayJob.id,
                minutes,
                message: `Hello, your cleaner is running approximately ${minutes} minutes behind schedule and will arrive shortly. We apologize for the delay.`
            });

            // 3. Simulated success
            setTimeout(() => {
                toast.success(t('cleaner.notifications.delay_success', { minutes, channel: channel.toUpperCase() }), {
                    icon: '✉️'
                });
                setSelectedDelayJob(null);
            }, 1000);

        } catch (error) {
            console.error('Error notifying delay:', error);
            toast.error(t('cleaner.notifications.delay_failed'));
        }
    };
    const [notifications, setNotifications] = useState<any[]>([
        {
            id: '1',
            type: 'assignment',
            title: 'Novo Trabalho Atribuído',
            message: 'Você foi escalado para uma limpeza em Adam Kate amanhã às 08:00.',
            timestamp: '1h atrás',
            isRead: false
        },
        {
            id: '2',
            type: 'update',
            title: 'Horário Alterado',
            message: 'O horário do agendamento de hoje foi ajustado para às 11:30.',
            timestamp: '3h atrás',
            isRead: true
        }
    ]);

    const unreadCount = notifications.filter(n => !n.isRead).length;


    const fetchJobs = async () => {
        setLoading(true);

        // Use date-only format to avoid timezone issues with ISO string
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        console.log('[CleanerApp] Fetching jobs for cleaner:', userId);
        console.log('[CleanerApp] Today (local):', today.toLocaleDateString('pt-BR'));
        console.log('[CleanerApp] Today (ISO date):', todayStr);

        // Fetch bookings for TODAY ONLY (Assigned to this cleaner)
        // Filter only pending/in_progress jobs (exclude completed/cancelled)
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                customers ( name, address, latitude, longitude, geofence_radius ),
                services ( name )
            `)
            .eq('assigned_to', userId) // FILTER BY CLEANER
            .gte('start_date', todayStr) // start_date >= today
            .lt('start_date', todayStr + 'T23:59:59') // start_date < end of today
            .in('status', ['pending', 'in_progress', 'confirmed', 'completed']) // Include completed for today's history
            .order('start_date', { ascending: true }); // Primary sort by date

        if (error) {
            console.error('[CleanerApp] Error fetching jobs:', error);
        }

        // Debug: Log each job's date
        console.log('[CleanerApp] Fetched jobs:', data?.length || 0);
        data?.forEach((job: any, i: number) => {
            const jobDate = new Date(job.start_date);
            console.log(`[CleanerApp] Job ${i + 1}: ${job.customers?.name} | Date: ${jobDate.toLocaleDateString('pt-BR')} | Status: ${job.status} | Raw: ${job.start_date}`);
        });

        // Sort: Active/In-Progress first, then by date
        const sorted = ((data as any[]) || []).sort((a, b) => {
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
            if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
            return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        });

        setBookings(sorted);
        setLoading(false);
    };

    useEffect(() => {
        fetchJobs();
        checkSubscription();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const getDateLocale = () => {
        const lang = i18n.language;
        if (lang.includes('pt')) return ptBR;
        if (lang.includes('es')) return es;
        return enUS;
    };

    if (activeJob) {
        return <ActiveJobView job={activeJob} onBack={() => { setActiveJob(null); fetchJobs(); }} />;
    }

    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans">
            {/* Cleaner Header */}
            <header className="bg-white px-6 pt-12 pb-6 shadow-sm rounded-b-[2rem] relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                            {userName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CL'}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 leading-none">
                                {t('cleaner.hello', { name: userName?.split(' ')[0] || "Cleaner", defaultValue: `Olá, ${userName?.split(' ')[0] || "Cleaner"}` })}
                            </h1>
                            <p className="text-sm font-medium text-slate-400">{t('role.cleaner', { defaultValue: 'Cleaner Crew' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowNotifications(true)}
                                    className="p-3 bg-slate-100 rounded-2xl text-slate-600 hover:text-indigo-600 transition-colors relative"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                                    )}
                                </button>
                                <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="p-3 bg-slate-100 rounded-2xl text-slate-600 hover:text-indigo-600 transition-colors">
                                    <Settings size={20} />
                                </button>
                            </div>
                            {showSettingsMenu && (
                                <div className="absolute right-0 top-12 bg-white rounded-xl shadow-lg border border-slate-100 py-2 min-w-[180px] z-50">
                                    {!isSubscribed && (
                                        <div className="px-4 py-2 border-b border-slate-100">
                                            <p className="text-xs text-slate-500 mb-2">Notificações desativadas</p>
                                            <Button
                                                onClick={() => subscribe('cleaner')}
                                                size="sm"
                                                className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                Ativar Notificações
                                            </Button>
                                        </div>
                                    )}
                                    {/* Location Permission Toggle */}
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Navigation size={16} className={locationPermission === 'granted' ? 'text-emerald-500' : locationPermission === 'denied' ? 'text-red-500' : 'text-slate-400'} />
                                                <span className="text-sm font-medium text-slate-700">Localização</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (locationPermission === 'granted') {
                                                        // Already granted - show toast with instructions to revoke
                                                        toast.info('📍 Para desativar, acesse as configurações do navegador e remova a permissão de localização deste site.', {
                                                            id: 'loc-revoke-info',
                                                            duration: 8000
                                                        });
                                                    } else {
                                                        // Not granted - request permission
                                                        navigator.geolocation.getCurrentPosition(
                                                            () => {
                                                                setLocationPermission('granted');
                                                                toast.success('📍 Localização ativada com sucesso!', { id: 'loc-enabled' });
                                                            },
                                                            (err) => {
                                                                console.error('[Geo] Permission request failed:', err);
                                                                if (err.code === 1) {
                                                                    setLocationPermission('denied');
                                                                    toast.error('📍 Localização negada. Para ativar, clique no ícone de cadeado na barra de endereços e permita o acesso.', {
                                                                        id: 'loc-denied',
                                                                        duration: 10000
                                                                    });
                                                                } else {
                                                                    toast.error('📍 Não foi possível obter localização. Tente novamente.', { id: 'loc-error' });
                                                                }
                                                            },
                                                            { enableHighAccuracy: true, timeout: 15000 }
                                                        );
                                                    }
                                                }}
                                                className={`relative w-12 h-6 rounded-full transition-colors ${locationPermission === 'granted' ? 'bg-emerald-500' :
                                                    locationPermission === 'denied' ? 'bg-red-400' : 'bg-slate-300'
                                                    }`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${locationPermission === 'granted' ? 'translate-x-7' : 'translate-x-1'
                                                    }`} />
                                            </button>
                                        </div>
                                        {/* Status text */}
                                        <p className={`text-xs mt-1 ${locationPermission === 'granted' ? 'text-emerald-600' :
                                            locationPermission === 'denied' ? 'text-red-500' : 'text-slate-400'
                                            }`}>
                                            {locationPermission === 'granted' && '✓ Ativo - Check-in por GPS disponível'}
                                            {locationPermission === 'denied' && '✗ Bloqueado - Use check-in manual'}
                                            {locationPermission === 'prompt' && 'Toque para ativar o GPS'}
                                            {locationPermission === 'unknown' && 'Status desconhecido'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setShowPasswordModal(true); setShowSettingsMenu(false); }}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 text-sm font-medium text-slate-700"
                                    >
                                        <Key size={16} className="text-indigo-500" />
                                        {t('cleaner.menu.change_password')}
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-rose-50 text-sm font-medium text-rose-600"
                                    >
                                        <LogOut size={16} />
                                        {t('cleaner.menu.logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('common.today', { defaultValue: 'Hoje' })}</p>
                        <h2 className="text-3xl font-black text-slate-900 capitalize">
                            {format(new Date(), 'EEEE, d MMM', { locale: getDateLocale() })}
                        </h2>
                    </div>
                    <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <UserCheck size={14} />
                        {t('status.online', { defaultValue: 'Online' })}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-6 space-y-4">
                {activeTab === 'jobs' ? (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{bookings.length} {t('common.tasks', { defaultValue: 'Tarefas' })}</span>
                            <button onClick={fetchJobs} className="text-indigo-600 p-2"><RefreshCw size={18} /></button>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />)}
                            </div>
                        ) : (
                            bookings.map(job => {
                                const jobDate = new Date(job.start_date);
                                const today = new Date();
                                const isFuture = jobDate.getDate() !== today.getDate() || jobDate.getMonth() !== today.getMonth();

                                return (
                                    <JobCard
                                        key={job.id}
                                        booking={job}
                                        onSelect={() => setActiveJob(job)}
                                        onShowDetails={(b) => setDetailsJob(b)}
                                        onNotifyDelay={(b) => setSelectedDelayJob(b)}
                                    />
                                );
                            })
                        )}
                    </>
                ) : (
                    userId && <EarningsTab userId={userId} />
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center safe-area-inset-bottom z-40">
                <button
                    onClick={() => setActiveTab('jobs')}
                    className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${activeTab === 'jobs'
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <Briefcase size={22} />
                    <span className="text-xs font-bold">{t('cleaner.tabs.jobs')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('earnings')}
                    className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${activeTab === 'earnings'
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <DollarSign size={22} />
                    <span className="text-xs font-bold">{t('cleaner.tabs.earnings')}</span>
                </button>
            </nav>

            {/* Password Change Modal */}
            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />

            <BookingDetailsDrawer
                booking={detailsJob}
                isOpen={!!detailsJob}
                onClose={() => setDetailsJob(null)}
            />

            <CleanerNotificationsDrawer
                notifications={notifications}
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
                onClearAll={() => setNotifications([])}
            />

            <DelayModal
                isOpen={!!selectedDelayJob}
                onClose={() => setSelectedDelayJob(null)}
                onConfirm={handleNotifyDelay}
                bookingName={selectedDelayJob?.customers?.name || "Propriedade"}
            />

            <PWAInstallPrompt />
            <LanguageFloatingWidget />
        </div>
    );
};
