import React, { useEffect, useState } from 'react';
import { Calendar, MoreVertical, MapPin, Clock, Loader2, CalendarX } from 'lucide-react';
import { Button } from '../../../ui/button';
import { createClient } from '../../../../lib/supabase/client';
import { format, parseISO } from 'date-fns';

export const AppointmentsTab: React.FC<{ customerId: string }> = ({ customerId }) => {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function loadAppointments() {
            setLoading(true);
            const { data } = await supabase
                .from('bookings')
                .select('*')
                .eq('customer_id', customerId)
                .order('start_date', { ascending: false });

            if (data) {
                setAppointments(data);
            }
            setLoading(false);
        }
        loadAppointments();
    }, [customerId]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center h-[400px]">
                        <Loader2 className="animate-spin text-indigo-600" />
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                        <CalendarX size={48} className="mb-4 text-slate-200" />
                        <p className="font-medium">Nenhum agendamento encontrado.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="px-8 py-5">Date & Time</th>
                                <th className="px-6 py-5">Service Type</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Value</th>
                                <th className="px-6 py-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {appointments.map((appointment) => (
                                <tr key={appointment.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{format(parseISO(appointment.start_date), 'MMM dd, yyyy')}</p>
                                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                                    <Clock size={10} /> {format(parseISO(appointment.start_date), 'hh:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="font-medium text-slate-700">{appointment.summary || 'Cleaning Service'}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${appointment.status === 'pending'
                                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                                            : appointment.status === 'confirmed'
                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            }`}>
                                            {appointment.status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="font-bold text-slate-900">
                                            ${(Number(appointment.price) || 0).toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <Button variant="ghost" size="icon" className="rounded-xl text-slate-400">
                                            <MoreVertical size={18} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
