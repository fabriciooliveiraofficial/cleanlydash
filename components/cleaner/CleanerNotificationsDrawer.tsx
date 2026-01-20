import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Bell, CheckCheck, Info, Calendar, AlertTriangle, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

interface Notification {
    id: string;
    type: 'assignment' | 'update' | 'cancellation' | 'message';
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
}

interface CleanerNotificationsDrawerProps {
    notifications: Notification[];
    isOpen: boolean;
    onClose: () => void;
    onClearAll: () => void;
    onMarkAsRead: (id: string) => void;
}

export const CleanerNotificationsDrawer: React.FC<CleanerNotificationsDrawerProps> = ({
    notifications,
    isOpen,
    onClose,
    onClearAll,
    onMarkAsRead
}) => {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[90vh] sm:h-[80vh] rounded-t-[2.5rem] p-0 border-none overflow-hidden flex flex-col">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

                <div className="flex items-center justify-between px-6 py-4 shrink-0">
                    <SheetHeader className="text-left">
                        <SheetTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Bell size={24} className="text-indigo-600" />
                            Notificações
                        </SheetTitle>
                    </SheetHeader>
                    {notifications.length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                            <CheckCheck size={14} />
                            Limpar Tudo
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-10">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                                <Bell size={40} />
                            </div>
                            <h3 className="font-bold text-slate-800">Tudo limpo!</h3>
                            <p className="text-sm text-slate-500 max-w-[200px] mt-1">Você não tem novas notificações no momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => onMarkAsRead(notif.id)}
                                    className={`p-4 rounded-3xl border transition-all active:scale-[0.98] cursor-pointer ${notif.isRead ? 'bg-white border-slate-100' : 'bg-indigo-50/30 border-indigo-100 shadow-sm'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${notif.type === 'assignment' ? 'bg-emerald-100 text-emerald-600' :
                                                notif.type === 'update' ? 'bg-amber-100 text-amber-600' :
                                                    notif.type === 'cancellation' ? 'bg-red-100 text-red-600' :
                                                        'bg-blue-100 text-blue-600'
                                            }`}>
                                            {notif.type === 'assignment' ? <Calendar size={20} /> :
                                                notif.type === 'update' ? <Info size={20} /> :
                                                    notif.type === 'cancellation' ? <AlertTriangle size={20} /> :
                                                        <Bell size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className={`font-bold text-sm truncate ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                                                    {notif.title}
                                                </h4>
                                                {!notif.isRead && (
                                                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                                                )}
                                            </div>
                                            <p className={`text-xs leading-relaxed ${notif.isRead ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {notif.message}
                                            </p>
                                            <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {notif.timestamp}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
