import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import { JobCard } from './JobCard';
import { ActiveJobView } from './ActiveJobView';
import { EarningsTab } from './EarningsTab';
import { LogOut, RefreshCw, UserCheck, Settings, Key, Briefcase, DollarSign } from 'lucide-react';
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

    const supabase = createClient();
    const { t, i18n } = useTranslation();

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 5);
        nextWeek.setHours(23, 59, 59, 999);

        // Fetch bookings for Today + Next 5 Days (Assigned to this cleaner)
        const { data } = await supabase
            .from('bookings')
            .select(`
                *,
                customers ( name, address, latitude, longitude, geofence_radius ),
                services ( name )
            `)
            .eq('assigned_to', userId) // FILTER BY CLEANER
            .gte('start_date', today.toISOString())
            .lte('start_date', nextWeek.toISOString())
            .order('start_date', { ascending: true }); // Primary sort by date

        // Sort: Active/Pending first, Completed last, ordered by date
        const sorted = ((data as any[]) || []).sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        });

        setBookings(sorted);
        setLoading(false);
    };

    useEffect(() => {
        fetchJobs();
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
        return <ActiveJobView job={activeJob} onBack={() => setActiveJob(null)} />;
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
