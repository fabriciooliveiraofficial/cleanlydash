import React, { useState, useEffect } from 'react';
import { Send, Clock, User, Sparkles, Phone, MessageSquare, Loader2, FileText, Camera, ShieldAlert } from 'lucide-react';
import { Button } from '../../../ui/button';
import { createClient } from '../../../../lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export const TimelineTab: React.FC<{ customer: any }> = ({ customer }) => {
    const [note, setNote] = useState('');
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function loadActivities() {
            setLoading(true);

            // 1. Fetch Job Evidence (Notes, DamageReports, Photos)
            const { data: evidence } = await supabase
                .from('job_evidence')
                .select(`
                    *,
                    bookings!inner(customer_id)
                `)
                .eq('bookings.customer_id', customer.id)
                .order('created_at', { ascending: false });

            // 2. Fetch Comms Logs (Call/SMS) matching customer's phone
            let comms: any[] = [];
            if (customer.phone) {
                const { data: commsLogs } = await supabase
                    .from('comms_logs')
                    .select('*')
                    .or(`from_number.eq.${customer.phone},to_number.eq.${customer.phone}`)
                    .order('created_at', { ascending: false });
                comms = commsLogs || [];
            }

            // Combine and format
            const combined = [
                ...(evidence || []).map(e => ({
                    id: e.id,
                    type: e.type,
                    content: e.notes || 'No description',
                    date: e.created_at,
                    icon: e.type === 'damage_report' ? ShieldAlert : e.url ? Camera : MessageSquare,
                    color: e.type === 'damage_report' ? 'red' : 'indigo',
                    user: 'Staff'
                })),
                ...comms.map(c => ({
                    id: c.id,
                    type: 'comms',
                    content: `${c.direction === 'inbound' ? 'Recebida' : 'Realizada'}: ${c.status} (${c.duration_secs}s)`,
                    date: c.created_at,
                    icon: Phone,
                    color: 'blue',
                    user: 'System'
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setActivities(combined);
            setLoading(false);
        }
        loadActivities();
    }, [customer.id, customer.phone]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Activity Feed */}
            <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <div className="relative mb-8">
                        <textarea
                            placeholder="Deixe uma nota interna sobre este cliente..."
                            className="w-full min-h-[120px] p-6 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            <Button className="h-9 px-4 rounded-xl bg-indigo-600 font-bold text-xs uppercase tracking-widest">
                                <Send size={14} className="mr-2" /> Salvar Nota
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium">Nenhuma atividade registrada.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-z-10 before:h-full before:w-0.5 before:bg-slate-100">
                            {activities.map((activity) => (
                                <div key={activity.id} className="flex gap-4 relative">
                                    <div className={`h-10 w-10 flex-shrink-0 rounded-2xl bg-${activity.color}-50 text-${activity.color}-600 flex items-center justify-center border border-${activity.color}-100 shadow-sm ring-4 ring-white`}>
                                        <activity.icon size={18} />
                                    </div>
                                    <div className="pt-0.5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-slate-900">{activity.user}</span>
                                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                                <Clock size={10} /> {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{activity.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
                <div className="bg-slate-900 rounded-3xl p-6 text-white text-center">
                    <User size={32} className="mx-auto mb-4 text-indigo-400" />
                    <h4 className="font-bold">Staff Preferred</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-6">Linked to recent bookings</p>
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold">A</div>
                        <div className="text-left">
                            <p className="text-xs font-bold">Auto Assign</p>
                            <p className="text-[10px] text-slate-400">Baseado no histórico</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
