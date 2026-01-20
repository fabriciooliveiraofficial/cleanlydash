import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { Bot, Send, X, Loader2, DollarSign } from 'lucide-react';
import { useAICredits } from '../../hooks/use-ai-credits';
import { Button } from '../ui/button';

interface AIChatAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    context: string;
    initialMessage?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
    isOpen,
    onClose,
    context,
    initialMessage
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { checkCredits, balance, refreshWallet } = useAICredits();
    const supabase = createClient();

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: initialMessage || 'Olá! Sou seu assistente virtual. Como posso ajudar com este processo?',
                    timestamp: new Date()
                }
            ]);
        }
    }, [isOpen, initialMessage]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen) {
            // setTimeout(() => inputRef.current?.focus(), 100);
            refreshWallet();
        }
    }, [isOpen, refreshWallet]);

    const handleSend = async () => {
        if (!input.trim()) return;

        if (!checkCredits()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const { data, error } = await supabase.functions.invoke('chat_completion', {
                body: {
                    message: userMsg.content,
                    context: context,
                    history: messages
                }
            });

            if (error) throw error;

            // If backend returns insufficient credits error structure (handled in function but checking just in case)
            if (data?.error === 'Insufficient credits') {
                toast.error('Saldo insuficiente para continuar.', {
                    action: { label: 'Recarregar', onClick: () => window.location.href = '/settings?tab=billing' }
                });
                setIsTyping(false);
                return;
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'Desculpe, não consegui processar sua resposta.',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
            refreshWallet(); // Update UI balance

        } catch (err: any) {
            console.error('Chat error:', err);
            toast.error('Erro ao conectar com o assistente.');
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: '⚠️ Ocorreu um erro de conexão. Por favor, tente novamente.',
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Header */}
            <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Assistente AirGoverness</h3>
                        <div className="text-[10px] text-indigo-100 flex items-center gap-1">
                            <DollarSign size={10} />
                            Saldo: ${balance?.toFixed(2)}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 h-96 overflow-y-auto p-4 bg-slate-50 space-y-4"
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 text-slate-500 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-100">
                {/* Warning Banner */}
                <div className="text-[10px] text-center text-slate-400 mb-2">
                    Esta conversa consome créditos da sua carteira.
                </div>

                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()}
                        placeholder="Digite sua dúvida..."
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                        disabled={isTyping}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="bg-indigo-600 hover:bg-indigo-700 w-10 h-10 p-0 rounded-xl"
                    >
                        {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </Button>
                </div>
            </div>
        </div>
    );
};
