import React, { useState, useEffect } from 'react';
import { Clock, Check, X, Save } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '../ui/button';

interface AvailabilitySlot {
    id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

interface AvailabilityEditorProps {
    memberId: string;
    memberName: string;
    isOpen: boolean;
    onClose: () => void;
}

const DAYS = [
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Segunda', short: 'Seg' },
    { value: 2, label: 'Terça', short: 'Ter' },
    { value: 3, label: 'Quarta', short: 'Qua' },
    { value: 4, label: 'Quinta', short: 'Qui' },
    { value: 5, label: 'Sexta', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
];

const TIME_OPTIONS = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

const defaultSlots: AvailabilitySlot[] = DAYS.map(day => ({
    day_of_week: day.value,
    start_time: '08:00',
    end_time: '18:00',
    is_available: day.value !== 0 && day.value !== 6 // Weekdays by default
}));

export const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({
    memberId,
    memberName,
    isOpen,
    onClose
}) => {
    const [slots, setSlots] = useState<AvailabilitySlot[]>(defaultSlots);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen && memberId) {
            fetchAvailability();
        }
    }, [isOpen, memberId]);

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('team_availability')
                .select('*')
                .eq('member_id', memberId)
                .order('day_of_week');

            if (error) throw error;

            if (data && data.length > 0) {
                // Merge with defaults to ensure all days exist
                const merged = DAYS.map(day => {
                    const existing = data.find((d: any) => d.day_of_week === day.value);
                    return existing || defaultSlots[day.value];
                });
                setSlots(merged as any);
            } else {
                setSlots(defaultSlots);
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar disponibilidade');
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (dayIndex: number) => {
        setSlots(prev => prev.map((slot, i) =>
            i === dayIndex ? { ...slot, is_available: !slot.is_available } : slot
        ));
    };

    const updateTime = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
        setSlots(prev => prev.map((slot, i) =>
            i === dayIndex ? { ...slot, [field]: value } : slot
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Delete existing and insert fresh
            await supabase
                .from('team_availability')
                .delete()
                .eq('member_id', memberId);

            const toInsert = slots.map(slot => ({
                member_id: memberId,
                day_of_week: slot.day_of_week,
                start_time: slot.start_time,
                end_time: slot.end_time,
                is_available: slot.is_available
            }));

            const { error } = await supabase
                .from('team_availability')
                .insert(toInsert as any);

            if (error) throw error;

            toast.success('Disponibilidade salva!');
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Disponibilidade</h2>
                            <p className="text-xs text-slate-500">{memberName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="py-12 text-center text-slate-400">Carregando...</div>
                    ) : (
                        slots.map((slot, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${slot.is_available
                                        ? 'border-emerald-200 bg-emerald-50/50'
                                        : 'border-slate-200 bg-slate-50/50'
                                    }`}
                            >
                                {/* Day Toggle */}
                                <button
                                    onClick={() => toggleDay(index)}
                                    className={`w-16 py-2 rounded-lg text-sm font-bold transition-colors ${slot.is_available
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 text-slate-500'
                                        }`}
                                >
                                    {DAYS[index].short}
                                </button>

                                {slot.is_available ? (
                                    <>
                                        {/* Start Time */}
                                        <select
                                            value={slot.start_time}
                                            onChange={e => updateTime(index, 'start_time', e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                                        >
                                            {TIME_OPTIONS.map(time => (
                                                <option key={time} value={time}>{time}</option>
                                            ))}
                                        </select>

                                        <span className="text-slate-400">até</span>

                                        {/* End Time */}
                                        <select
                                            value={slot.end_time}
                                            onChange={e => updateTime(index, 'end_time', e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                                        >
                                            {TIME_OPTIONS.map(time => (
                                                <option key={time} value={time}>{time}</option>
                                            ))}
                                        </select>
                                    </>
                                ) : (
                                    <span className="flex-1 text-sm text-slate-400 italic">Indisponível</span>
                                )}

                                {/* Status Icon */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${slot.is_available ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    {slot.is_available ? <Check size={16} /> : <X size={16} />}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-2 border-t border-slate-100 flex gap-2">
                    <button
                        onClick={() => setSlots(slots.map(s => ({ ...s, is_available: true })))}
                        className="flex-1 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    >
                        ✓ Todos Disponíveis
                    </button>
                    <button
                        onClick={() => setSlots(slots.map(s => ({ ...s, is_available: s.day_of_week >= 1 && s.day_of_week <= 5 })))}
                        className="flex-1 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                        📅 Seg-Sex
                    </button>
                    <button
                        onClick={() => setSlots(slots.map(s => ({ ...s, is_available: false })))}
                        className="flex-1 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-lg"
                    >
                        ✕ Nenhum
                    </button>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save size={16} className="mr-2" />
                        {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
