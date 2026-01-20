import React, { useState } from 'react';
import { Check, User, Phone, Lock, Zap, Building2, Rocket, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UsageSimulator } from './UsageSimulator';

// Tipos de Planos
type PlanCategory = 'SYSTEM' | 'COMBOS' | 'TELEPHONY';

interface PricingSectionProps {
    onStart: (planId: string) => void;
}

export function PricingSection({ onStart }: PricingSectionProps) {
    const [category, setCategory] = useState<PlanCategory>('COMBOS');

    // System Plans (User-based)
    const systemPlans = [
        {
            id: "system_essentials",
            name: "Essentials",
            description: "Para pequenas operações",
            price: 29.90,
            users: 2,
            features: [
                "Acesso completo ao Sistema",
                "Gestão de Propriedades",
                "Automação de Tarefas",
                "App Mobile para Cleaners"
            ],
            telephonyMethods: false, // Bloqueado
            icon: Building2,
            color: "blue"
        },
        {
            id: "system_business",
            name: "Business",
            description: "Para times em crescimento",
            price: 39.90,
            users: 4,
            features: [
                "Tudo do Essentials",
                "Analytics Avançado",
                "Gestão de Inventário",
                "API Acesso"
            ],
            telephonyMethods: false,
            recommended: true,
            icon: Briefcase,
            color: "emerald"
        }
    ];

    // Combo Plans (User + Credits)
    const comboPlans = [
        {
            id: "founders_combo",
            name: "Founders",
            price: 49.90,
            users: 2,
            minutes: 150,
            features: [
                "Sistema Completo",
                "Número Local (EUA)",
                "Gravador de Chamadas",
                "Correio de Voz Transcrito"
            ],
            icon: Zap,
            color: "purple"
        },
        {
            id: "solopreneur_combo",
            name: "Solopreneur",
            price: 69.90,
            users: 4,
            minutes: 600,
            features: [
                "Todas features Founders",
                "Menus de Voz (IVR)",
                "Filas de Chamada",
                "SMS Marketing"
            ],
            recommended: true,
            icon: Rocket,
            color: "indigo"
        },
        {
            id: "growth_team_combo",
            name: "Growth Team",
            price: 99.90,
            users: 5,
            minutes: 1500,
            features: [
                "Features Solopreneur",
                "Power Dialer",
                "Monitoramento em Tempo Real",
                "CRM Avançado"
            ],
            icon: Building2,
            color: "orange"
        }
    ];

    // Telephony Plans (Only Credits)
    const telephonyPlans = [
        {
            id: "voice_starter",
            name: "Voice Starter",
            price: 14.99,
            users: 1,
            minutes: 150,
            features: [
                "Apenas Linha Comercial",
                "Apps Web & Mobile",
                "Gravador de Chamadas",
                "Voicemail Drop"
            ],
            icon: Phone,
            color: "cyan"
        },
        {
            id: "voice_pro",
            name: "Voice Pro",
            price: 34.99,
            users: 3,
            minutes: 600,
            features: [
                "Todas features Starter",
                "Filas de Chamada",
                "Menus de Voz (IVR)",
                "Transferências Quentes"
            ],
            recommended: true,
            icon: Zap,
            color: "blue"
        },
        {
            id: "voice_scale",
            name: "Voice Scale",
            price: 89.99,
            users: 5,
            minutes: 1500,
            features: [
                "Todas features Pro",
                "Power Dialer",
                "Analise de Sentimento",
                "Relatórios Avançados"
            ],
            icon: Rocket,
            color: "violet"
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
                        Escolha o plano ideal para sua operação
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Comece com uma gestão eficiente ou potencialize com nossos combos de comunicação.
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
                                System Only
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
                                Combos + Voz
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
                                Telefonia
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
                                        Recomendado
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
                                <span className="text-slate-500">/mês</span>
                            </div>

                            <div className="space-y-4 mb-8 flex-1">
                                <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <User size={16} className="text-slate-400" />
                                    <span className="font-semibold">{plan.users} Usuários Incluídos</span>
                                </div>

                                {(category === 'COMBOS' || category === 'TELEPHONY') && plan.minutes && (
                                    <div className="flex items-center gap-3 text-sm text-indigo-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <Phone size={16} className="text-indigo-500" />
                                        <span className="font-semibold">{plan.minutes} Minutos Incluídos/mês</span>
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
                                            Recursos de Telefonia
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {/* Simulation for Combos & Telephony */}
                            {(category === 'COMBOS' || category === 'TELEPHONY') && plan.minutes && (
                                <div className="mt-2 mb-6 -mx-2">
                                    <UsageSimulator initialMinutes={plan.minutes} label="Simule seu uso:" />
                                </div>
                            )}

                            <Button
                                onClick={() => onStart(plan.id)}
                                className={cn(
                                    "w-full py-6 text-lg font-semibold rounded-xl",
                                    plan.recommended ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-slate-800"
                                )}
                            >
                                Começar Agora
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Global Simulator for "Each Additional $1" */}
                <div className="max-w-2xl mx-auto mt-20 pt-10 border-t border-slate-200">
                    <h3 className="text-xl font-bold text-center text-slate-900 mb-8">
                        Precisa de mais? Veja o poder de $1
                    </h3>
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-1">
                        <UsageSimulator
                            initialMinutes={125}
                            label="Cada $1 Adicional adiciona:"
                            className="border-0 shadow-none bg-transparent"
                        />
                    </div>
                    <p className="text-center text-sm text-slate-500 mt-4">
                        *Adicione créditos extras a qualquer momento sem mudar de plano.
                    </p>
                </div>
            </div>
        </section>
    );
}
