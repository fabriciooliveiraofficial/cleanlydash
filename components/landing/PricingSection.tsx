import React, { useState } from 'react';
import { Check, User, Phone, Lock, Zap, Building2, Rocket, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UsageSimulator } from './UsageSimulator';

// Tipos de Planos
type PlanCategory = 'SYSTEM' | 'COMBOS' | 'TELEPHONY';

interface PricingSectionProps {
    onStart: (planId: string) => void;
    lang?: 'en' | 'pt' | 'es';
}

const PRICING_DATA = {
    en: {
        title: "Choose the ideal plan for your operation",
        subtitle: "Start with efficient management or boost with our communication combos.",
        buttons: { system: "System Only", combos: "Combos + Voice", telephony: "Telephony" },
        units: { month: "/mo", users: "Users Included", minutes: "Minutes Included/mo" },
        badges: { recommended: "Recommended", lock: "Telephony Features" },
        cta: "Get Started",
        simulator: "Simulate your usage:",
        footer: {
            title: "Need more? See the power of $1",
            simulator: "Each additional $1 adds:",
            note: "*Add extra credits anytime without changing plans."
        },
        plans: {
            system: [
                { id: "system_essentials", name: "Essentials", description: "For small operations", features: ["Full System Access", "Property Management", "Task Automation", "Mobile App for Cleaners"] },
                { id: "system_business", name: "Business", description: "For growing teams", features: ["Everything in Essentials", "Advanced Analytics", "Inventory Management", "API Access"] }
            ],
            combos: [
                { id: "founders_combo", name: "Founders", features: ["Full System", "Local Number (US)", "Call Recording", "Voicemail Transcription"] },
                { id: "solopreneur_combo", name: "Solopreneur", features: ["All Founders features", "Voice Menus (IVR)", "Call Queues", "SMS Marketing"] },
                { id: "growth_team_combo", name: "Growth Team", features: ["Solopreneur Features", "Power Dialer", "Real-time Monitoring", "Advanced CRM"] }
            ],
            telephony: [
                { id: "voice_starter", name: "Voice Starter", features: ["Business Line Only", "Web & Mobile Apps", "Call Recording", "Voicemail Drop"] },
                { id: "voice_pro", name: "Voice Pro", features: ["All Starter features", "Call Queues", "Voice Menus (IVR)", "Warm Transfers"] },
                { id: "voice_scale", name: "Voice Scale", features: ["All Pro features", "Power Dialer", "Sentiment Analysis", "Advanced Reporting"] }
            ]
        }
    },
    pt: {
        title: "Escolha o plano ideal para sua operação",
        subtitle: "Comece com uma gestão eficiente ou potencialize com nossos combos de comunicação.",
        buttons: { system: "System Only", combos: "Combos + Voz", telephony: "Telefonia" },
        units: { month: "/mês", users: "Usuários Incluídos", minutes: "Minutos Incluídos/mês" },
        badges: { recommended: "Recomendado", lock: "Recursos de Telefonia" },
        cta: "Começar Agora",
        simulator: "Simule seu uso:",
        footer: {
            title: "Precisa de mais? Veja o poder de $1",
            simulator: "Cada $1 Adicional adiciona:",
            note: "*Adicione créditos extras a qualquer momento sem mudar de plano."
        },
        plans: {
            system: [
                { id: "system_essentials", name: "Essentials", description: "Para pequenas operações", features: ["Acesso completo ao Sistema", "Gestão de Propriedades", "Automação de Tarefas", "App Mobile para Cleaners"] },
                { id: "system_business", name: "Business", description: "Para times em crescimento", features: ["Tudo do Essentials", "Analytics Avançado", "Gestão de Inventário", "API Acesso"] }
            ],
            combos: [
                { id: "founders_combo", name: "Founders", features: ["Sistema Completo", "Número Local (EUA)", "Gravador de Chamadas", "Correio de Voz Transcrito"] },
                { id: "solopreneur_combo", name: "Solopreneur", features: ["Todas features Founders", "Menus de Voz (IVR)", "Filas de Chamada", "SMS Marketing"] },
                { id: "growth_team_combo", name: "Growth Team", features: ["Features Solopreneur", "Power Dialer", "Monitoramento em Tempo Real", "CRM Avançado"] }
            ],
            telephony: [
                { id: "voice_starter", name: "Voice Starter", features: ["Apenas Linha Comercial", "Apps Web & Mobile", "Gravador de Chamadas", "Voicemail Drop"] },
                { id: "voice_pro", name: "Voice Pro", features: ["Todas features Starter", "Filas de Chamada", "Menus de Voz (IVR)", "Transferências Quentes"] },
                { id: "voice_scale", name: "Voice Scale", features: ["Todas features Pro", "Power Dialer", "Analise de Sentimento", "Relatórios Avançados"] }
            ]
        }
    },
    es: {
        title: "Elige el plan ideal para tu operación",
        subtitle: "Comienza con una gestión eficiente o potencia con nuestros combos de comunicación.",
        buttons: { system: "Solo Sistema", combos: "Combos + Voz", telephony: "Telefonía" },
        units: { month: "/mes", users: "Usuarios Incluidos", minutes: "Minutos Incluidos/mes" },
        badges: { recommended: "Recomendado", lock: "Funciones de Telefonía" },
        cta: "Empezar Ahora",
        simulator: "Simula tu uso:",
        footer: {
            title: "¿Necesitas más? Mira el poder de $1",
            simulator: "Cada $1 Adicional agrega:",
            note: "*Agrega créditos extra en cualquier momento sin cambiar de plan."
        },
        plans: {
            system: [
                { id: "system_essentials", name: "Essentials", description: "Para pequeñas operaciones", features: ["Acceso completo al Sistema", "Gestión de Propiedades", "Automatización de Tareas", "App Móvil para Cleaners"] },
                { id: "system_business", name: "Business", description: "Para equipos en crecimiento", features: ["Todo de Essentials", "Analytics Avanzado", "Gestión de Inventario", "Acceso API"] }
            ],
            combos: [
                { id: "founders_combo", name: "Founders", features: ["Sistema Completo", "Número Local (EE.UU.)", "Grabador de Llamadas", "Transcripción de Buzón de Voz"] },
                { id: "solopreneur_combo", name: "Solopreneur", features: ["Todas las funciones Founders", "Menús de Voz (IVR)", "Colas de Llamada", "SMS Marketing"] },
                { id: "growth_team_combo", name: "Growth Team", features: ["Funciones Solopreneur", "Power Dialer", "Monitoreo en Tiempo Real", "CRM Avanzado"] }
            ],
            telephony: [
                { id: "voice_starter", name: "Voice Starter", features: ["Solo Línea Comercial", "Apps Web y Móvil", "Grabador de Llamadas", "Voicemail Drop"] },
                { id: "voice_pro", name: "Voice Pro", features: ["Todas las funciones Starter", "Colas de Llamada", "Menús de Voz (IVR)", "Transferencias Calientes"] },
                { id: "voice_scale", name: "Voice Scale", features: ["Todas las funciones Pro", "Power Dialer", "Análisis de Sentimiento", "Reportes Avanzados"] }
            ]
        }
    }
};

export function PricingSection({ onStart, lang = 'pt' }: PricingSectionProps) {
    const [category, setCategory] = useState<PlanCategory>('COMBOS');
    const t = PRICING_DATA[lang];

    // Reconstruct plans with translations but keeping static data like price/users/icons
    const systemPlans = [
        {
            ...t.plans.system[0],
            price: 29.90,
            users: 2,
            telephonyMethods: false,
            icon: Building2,
            color: "blue",
            recommended: false
        },
        {
            ...t.plans.system[1],
            price: 39.90,
            users: 4,
            telephonyMethods: false,
            recommended: true,
            icon: Briefcase,
            color: "emerald"
        }
    ];

    const comboPlans = [
        {
            ...t.plans.combos[0],
            price: 49.90,
            users: 2,
            minutes: 150,
            icon: Zap,
            color: "purple",
            recommended: false
        },
        {
            ...t.plans.combos[1],
            price: 69.90,
            users: 4,
            minutes: 600,
            recommended: true,
            icon: Rocket,
            color: "indigo"
        },
        {
            ...t.plans.combos[2],
            price: 99.90,
            users: 5,
            minutes: 1500,
            icon: Building2,
            color: "orange",
            recommended: false
        }
    ];

    const telephonyPlans = [
        {
            ...t.plans.telephony[0],
            price: 14.99,
            users: 1,
            minutes: 150,
            icon: Phone,
            color: "cyan",
            recommended: false
        },
        {
            ...t.plans.telephony[1],
            price: 34.99,
            users: 3,
            minutes: 600,
            recommended: true,
            icon: Zap,
            color: "blue"
        },
        {
            ...t.plans.telephony[2],
            price: 89.99,
            users: 5,
            minutes: 1500,
            icon: Rocket,
            color: "violet",
            recommended: false
        }
    ];

    const getActivePlans = () => {
        switch (category) {
            case 'SYSTEM': return systemPlans;
            case 'COMBOS': return comboPlans;
            case 'TELEPHONY': return telephonyPlans;
            default: return comboPlans;
        }
    };

    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden" id="pricing">
            <div className="container px-4 mx-auto">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        {t.title}
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        {t.subtitle}
                    </p>

                    <div className="flex justify-center mt-8">
                        <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
                            <button
                                onClick={() => setCategory('SYSTEM')}
                                className={cn(
                                    "px-6 py-2.5 text-sm font-semibold rounded-lg transition-all",
                                    category === 'SYSTEM'
                                        ? "bg-slate-900 text-white shadow-md"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {t.buttons.system}
                            </button>
                            <button
                                onClick={() => setCategory('COMBOS')}
                                className={cn(
                                    "px-6 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
                                    category === 'COMBOS'
                                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Zap size={16} />
                                {t.buttons.combos}
                            </button>
                            <button
                                onClick={() => setCategory('TELEPHONY')}
                                className={cn(
                                    "px-6 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
                                    category === 'TELEPHONY'
                                        ? "bg-sky-600 text-white shadow-md"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Phone size={16} />
                                {t.buttons.telephony}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className={cn(
                    "grid gap-8 max-w-7xl mx-auto",
                    category === 'SYSTEM' ? "grid-cols-1 md:grid-cols-2 max-w-4xl" : "grid-cols-1 md:grid-cols-3"
                )}>
                    {getActivePlans().map((plan) => (
                        <div
                            key={plan.name}
                            className={cn(
                                "relative flex flex-col p-8 bg-white rounded-3xl border transition-all duration-300 hover:shadow-xl",
                                plan.recommended
                                    ? "border-indigo-600 shadow-lg scale-105 z-10"
                                    : "border-slate-200"
                            )}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 right-0 -mt-3 -mr-3">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white shadow-sm">
                                        {t.badges.recommended}
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                                    `bg-${plan.color}-100 text-${plan.color}-600`
                                )}>
                                    <plan.icon size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                {category === 'SYSTEM' && (
                                    <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                                )}
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                                <span className="text-slate-500">{t.units.month}</span>
                            </div>

                            <div className="space-y-4 mb-8 flex-1">
                                <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <User size={16} className="text-slate-400" />
                                    <span className="font-semibold">{plan.users} {t.units.users}</span>
                                </div>

                                {(category === 'COMBOS' || category === 'TELEPHONY') && plan.minutes && (
                                    <div className="flex items-center gap-3 text-sm text-indigo-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <Phone size={16} className="text-indigo-500" />
                                        <span className="font-semibold">{plan.minutes} {t.units.minutes}</span>
                                    </div>
                                )}

                                <ul className="space-y-3 mt-4">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                                            <Check size={16} className="text-emerald-500 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}

                                    {/* Telephony Lock for System Plans */}
                                    {category === 'SYSTEM' && (
                                        <li className="flex items-center gap-3 text-sm text-slate-400 opacity-60">
                                            <Lock size={16} className="text-slate-400 flex-shrink-0" />
                                            {t.badges.lock}
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {/* Simulation for Combos & Telephony */}
                            {(category === 'COMBOS' || category === 'TELEPHONY') && plan.minutes && (
                                <div className="mt-2 mb-6 -mx-2">
                                    <UsageSimulator initialMinutes={plan.minutes} label={t.simulator} lang={lang} />
                                </div>
                            )}

                            <Button
                                onClick={() => onStart(plan.id)}
                                className={cn(
                                    "w-full py-6 text-lg font-semibold rounded-xl",
                                    plan.recommended ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-slate-800"
                                )}
                            >
                                {t.cta}
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Global Simulator for "Each Additional $1" */}
                <div className="max-w-2xl mx-auto mt-20 pt-10 border-t border-slate-200">
                    <h3 className="text-xl font-bold text-center text-slate-900 mb-8">
                        {t.footer.title}
                    </h3>
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-1">
                        <UsageSimulator
                            initialMinutes={125}
                            label={t.footer.simulator}
                            className="border-0 shadow-none bg-transparent"
                            lang={lang}
                        />
                    </div>
                    <p className="text-center text-sm text-slate-500 mt-4">
                        {t.footer.note}
                    </p>
                </div>
            </div>
        </section>
    );
}
