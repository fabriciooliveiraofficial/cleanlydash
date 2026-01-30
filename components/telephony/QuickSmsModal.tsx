import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface QuickSmsModalProps {
    isOpen: boolean;
    onClose: () => void;
    phoneNumber: string;
    customerName?: string;
}

export const QuickSmsModal: React.FC<QuickSmsModalProps> = ({
    isOpen,
    onClose,
    phoneNumber,
    customerName
}) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const supabase = createClient();

    const handleSend = async () => {
        if (!message.trim()) return;

        setSending(true);
        try {
            const { data, error } = await supabase.functions.invoke('send_sms', {
                body: {
                    to: phoneNumber,
                    message: message
                }
            });

            if (error) {
                // Try to get the actual error message from the response
                const errorMessage = data?.error || error.message || 'Erro desconhecido';
                throw new Error(errorMessage);
            }

            toast.success('Mensagem enviada com sucesso!');
            setMessage('');
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao enviar SMS: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nova Mensagem</DialogTitle>
                    <p className="text-sm text-slate-500">
                        Para: <span className="font-bold text-slate-700">{customerName || phoneNumber}</span> ({phoneNumber})
                    </p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Textarea
                        placeholder="Digite sua mensagem..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="h-32 resize-none"
                    />
                </div>
                <DialogFooter className="flex justify-between sm:justify-between items-center">
                    <p className="text-xs text-slate-400 italic">
                        Custo estimado: $ 0.05
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSend} disabled={sending || !message.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                            {sending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send className="mr-2" size={16} />}
                            Enviar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
