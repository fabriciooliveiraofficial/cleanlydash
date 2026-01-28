import React, { useEffect, useState } from 'react';
import {
    LifeBuoy,
    Plus,
    MessageSquare,
    Send,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { Button } from '../ui/button';
import { useRole } from '../../hooks/use-role';
import { toast } from 'sonner';

interface Ticket {
    id: string;
    subject: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    created_at: string;
}

interface TicketMessage {
    id: string;
    message: string;
    is_admin: boolean;
    created_at: string;
}

export const TenantSupport: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [replyText, setReplyText] = useState('');

    // New Ticket Form
    const [newTicket, setNewTicket] = useState({ subject: '', category: 'general', priority: 'medium', description: '' });
    const { user, tenant_id: roleTenantId, loading: roleLoading } = useRole();
    const supabase = createClient();

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);
        }
    }, [selectedTicket]);

    const fetchTickets = async () => {
        if (roleLoading) return;
        if (!roleTenantId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('tenant_id', roleTenantId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("fetchTickets error:", error);
                toast.error("Error loading tickets");
            } else {
                setTickets(data as any || []);
            }
        } catch (error) {
            console.error("Error in fetchTickets:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (ticketId: string) => {
        const { data, error } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) console.error(error);
        else setMessages(data as any || []);
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleTenantId || !user) {
            toast.error("Contexto de empresa não identificado. Tente atualizar a página.");
            return;
        }

        try {

            // 1. Create Ticket
            const { data: ticket, error } = await (supabase as any).from('support_tickets').insert({
                tenant_id: roleTenantId,
                subject: newTicket.subject,
                category: newTicket.category,
                priority: newTicket.priority,
                status: 'open'
            }).select().single();

            if (error) throw error;
            if (!ticket) throw new Error("Failed to create ticket");

            // 2. Add First Message (Description)
            if (newTicket.description) {
                await (supabase as any).from('ticket_messages').insert({
                    ticket_id: ticket.id,
                    message: newTicket.description,
                    sender_id: user!.id,
                    is_admin: false
                });
            }

            toast.success("Chamado aberto com sucesso!");
            setIsCreating(false);
            setNewTicket({ subject: '', category: 'general', priority: 'medium', description: '' });
            fetchTickets();
        } catch (err: any) {
            toast.error("Erro ao criar chamado: " + err.message);
        }
    };

    const handleReply = async () => {
        if (!replyText.trim() || !selectedTicket) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await (supabase as any).from('ticket_messages').insert({
                ticket_id: selectedTicket.id,
                message: replyText,
                sender_id: user!.id,
                is_admin: false
            });

            if (error) throw error;

            setReplyText('');
            fetchMessages(selectedTicket.id);
            toast.success("Mensagem enviada!");
        } catch (err) {
            toast.error("Erro ao enviar mensagem.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-emerald-100 text-emerald-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'resolved': return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            {/* Left: Ticket List */}
            <div className="w-[350px] bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-black text-slate-800 flex items-center gap-2">
                        <LifeBuoy className="text-indigo-600" size={20} /> Suporte
                    </h2>
                    <Button size="sm" onClick={() => setIsCreating(true)} className="rounded-xl px-3 h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                        <Plus size={16} /> Novo
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading ? (
                        <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 text-sm">Nenhum chamado encontrado.</div>
                    ) : (
                        tickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => { setIsCreating(false); setSelectedTicket(ticket); }}
                                className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 className={`font-bold text-sm line-clamp-1 mb-1 ${selectedTicket?.id === ticket.id ? 'text-indigo-900' : 'text-slate-700'}`}>{ticket.subject}</h3>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    <span className={ticket.priority === 'critical' ? 'text-rose-500' : 'text-slate-400'}>{ticket.priority}</span>
                                    <span>•</span>
                                    <span>{ticket.category}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Content (Create or View) */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col relative">
                {isCreating ? (
                    <div className="p-8 max-w-2xl mx-auto w-full">
                        <div className="mb-8 text-center">
                            <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plus size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">Novo Chamado</h2>
                            <p className="text-slate-500">Descreva seu problema para nossa equipe.</p>
                        </div>
                        <form onSubmit={handleCreateTicket} className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Assunto</label>
                                <input
                                    required
                                    value={newTicket.subject}
                                    onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 placeholder:font-normal focus:ring-2 ring-indigo-500 transition-all"
                                    placeholder="Resumo do problema..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Categoria</label>
                                    <select
                                        value={newTicket.category}
                                        onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 focus:ring-2 ring-indigo-500 transition-all outline-none"
                                    >
                                        <option value="general">Geral</option>
                                        <option value="technical">Técnico</option>
                                        <option value="billing">Financeiro</option>
                                        <option value="feature">Sugestão</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Prioridade</label>
                                    <select
                                        value={newTicket.priority}
                                        onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 focus:ring-2 ring-indigo-500 transition-all outline-none"
                                    >
                                        <option value="low">Baixa</option>
                                        <option value="medium">Média</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Descrição</label>
                                <textarea
                                    required
                                    value={newTicket.description}
                                    onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                                    className="w-full h-32 bg-slate-50 border-none rounded-xl p-4 font-medium text-slate-800 placeholder:font-normal focus:ring-2 ring-indigo-500 transition-all resize-none"
                                    placeholder="Detalhe o que está acontecendo..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="flex-1 h-12 rounded-xl font-bold text-slate-500">Cancelar</Button>
                                <Button type="submit" className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200">Criar Chamado</Button>
                            </div>
                        </form>
                    </div>
                ) : selectedTicket ? (
                    <>
                        {/* Ticket Header */}
                        <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <h1 className="text-xl font-black text-slate-900 mb-2">{selectedTicket.subject}</h1>
                                <div className="flex gap-2">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                                        {selectedTicket.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">
                                        {selectedTicket.category}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-400 block uppercase tracking-widest mb-0.5">Ticket ID</span>
                                <span className="font-mono text-xs text-slate-500">#{selectedTicket.id.slice(0, 8)}</span>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${!msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${!msg.is_admin
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                        }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                        <div className={`text-[10px] mt-2 font-medium opacity-60 ${!msg.is_admin ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {!msg.is_admin ? 'Você' : 'Suporte Cleanlydash'} • {new Date(msg.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="text-center py-10 text-slate-400 italic">Inicie a conversa...</div>
                            )}
                        </div>

                        {/* Reply Area */}
                        <div className="p-4 bg-white border-t border-slate-100">
                            <div className="flex gap-3">
                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Digite sua resposta..."
                                    className="flex-1 bg-slate-50 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 ring-indigo-500 outline-none resize-none h-[60px]"
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                                />
                                <Button onClick={handleReply} className="h-[60px] w-[60px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                                    <Send size={24} />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="h-20 w-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                            <MessageSquare size={32} className="opacity-40" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-600 mb-1">Central de Suporte</h3>
                        <p className="text-sm max-w-xs text-center">Selecione um chamado ao lado ou abra um novo para falar com nossa equipe.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
