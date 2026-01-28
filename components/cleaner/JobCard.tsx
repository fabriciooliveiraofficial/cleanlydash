import React from 'react';
import { MapPin, Clock, Calendar, CheckCircle, DollarSign, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface JobCardProps {
    booking: any;
    onSelect: () => void;
    onShowDetails: (booking: any) => void;
    onNotifyDelay?: (booking: any) => void;
    isFuture?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({ booking, onSelect, onShowDetails, onNotifyDelay, isFuture = false }) => {
    const isCompleted = booking.status === 'completed';
    const hasPay = booking.cleaner_pay_rate && booking.cleaner_pay_rate > 0;
    const isPaid = booking.pay_status === 'paid';

    const handleClick = () => {
        // Allow view for future/completed, but the view itself handles the readonly state
        if (isFuture) return; // For now preventing selection of future jobs as they have no actions
        onSelect();
    };

    return (
        <div onClick={handleClick} className={`rounded-2xl p-5 border shadow-sm transition-transform cursor-pointer ${isFuture ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-indigo-50 active:scale-95'}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center gap-2 font-bold text-sm px-3 py-1 rounded-full ${isCompleted ? 'text-slate-500 bg-slate-200' : 'text-indigo-600 bg-indigo-50'}`}>
                    <Clock size={14} />
                    {format(parseISO(booking.start_date), 'HH:mm')} - {format(parseISO(booking.end_date), 'HH:mm')}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowDetails(booking);
                        }}
                        className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
                        title="Ver Detalhes"
                    >
                        <Eye size={18} />
                    </button>
                    {isCompleted ? (
                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded-md">
                            <CheckCircle size={14} /> Concluído
                        </div>
                    ) : (booking.status === 'confirmed' || booking.status === 'in_progress') && (
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    )}
                </div>
            </div>

            <h3 className={`text-xl font-bold mb-1 leading-tight ${isCompleted ? 'text-slate-500' : 'text-slate-800'}`}>
                {booking.customers?.name || "Propriedade Desconhecida"}
            </h3>
            <p className="text-sm text-slate-400 font-medium flex items-center gap-1 mb-2">
                <MapPin size={14} />
                {booking.customers?.address || "Sem endereço"}
            </p>

            {/* Pay Rate Display */}
            {hasPay && (
                <div className={`flex items-center justify-between p-3 rounded-xl mb-3 ${isPaid ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                    <div className="flex items-center gap-2">
                        <DollarSign size={18} className={isPaid ? 'text-emerald-600' : 'text-amber-600'} />
                        <span className={`font-black text-lg ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                            ${booking.cleaner_pay_rate.toFixed(2)}
                        </span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isPaid ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                        {isPaid ? 'PAGAMENTO: ✓ PAGO' : 'PAGAMENTO: PENDENTE'}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                    disabled={isFuture}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect();
                    }}
                    className={`flex-[2] font-bold py-3 rounded-xl text-sm shadow-lg transition-colors ${isCompleted ? 'bg-slate-200 text-slate-500 shadow-none' :
                        isFuture ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' :
                            'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
                        }`}
                >
                    {isCompleted ? 'Revisar Detalhes' :
                        isFuture ? `Agendado: ${format(parseISO(booking.start_date), 'dd/MM')}` :
                            'Iniciar Job'}
                </button>
                {!isCompleted && !isFuture && onNotifyDelay && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onNotifyDelay(booking);
                        }}
                        className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold py-3 rounded-xl text-xs transition-colors shadow-sm active:scale-95"
                    >
                        Atrasar
                    </button>
                )}
            </div>
        </div>
    );
};
