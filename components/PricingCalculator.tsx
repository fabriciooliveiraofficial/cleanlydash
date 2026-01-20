import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Sparkles, Wallet, Zap, ArrowRight } from 'lucide-react';

interface PricingCalculatorProps {
  lang?: 'en' | 'pt' | 'es';
}

const translations = {
  en: {
    voice_title: "Voice Minutes",
    voice_subtitle: "Telecom Scalability",
    ai_title: "AI Transcription Hours",
    ai_subtitle: "Wallet Pay-as-you-go",
    credit_system: "Pre-paid credit system: <span class='text-slate-900 font-black'>$5.00</span> per processing hour.",
    monthly_sub: "Monthly Subscription",
    initial_wallet: "Initial Wallet Load",
    est_investment: "Estimated Investment",
    per_month: "/initial month",
    cta: "Start with this Setup",
    tiers: { start: 'Starter', growth: 'Pro', scale: 'Scale' }
  },
  pt: {
    voice_title: "Minutos de Voz",
    voice_subtitle: "Escalabilidade de Telecom",
    ai_title: "Horas de Transcrição IA",
    ai_subtitle: "Wallet Pay-as-you-go",
    credit_system: "Sistema de créditos pré-pagos: <span class='text-slate-900 font-black'>$5.00</span> por hora de processamento.",
    monthly_sub: "Assinatura Mensal",
    initial_wallet: "Recarga Inicial Wallet",
    est_investment: "Investimento Estimado",
    per_month: "/mês inicial",
    cta: "Começar com este Setup",
    tiers: { start: 'Starter', growth: 'Pro', scale: 'Scale' }
  },
  es: {
    voice_title: "Minutos de Voz",
    voice_subtitle: "Escalabilidad de Telecom",
    ai_title: "Horas de Transcripción IA",
    ai_subtitle: "Billetera Pay-as-you-go",
    credit_system: "Sistema de créditos prepagos: <span class='text-slate-900 font-black'>$5.00</span> por hora de procesamiento.",
    monthly_sub: "Suscripción Mensual",
    initial_wallet: "Recarga Inicial Billetera",
    est_investment: "Inversión Estimada",
    per_month: "/mes inicial",
    cta: "Comenzar con esta Configuración",
    tiers: { start: 'Starter', growth: 'Pro', scale: 'Scale' }
  }
};

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({ lang = 'en' }) => {
  const [minutes, setMinutes] = useState(150);
  const [aiHours, setAiHours] = useState(0);

  const t = translations[lang] || translations['en'];

  // Pricing Logic (Updated to Matches Voice Plans: Starter $14.99, Pro $34.99, Scale $89.99)
  const getPlan = () => {
    if (minutes <= 150) return { name: t.tiers.start, price: 14.99 };
    if (minutes <= 600) return { name: t.tiers.growth, price: 34.99 };
    return { name: t.tiers.scale, price: 89.99 };
  };

  const plan = getPlan();
  const aiCost = aiHours * 5; // $5.00 per hour
  const total = (plan.price + aiCost).toFixed(2);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200">
      <div className="space-y-12">
        {/* Zone A: Telephony */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Phone size={20} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 leading-none">{t.voice_title}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{t.voice_subtitle}</p>
              </div>
            </div>
            <span className="text-2xl font-black text-indigo-600">{minutes} min</span>
          </div>

          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          <div className="flex items-center justify-between px-2">
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${plan.name === t.tiers.start ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{t.tiers.start}</div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${plan.name === t.tiers.growth ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{t.tiers.growth}</div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${plan.name === t.tiers.scale ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{t.tiers.scale}</div>
          </div>
        </div>

        {/* Zone B: AI Power */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 leading-none">{t.ai_title}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{t.ai_subtitle}</p>
              </div>
            </div>
            <span className="text-2xl font-black text-amber-600">{aiHours}h</span>
          </div>

          <input
            type="range"
            min="0"
            max="50"
            value={aiHours}
            onChange={(e) => setAiHours(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <Wallet size={16} className="text-slate-400" />
            <p className="text-[11px] font-bold text-slate-500 italic" dangerouslySetInnerHTML={{ __html: t.credit_system }}></p>
          </div>
        </div>
      </div>

      {/* Result Section */}
      <div className="mt-12 pt-8 border-t space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-bold text-slate-500">
            <span>{t.monthly_sub} ({plan.name})</span>
            <span className="text-slate-900">$ {plan.price}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold text-slate-500">
            <span>{t.initial_wallet}</span>
            <span className="text-slate-900">$ {aiCost.toFixed(2)}</span>
          </div>
        </div>

        <motion.div
          key={total}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 rounded-3xl bg-indigo-950 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={64} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{t.est_investment}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">$ {total}</span>
            <span className="text-indigo-400 text-xs font-bold">{t.per_month}</span>
          </div>
        </motion.div>

        <button className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
          {t.cta} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};
