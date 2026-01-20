import React from 'react';
import { RefreshCw, Calendar } from 'lucide-react';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type EndType = 'never' | 'date' | 'count';

export interface RecurrenceConfig {
    type: RecurrenceType;
    endType: EndType;
    endDate?: string;
    endCount?: number;
}

interface RecurrenceSelectorProps {
    value: RecurrenceConfig;
    onChange: (config: RecurrenceConfig) => void;
}

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; rrule: string }[] = [
    { value: 'none', label: 'Não repete', rrule: '' },
    { value: 'daily', label: 'Diariamente', rrule: 'FREQ=DAILY' },
    { value: 'weekly', label: 'Semanalmente', rrule: 'FREQ=WEEKLY' },
    { value: 'biweekly', label: 'Quinzenalmente', rrule: 'FREQ=WEEKLY;INTERVAL=2' },
    { value: 'monthly', label: 'Mensalmente', rrule: 'FREQ=MONTHLY' },
];

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({ value, onChange }) => {
    const handleTypeChange = (type: RecurrenceType) => {
        onChange({
            ...value,
            type,
            // Reset end settings when changing type - default to 'count'
            endType: type === 'none' ? 'count' : value.endType,
        });
    };

    const handleEndTypeChange = (endType: EndType) => {
        onChange({
            ...value,
            endType,
            endDate: endType === 'date' ? value.endDate || '' : undefined,
            endCount: endType === 'count' ? value.endCount || 4 : undefined,
        });
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
                <RefreshCw size={14} className="inline mr-1" /> Recorrência
            </label>

            {/* Recurrence Type */}
            <div className="flex flex-wrap gap-2">
                {RECURRENCE_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleTypeChange(opt.value)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${value.type === opt.value
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* End Condition - Only show if recurrence is enabled */}
            {value.type !== 'none' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Repetir até:
                    </label>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => handleEndTypeChange('date')}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${value.endType === 'date'
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                : 'bg-white text-slate-500 border-slate-200'
                                }`}
                        >
                            📅 Data
                        </button>
                        <button
                            type="button"
                            onClick={() => handleEndTypeChange('count')}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${value.endType === 'count'
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                : 'bg-white text-slate-500 border-slate-200'
                                }`}
                        >
                            🔢 Vezes
                        </button>
                    </div>

                    {/* Date Input */}
                    {value.endType === 'date' && (
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-slate-400" />
                            <input
                                type="date"
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={value.endDate || ''}
                                onChange={e => onChange({ ...value, endDate: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Count Input */}
                    {value.endType === 'count' && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600">Repetir</span>
                            <input
                                type="number"
                                min="2"
                                max="52"
                                className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={value.endCount || 4}
                                onChange={e => onChange({ ...value, endCount: parseInt(e.target.value) || 4 })}
                            />
                            <span className="text-sm text-slate-600">vezes</span>
                        </div>
                    )}

                    {/* Preview */}
                    <div className="text-xs text-slate-400 bg-white p-2 rounded border border-slate-100">
                        {value.type === 'daily' && '📆 Todos os dias'}
                        {value.type === 'weekly' && '📆 Toda semana no mesmo dia'}
                        {value.type === 'biweekly' && '📆 A cada 2 semanas'}
                        {value.type === 'monthly' && '📆 Todo mês no mesmo dia'}
                        {value.endType === 'date' && value.endDate && ` até ${value.endDate}`}
                        {value.endType === 'count' && ` (${value.endCount || 4} ocorrências)`}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper to generate RRULE string
export const generateRRule = (config: RecurrenceConfig): string | null => {
    if (config.type === 'none') return null;

    const option = RECURRENCE_OPTIONS.find(o => o.value === config.type);
    if (!option) return null;

    let rrule = option.rrule;

    if (config.endType === 'count' && config.endCount) {
        rrule += `;COUNT=${config.endCount}`;
    } else if (config.endType === 'date' && config.endDate) {
        const dateStr = config.endDate.replace(/-/g, '') + 'T235959Z';
        rrule += `;UNTIL=${dateStr}`;
    }

    return rrule;
};

// Helper to calculate interval in days
export const getIntervalDays = (type: RecurrenceType): number => {
    switch (type) {
        case 'daily': return 1;
        case 'weekly': return 7;
        case 'biweekly': return 14;
        case 'monthly': return 30; // Approximate
        default: return 0;
    }
};
