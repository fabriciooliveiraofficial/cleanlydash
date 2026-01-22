import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Users, Crown, ShieldCheck } from 'lucide-react';
import { PLAN_FEATURES, PLAN_CONFIGS } from './plan_data';
import { Button } from '../ui/button';

interface PlanDetailsModalProps {
    planId: string | null;
    onClose: () => void;
    onSelect: (planId: string) => void;
    lang?: 'en' | 'pt' | 'es';
}

const UI_TEXT = {
    en: {
        subtitle: "Detailed feature breakdown and limitations.",
        seats_title: "Included Seats",
        seats_desc_prefix: "This plan includes",
        seats_desc_suffix: "Active Users",
        categories: {
            management: 'Management & Sync',
            guest_experience: 'Guest Experience',
            operations: 'Operations & Maintenance',
            telephony: 'Telephony & AI',
            finance: 'Finance & Owners'
        },
        guarantee: "30-Day Money-Back Guarantee",
        close: "Close",
        select: "Select Plan"
    },
    pt: {
        subtitle: "Detalhamento e limitações do plano.",
        seats_title: "Assentos Incluídos",
        seats_desc_prefix: "Este plano inclui",
        seats_desc_suffix: "Usuários Ativos",
        categories: {
            management: 'Gerenciamento e Sincronização',
            guest_experience: 'Experiência do Hóspede',
            operations: 'Operações e Manutenção',
            telephony: 'Telefonia e IA',
            finance: 'Finanças e Proprietários'
        },
        guarantee: "Garantia de 30 Dias",
        close: "Fechar",
        select: "Selecionar Plano"
    },
    es: {
        subtitle: "Desglose detallado y limitaciones.",
        seats_title: "Asientos Incluidos",
        seats_desc_prefix: "Este plan incluye",
        seats_desc_suffix: "Usuarios Activos",
        categories: {
            management: 'Gestión y Sincronización',
            guest_experience: 'Experiencia del Huésped',
            operations: 'Operaciones y Mantenimiento',
            telephony: 'Telefonía e IA',
            finance: 'Finanzas y Propietarios'
        },
        guarantee: "Garantía de 30 Días",
        close: "Cerrar",
        select: "Seleccionar Plan"
    }
};

export const PlanDetailsModal: React.FC<PlanDetailsModalProps> = ({ planId, onClose, onSelect, lang = 'en' }) => {
    if (!planId) return null;

    const config = PLAN_CONFIGS[planId];
    // Fallback if plan not found in config
    if (!config) return null;

    const includedFeatures = new Set(config.features);
    const t = UI_TEXT[lang];

    return (
        <AnimatePresence>
            {planId && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto"
                    >
                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-3xl font-black text-slate-900 capitalize">
                                            {planId.replace(/_/g, ' ')}
                                        </h2>
                                        {planId.includes('founders') && (
                                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1 border border-amber-200">
                                                <Crown size={14} /> Founder's
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 font-medium">{t.subtitle}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content (Scrollable) */}
                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                {/* User Limit Block */}
                                <div className="mb-10 bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-center gap-6">
                                    <div className="h-14 w-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                        <Users size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{t.seats_title}</h3>
                                        <p className="text-indigo-700 font-medium">
                                            {t.seats_desc_prefix} <span className="font-black text-xl">{config.users} {t.seats_desc_suffix}</span> (Staff or Admins).
                                        </p>
                                    </div>
                                </div>

                                {/* Features Grid */}
                                <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
                                    {(Object.keys(t.categories) as Array<keyof typeof t.categories>).map((catKey) => {
                                        const catFeatures = PLAN_FEATURES.filter(f => f.category === catKey);
                                        if (catFeatures.length === 0) return null;

                                        return (
                                            <div key={catKey}>
                                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                                                    {t.categories[catKey]}
                                                </h3>
                                                <ul className="space-y-3">
                                                    {catFeatures.map((feature) => {
                                                        const isIncluded = includedFeatures.has(feature.id);
                                                        return (
                                                            <li key={feature.id} className={`flex items-start gap-3 ${isIncluded ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                                                <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isIncluded
                                                                    ? (feature.premium ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')
                                                                    : 'bg-slate-100 text-slate-300'
                                                                    }`}>
                                                                    {isIncluded ? <Check size={12} strokeWidth={4} /> : <X size={12} />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-sm font-bold ${isIncluded ? 'text-slate-900' : 'text-slate-400'}`}>
                                                                            {feature.label[lang]}
                                                                        </span>
                                                                        {feature.premium && isIncluded && (
                                                                            <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">
                                                                                PREMIUM
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {/* Description tooltip or subtext could go here */}
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer / CTA */}
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    {t.guarantee}
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="ghost" onClick={onClose}>{t.close}</Button>
                                    <Button
                                        onClick={() => onSelect(planId)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-lg shadow-indigo-200"
                                    >
                                        {t.select}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
