import React, { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone, MessageCircle, Save, CheckCircle, Settings, History, Send } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { useNotifications } from '../../hooks/use-notifications';
import { useRole } from '../../hooks/use-role';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationInbox } from '../notifications/NotificationInbox';

interface NotificationSettingsData {
    tenant_id?: string;
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
    whatsapp_enabled: boolean;
    events: {
        new_booking: boolean;
        booking_cancelled: boolean;
        payment_failed: boolean;
        low_balance: boolean;
        new_review: boolean;
        support_reply: boolean;
        checklist_completed: boolean;
        checkin_alert: boolean;
    };
    recipients: {
        emails: string[];
        phones: string[];
    };
}

export const NotificationSettings: React.FC = () => {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');

    const [settings, setSettings] = useState<NotificationSettingsData>({
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        whatsapp_enabled: false,
        events: {
            new_booking: true,
            booking_cancelled: true,
            payment_failed: true,
            low_balance: true,
            new_review: false,
            support_reply: true,
            checklist_completed: true,
            checkin_alert: true
        },
        recipients: {
            emails: [],
            phones: []
        }
    });

    const { tenant_id, user: authUser } = useRole();
    const { isSubscribed, subscribe, unsubscribe } = useNotifications();

    const [emailInput, setEmailInput] = useState('');

    useEffect(() => {
        if (tenant_id) {
            fetchSettings();
        }
    }, [tenant_id]);

    const fetchSettings = async () => {
        try {
            if (!tenant_id) return;

            const { data, error } = await supabase
                .from('tenant_notification_settings')
                .select('*')
                .eq('tenant_id', tenant_id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching settings:', error);
            }

            if (data) {
                setSettings(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!tenant_id) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('tenant_notification_settings')
                .upsert({
                    tenant_id: tenant_id,
                    ...settings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id' });

            if (error) throw error;
            toast.success('Configurações salvas com sucesso');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleEvent = (key: keyof typeof settings.events) => {
        setSettings(prev => ({
            ...prev,
            events: { ...prev.events, [key]: !prev.events[key] }
        }));
    };

    const addEmail = () => {
        if (!emailInput || !emailInput.includes('@')) return;
        setSettings(prev => ({
            ...prev,
            recipients: { ...prev.recipients, emails: [...prev.recipients.emails, emailInput] }
        }));
        setEmailInput('');
    };

    const removeEmail = (email: string) => {
        setSettings(prev => ({
            ...prev,
            recipients: { ...prev.recipients, emails: prev.recipients.emails.filter(e => e !== email) }
        }));
    };

    const togglePush = async (enabled: boolean) => {
        if (enabled) {
            const success = await subscribe('tenant');
            if (success) {
                setSettings(prev => ({ ...prev, push_enabled: true }));
            }
        } else {
            await unsubscribe();
            setSettings(prev => ({ ...prev, push_enabled: false }));
        }
    };

    const testNotification = async (type: 'standard' | 'rich' | 'interactive') => {
        try {
            if (!authUser) return;

            let payload: any = {
                user_id: authUser.id,
                title: 'Teste de Notificação 🚀',
                body: 'Parabéns! Suas notificações push estão configuradas corretamente.',
                url: '/dashboard'
            };

            if (type === 'rich') {
                payload.image = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000';
                payload.title = 'Limpeza Concluída! ✨';
                payload.body = 'O checklist da sua propriedade foi finalizado com sucesso.';
            } else if (type === 'interactive') {
                payload.title = 'Novo Chamado de Suporte 🎧';
                payload.body = 'Um cliente enviou uma dúvida sobre o serviço #1234';
                payload.actions = [
                    { action: 'open', title: 'Ver Chamado' },
                    { action: 'dismiss', title: 'Ignorar' }
                ];
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.error('[NotificationSettings] No active session found');
                toast.error('Erro de autenticação. Tente recarregar a página.');
                return;
            }

            console.log('[NotificationSettings] Session found. Token:', session.access_token.substring(0, 10) + '...');
            console.log('[NotificationSettings] Session Details:', {
                aud: session.user.aud,
                role: session.user.role,
                expires_at: session.expires_at
            });

            // Using raw fetch to debug 401 error
            const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-native-push`;
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYm9raWx2dXJ4enRxaXd2eGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTYxMjYsImV4cCI6MjA4MzM3MjEyNn0.6XrV6S665pYDibo4RA52ddb-JCTk7jyikwgxs2lpTRs';

            console.log('[NotificationSettings] Attempting with ANON KEY in Authorization header (Debugging)');

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`, // TESTING: Use Anon Key instead of User Token
                    'apikey': anonKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[NotificationSettings] Function Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });

                // Handle Supabase 401 specifically
                if (response.status === 401) {
                    toast.error('Sua sessão expirou ou é inválida.', {
                        action: {
                            label: 'Sair e Entrar',
                            onClick: async () => {
                                await supabase.auth.signOut();
                                window.location.href = '/login';
                            }
                        },
                        duration: 8000
                    });
                    throw new Error('Sessão inválida (401). Realize login novamente.');
                }

                throw new Error(`Erro na função: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            toast.success('Notificação de teste enviada!');
        } catch (err: any) {
            toast.error('Erro no teste: ' + err.message);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <div className="w-10 h-10 bg-indigo-100 rounded-full mb-4 flex items-center justify-center text-indigo-400">
                <Bell size={24} />
            </div>
            <p className="text-slate-400 font-medium text-sm">Carregando configurações...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            {/* Unified Notification Center Header */}
            <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Bell className="text-indigo-600" size={24} /> Notification Center
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                        Gerencie canais de alerta e visualize o histórico de interações.
                    </p>
                </div>

                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings'
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Settings size={16} /> Configurações
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'history'
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <History size={16} /> Histórico
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'settings' ? (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        {/* 1. Channels Area */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Send size={16} className="text-indigo-600" /> Canais de Alerta
                                </h3>

                                <div className="space-y-3">
                                    {[
                                        { id: 'email', label: 'E-mail Enterprise', icon: <Mail size={18} />, enabled: settings.email_enabled, toggle: () => setSettings(s => ({ ...s, email_enabled: !s.email_enabled })) },
                                        { id: 'whatsapp', label: 'WhatsApp Direct', icon: <MessageCircle size={18} />, enabled: settings.whatsapp_enabled, toggle: () => setSettings(s => ({ ...s, whatsapp_enabled: !s.whatsapp_enabled })) },
                                        { id: 'sms', label: 'SMS Gateway', icon: <Smartphone size={18} />, enabled: settings.sms_enabled, toggle: () => setSettings(s => ({ ...s, sms_enabled: !s.sms_enabled })) },
                                    ].map(channel => (
                                        <button
                                            key={channel.id}
                                            onClick={channel.toggle}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${channel.enabled
                                                ? 'border-indigo-100 bg-indigo-50/20 shadow-sm'
                                                : 'border-slate-50 bg-slate-50/50 grayscale opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${channel.enabled ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                                                    {channel.icon}
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{channel.label}</span>
                                            </div>
                                            <div className={`w-10 h-5 rounded-full transition-all relative ${channel.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-white shadow-sm transition-all ${channel.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                            </div>
                                        </button>
                                    ))}

                                    <div className={`p-4 rounded-2xl border transition-all duration-300 ${isSubscribed ? 'border-indigo-100 bg-indigo-50/20 shadow-sm' : 'border-slate-100 bg-slate-50/50'
                                        }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                                                    <Smartphone size={18} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">Notificações Push</span>
                                            </div>
                                            <button
                                                onClick={() => togglePush(!isSubscribed)}
                                                className={`w-10 h-5 rounded-full transition-all relative ${isSubscribed ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-white shadow-sm transition-all ${isSubscribed ? 'left-[22px]' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                        {!isSubscribed && (
                                            <button
                                                onClick={() => togglePush(true)}
                                                className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-100 text-indigo-600 shadow-sm hover:bg-slate-50 transition-colors"
                                            >
                                                Autorizar Navegador
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Test Hub Card */}
                            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 text-white overflow-hidden relative">
                                <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-indigo-600/20 blur-3xl rounded-full" />
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 flex items-center gap-2">
                                    <Send size={14} /> Hub de Testes
                                </h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => testNotification('standard')}
                                        disabled={!isSubscribed}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group disabled:opacity-30"
                                    >
                                        <span className="text-sm font-bold">Standard Push</span>
                                        <div className="p-1 px-3 rounded-lg bg-white/10 text-[10px] uppercase font-black tracking-widest group-hover:bg-indigo-600 transition-colors">Test</div>
                                    </button>
                                    <button
                                        onClick={() => testNotification('rich')}
                                        disabled={!isSubscribed}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group disabled:opacity-30"
                                    >
                                        <span className="text-sm font-bold">Rich Media</span>
                                        <div className="p-1 px-3 rounded-lg bg-white/10 text-[10px] uppercase font-black tracking-widest group-hover:bg-indigo-600 transition-colors">Rich</div>
                                    </button>
                                    <button
                                        onClick={() => testNotification('interactive')}
                                        disabled={!isSubscribed}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors group disabled:opacity-30"
                                    >
                                        <span className="text-sm font-bold">Interactive Actions</span>
                                        <div className="p-1 px-3 rounded-lg bg-indigo-600 text-[10px] uppercase font-black tracking-widest shadow-lg shadow-indigo-600/20">Inter</div>
                                    </button>
                                </div>
                                <p className="mt-6 text-[10px] text-slate-400 leading-relaxed italic text-center">
                                    * Ative as notificações push para habilitar o hub de testes.
                                </p>
                            </div>
                        </div>

                        {/* 2. Events/Triggers Area */}
                        <div className="lg:col-span-8 space-y-8">
                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Bell size={16} className="text-indigo-600" /> Eventos Operacionais
                                    </h3>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {saving ? 'Gravando...' : 'Salvar Alterações'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { key: 'new_booking', label: 'Nova Reserva', desc: 'Reserva confirmada via integração.', group: 'Operacional' },
                                        { key: 'booking_cancelled', label: 'Cancelamento', desc: 'Alertar quando uma faxina for abortada.', group: 'Operacional' },
                                        { key: 'checklist_completed', label: 'Checklist OK', desc: 'Faxineira finalizou as tarefas.', group: 'Operacional' },
                                        { key: 'checkin_alert', label: 'Time Window', desc: 'Alerta 1h antes do check-in.', group: 'Operacional' },
                                        { key: 'support_reply', label: 'Ticket Atendido', desc: 'Nossa equipe respondeu seu chamado.', group: 'Suporte' },
                                        { key: 'new_review', label: 'Review Recebida', desc: 'Notas e comentários do proprietário.', group: 'Suporte' },
                                        { key: 'payment_failed', label: 'Falha Cobrança', desc: 'Assinatura ou crédito com erro.', group: 'Financeiro' },
                                        { key: 'low_balance', label: 'Saldo Crítico', desc: 'Créditos de API abaixo de 10%.', group: 'Financeiro' },
                                    ].map((event) => (
                                        <div
                                            key={event.key}
                                            onClick={() => toggleEvent(event.key as any)}
                                            className={`group cursor-pointer p-5 rounded-2xl border transition-all duration-300 ${(settings.events as any)[event.key]
                                                ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50'
                                                : 'bg-slate-50 border-slate-100 hover:border-slate-200 opacity-70'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className={`p-2 rounded-xl transition-all ${(settings.events as any)[event.key] ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                                                    }`}>
                                                    <CheckCircle size={16} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.group}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-900 mb-1">{event.label}</h4>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{event.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recipients Management */}
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                                <div className="max-w-xl mx-auto space-y-6">
                                    <div className="text-center space-y-2 mb-8">
                                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Hub de Destinatários</h3>
                                        <p className="text-xs text-slate-500 font-medium">Configure e-mails adicionais para receber alertas de backoffice.</p>
                                    </div>

                                    <div className="bg-white p-1.5 rounded-2xl flex gap-2 border border-slate-100 shadow-sm focus-within:ring-2 ring-indigo-100 transition-all">
                                        <input
                                            type="email"
                                            className="flex-1 px-4 py-3 outline-none text-sm font-medium bg-transparent"
                                            placeholder="colaborador@airgoverness.com"
                                            value={emailInput}
                                            onChange={e => setEmailInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addEmail()}
                                        />
                                        <button
                                            onClick={addEmail}
                                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-colors"
                                        >
                                            Adicionar
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                                        {settings.recipients.emails.map(email => (
                                            <div key={email} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:border-slate-300">
                                                <span className="text-xs font-bold text-slate-700">{email}</span>
                                                <button
                                                    onClick={() => removeEmail(email)}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {settings.recipients.emails.length === 0 && (
                                            <p className="text-xs text-slate-400 font-medium italic">Nenhum destinatário extra cadastrado.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8"
                    >
                        <NotificationInbox />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
