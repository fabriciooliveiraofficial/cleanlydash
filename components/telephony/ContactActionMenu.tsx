import React, { useState } from 'react';
import { Phone, MessageSquare, MoreVertical, Copy } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTelnyx } from '@/hooks/use-telnyx';
import { toast } from 'sonner';
import { QuickSmsModal } from './QuickSmsModal';

interface ContactActionMenuProps {
    phoneNumber: string;
    customerName?: string;
    children?: React.ReactNode;
    asChild?: boolean;
}

export const ContactActionMenu: React.FC<ContactActionMenuProps> = ({
    phoneNumber,
    customerName = 'Desconhecido',
    children,
    asChild = false
}) => {
    const { makeCall } = useTelnyx();
    const [isSmsOpen, setIsSmsOpen] = useState(false);

    const handleCall = () => {
        makeCall(phoneNumber);
        toast.success(`Ligando para ${customerName}...`);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(phoneNumber);
        toast.success('Número copiado!');
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild={asChild}>
                    {children || (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={16} />
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{customerName}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCall} className="cursor-pointer gap-2">
                        <Phone size={14} className="text-indigo-600" />
                        Ligar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsSmsOpen(true)} className="cursor-pointer gap-2">
                        <MessageSquare size={14} className="text-emerald-600" />
                        Enviar SMS
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCopy} className="cursor-pointer gap-2 opacity-50">
                        <Copy size={14} />
                        Copiar Número
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <QuickSmsModal
                isOpen={isSmsOpen}
                onClose={() => setIsSmsOpen(false)}
                phoneNumber={phoneNumber}
                customerName={customerName}
            />
        </>
    );
};
