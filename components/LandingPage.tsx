import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane,
  Sparkles,
  PhoneCall,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  Calendar,
  Users,
  MessageSquare,
  Globe,
  Info
} from 'lucide-react';
import { Button } from './ui/button';
import { PricingCalculator } from './PricingCalculator';
import { PricingSection } from './landing/PricingSection';
import { PlanDetailsModal } from './landing/PlanDetailsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Menu } from 'lucide-react';

interface LandingPageProps {
  onStart: (planId?: string) => void;
  onLogin: () => void;
}

type Language = 'en' | 'pt' | 'es';

const translations = {
  en: {
    nav: ['Features', 'Pricing', 'Calculator'],
    login: 'Login',
    start: 'Get Started',
    hero: {
      tag: "Founder's Offer: Active",
      title: "The Operating System for <span class='text-indigo-600'>Property & Cleaning</span> Empires.",
      subtitle: "Stop overpaying for scattered tools. Whether you manage Short-Term Rentals or Residential/Commercial Cleaning Fleets, get Telephony, Scheduling, and AI in a single hybrid platform.",
      cta: "View Founder's Offer",
      social_proof: "Join <span class='text-slate-900 font-black'>12/50</span> Founding Members",
      offer_card: {
        badge: "Limited Offer",
        title: "Founder's Combo",
        subtitle: "All-In-One Lifetime Access",
        old_price: "$89/mo",
        items: [
          { title: "Essentials System", subtitle: "2 Users • Scheduling" },
          { title: "Voice Starter", subtitle: "150 Mins • 50 SMS • 20 MMS" },
          { title: "Concierge Migration", subtitle: "We migrate your data for free" }
        ],
        cta: "Claim My Spot",
        disclaimer: "No contract. Cancel anytime."
      }
    },
    features: {
      hybrid: { title: "Hybrid Power", text: "Why have two tabs open? Answer calls without leaving your booking calendar. The only system that merges Telecom and Management." },
      fraud: { title: "Anti-Fraud", text: "Unique logins per user prevent password sharing." },
      mms: { title: "SMS & MMS", text: "Send cleaning photos via MMS directly from the system." },
      dialer: { title: "Global Floating Dialer", text: "Receive calls while editing a reservation. The floating dialer ensures you never lose unsaved data.", badge: "True Multitasking" }
    },
    pricing: {
      title: "Flexible Plans",
      subtitle: "Choose only what your business needs.",
      tabs: { combos: 'Combos 🔥', system: 'System', telephony: 'Telephony' },
      cards: {
        solopreneur: { title: "Solopreneur", desc: "For independent hosts.", badges: ["Essentials System", "Voice Starter", "1 User", "50 SMS Included"] },
        founders: { title: "Founder's", desc: "Limited launch offer.", badges: ["Everything in Solopreneur", "Concierge Onboarding", "Priority Support", "Lifetime Lock"] },
        growth: { title: "Growth Team", desc: "For small teams.", badges: ["Business System", "Voice Pro", "3 Users", "Automated Payroll"] },
        essentials: { title: "Essentials", desc: "Efficient basic management.", badges: ["Up to 2 Users", "Scheduling", "Estimates", "Unified Inbox"] },
        business: { title: "Business", desc: "Full management with HR.", badges: ["Up to 5 Users", "Payroll & Staff", "Owner Portal", "Financial Reports"], badge_label: "Popular" },
        enterprise: { title: "Enterprise", desc: "For large operations.", badges: ["Unlimited Users", "API Access", "White Label", "Guaranteed SLA"] },
        voice_starter: { title: "Voice Starter", desc: "Business line only.", badges: ["1 User", "150 Minutes", "50 SMS", "20 MMS"] },
        voice_pro: { title: "Voice Pro", desc: "Moderate volume.", badges: ["3 Users", "600 Minutes", "600 SMS", "50 MMS"] },
        voice_scale: { title: "Voice Scale", desc: "High volume.", badges: ["5 Users", "1500 Minutes", "1500 SMS", "100 MMS"] }
      },
      wallet_guarantee: "Your wallet never goes negative. The system pauses automatically if balance hits $0.00, guaranteeing no surprise telephony bills."
    },
    footer: {
      tag: "Made by hosts, for hosts. The first platform that takes scaling operations seriously.",
      rights: "© 2024 Cleanlydash. All Rights Reserved."
    }
  },
  pt: {
    nav: ['Funcionalidades', 'Preços', 'Calculadora'],
    login: 'Entrar',
    start: 'Começar Agora',
    hero: {
      tag: "Oferta Founder: Ativa",
      title: "O Sistema Operacional de <span class='text-indigo-600'>Impérios</span> de Hospedagem e Limpeza.",
      subtitle: "Ideal para Investidores Airbnb, Empresas de Limpeza Residencial e Comercial. Tenha Telefonia, Agendamento e IA em uma única plataforma híbrida.",
      cta: "Ver Oferta Founder",
      social_proof: "Junte-se a <span class='text-slate-900 font-black'>12/50</span> Fundadores",
      offer_card: {
        badge: "Oferta Limitada",
        title: "Founder's Combo",
        subtitle: "Acesso Vitalício All-In-One",
        old_price: "$89/mo",
        items: [
          { title: "Sistema Essentials", subtitle: "2 Usuários • Agendamento" },
          { title: "Voice Starter", subtitle: "150 Min • 50 SMS • 20 MMS" },
          { title: "Concierge Migration", subtitle: "Migramos seus dados grátis" }
        ],
        cta: "Garantir Minha Vaga",
        disclaimer: "Sem fidelidade. Cancele quando quiser."
      }
    },
    features: {
      hybrid: { title: "Poder Híbrido", text: "Por que ter duas abas abertas? Atenda chamadas sem sair do calendário de agendamento. O único sistema que une Telecom e Gestão." },
      fraud: { title: "Anti-Fraude", text: "Logins únicos por usuário evitam compartilhamento de senhas." },
      mms: { title: "SMS & MMS", text: "Envie fotos das limpezas via MMS direto do sistema." },
      dialer: { title: "Global Floating Dialer", text: "Receba chamadas enquanto edita uma reserva. O dialer flutuante garante que você nunca perca dados não salvos.", badge: "Multitasking Real" }
    },
    pricing: {
      title: "Planos Flexíveis",
      subtitle: "Escolha apenas o que seu negócio precisa.",
      tabs: { combos: 'Combos 🔥', system: 'Sistema', telephony: 'Telefonia' },
      cards: {
        solopreneur: { title: "Solopreneur", desc: "Para anfitriões independentes.", badges: ["Sistema Essentials", "Voice Starter", "1 Usuário", "50 SMS Incluídos"] },
        founders: { title: "Founder's", desc: "Oferta de lançamento limitada.", badges: ["Tudo do Solopreneur", "Onboarding Concierge", "Prioridade no Suporte", "Lifetime Lock"] },
        growth: { title: "Growth Team", desc: "Para pequenas equipes.", badges: ["Sistema Business", "Voice Pro", "3 Usuários", "Payroll Automatizado"] },
        essentials: { title: "Essentials", desc: "Gestão básica eficiente.", badges: ["Até 2 Usuários", "Agendamento", "Estimativas", "Unified Inbox"] },
        business: { title: "Business", desc: "Gestão completa com RH.", badges: ["Até 5 Usuários", "Payroll & Staff", "Portal do Proprietário", "Relatórios Financeiros"], badge_label: "Popular" },
        enterprise: { title: "Enterprise", desc: "Para grandes operações.", badges: ["Usuários Ilimitados", "API Access", "White Label", "SLA Garantido"] },
        voice_starter: { title: "Voice Starter", desc: "Apenas linha comercial.", badges: ["1 Usuário", "150 Minutos", "50 SMS", "20 MMS"] },
        voice_pro: { title: "Voice Pro", desc: "Volume moderado.", badges: ["3 Usuários", "600 Minutos", "600 SMS", "50 MMS"] },
        voice_scale: { title: "Voice Scale", desc: "Volume alto.", badges: ["5 Usuários", "1500 Minutos", "1500 SMS", "100 MMS"] }
      },
      wallet_guarantee: "Seu saldo nunca fica negativo. O sistema pausa automaticamente se a carteira atingir $0,00, garantindo que você nunca receba uma conta surpresa de telefonia."
    },
    footer: {
      tag: "Feito por anfitriões, para anfitriões. A primeira plataforma que leva a sério a operação de quem escala.",
      rights: "© 2024 Cleanlydash. Todos os direitos reservados."
    }
  },
  es: {
    nav: ['Funcionalidades', 'Precios', 'Calculadora'],
    login: 'Entrar',
    start: 'Empezar Ahora',
    hero: {
      tag: "Oferta Founder: Activa",
      title: "El Sistema Operativo de <span class='text-indigo-600'>Imperios</span> Airbnb.",
      subtitle: "Deja de pagar por Aircall y Guesty por separado. Obtenga Telefonía, Programación e IA en una única plataforma híbrida.",
      cta: "Ver Oferta Founder",
      social_proof: "Únete a <span class='text-slate-900 font-black'>12/50</span> Fundadores",
      offer_card: {
        badge: "Oferta Limitada",
        title: "Combo Founder's",
        subtitle: "Acceso Vitalicio All-In-One",
        old_price: "$89/mo",
        items: [
          { title: "Sistema Essentials", subtitle: "2 Usuarios • Programación" },
          { title: "Voice Starter", subtitle: "150 Min • 50 SMS • 20 MMS" },
          { title: "Concierge Migration", subtitle: "Migramos tus datos gratis" }
        ],
        cta: "Asegurar Mi Lugar",
        disclaimer: "Sin permanencia. Cancela cuando quieras."
      }
    },
    features: {
      hybrid: { title: "Poder Híbrido", text: "¿Por qué tener dos pestañas abiertas? Responde llamadas sin salir de tu calendario. El único sistema que une Telecom y Gestión." },
      fraud: { title: "Anti-Fraude", text: "Logins únicos por usuario evitan compartir contraseñas." },
      mms: { title: "SMS & MMS", text: "Envía fotos de limpieza vía MMS directamente desde el sistema." },
      dialer: { title: "Global Floating Dialer", text: "Recibe llamadas mientras editas una reserva. El dialer flotante asegura que nunca pierdas datos no guardados.", badge: "Multitasking Real" }
    },
    pricing: {
      title: "Planes Flexibles",
      subtitle: "Elige solo lo que tu negocio necesita.",
      tabs: { combos: 'Combos 🔥', system: 'Sistema', telephony: 'Telefonía' },
      cards: {
        solopreneur: { title: "Solopreneur", desc: "Para anfitriones independientes.", badges: ["Sistema Essentials", "Voice Starter", "1 Usuario", "50 SMS Incluidos"] },
        founders: { title: "Founder's", desc: "Oferta de lanzamiento limitada.", badges: ["Todo de Solopreneur", "Onboarding Concierge", "Prioridad en Soporte", "Lifetime Lock"] },
        growth: { title: "Growth Team", desc: "Para pequeños equipos.", badges: ["Sistema Business", "Voice Pro", "3 Usuarios", "Payroll Automatizado"] },
        essentials: { title: "Essentials", desc: "Gestión básica eficiente.", badges: ["Hasta 2 Usuarios", "Programación", "Estimaciones", "Unified Inbox"] },
        business: { title: "Business", desc: "Gestión completa con RRHH.", badges: ["Hasta 5 Usuarios", "Payroll & Staff", "Portal del Propietario", "Reportes Financieros"], badge_label: "Popular" },
        enterprise: { title: "Enterprise", desc: "Para grandes operaciones.", badges: ["Usuarios Ilimitados", "API Access", "White Label", "SLA Garantido"] },
        voice_starter: { title: "Voice Starter", desc: "Solo línea comercial.", badges: ["1 Usuario", "150 Minutos", "50 SMS", "20 MMS"] },
        voice_pro: { title: "Voice Pro", desc: "Volumen moderado.", badges: ["3 Usuarios", "600 Minutos", "600 SMS", "50 MMS"] },
        voice_scale: { title: "Voice Scale", desc: "Volumen alto.", badges: ["5 Usuarios", "1500 Minutos", "1500 SMS", "100 MMS"] }
      },
      wallet_guarantee: "Tu saldo nunca es negativo. El sistema pausa automáticamente si la billetera llega a $0.00, garantizando que nunca recibas una factura sorpresa."
    },
    footer: {
      tag: "Hecho por anfitriones, para anfitriones. La primera plataforma que toma en serio la operación de quienes escalan.",
      rights: "© 2024 Cleanlydash. Todos los derechos reservados."
    }
  }
};

export const LandingPage: React.FC<LandingPageProps & { onFeatures: () => void }> = ({ onStart, onLogin, onFeatures }) => {
  const [pricingTab, setPricingTab] = useState<'system' | 'telephony' | 'combos'>('combos');
  const [lang, setLang] = useState<Language>('en'); // Default to US English
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 scroll-smooth font-sans">
      {/* ... keeping other parts via context matching ... */}
      <header className="fixed top-0 z-50 w-full glass border-b border-white/20 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-600 p-1.5 text-white shadow-lg shadow-indigo-200">
              <Plane size={22} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase text-slate-900">Cleanlydash</span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <button onClick={onFeatures} className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
              {t.nav[0]}
            </button>
            <a href="#pricing" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
              {t.nav[1]}
            </a>
            <a href="#calculator" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
              {t.nav[2]}
            </a>
          </nav>


          <div className="hidden md:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 hover:bg-slate-100">
                  <Globe className="h-5 w-5 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/80 backdrop-blur-md border-slate-200">
                <DropdownMenuItem onClick={() => setLang('en')} className="font-bold cursor-pointer">🇺🇸 English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('pt')} className="font-bold cursor-pointer">🇧🇷 Português</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('es')} className="font-bold cursor-pointer">🇪🇸 Español</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" className="font-bold text-slate-600 hover:bg-slate-100" onClick={(e) => { e.preventDefault(); onLogin(); }} type="button">{t.login}</Button>
            <Button className="rounded-full bg-indigo-600 font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95" onClick={(e) => { e.preventDefault(); onStart(); }} type="button">
              {t.start}
            </Button>
          </div>


          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 hover:bg-slate-100">
                  <Globe className="h-5 w-5 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/80 backdrop-blur-md border-slate-200">
                <DropdownMenuItem onClick={() => setLang('en')} className="font-bold cursor-pointer">🇺🇸 English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('pt')} className="font-bold cursor-pointer">🇧🇷 Português</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('es')} className="font-bold cursor-pointer">🇪🇸 Español</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Stunning Toggle Button */}
            <motion.button
              onClick={() => setIsMenuOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative z-50 flex h-12 w-12 flex-col items-center justify-center gap-[6px] rounded-full bg-slate-900 shadow-xl shadow-slate-300 transition-colors hover:bg-slate-800 md:hidden"
            >
              <span className="block h-[2.5px] w-6 rounded-full bg-white transition-transform duration-300"></span>
              <span className="block h-[2.5px] w-6 rounded-full bg-white transition-transform duration-300"></span>
              <span className="block h-[2.5px] w-4 rounded-full self-end mr-3 bg-indigo-400 transition-transform duration-300"></span>
            </motion.button>

            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetContent side="right" className="w-[300px] sm:w-[380px] p-0">
                <div className="p-8 h-full flex flex-col">
                  <SheetHeader className="text-left mb-12">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-indigo-600 p-1.5 text-white shadow-lg shadow-indigo-200">
                        <Plane size={18} strokeWidth={2.5} />
                      </div>
                      <span className="text-lg font-black tracking-tighter uppercase text-slate-900">Cleanlydash</span>
                    </div>
                  </SheetHeader>
                  <div className="flex flex-col gap-6">
                    <nav className="flex flex-col gap-4">
                      <button onClick={() => { setIsMenuOpen(false); onFeatures(); }} className="text-lg font-bold text-slate-600 hover:text-indigo-600 text-left transition-colors">
                        {t.nav[0]}
                      </button>
                      <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                        {t.nav[1]}
                      </a>
                      <a href="#calculator" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                        {t.nav[2]}
                      </a>
                    </nav>

                    <div className="h-px bg-slate-100 my-2" />

                    <div className="flex flex-col gap-4">
                      <Button variant="outline" className="w-full justify-start font-bold text-slate-600 h-12 text-lg rounded-xl" onClick={onLogin}>
                        {t.login}
                      </Button>
                      <Button className="w-full bg-indigo-600 font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 h-12 text-lg rounded-xl" onClick={() => onStart()}>
                        {t.start}
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-indigo-50/80 to-transparent rounded-full blur-3xl -z-10"></div>

        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-700 mb-8 border border-amber-200">
              <Sparkles size={14} /> {t.hero.tag}
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight mb-8" dangerouslySetInnerHTML={{ __html: t.hero.title }}></h1>
            <p className="max-w-xl text-lg md:text-xl text-slate-600 font-medium mb-10 leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                size="lg"
                type="button"
                className="h-14 px-8 rounded-2xl bg-slate-900 text-lg font-bold shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all hover:-translate-y-1 w-full sm:w-auto"
                onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}
              >
                {t.hero.cta} <ArrowRight className="ml-2" />
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm font-bold text-slate-500">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <p dangerouslySetInnerHTML={{ __html: t.hero.social_proof }}></p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative"
          >
            {/* Founder's Offer Card */}
            <div className="relative z-10 bg-white rounded-[2.5rem] p-8 shadow-2xl border border-indigo-100/50 backdrop-blur-xl">
              <div className="absolute -top-6 right-8 bg-black text-white px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-xl">
                {t.hero.offer_card.badge}
              </div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{t.hero.offer_card.title}</h3>
                  <p className="text-slate-500 font-bold">{t.hero.offer_card.subtitle}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-400 line-through">{t.hero.offer_card.old_price}</div>
                  <div className="text-4xl font-black text-indigo-600">$ 49<span className="text-xl">.90</span></div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Calendar size={20} /></div>
                  <div>
                    <div className="font-black text-slate-900">{t.hero.offer_card.items[0].title}</div>
                    <div className="text-xs font-bold text-slate-400">{t.hero.offer_card.items[0].subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600"><PhoneCall size={20} /></div>
                  <div>
                    <div className="font-black text-slate-900">{t.hero.offer_card.items[1].title}</div>
                    <div className="text-xs font-bold text-slate-400">{t.hero.offer_card.items[1].subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600"><Sparkles size={20} /></div>
                  <div>
                    <div className="font-black text-slate-900">{t.hero.offer_card.items[2].title}</div>
                    <div className="text-xs font-bold text-slate-400">{t.hero.offer_card.items[2].subtitle}</div>
                  </div>
                </div>
              </div>

              <Button type="button" className="w-full h-14 bg-indigo-600 text-lg font-bold rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all" onClick={(e) => { e.preventDefault(); onStart('founders_combo'); }}>
                {t.hero.offer_card.cta}
              </Button>
              <p className="mt-4 text-center text-xs font-bold text-slate-400">{t.hero.offer_card.disclaimer}</p>
            </div>

            {/* Background Decor */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[3rem] opacity-20 blur-2xl -z-10"></div>
          </motion.div>
        </div>
      </section>

      {/* Bento Features "Hybrid Power" */}
      <section id="features" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-3 md:grid-rows-2 gap-6 h-auto">
            <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <div className="h-14 w-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                  <Zap size={32} className="text-amber-400" />
                </div>
                <h3 className="text-3xl font-black mb-4">{t.features.hybrid.title}</h3>
                <p className="text-slate-400 text-lg max-w-md font-medium">{t.features.hybrid.text}</p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 scale-150 translate-x-10 translate-y-10 group-hover:scale-125 transition-transform duration-700">
                <PhoneCall size={300} />
              </div>
            </div>

            <div className="bg-indigo-50 rounded-[2.5rem] p-10 border border-indigo-100 flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
                  <Users size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{t.features.fraud.title}</h3>
                <p className="text-slate-500 text-sm font-bold">{t.features.fraud.text}</p>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-[2.5rem] p-10 border border-emerald-100 flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-200">
                  <MessageSquare size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{t.features.mms.title}</h3>
                <p className="text-slate-500 text-sm font-bold">{t.features.mms.text}</p>
              </div>
            </div>

            <div className="md:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-slate-900 mb-4">{t.features.dialer.title}</h3>
                <p className="text-slate-500 font-medium mb-6">{t.features.dialer.text}</p>
                <div className="inline-flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-lg">
                  <Check size={16} /> {t.features.dialer.badge}
                </div>
              </div>
              <div className="w-full md:w-1/3 aspect-video bg-indigo-900 rounded-2xl shadow-2xl skew-x-[-3deg] md:skew-x-[-6deg] origin-bottom-right"></div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW PRICING SECTION (Replacing old Pricing & Calculator) */}
      <PricingSection onStart={onStart} />

      {/* Footer */}
      <footer className="bg-slate-900 py-20 text-white border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-8">
              <span className="text-xl font-black tracking-tighter uppercase text-white">Cleanlydash</span>
            </div>
            <p className="text-slate-400 max-w-sm font-medium">
              {t.footer.tag}
            </p>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest text-indigo-400 mb-6">Platform</h4>
            <ul className="space-y-4 text-slate-400 text-sm font-bold">
              <li>Features</li>
              <li>Founder's Club</li>
              <li>Login</li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest text-indigo-400 mb-6">Legal</h4>
            <ul className="space-y-4 text-slate-400 text-sm font-bold">
              <li>Terms of Use</li>
              <li>Privacy</li>
              <li>SLA</li>
            </ul>
          </div>
        </div>
        <div className="text-center pt-20 mt-20 border-t border-white/5 text-slate-600 text-xs font-bold uppercase tracking-widest">
          {t.footer.rights}
        </div>
      </footer>

      {/* Details Modal */}
      <PlanDetailsModal
        planId={detailPlanId}
        onClose={() => setDetailPlanId(null)}
        onSelect={(pid) => {
          setDetailPlanId(null);
          onStart(pid);
        }}
      />
    </div>
  );
};

// Helper Component for Pricing Cards
// Helper Component for Pricing Cards
const PricingCard = ({ title, price, cents, features, highlight, badge, desc, onCta, onViewDetails }: any) => (
  <div
    className={`relative p-8 rounded-[2rem] flex flex-col h-full transition-all group ${highlight ? 'bg-slate-900 text-white shadow-2xl shadow-indigo-900/20 scale-105 z-10' : 'bg-white text-slate-900 shadow-xl border border-slate-100'}`}
  >
    {badge && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
        {badge}
      </div>
    )}
    <div className="mb-6 cursor-pointer" onClick={onViewDetails}>
      <div className="flex justify-between items-start">
        <h3 className={`text-xl font-black mb-2 hover:underline decoration-dash ${highlight ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
        <div className={`p-1 rounded-full ${highlight ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}>
          <Info size={16} />
        </div>
      </div>
      <p className={`text-sm font-medium ${highlight ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
    </div>
    <div className="mb-8 cursor-pointer" onClick={onViewDetails}>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold opacity-50">$</span>
        <span className={`text-5xl font-black ${highlight ? 'text-white' : 'text-slate-900'}`}>{price}</span>
        {cents && <span className="text-2xl font-bold opacity-50">.{cents}</span>}
        <span className="text-sm font-bold opacity-50">/mo</span>
      </div>
    </div>
    <ul className="space-y-4 mb-8 flex-1 cursor-pointer" onClick={onViewDetails}>
      {features.map((feat: string, i: number) => (
        <li key={i} className="flex items-center gap-3 text-sm font-bold">
          <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${highlight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <Check size={10} strokeWidth={4} />
          </div>
          <span className={highlight ? 'text-slate-300' : 'text-slate-600'}>{feat}</span>
        </li>
      ))}
      <li className={`text-xs font-bold uppercase tracking-widest mt-4 ${highlight ? 'text-indigo-400' : 'text-indigo-600'} flex items-center gap-1`}>
        View Full Specs <ArrowRight size={12} />
      </li>
    </ul>
    <Button
      onClick={(e) => {
        e.stopPropagation();
        onCta();
      }}
      className={`w-full h-12 rounded-xl font-bold transition-all ${highlight ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
    >
      {highlight ? 'Start Now' : 'Join Waitlist'}
    </Button>
  </div>
);