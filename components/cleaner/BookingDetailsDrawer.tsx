import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { MapPin, Clock, Calendar, Info, Navigation, User, FileText, ClipboardList, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

interface BookingDetailsDrawerProps {
    booking: any;
    isOpen: boolean;
    onClose: () => void;
}

export const BookingDetailsDrawer: React.FC<BookingDetailsDrawerProps> = ({ booking, isOpen, onClose }) => {
    if (!booking) return null;

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.customers?.address || '')}`;

    // Fallback notes if needed
    const { notes_client, notes_staff, notes_internal } = booking;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[90vh] sm:h-[80vh] rounded-t-[2.5rem] p-0 border-none overflow-hidden flex flex-col">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

                <div className="flex-1 overflow-y-auto px-6 pb-10">
                    <SheetHeader className="text-left mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-md"> Detalhes do Job </span>
                            {booking.status === 'completed' && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-md"> Concluído </span>
                            )}
                        </div>
                        <SheetTitle className="text-3xl font-black text-slate-800 leading-tight">
                            {booking.customers?.name || "Propriedade Desconhecida"}
                        </SheetTitle>
                        <SheetDescription className="text-slate-500 font-medium flex items-center gap-1 text-sm">
                            <MapPin size={14} className="text-indigo-400" />
                            {booking.customers?.address || "Sem endereço"}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Calendar size={12} /> Data
                            </div>
                            <div className="font-bold text-slate-700">
                                {format(parseISO(booking.start_date), 'dd/MM/yyyy')}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Clock size={12} /> Horário
                            </div>
                            <div className="font-bold text-slate-700">
                                {format(parseISO(booking.start_date), 'HH:mm')} - {format(parseISO(booking.end_date), 'HH:mm')}
                            </div>
                        </div>
                    </div>

                    {booking.cleaner_pay_rate > 0 && (
                        <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 mb-8 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Seu Ganhos Estimados</div>
                                <div className="text-3xl font-black text-emerald-700">R$ {booking.cleaner_pay_rate.toFixed(2)}</div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <DollarSign size={24} />
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Google Maps Button */}
                        <Button
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 font-bold text-lg transition-transform active:scale-95"
                            onClick={() => window.open(googleMapsUrl, '_blank')}
                        >
                            <Navigation size={20} />
                            Navegar com Google Maps
                        </Button>

                        <Separator className="bg-slate-100" />

                        {/* Service Section */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ClipboardList size={14} /> Serviço Contratado
                            </h4>
                            <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100/50">
                                <div className="text-indigo-900 font-black text-xl mb-1">
                                    {booking.services?.name || "Serviço Geral"}
                                </div>
                                <div className="text-indigo-600/70 text-xs font-bold uppercase tracking-wider">
                                    Duração prevista: {booking.duration_minutes} min
                                </div>
                            </div>
                        </div>

                        {/* Notes Sections */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText size={14} /> Notas do Agendamento
                            </h4>

                            <div className="space-y-3">
                                {notes_staff && (
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                        <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Nota para a Equipe</div>
                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">{notes_staff}</p>
                                    </div>
                                )}

                                {notes_client && (
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Nota do Cliente</div>
                                        <p className="text-sm text-blue-900 font-medium leading-relaxed">{notes_client}</p>
                                    </div>
                                )}

                                {notes_internal && (
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Observações Internas</div>
                                        <p className="text-sm text-slate-800 font-medium leading-relaxed">{notes_internal}</p>
                                    </div>
                                )}

                                {!notes_staff && !notes_client && !notes_internal && (
                                    <div className="text-center py-8 text-slate-400 italic text-sm font-medium">
                                        Nenhuma nota adicional para este agendamento.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
