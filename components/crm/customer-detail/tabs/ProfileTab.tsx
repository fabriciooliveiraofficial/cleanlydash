import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Globe, Hash, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { createClient } from '../../../../lib/supabase/client';
import { format } from 'date-fns';

export const ProfileTab: React.FC<{ customer: any; onUpdate: (c: any) => void }> = ({ customer }) => {
    const [stats, setStats] = useState({ totalValue: 0, totalJobs: 0 });
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function loadStats() {
            setLoading(true);
            const { data } = await supabase
                .from('bookings')
                .select('price')
                .eq('customer_id', customer.id);

            if (data) {
                const totalValue = data.reduce((acc: number, b: any) => acc + (Number(b.price) || 0), 0);
                setStats({
                    totalValue,
                    totalJobs: data.length
                });
            }
            setLoading(false);
        }
        loadStats();
    }, [customer.id]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">Basic Information</h3>
                        <button className="text-indigo-600 text-xs font-bold uppercase tracking-widest hover:underline">Edit Info</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Name</label>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 font-bold">
                                <Hash size={16} className="text-indigo-500" /> {customer.name || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Email</label>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 font-bold">
                                <Mail size={16} className="text-indigo-500" /> {customer.email || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Phone</label>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 font-bold">
                                <Phone size={16} className="text-indigo-500" /> {customer.phone || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Address</label>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 font-bold">
                                <MapPin size={16} className="text-indigo-500" /> {customer.address || '-'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Property Details */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">Property Settings</h3>
                        <button className="text-indigo-600 text-xs font-bold uppercase tracking-widest hover:underline">Update Access</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Access Code</label>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-black">
                                <ShieldCheck size={16} /> {customer.access_code || 'Não definido'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Notes for Cleaner</label>
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 text-xs italic">
                                {customer.notes_staff || 'Sem instruções específicas.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Lifetime Value</p>
                    {loading ? (
                        <div className="flex justify-center p-2"><Loader2 className="animate-spin text-indigo-600" /></div>
                    ) : (
                        <p className="text-4xl font-black text-slate-900">${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    )}
                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-center gap-4">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400">Total Jobs</p>
                            <p className="text-xl font-bold text-indigo-600">{stats.totalJobs}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-100"></div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400">Status</p>
                            <p className="text-xl font-bold text-emerald-500 uppercase tracking-tighter">{customer.status || 'Active'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Member Details</p>
                    <p className="text-lg font-bold">Active Customer</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium bg-white/10 px-3 py-2 rounded-xl">
                        <Clock size={14} /> Client since {customer.created_at ? format(new Date(customer.created_at), 'MMM yyyy') : 'N/A'}
                    </div>
                </div>
            </div>
        </div>
    );
};
