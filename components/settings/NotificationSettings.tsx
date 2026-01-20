import React, { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone, MessageCircle, Save, CheckCircle } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';

interface NotificationSettingsData {
    id?: string;
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
            new_review: false
        },
        recipients: {
            emails: [],
            phones: []
        }
    });

    const [emailInput, setEmailInput] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('tenant_notification_settings')
                .select('*')
                .eq('tenant_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                console.error('Error fetching settings:', error);
            }

            if (data) {
                setSettings(data);
            } else {
                // If no settings exist, we keep defaults. 
                // We will create the record on first save.
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Upsert
            const { error } = await supabase
                .from('tenant_notification_settings')
                .upsert({
                    tenant_id: user.id,
                    ...settings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id' });

            if (error) throw error;
            toast.success('Notification preferences saved');
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
    const subscribeToPush = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                toast.error('Browser does not support push notifications');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Permission blocked');
                return;
            }

            const registration = await navigator.serviceWorker.register('/sw.js');
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: 'BFA_YOUR_VAPID_PUBLIC_KEY' // Placeholder: Requires real VAPID key context
            });

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await (supabase.from('push_subscriptions') as any).upsert({
                user_id: user.id,
                subscription_json: subscription,
                device_type: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop'
            });

            setSettings(prev => ({ ...prev, push_enabled: true }));
            toast.success('Push notifications enabled!');
        } catch (err: any) {
            console.error('Subscription error:', err);
            toast.error('Failed to register for push');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading preferences...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Notification Preferences</h2>
                    <p className="text-slate-500 mt-1">Control how and when you receive system alerts.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                    {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 1. Channels */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Bell size={18} className="text-indigo-500" /> Active Channels
                    </h3>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${settings.email_enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <Mail size={18} />
                                </div>
                                <span className="font-medium text-slate-700">Email Alerts</span>
                            </div>
                            <input
                                type="checkbox"
                                className="w-5 h-5 accent-indigo-600"
                                checked={settings.email_enabled}
                                onChange={e => setSettings(s => ({ ...s, email_enabled: e.target.checked }))}
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${settings.sms_enabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <Smartphone size={18} />
                                </div>
                                <span className="font-medium text-slate-700">SMS Alerts</span>
                            </div>
                            <input
                                type="checkbox"
                                className="w-5 h-5 accent-indigo-600"
                                checked={settings.sms_enabled}
                                onChange={e => setSettings(s => ({ ...s, sms_enabled: e.target.checked }))}
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${settings.push_enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <span className="font-medium text-slate-700 block text-sm">Push Alerts</span>
                                    {!settings.push_enabled && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); subscribeToPush(); }}
                                            className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight hover:underline"
                                        >
                                            Ativar no Navegador
                                        </button>
                                    )}
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                className="w-5 h-5 accent-indigo-600"
                                checked={settings.push_enabled}
                                onChange={e => {
                                    if (e.target.checked && !settings.push_enabled) {
                                        subscribeToPush();
                                    } else {
                                        setSettings(s => ({ ...s, push_enabled: e.target.checked }));
                                    }
                                }}
                            />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${settings.whatsapp_enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <MessageCircle size={18} />
                                </div>
                                <span className="font-medium text-slate-700">WhatsApp</span>
                            </div>
                            <input
                                type="checkbox"
                                className="w-5 h-5 accent-indigo-600"
                                checked={settings.whatsapp_enabled}
                                onChange={e => setSettings(s => ({ ...s, whatsapp_enabled: e.target.checked }))}
                            />
                        </label>
                    </div>
                </div>

                {/* 2. Triggers */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle size={18} className="text-indigo-500" /> Notification Triggers
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { key: 'new_booking', label: 'New Booking Received', desc: 'When a customer schedules a new service.' },
                            { key: 'booking_cancelled', label: 'Booking Cancelled', desc: 'When a customer or cleaner cancels.' },
                            { key: 'payment_failed', label: 'Payment Failed', desc: 'If a Stripe charge is declined.' },
                            { key: 'low_balance', label: 'Low Wallet Balance', desc: 'When funds drop below threshold.' },
                            { key: 'new_review', label: 'New Review/Rating', desc: 'When a customer leaves feedback.' },
                        ].map(item => (
                            <div key={item.key} className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:border-indigo-100 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-5 h-5 accent-indigo-600"
                                    checked={(settings.events as any)[item.key]}
                                    onChange={() => toggleEvent(item.key as any)}
                                />
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">{item.label}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Recipients */}
                <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="font-bold text-slate-800">Alert Recipients</h3>
                    <p className="text-sm text-slate-500 mb-4">Who should receive these administrative alerts?</p>

                    <div className="max-w-xl">
                        <div className="flex gap-2 mb-3">
                            <input
                                type="email"
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="admin@example.com"
                                value={emailInput}
                                onChange={e => setEmailInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addEmail()}
                            />
                            <button
                                onClick={addEmail}
                                className="bg-slate-800 text-white px-4 rounded-lg font-medium hover:bg-slate-900"
                            >
                                Add Email
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {settings.recipients.emails.map(email => (
                                <span key={email} className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                                    {email}
                                    <button onClick={() => removeEmail(email)} className="hover:text-indigo-900">×</button>
                                </span>
                            ))}
                            {settings.recipients.emails.length === 0 && (
                                <span className="text-sm text-slate-400 italic">No recipients added yet.</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
