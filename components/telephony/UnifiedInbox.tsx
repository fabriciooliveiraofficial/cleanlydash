
import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, MoreVertical, Send, Paperclip, Mic, User, Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import { createClient } from '../../lib/supabase/client.ts';
import { Button } from '../ui/button.tsx';
import { toast } from 'sonner';
import { useTelnyx } from '../../hooks/use-telnyx.ts';
import { CommsSettings } from './CommsSettings.tsx';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu.tsx';
import { DollarSign } from 'lucide-react';
import { QuickPaymentModal } from '../commerce/QuickPaymentModal.tsx';

interface Conversation {
    id: string;
    customer_name: string;
    customer_phone: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
    avatar_color?: string;
    channel: 'whatsapp' | 'sms' | 'voice';
}

interface Message {
    id: string;
    content: string;
    direction: 'inbound' | 'outbound';
    created_at: string;
    status: 'sent' | 'delivered' | 'read' | 'queued';
}

export const UnifiedInbox: React.FC = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'inbox' | 'settings'>('inbox');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { makeCall } = useTelnyx();
    const supabase = createClient();

    // Helper to generate consistent colors
    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-emerald-100 text-emerald-600',
            'bg-blue-100 text-blue-600',
            'bg-purple-100 text-purple-600',
            'bg-amber-100 text-amber-600',
            'bg-rose-100 text-rose-600',
            'bg-indigo-100 text-indigo-600'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch Customers (acting as potential conversations for now)
                const { data: customers, error } = await supabase
                    .from('customers')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    toast.error(t('common.loading') + ' ' + t('common.error')); // Fallback error msg if key missing
                    console.error(error);
                    return;
                }

                if (customers) {
                    const mappedConversations: Conversation[] = (customers as any[]).map(c => ({
                        id: c.id,
                        customer_name: c.name || 'Unknown',
                        customer_phone: c.phone || 'No Phone',
                        last_message: t('inbox.start_conversation'),
                        last_message_at: '', // Could be c.created_at formatted
                        unread_count: 0,
                        avatar_color: getAvatarColor(c.name || 'Unknown'),
                        channel: 'sms' // Default to SMS for now
                    }));
                    setConversations(mappedConversations);
                }
            } catch (err) {
                console.error("Error loading inbox:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [t]);

    useEffect(() => {
        if (selectedId) {
            // Mock messages to show "Clean Slate" for new customers or fetch real ones
            // For now, we clear messages so it looks like a View to start chatting
            setMessages([]);
        }
    }, [selectedId]);

    const [isUploading, setIsUploading] = useState(false);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const selectedConversation = conversations.find(c => c.id === selectedId);
        if (!selectedConversation) {
            toast.error(t('inbox.select_conversation'));
            return;
        }

        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            content: inputText,
            direction: 'outbound',
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'queued'
        };

        // Optimistic UI update
        setMessages(prev => [...prev, newMessage]);
        setInputText('');

        try {
            const { error } = await supabase.functions.invoke('send_sms', {
                body: {
                    to: selectedConversation.customer_phone,
                    message: newMessage.content
                }
            });

            if (error) throw error;

            // Update status to 'sent'
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
        } catch (error: any) {
            console.error('Error sending SMS:', error);
            toast.error('Failed to send SMS');
            // Update status to 'failed' (or remove)
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m)); // define failed status if needed or just error toast
        }
    };

    const handleAudioCall = () => {
        const selectedConversation = conversations.find(c => c.id === selectedId);
        if (!selectedConversation) return;
        makeCall(selectedConversation.customer_phone);
        toast.success(`${t('inbox.calling')} ${selectedConversation.customer_name}...`);
    };

    const handleVideoCall = () => {
        toast.info(t('inbox.video_soon'));
    };

    const handleMicClick = () => {
        toast.info(t('inbox.voice_soon'));
    };

    const handleAttach = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const selectedConversation = conversations.find(c => c.id === selectedId);
            if (!selectedConversation) return;

            setIsUploading(true);
            toast.loading('Uploading attachment...');

            try {
                // Upload to Supabase Storage
                const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(`${selectedConversation.customer_phone}/${fileName}`, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(`${selectedConversation.customer_phone}/${fileName}`);

                // Send MMS
                const { error: sendError } = await supabase.functions.invoke('send_sms', {
                    body: {
                        to: selectedConversation.customer_phone,
                        message: `[Attachment: ${file.name}]`,
                        media_urls: [publicUrl]
                    }
                });

                if (sendError) throw sendError;

                toast.dismiss();
                toast.success('MMS enviado!');

                const newMessage: Message = {
                    id: Date.now().toString(),
                    content: `[File] ${file.name}`,
                    direction: 'outbound',
                    created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: 'sent'
                };
                setMessages(prev => [...prev, newMessage]);

            } catch (error: any) {
                console.error(error);
                toast.dismiss();
                toast.error('Erro ao enviar anexo: ' + error.message);
            } finally {
                setIsUploading(false);
                // Reset file input
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const selectedConversation = conversations.find(c => c.id === selectedId);

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6">
            {/* LEFT PANEL: Conversation List */}
            <div className="w-[350px] glass-panel flex flex-col rounded-3xl overflow-hidden border-white/50 transition-all duration-300">
                <div className="p-4 border-b border-slate-200/50 bg-white/30 backdrop-blur-md flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 px-2">{t('inbox.title')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setView(view === 'inbox' ? 'settings' : 'inbox')}
                        className={`rounded-xl transition-colors ${view === 'settings' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title={t('settings.language')}
                    >
                        {view === 'settings' ? <ArrowLeft size={20} /> : <SettingsIcon size={20} />}
                    </Button>
                </div>

                {/* Search Bar - Only show in Inbox mode or if we want it persistent */}
                <div className="px-4 pb-4 pt-0 border-b border-slate-200/50 bg-white/30 backdrop-blur-md">
                    <div className="bg-white/50 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/60 shadow-inner">
                        <Search size={18} className="text-slate-400" />
                        <input
                            placeholder={t('inbox.search_placeholder')}
                            className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center h-40 text-slate-400">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center p-8 text-slate-400 text-sm">
                            {t('inbox.no_customers')}
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => {
                                    setSelectedId(conv.id);
                                    setView('inbox');
                                }}
                                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 ${selectedId === conv.id && view === 'inbox'
                                    ? 'bg-indigo-50/80 shadow-sm border border-indigo-100'
                                    : 'hover:bg-white/40 border border-transparent'
                                    }`}
                            >
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${conv.avatar_color}`}>
                                    {conv.customer_name.charAt(0)}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className={`font-bold text-sm ${selectedId === conv.id && view === 'inbox' ? 'text-indigo-900' : 'text-slate-800'}`}>
                                            {conv.customer_name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">{conv.last_message_at}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate pr-2 line-clamp-1">{conv.last_message}</p>
                                </div>
                                {conv.unread_count > 0 && (
                                    <div className="h-5 w-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-indigo-200">
                                        {conv.unread_count}
                                    </div>
                                )}
                            </button>
                        )))}
                </div>
            </div>

            {/* RIGHT PANEL: Chat Thread OR Settings */}
            {view === 'settings' ? (
                <CommsSettings />
            ) : (
                <div className="flex-1 glass-panel rounded-3xl overflow-hidden flex flex-col border-white/50 relative">
                    {selectedId ? (
                        <>
                            {/* Thread Header */}
                            <div className="h-20 border-b border-slate-200/50 flex items-center justify-between px-6 bg-white/30 backdrop-blur-md">
                                <div className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold shadow-sm ${selectedConversation?.avatar_color}`}>
                                        {selectedConversation?.customer_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{selectedConversation?.customer_name}</h3>
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <span className={`h-1.5 w-1.5 rounded-full ${selectedConversation?.channel === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                                            {selectedConversation?.customer_phone}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={handleAudioCall} variant="ghost" size="icon" className="hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors" title={t('inbox.calling')}>
                                        <Phone size={20} />
                                    </Button>
                                    <Button onClick={handleVideoCall} variant="ghost" size="icon" className="hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors" title="Start Video Call">
                                        <Video size={20} />
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors" title={t('common.more_options')}>
                                                <MoreVertical size={20} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                            <DropdownMenuItem onClick={() => setIsPaymentModalOpen(true)} className="rounded-lg cursor-pointer text-indigo-600 font-bold bg-indigo-50/50 focus:bg-indigo-100">
                                                <DollarSign size={16} className="mr-2" /> Solicitar Pagamento
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => toast.info("Contact details coming soon")} className="rounded-lg cursor-pointer">
                                                {t('inbox.view_contact')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => toast.info("Block feature coming soon")} className="rounded-lg cursor-pointer">
                                                {t('inbox.block_number')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => toast.error("Delete conversation restricted")} className="text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg cursor-pointer">
                                                {t('inbox.delete_conversion')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <div className="bg-indigo-50 p-4 rounded-full mb-4">
                                            <Send size={24} className="text-indigo-400" />
                                        </div>
                                        <p className="text-sm">{t('inbox.start_conversation')}!</p>
                                    </div>
                                ) : (
                                    messages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm relative ${msg.direction === 'outbound'
                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                                }`}>
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                <span className={`text-[10px] absolute bottom-1 right-3 ${msg.direction === 'outbound' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {msg.created_at}
                                                </span>
                                            </div>
                                        </div>
                                    )))}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white/40 border-t border-slate-200/50 backdrop-blur-md">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <div className="flex items-center gap-2 bg-white rounded-2xl p-2 pl-4 border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                    <Button onClick={handleAttach} variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 h-8 w-8 rounded-full transition-colors" title={t('inbox.attach')}>
                                        <Paperclip size={18} />
                                    </Button>
                                    <input
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder={t('inbox.type_message')}
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!inputText.trim() && !isUploading}
                                        size="icon"
                                        className={`h-8 w-8 rounded-full shadow-md transition-all ${!inputText.trim() ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95'}`}
                                    >
                                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="ml-0.5" />}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <div className="h-20 w-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 shadow-inset">
                                <User size={40} className="opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-600 mb-2">{t('inbox.select_conversation')}</h3>
                            <p className="text-sm">{t('inbox.select_conversation_desc')}</p>
                        </div>
                    )}
                </div>
            )}

            <QuickPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                customerEmail={selectedConversation?.customer_phone + '@placeholder.com'} // Simplified for now since we don't always have email in the list
                customerName={selectedConversation?.customer_name}
                onSuccess={(url) => {
                    setInputText(`Olá ${selectedConversation?.customer_name}! Segue o link para pagamento da sua fatura: ${url}`);
                }}
            />
        </div>
    );
};
