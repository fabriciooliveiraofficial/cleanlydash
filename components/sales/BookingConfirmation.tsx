import React, { useState, useEffect } from 'react';
import { Check, Calendar, Clock, DollarSign, Package, Sparkles, Loader2, PartyPopper } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';

const supabase = createClient();

interface BookingData {
    tenantId: string;
    serviceId: string;
    recurringServiceId?: string;
    frequency?: string;
    addonIds: string[];
    date: string;
    time: string;
    clientName: string;
    clientEmail: string;
    total: number;
    recurringTotal?: number;
}

export const BookingConfirmation = () => {
    const [status, setStatus] = useState<'loading' | 'confirming' | 'success' | 'error'>('loading');
    const [data, setData] = useState<BookingData | null>(null);
    const [service, setService] = useState<any>(null);
    const [recurringService, setRecurringService] = useState<any>(null);
    const [addons, setAddons] = useState<any[]>([]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const encodedData = params.get('data');

        if (encodedData) {
            try {
                const decoded = JSON.parse(atob(encodedData));
                setData(decoded);
                fetchDetails(decoded);
            } catch (e) {
                console.error("Failed to decode booking data", e);
                setStatus('error');
            }
        } else {
            setStatus('error');
        }
    }, []);

    const fetchDetails = async (decoded: BookingData) => {
        // Fetch service and addons info to display
        const { data: svc } = await supabase.from('services').select('*').eq('id', decoded.serviceId).single();

        let recurSvc = null;
        if (decoded.recurringServiceId) {
            const { data: rs } = await supabase.from('services').select('*').eq('id', decoded.recurringServiceId).single();
            recurSvc = rs;
        }

        const { data: adds } = await supabase.from('addons').select('*').in('id', decoded.addonIds);

        setService(svc);
        setRecurringService(recurSvc);
        setAddons(adds || []);
        setStatus('confirming');
    };

    const handleConfirm = async () => {
        if (!data) return;
        setStatus('loading');

        try {
            const { data: result, error } = await supabase.functions.invoke('confirm_quote_booking', {
                body: data
            });

            if (error) throw error;
            setStatus('success');
            toast.success("Booking confirmed successfully!");
        } catch (e: any) {
            console.error("Confirmation error", e);
            toast.error("Failed to confirm booking: " + e.message);
            setStatus('confirming');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                        <Package size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Invalid Link</h2>
                    <p className="text-slate-500 font-medium">This booking link is invalid or has expired.</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 max-w-md w-full text-center space-y-6 animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
                        <Check size={40} strokeWidth={3} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Booking Confirmed!</h2>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">We'll see you soon</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                            <Calendar size={18} className="text-indigo-500" />
                            <span className="font-bold text-sm">{new Date(data!.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                            <Clock size={18} className="text-indigo-500" />
                            <span className="font-bold text-sm">{data!.time}</span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-400 font-medium italic">A confirmation email has been sent to {data!.clientEmail}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-white p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <Sparkles size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Confirm Booking</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">One-click Reservation</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-indigo-600 tracking-tighter">R$ {data?.total.toFixed(2)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Total</div>
                        {data?.recurringTotal && (
                            <div className="mt-1">
                                <div className="text-sm font-black text-rose-500 tracking-tight">R$ {data.recurringTotal.toFixed(2)}</div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Recurring / visit</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} className="text-indigo-500" />
                                Date & Time
                            </label>
                            <div className="space-y-1">
                                <div className="text-lg font-black text-slate-800">{new Date(data!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                <div className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                                    <Clock size={14} />
                                    Starts at {data!.time}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={12} className="text-indigo-500" />
                                Service Detail
                            </label>
                            <div className="space-y-1">
                                <div className="text-lg font-black text-slate-800 leading-tight">{service?.name}</div>
                                {recurringService && recurringService.id !== service?.id && (
                                    <div className="text-xs font-bold text-slate-400">
                                        Recurring: <span className="text-indigo-500">{recurringService.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Addons */}
                    {addons.length > 0 && (
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Package size={12} className="text-indigo-500" />
                                Selected Add-ons
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {addons.map(a => (
                                    <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-sm font-bold text-slate-700">{a.name}</span>
                                        <span className="text-xs font-black text-indigo-600">+ ${a.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Client Info */}
                    <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Details</div>
                                <div className="text-lg font-black text-slate-800">{data!.clientName}</div>
                                <div className="text-sm font-bold text-indigo-500">{data!.clientEmail}</div>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm border border-slate-100">
                                <PartyPopper size={24} />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirm}
                        className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        Confirm My Booking
                        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                            <Check size={20} />
                        </div>
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No upfront payment required today</p>
                </div>
            </div>
        </div>
    );
};
