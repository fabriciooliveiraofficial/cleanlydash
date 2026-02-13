import React, { useEffect, useState } from 'react';
import { Bell, Calendar, ExternalLink, Trash2, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { useRole } from '../../hooks/use-role';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationHistory {
    id: string;
    title: string;
    body: string;
    category: string;
    data: any;
    created_at: string;
    read_at: string | null;
}

export const NotificationInbox: React.FC = () => {
    const supabase = createClient();
    const { user } = useRole();
    const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchNotifications();
        }
    }, [user?.id]);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notification_history')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setNotifications(data || []);
        } catch (err) {
            console.error('Error fetching notification history:', err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notification_history')
                .update({ read_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
            );
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notification_history')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'booking': return <Calendar size={18} className="text-indigo-600" />;
            case 'payment': return <CheckCircle size={18} className="text-emerald-600" />;
            case 'alert': return <AlertTriangle size={18} className="text-rose-500" />;
            default: return <Info size={18} className="text-slate-400" />;
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-400">Buscando histórico...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-[500px] max-h-[80vh]">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 px-2">
                    <Bell size={16} className="text-indigo-600" /> Notificações
                </h3>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase border border-indigo-100">
                    {notifications.length} registros
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                <AnimatePresence mode="popLayout">
                    {notifications.map((notif) => (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={`group relative flex items-start gap-3 p-3 rounded-xl transition-all duration-200 border ${notif.read_at ? 'bg-white border-transparent hover:bg-slate-50' : 'bg-indigo-50/30 border-indigo-100/50'
                                }`}
                        >
                            <div className={`mt-1 p-2 rounded-xl shrink-0 ${notif.read_at ? 'bg-slate-50 text-slate-400' : 'bg-white shadow-sm ring-1 ring-black/5'}`}>
                                {getIcon(notif.category)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-1">
                                    <h4 className={`text-sm font-bold truncate ${notif.read_at ? 'text-slate-600' : 'text-slate-900'}`}>
                                        {notif.title}
                                    </h4>
                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                        {format(new Date(notif.created_at), "HH:mm", { locale: ptBR })}
                                    </span>
                                </div>
                                <p className={`text-xs leading-relaxed line-clamp-2 ${notif.read_at ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {notif.body}
                                </p>

                                {notif.data?.url && (
                                    <a
                                        href={notif.data.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black text-indigo-600 uppercase tracking-wider hover:underline"
                                    >
                                        <ExternalLink size={10} /> Ver Detalhes
                                    </a>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 self-start pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notif.read_at && (
                                    <button
                                        onClick={() => markAsRead(notif.id)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm bg-slate-50 border border-transparent hover:border-slate-100"
                                        title="Marcar como lida"
                                    >
                                        <CheckCircle size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteNotification(notif.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all shadow-sm bg-slate-50 border border-transparent hover:border-slate-100"
                                    title="Excluir"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {notifications.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl opacity-60">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Bell size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nada por aqui</p>
                    </div>
                )}
            </div>
        </div>
    );
};
