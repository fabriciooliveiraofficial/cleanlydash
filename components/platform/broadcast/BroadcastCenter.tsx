import React, { useState } from 'react';
import { Megaphone, Send, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { createPlatformClient } from '../../../lib/supabase/platform-client';
import { toast } from 'sonner';

export const BroadcastCenter: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'critical'>('info');
    const [audience, setAudience] = useState<'all' | 'paid' | 'free'>('all');
    const [duration, setDuration] = useState('24'); // hours

    const supabase = createPlatformClient();

    const handleSendBroadcast = async () => {
        if (!title || !message) {
            toast.error('Please fill in title and message');
            return;
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + parseInt(duration));

        try {
            const { error } = await (supabase as any).from('system_notifications').insert({
                title,
                message,
                type,
                target_audience: audience,
                expires_at: expiresAt.toISOString()
            });

            if (error) throw error;

            toast.success('Broadcast sent successfully!');
            setTitle('');
            setMessage('');
        } catch (err: any) {
            toast.error(`Failed to send: ${err.message}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                        <Megaphone size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Broadcast Center</h2>
                        <p className="text-slate-500">Send system-wide notifications to all tenants.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notification Title</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g., Scheduled Maintenance"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Message Body</label>
                            <textarea
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                                placeholder="Message details..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                    <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <h3 className="font-semibold text-slate-800">Configuration</h3>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Severity Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setType('info')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${type === 'info' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    Info
                                </button>
                                <button
                                    onClick={() => setType('warning')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    Warning
                                </button>
                                <button
                                    onClick={() => setType('critical')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${type === 'critical' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    Critical
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Audience</label>
                            <select
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none bg-white"
                                value={audience}
                                onChange={(e: any) => setAudience(e.target.value)}
                            >
                                <option value="all">All Tenants</option>
                                <option value="paid">Paid Plans Only</option>
                                <option value="free">Free Tier Only</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Duration (Hours)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none bg-white"
                                value={duration}
                                onChange={e => setDuration(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSendBroadcast}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <Send size={18} /> Send Broadcast
                    </button>
                </div>
            </div>

            {/* Preview Section */}
            <div className="bg-slate-100 p-8 rounded-xl border border-slate-200 border-dashed text-center">
                <p className="text-slate-400 text-sm mb-4">Preview of how it will appear to tenants</p>
                <div className={`inline-flex items-start gap-3 p-4 rounded-lg shadow-sm text-left max-w-lg ${type === 'info' ? 'bg-blue-50 text-blue-800' :
                    type === 'warning' ? 'bg-amber-50 text-amber-800' :
                        'bg-red-50 text-red-800'
                    }`}>
                    {type === 'info' && <Info size={20} className="mt-0.5 shrink-0" />}
                    {type === 'warning' && <AlertTriangle size={20} className="mt-0.5 shrink-0" />}
                    {type === 'critical' && <AlertTriangle size={20} className="mt-0.5 shrink-0" />}
                    <div>
                        <h4 className="font-bold text-sm">{title || 'Notification Title'}</h4>
                        <p className="text-sm opacity-90">{message || 'Message content will fulfill this space...'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
