import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, User, DollarSign, Check } from 'lucide-react';

interface RecurrenceInstance {
    id: string;
    start_date: string;
    price: number;
    assigned_to?: string;
    cleaner_name?: string;
    status: string;
}

interface DeleteRecurrenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
    instances: RecurrenceInstance[];
    isDeleting: boolean;
}

export const DeleteRecurrenceModal: React.FC<DeleteRecurrenceModalProps> = ({
    isOpen, onClose, onConfirm, instances, isDeleting
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Select all by default when opening
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(instances.map(i => i.id));
        }
    }, [isOpen, instances]);

    const toggleId = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedIds.length === instances.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(instances.map(i => i.id));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-0 shadow-2xl gap-0">
                {/* Header */}
                <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center gap-4 shrink-0">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-sm border border-rose-200">
                        <Trash2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-rose-950 tracking-tight">Excluir Recorrência</h2>
                        <p className="text-rose-800/70 text-sm font-medium mt-0.5">Selecione quais ocorrências da série deseja remover.</p>
                    </div>
                </div>

                {/* Selection Controls */}
                <div className="px-6 py-3 bg-white border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500 shrink-0">
                    <span>{instances.length} agendamentos encontrados</span>
                    <button onClick={toggleAll} className="text-indigo-600 hover:text-indigo-800 uppercase tracking-widest text-[10px]">
                        {selectedIds.length === instances.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 custom-scrollbar">
                    {instances.map(inst => (
                        <div key={inst.id}
                            onClick={() => toggleId(inst.id)}
                            className={`
                                  flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group select-none
                                  ${selectedIds.includes(inst.id)
                                    ? 'bg-white border-rose-200 shadow-md ring-1 ring-rose-100'
                                    : 'bg-white border-slate-100 hover:border-slate-300 opacity-60 hover:opacity-100'}
                              `}
                        >
                            <div className={`
                                 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0
                                 ${selectedIds.includes(inst.id) ? 'bg-rose-500 border-rose-500 text-white scale-110' : 'border-slate-300 bg-slate-50 group-hover:border-slate-400'}
                             `}>
                                {selectedIds.includes(inst.id) && <Check size={14} strokeWidth={4} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="font-bold text-slate-800 text-sm capitalize truncate">
                                        {format(new Date(inst.start_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                                        {format(new Date(inst.start_date), "HH:mm")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                                        <User size={12} />
                                        {inst.cleaner_name || 'Sem Staff'}
                                    </span>
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                                        <DollarSign size={12} />
                                        {inst.price.toFixed(2)}
                                    </span>
                                    {inst.status && (
                                        <span className={`uppercase text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md ${inst.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                inst.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-200 text-slate-600'
                                            }`}>
                                            {inst.status === 'confirmed' ? 'Confirmado' : inst.status === 'pending' ? 'Pendente' : inst.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selecionados</span>
                        <span className="text-lg font-black text-rose-600">{selectedIds.length}</span>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 h-11 rounded-xl">Cancelar</Button>
                        <Button variant="destructive"
                            onClick={() => onConfirm(selectedIds)}
                            disabled={selectedIds.length === 0 || isDeleting}
                            className="bg-rose-600 hover:bg-rose-700 gap-2 h-11 px-6 rounded-xl font-bold shadow-lg shadow-rose-200 text-white">
                            {isDeleting ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Excluindo...</>
                            ) : (
                                <><Trash2 size={16} /> Excluir Selecionados</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
