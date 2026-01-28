import React, { useEffect, useState } from 'react';
import {
    Ticket,
    MessageSquare,
    CheckCircle,
    Clock,
    User,
    Send,
    Search,
    Filter
} from 'lucide-react';
import { createPlatformClient } from '../../../lib/supabase/platform-client';
import { toast } from 'sonner';

interface TicketType {
    id: string;
    subject: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    created_at: string;
    tenant_id: string;
    tenant_profiles: {
        name: string;
        email: string;
    };
}

export const SupportInbox: React.FC = () => {
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
    const [replyText, setReplyText] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const supabase = createPlatformClient();

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        // Note: We need to join with tenant_profiles to see who opened the ticket
        // This requires 'tenant_profiles' to be readable by Super Admin (already done)
        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                *,
                tenant_profiles (name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
            toast.error('Failed to load tickets');
        } else {
            setTickets(data as any || []);
        }
        setLoading(false);
    };

    const handleSendReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;

        try {
            const { error } = await (supabase as any).from('ticket_messages').insert({
                ticket_id: selectedTicket.id,
                message: replyText,
                is_admin: true,
                sender_id: (await supabase.auth.getUser()).data.user?.id
            });

            if (error) throw error;

            toast.success('Reply sent!');
            setReplyText('');
            // TODO: Refresh messages (Separate component ideally)
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const updateStatus = async (ticketId: string, newStatus: string) => {
        const { error } = await (supabase as any)
            .from('support_tickets')
            .update({ status: newStatus })
            .eq('id', ticketId);

        if (!error) {
            toast.success(`Ticket marked as ${newStatus}`);
            fetchTickets(); // Refresh list
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(prev => prev ? ({ ...prev, status: newStatus } as any) : null);
            }
        }
    };

    const filteredTickets = tickets.filter(t => filterStatus === 'all' || t.status === filterStatus);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Support Inbox...</div>;

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Ticket List */}
            <div className="w-1/3 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Ticket size={18} className="text-indigo-600" /> Inbox
                    </h3>
                    <select
                        className="text-xs border border-slate-200 rounded px-2 py-1 outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No tickets found.
                        </div>
                    ) : (
                        filteredTickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-indigo-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${ticket.priority === 'critical' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(ticket.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{ticket.subject}</h4>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                    {ticket.tenant_profiles?.name || 'Unknown Tenant'}
                                </p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Ticket Detail (Right Pane) */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                {selectedTicket ? (
                    <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-1">{selectedTicket.subject}</h2>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1"><User size={14} /> {selectedTicket.tenant_profiles?.name}</span>
                                    <span className="flex items-center gap-1"><Clock size={14} /> {new Date(selectedTicket.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateStatus(selectedTicket.id, 'resolved')}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                                >
                                    <CheckCircle size={16} /> Resolve
                                </button>
                            </div>
                        </div>

                        {/* Conversation Area (Placeholder for messages) */}
                        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4">
                                <p className="text-slate-800 text-sm">
                                    (Original Issue Description would go here. For now, we assume title handles it or we fetch first message.)
                                </p>
                            </div>
                            {/* Messages would be mapped here */}
                            <div className="flex justify-center my-4">
                                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Today</span>
                            </div>
                        </div>

                        {/* Reply Box */}
                        <div className="p-4 border-t border-slate-200 bg-white">
                            <div className="flex gap-2">
                                <textarea
                                    className="flex-1 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                                    placeholder="Type your reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                ></textarea>
                                <button
                                    onClick={handleSendReply}
                                    className="bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-700 transition-colors flex flex-col items-center justify-center gap-1 w-20"
                                >
                                    <Send size={18} />
                                    <span className="text-xs font-medium">Send</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare size={48} className="mb-4 text-slate-300" />
                        <p>Select a ticket to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};
