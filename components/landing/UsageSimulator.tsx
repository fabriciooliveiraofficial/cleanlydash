import React, { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { MessageSquare, Phone, Image as ImageIcon } from "lucide-react";

interface UsageSimulatorProps {
    initialMinutes: number;
    label?: string;
    className?: string;
    lang?: 'en' | 'pt' | 'es';
}

// 4x Margin Pricing (Cost x 4)
const PRICES = {
    VOICE: 0.008, // per minute
    SMS: 0.004,   // per sms
    MMS: 0.020    // per mms
};

const TRANSLATIONS = {
    en: {
        base_budget: "Base Budget",
        minutes: "Minutes",
        sms: "SMS",
        mms: "MMS",
        note: "*Estimated values based on flexible credit usage."
    },
    pt: {
        base_budget: "Orçamento Base",
        minutes: "Minutos",
        sms: "SMS",
        mms: "MMS",
        note: "*Valores estimados baseados no uso flexível dos créditos inclusos."
    },
    es: {
        base_budget: "Presupuesto Base",
        minutes: "Minutos",
        sms: "SMS",
        mms: "MMS",
        note: "*Valores estimados basados en el uso flexible de créditos incluidos."
    }
};

export function UsageSimulator({ initialMinutes, label, className, lang = 'en' }: UsageSimulatorProps) {
    // Base budget is calculated from the initial minutes allocation
    const TOTAL_BUDGET = initialMinutes * PRICES.VOICE;
    const t = TRANSLATIONS[lang];

    const [minutes, setMinutes] = useState(initialMinutes);
    const [sms, setSms] = useState(0);
    const [mms, setMms] = useState(0);

    // Maximum capacities if budget was 100% allocated to one resource
    const maxMinutes = Math.floor(TOTAL_BUDGET / PRICES.VOICE);
    const maxSms = Math.floor(TOTAL_BUDGET / PRICES.SMS);
    const maxMms = Math.floor(TOTAL_BUDGET / PRICES.MMS);

    // Reset when initialMinutes changes (e.g. switching plans)
    useEffect(() => {
        setMinutes(initialMinutes);
        setSms(0);
        setMms(0);
    }, [initialMinutes]);

    // Helper to calculate current used budget
    const calculateUsed = (m: number, s: number, mm: number) => {
        return (m * PRICES.VOICE) + (s * PRICES.SMS) + (mm * PRICES.MMS);
    };

    const handleMinutesChange = (value: number[]) => {
        let newMinutes = value[0];
        const currentCostOthers = (sms * PRICES.SMS) + (mms * PRICES.MMS);

        // Constraint: Can't exceed budget
        if ((newMinutes * PRICES.VOICE) + currentCostOthers > TOTAL_BUDGET) {
            // Logic: If minutes increase, reduce others proportionally
            const availableForOthers = Math.max(0, TOTAL_BUDGET - (newMinutes * PRICES.VOICE));

            // If we need to reduce others
            if (currentCostOthers > availableForOthers) {
                setSms(0);
                setMms(0);
            }
        }
        setMinutes(newMinutes);
    };

    // "Mixer" Logic: Moving a slider prioritizes that value and reduces others if needed
    const adjustValues = (type: 'MIN' | 'SMS' | 'MMS', value: number) => {
        const val = Math.max(0, value);
        let budget = TOTAL_BUDGET;

        if (type === 'MIN') {
            const cost = val * PRICES.VOICE;
            if (cost > budget) return; // Should not happen with max constraint

            let remaining = budget - cost;

            // Check if SMS+MMS fit
            let currentOthersCost = (sms * PRICES.SMS) + (mms * PRICES.MMS);
            if (currentOthersCost > remaining) {
                const ratio = remaining / currentOthersCost;
                setSms(Math.floor(sms * ratio));
                setMms(Math.floor(mms * ratio));
            }
            setMinutes(val);
        }
        else if (type === 'SMS') {
            const cost = val * PRICES.SMS;
            if (cost > budget) return;

            let remaining = budget - cost;
            let currentOthersCost = (minutes * PRICES.VOICE) + (mms * PRICES.MMS);

            if (currentOthersCost > remaining) {
                const ratio = remaining / currentOthersCost;
                setMinutes(Math.floor(minutes * ratio));
                setMms(Math.floor(mms * ratio));
            }
            setSms(val);
        }
        else if (type === 'MMS') {
            const cost = val * PRICES.MMS;
            if (cost > budget) return;

            let remaining = budget - cost;
            let currentOthersCost = (minutes * PRICES.VOICE) + (sms * PRICES.SMS);

            if (currentOthersCost > remaining) {
                const ratio = remaining / currentOthersCost;
                setMinutes(Math.floor(minutes * ratio));
                setSms(Math.floor(sms * ratio));
            }
            setMms(val);
        }
    };


    return (
        <div className={cn("bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm", className)}>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-700">{label || "Usage Simulation"}</h4>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    {t.base_budget}: ${TOTAL_BUDGET.toFixed(2)}
                </span>
            </div>

            <div className="space-y-6">
                {/* Minutes Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-indigo-600">
                            <Phone size={14} /> {t.minutes}
                        </span>
                        <span className="text-slate-900">{minutes}</span>
                    </div>
                    <Slider
                        value={[minutes]}
                        max={maxMinutes}
                        step={1}
                        onValueChange={(v) => adjustValues('MIN', v[0])}
                        className="[&_.relative]:h-2 [&_.bg-primary]:bg-emerald-500"
                    />
                </div>

                {/* SMS Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-blue-600">
                            <MessageSquare size={14} /> {t.sms}
                        </span>
                        <span className="text-slate-900">{sms}</span>
                    </div>
                    <Slider
                        value={[sms]}
                        max={maxSms}
                        step={1}
                        onValueChange={(v) => adjustValues('SMS', v[0])}
                        className="[&_.relative]:h-2 [&_.bg-primary]:bg-blue-500"
                    />
                </div>

                {/* MMS Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-purple-600">
                            <ImageIcon size={14} /> {t.mms}
                        </span>
                        <span className="text-slate-900">{mms}</span>
                    </div>
                    <Slider
                        value={[mms]}
                        max={maxMms}
                        step={1}
                        onValueChange={(v) => adjustValues('MMS', v[0])}
                        className="[&_.relative]:h-2 [&_.bg-primary]:bg-purple-500"
                    />
                </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-4 text-center">
                {t.note}
            </p>
        </div>
    );
}
