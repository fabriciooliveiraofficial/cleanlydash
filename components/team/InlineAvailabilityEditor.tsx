import React, { useState, useEffect } from 'react';
import { Clock, Check, X } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';

export interface AvailabilitySlot {
    id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

interface InlineAvailabilityEditorProps {
    memberId?: string; // Optional - if provided, fetches existing data
    value: AvailabilitySlot[];
    onChange: (slots: AvailabilitySlot[]) => void;
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

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) =>
    `${String(i).padStart(2, '0')}:00`
);

export const getDefaultSlots = (): AvailabilitySlot[] => DAYS.map(day => ({
    day_of_week: day.value,
    start_time: '08:00',
    end_time: '18:00',
    is_available: day.value !== 0 && day.value !== 6 // Weekdays by default
}));

export const InlineAvailabilityEditor: React.FC<InlineAvailabilityEditorProps> = ({
    memberId,
    value,
    onChange
}) => {
    const [loading, setLoading] = useState(false);
    const [businessHours, setBusinessHours] = useState<{ start: string; end: string } | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (memberId) {
            fetchAvailability();
        }
        fetchBusinessHours();
    }, [memberId]);

    const fetchBusinessHours = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('tenant_profiles').select('business_hours').eq('id', user.id).single();
            if (data?.business_hours) {
                setBusinessHours(data.business_hours as any);
            }
        }
    }

    const fetchAvailability = async () => {
        if (!memberId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('team_availability')
                .select('*')
                .eq('member_id', memberId)
                .order('day_of_week');

            if (error) throw error;

            if (data && data.length > 0) {
                const merged = DAYS.map(day => {
                    const existing = data.find((d: any) => d.day_of_week === day.value);
                    if (existing) {
                        return {
                            ...existing,
                            start_time: existing.start_time?.slice(0, 5),
                            end_time: existing.end_time?.slice(0, 5)
                        };
                    }
                    return value[day.value];
                });
                onChange(merged as AvailabilitySlot[]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (dayIndex: number) => {
        const updated = value.map((slot, i) =>
            i === dayIndex ? { ...slot, is_available: !slot.is_available } : slot
        );
        onChange(updated);
    };

    const updateTime = (dayIndex: number, field: 'start_time' | 'end_time', newValue: string) => {
        const slot = value[dayIndex];
        const otherValue = field === 'start_time' ? slot.end_time : slot.start_time;

        if (field === 'start_time' && newValue >= otherValue) return;
        if (field === 'end_time' && newValue <= otherValue) return;

        if (businessHours) {
            const dayConfig = businessHours[slot.day_of_week];
            if (dayConfig && dayConfig.active) {
                if (field === 'start_time' && newValue < dayConfig.start) return;
                if (field === 'end_time' && newValue > dayConfig.end) return;
            } else if (dayConfig && !dayConfig.active) {
                return;
            }
        }

        const updated = value.map((slot, i) =>
            i === dayIndex ? { ...slot, [field]: newValue } : slot
        );
        onChange(updated);
    };

    const formatTimeOption = (timeStr: string) => {
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour, 10);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minute} ${period}`;
    };

    const setAllWeekdays = () => {
        const updated = value.map(s => ({ ...s, is_available: s.day_of_week >= 1 && s.day_of_week <= 5 }));
        onChange(updated);
    };

    const setAllAvailable = () => {
        const updated = value.map(s => ({ ...s, is_available: true }));
        onChange(updated);
    };

    const setNoneAvailable = () => {
        const updated = value.map(s => ({ ...s, is_available: false }));
        onChange(updated);
    };

    if (loading) {
        return <div className="py-8 text-center text-slate-400">Carregando disponibilidade...</div>;
    }

    return (
        <div className="space-y-3">
            {/* Quick Actions */}
            <div className="flex gap-2 mb-4">
                <button
                    type="button"
                    onClick={setAllWeekdays}
                    className="flex-1 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                >
                    📅 Seg-Sex
                </button>
                <button
                    type="button"
                    onClick={setAllAvailable}
                    className="flex-1 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200"
                >
                    ✓ Todos
                </button>
                <button
                    type="button"
                    onClick={setNoneAvailable}
                    className="flex-1 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200"
                >
                    ✕ Nenhum
                </button>
            </div>

            {/* Day Slots */}
            {value.map((slot, index) => (
                <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${slot.is_available
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                        }`}
                >
                    {/* Day Toggle */}
                    <button
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={`w-14 py-2 rounded-lg text-xs font-bold transition-colors ${slot.is_available
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                            }`}
                    >
                        {DAYS[index].short}
                    </button>

                    {slot.is_available ? (
                        <>
                            <select
                                value={slot.start_time}
                                onChange={e => updateTime(index, 'start_time', e.target.value)}
                                className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                            >
                                {(() => {
                                    const dayConfig = businessHours ? businessHours[slot.day_of_week] : null;
                                    const options = TIME_OPTIONS.filter(time => {
                                        if (!dayConfig || !dayConfig.active) return true;
                                        return time >= dayConfig.start && time < dayConfig.end;
                                    });
                                    if (!options.includes(slot.start_time)) options.push(slot.start_time);
                                    options.sort();
                                    return options.map(time => (
                                        <option key={time} value={time}>{formatTimeOption(time)}</option>
                                    ));
                                })()}
                            </select>

                            <span className="text-slate-400 text-xs">até</span>

                            <select
                                value={slot.end_time}
                                onChange={e => updateTime(index, 'end_time', e.target.value)}
                                className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                            >
                                {(() => {
                                    const dayConfig = businessHours ? businessHours[slot.day_of_week] : null;
                                    const options = TIME_OPTIONS.filter(time => {
                                        if (!dayConfig || !dayConfig.active) return true;
                                        return time > dayConfig.start && time <= dayConfig.end;
                                    });
                                    if (!options.includes(slot.end_time)) options.push(slot.end_time);
                                    options.sort();
                                    return options.map(time => (
                                        <option key={time} value={time}>{formatTimeOption(time)}</option>
                                    ));
                                })()}
                            </select>
                        </>
                    ) : (
                        <span className="flex-1 text-xs text-slate-400 italic">Indisponível</span>
                    )}

                    {/* Status Icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${slot.is_available ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                        {slot.is_available ? <Check size={14} /> : <X size={14} />}
                    </div>
                </div>
            ))}
        </div>
    );
};
