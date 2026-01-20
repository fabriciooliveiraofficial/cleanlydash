import React, { useState } from 'react';
import { X, Clock, Send, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface DelayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (minutes: number) => void;
    bookingName: string;
}

export const DelayModal: React.FC<DelayModalProps> = ({ isOpen, onClose, onConfirm, bookingName }) => {
    const [minutes, setMinutes] = useState<string>('15');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const mins = parseInt(minutes);
        if (isNaN(mins) || mins <= 0) return;

        setSending(true);
        onConfirm(mins);
        // Reset and close is handled by parent or after a timeout if needed, 
        // but typically parents close it on confirm.
    };

    const QUICK_OPTIONS = ['10', '15', '20', '30', '45', '60'];

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-0 flex items-center justify-between text-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                            <Clock size={20} />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight">Notificar Atraso</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wide">Imóvel</p>
                        <p className="text-slate-900 font-bold">{bookingName}</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 block ml-1">
                            Quantos minutos de atraso?
                        </label>
                        <div className="relative">
                            <input
                                autoFocus
                                type="number"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                className="w-full h-16 bg-white border-2 border-slate-100 rounded-2xl px-6 text-2xl font-black text-slate-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all placeholder:text-slate-200"
                                placeholder="0"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                Minutos
                            </div>
                        </div>
                    </div>

                    {/* Quick Selection */}
                    <div className="grid grid-cols-3 gap-2">
                        {QUICK_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setMinutes(opt)}
                                className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${minutes === opt
                                        ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-inner'
                                        : 'bg-white border-slate-50 text-slate-500 hover:border-slate-200'
                                    }`}
                            >
                                +{opt}m
                            </button>
                        ))}
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-dashed border-amber-200 flex gap-3 text-amber-800">
                        <AlertCircle size={20} className="shrink-0" />
                        <p className="text-[11px] leading-relaxed font-medium">
                            O cliente receberá uma mensagem em inglês informando o tempo estimado de atraso.
                        </p>
                    </div>

                    <Button
                        onClick={handleConfirm}
                        disabled={!minutes || parseInt(minutes) <= 0 || sending}
                        className="w-full h-14 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-lg rounded-2xl shadow-xl shadow-amber-100 transition-all hover:scale-[1.02] active:scale-95 gap-3"
                    >
                        {sending ? 'Enviando...' : <><Send size={20} /> Notificar Cliente</>}
                    </Button>
                </div>
            </div>
        </div>
    );
};
