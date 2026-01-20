import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Check,
    Zap,
    MessageSquare,
    PhoneCall,
    Calendar,
    Shield,
    Wallet,
    Globe,
    Server,
    Cpu,
    Lock,
    ArrowRight,
    Play,
    Users,
    Briefcase,
    LayoutGrid,
    Smartphone,
    CreditCard
} from 'lucide-react';
import { Button } from './ui/button';
import { LanguageFloatingWidget, Language } from './LanguageFloatingWidget';

interface FeaturesPageProps {
    onBack: () => void;
    onStart: () => void;
}

const translations = {
    en: {
        header: {
            title: "Cleanlydash",
            back: "Back",
            cta: "Get Started"
        },
        hero: {
            tag: "The Operating System",
            title: "Power Beyond <br /> Scheduling.",
            subtitle: "Stop stitching together <span class='text-white'>Aircall</span>, <span class='text-white'>Guesty</span>, and <span class='text-white'>Slack</span>. Cleanlydash is the first hybrid platform built to run empires, not just listings."
        },
        sections: {
            inbox: {
                title: "Unified Inbox <br /><span class='text-blue-500'>& CRM</span>",
                desc: "One stream for SMS, Email, and Voice. Identify guests instantly, see their booking details while you chat, and manage relationships without tab-switching.",
                list: ['Universal Search', 'Guest Profiles', 'Interaction History'],
                cards: {
                    identity: { title: "Guest Identity", desc: "Automatic profile enrichment. Know who is calling before you pick up." },
                    omni: { title: "Omni-Channel", desc: "ALL in one place." },
                    context: { title: "Context-Aware", desc: "See current reservation status (Check-in, Check-out) right next to the chat." }
                }
            },
            ops: {
                tag: "Efficiency",
                title: "Operations Engine",
                desc: "Dispatch cleaners, track inventory, and verify job completion with GPS geofencing. It's not just a calendar; it's a command center.",
                cta: "Explore Ops",
                cleaner_status: "Cleaner Status",
                cards: {
                    sched: { title: "Drag & Drop Sched", desc: "Visual timeline for complex team coordination." },
                    proof: { title: "Photo Proof", desc: "Require photo upload before marking jobs as done." }
                }
            },
            ai: {
                tag: "The Crown Jewel",
                title: "AI Voice Telephony",
                desc: "Replace your reception desk with AI. Automatically answer FAQs, route calls, and transcribe voicemails.",
                cards: [
                    { title: "Live Transcription", desc: "Read voicemails as text in your inbox instantly." },
                    { title: "Smart Routing (IVR)", desc: "\"Press 1 for Maintenance, 2 for Bookings\"." },
                    { title: "Floating Dialer", desc: "Stay on the page while you talk. Full context preserved." }
                ]
            },
            kill_list: {
                title: "The \"Kill List\"",
                subtitle: "How many subscriptions can you cancel today?",
                table: {
                    feature: "Feature",
                    cleanly: "Cleanlydash",
                    stack: "The \"Stack\"",
                    rows: [
                        { name: "Property Management (PMS)", stack_cost: "$50/mo (Guesty)" },
                        { name: "Business Telephony (VoIP)", stack_cost: "$30/user (Aircall)" },
                        { name: "Team Scheduling", stack_cost: "$20/mo (When I Work)" },
                        { name: "Maintenance Tickets", stack_cost: "$40/mo (Breezeway)" },
                    ],
                    total: "Total Monthly Cost"
                }
            },
            matrix: {
                title: "Complete Feature Matrix",
                subtitle: "Every tool you need to scale, built-in.",
                categories: {
                    management: "Property & Rental Management",
                    operations: "Field Operations & Team",
                    finance: "Finance & Owner Relations",
                    tech: "Advanced Technology & AI"
                },
                features: {
                    multi_cal: "Multi-Calendar Sync (iCal/OTA)",
                    channel: "Channel Manager (Airbnb, VRBO)",
                    auto_review: "Automated Guest Reviews",
                    guidebooks: "Digital Guidebooks",
                    website: "Direct Booking Website",
                    gps: "GPS Geofencing Check-in",
                    checklist: "Visual Checklists & Inventory",
                    app: "Mobile App for Cleaners",
                    maint: "Maintenance Tracking",
                    supply: "Supply Management",
                    owner_portal: "Owner Portal & Login",
                    statements: "Automated Owner Statements",
                    payroll: "Cleaner Payroll Calculator",
                    expense: "Expense Tracking & ROI",
                    wallet: "Pre-paid Wallet System",
                    ai_voice: "AI Voice Receptionist",
                    ivr: "Visual IVR Builder",
                    sms: "2-Way SMS & MMS Marketing",
                    api: "Open API Access",
                    whitelabel: "White Label Options"
                }
            },
            footer: {
                title: "Ready to consolidate?",
                cta: "Start Founder's Plan"
            }
        }
    },
    pt: {
        header: {
            title: "Cleanlydash",
            back: "Voltar",
            cta: "Começar"
        },
        hero: {
            tag: "O Sistema Operacional",
            title: "Poder Além do <br /> Agendamento.",
            subtitle: "Pare de remendar <span class='text-white'>Aircall</span>, <span class='text-white'>Guesty</span> e <span class='text-white'>Slack</span>. Cleanlydash é a primeira plataforma híbrida feita para impérios, não apenas anúncios."
        },
        sections: {
            inbox: {
                title: "Inbox Unificado <br /><span class='text-blue-500'>& CRM</span>",
                desc: "Um fluxo para SMS, Email e Voz. Identifique hóspedes instantaneamente, veja detalhes da reserva enquanto conversa e gerencie relacionamentos sem trocar de aba.",
                list: ['Busca Universal', 'Perfis de Hóspedes', 'Histórico de Interação'],
                cards: {
                    identity: { title: "Identidade do Hóspede", desc: "Enriquecimento automático de perfil. Saiba quem liga antes de atender." },
                    omni: { title: "Omni-Channel", desc: "TUDO em um só lugar." },
                    context: { title: "Contexto Real", desc: "Veja status da reserva (Check-in, Check-out) ao lado do chat." }
                }
            },
            ops: {
                tag: "Eficiência",
                title: "Motor de Operações",
                desc: "Despache faxineiros, rastreie inventário e verifique conclusões com GPS. Não é só um calendário; é um centro de comando.",
                cta: "Explorar Ops",
                cleaner_status: "Status da Equipe",
                cards: {
                    sched: { title: "Agendamento Drag & Drop", desc: "Linha do tempo visual para coordenação complexa." },
                    proof: { title: "Prova Fotográfica", desc: "Exija upload de foto antes de concluir serviços." }
                }
            },
            ai: {
                tag: "A Joia da Coroa",
                title: "Telefonia por Voz IA",
                desc: "Substitua sua recepção por IA. Responda FAQs automaticamente, roteie chamadas e transcreva correios de voz.",
                cards: [
                    { title: "Transcrição ao Vivo", desc: "Leia voicemails como texto instantaneamente." },
                    { title: "Roteamento Inteligente (URA)", desc: "\"Disque 1 para Manutenção, 2 para Reservas\"." },
                    { title: "Dialer Flutuante", desc: "Fique na página enquanto fala. Contexto preservado." }
                ]
            },
            kill_list: {
                title: "A \"Lista de Corte\"",
                subtitle: "Quantas assinaturas você pode cancelar hoje?",
                table: {
                    feature: "Recurso",
                    cleanly: "Cleanlydash",
                    stack: "A \"Pilha Antiga\"",
                    rows: [
                        { name: "Gestão de Propriedade (PMS)", stack_cost: "R$ 250/mês (Guesty)" },
                        { name: "Telefonia Comercial (VoIP)", stack_cost: "R$ 150/user (Aircall)" },
                        { name: "Agendamento de Equipe", stack_cost: "R$ 100/mês (When I Work)" },
                        { name: "Tickets de Manutenção", stack_cost: "R$ 200/mês (Breezeway)" },
                    ],
                    total: "Custo Mensal Total"
                }
            },
            matrix: {
                title: "Matriz Completa de Recursos",
                subtitle: "Cada ferramenta para escalar, integrada.",
                categories: {
                    management: "Gestão de Propriedade & Aluguel",
                    operations: "Operações de Campo & Equipe",
                    finance: "Finanças & Relação com Proprietário",
                    tech: "Tecnologia Avançada & IA"
                },
                features: {
                    multi_cal: "Sincronização Multi-Calendário (iCal/OTA)",
                    channel: "Channel Manager (Airbnb, VRBO)",
                    auto_review: "Avaliações Automáticas de Hóspedes",
                    guidebooks: "Guias Digitais (Guidebooks)",
                    website: "Site de Reservas Diretas",
                    gps: "Check-in via GPS Geofencing",
                    checklist: "Checklists Visuais e Inventário",
                    app: "App Móvel para Faxineiros",
                    maint: "Rastreamento de Manutenção",
                    supply: "Gestão de Suprimentos",
                    owner_portal: "Portal e Login do Proprietário",
                    statements: "Extratos Automáticos para Proprietários",
                    payroll: "Calculadora de Folha de Pagamento",
                    expense: "Rastreamento de Despesas e ROI",
                    wallet: "Sistema de Carteira Pré-paga",
                    ai_voice: "Recepcionista de Voz IA",
                    ivr: "Construtor Visual de URA",
                    sms: "Marketing SMS e MMS Bidirecional",
                    api: "Acesso API Aberta",
                    whitelabel: "Opções White Label"
                }
            },
            footer: {
                title: "Pronto para consolidar?",
                cta: "Começar Plano Founder"
            }
        }
    },
    es: {
        header: {
            title: "Cleanlydash",
            back: "Volver",
            cta: "Empezar"
        },
        hero: {
            tag: "El Sistema Operativo",
            title: "Poder Más Allá <br /> de la Agenda.",
            subtitle: "Deja de remendar <span class='text-white'>Aircall</span>, <span class='text-white'>Guesty</span> y <span class='text-white'>Slack</span>. Cleanlydash es la primera plataforma híbrida construida para imperios, no solo listados."
        },
        sections: {
            inbox: {
                title: "Buzón Unificado <br /><span class='text-blue-500'>& CRM</span>",
                desc: "Un flujo para SMS, Email y Voz. Identifica huéspedes al instante, ve detalles de la reserva mientras chateas y gestiona relaciones sin cambiar de pestaña.",
                list: ['Búsqueda Universal', 'Perfiles de Huéspedes', 'Historial de Interacción'],
                cards: {
                    identity: { title: "Identidad del Huésped", desc: "Enriquecimiento automático de perfil." },
                    omni: { title: "Omni-Canal", desc: "TODO en un solo lugar." },
                    context: { title: "Contexto Real", desc: "Ve estado de reserva junto al chat." }
                }

            },
            ops: {
                tag: "Eficiencia",
                title: "Motor de Operaciones",
                desc: "Despacha limpiadores, rastrea inventario y verifica finalización con GPS.",
                cta: "Explorar Ops",
                cleaner_status: "Estado del Equipo",
                cards: {
                    sched: { title: "Agenda Drag & Drop", desc: "Línea de tiempo visual." },
                    proof: { title: "Prueba Fotográfica", desc: "Requiere foto antes de finalizar." }
                }
            },
            ai: {
                tag: "La Joya de la Corona",
                title: "Telefonía por Voz IA",
                desc: "Reemplaza tu recepción con IA. Responde FAQs, enruta llamadas y transcribe correos de voz.",
                cards: [
                    { title: "Transcripción en Vivo", desc: "Lee voicemails como texto." },
                    { title: "Enrutamiento Inteligente", desc: "\"Presione 1 para Mantenimiento\"." },
                    { title: "Dialer Flotante", desc: "Mantente en la página mientras hablas." }
                ]
            },
            kill_list: {
                title: "La \"Lista de Corte\"",
                subtitle: "¿Cuántas suscripciones puedes cancelar hoy?",
                table: {
                    feature: "Característica",
                    cleanly: "Cleanlydash",
                    stack: "La \"Pila Antigua\"",
                    rows: [
                        { name: "Gestión de Propiedad (PMS)", stack_cost: "$50/mo (Guesty)" },
                        { name: "Telefonía de Negocios (VoIP)", stack_cost: "$30/user (Aircall)" },
                        { name: "Programación de Equipo", stack_cost: "$20/mo (When I Work)" },
                        { name: "Tickets de Mantenimiento", stack_cost: "$40/mo (Breezeway)" },
                    ],
                    total: "Costo Mensual Total"
                }
            },
            matrix: {
                title: "Matriz Completa de Recursos",
                subtitle: "Cada herramienta para escalar, integrada.",
                categories: {
                    management: "Gestión de Propiedad & Alquiler",
                    operations: "Operaciones de Campo & Equipo",
                    finance: "Finanzas & Relación con Propietario",
                    tech: "Tecnología Avanzada & IA"
                },
                features: {
                    multi_cal: "Sincronización Multi-Calendario",
                    channel: "Channel Manager (Airbnb, VRBO)",
                    auto_review: "Reseñas Automáticas",
                    guidebooks: "Guías Digitales",
                    website: "Sitio de Reservas Directas",
                    gps: "Check-in vía GPS Geofencing",
                    checklist: "Checklists Visuales e Inventario",
                    app: "App Móvil para Limpiadores",
                    maint: "Rastreo de Mantenimiento",
                    supply: "Gestión de Suministros",
                    owner_portal: "Portal y Login del Propietario",
                    statements: "Extractos Automáticos",
                    payroll: "Calculadora de Nómina",
                    expense: "Rastreo de Gastos y ROI",
                    wallet: "Sistema de Billetera Prepaga",
                    ai_voice: "Recepcionista de Voz IA",
                    ivr: "Constructor Visual de IVR",
                    sms: "Marketing SMS y MMS",
                    api: "Acceso API Abierta",
                    whitelabel: "Opciones Marca Blanca"
                }
            },
            footer: {
                title: "¿Listo para consolidar?",
                cta: "Empezar Plan Founder"
            }
        }
    }
};

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onBack, onStart }) => {
    const [lang, setLang] = useState<Language>('en');
    const t = translations[lang];

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
            {/* Language Widget */}
            <LanguageFloatingWidget currentLang={lang} onLanguageChange={setLang} variant="dark" />

            {/* Header */}
            <header className="fixed top-0 z-50 w-full glass border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full">
                            <ChevronLeft size={24} />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-indigo-600 p-1.5 text-white shadow-lg shadow-indigo-500/20">
                                <Globe size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-lg font-black tracking-tighter uppercase text-white hidden sm:block">{t.header.title}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button onClick={onStart} className="rounded-full bg-indigo-600 font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all px-6">
                            {t.header.cta}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
                <div className="mx-auto max-w-7xl px-6 text-center">
                    <motion.div
                        key={lang}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6 backdrop-blur-md">
                            {t.hero.tag}
                        </span>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent" dangerouslySetInnerHTML={{ __html: t.hero.title }}></h1>
                        <p className="max-w-2xl mx-auto text-xl text-slate-400 font-medium leading-relaxed mb-10" dangerouslySetInnerHTML={{ __html: t.hero.subtitle }}></p>
                    </motion.div>
                </div>
            </section>

            {/* Feature Deep Dives - Bento Grids */}
            <div className="space-y-32 pb-32">

                {/* 1. UNIFIED INBOX & CRM */}
                <section className="mx-auto max-w-7xl px-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 flex flex-col justify-center">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                                <MessageSquare size={24} />
                            </div>
                            <h2 className="text-4xl font-black mb-4" dangerouslySetInnerHTML={{ __html: t.sections.inbox.title }}></h2>
                            <p className="text-slate-400 text-lg leading-relaxed mb-8">{t.sections.inbox.desc}</p>
                            <ul className="space-y-3">
                                {t.sections.inbox.list.map(item => (
                                    <li key={item} className="flex items-center gap-3 text-sm font-bold text-slate-300">
                                        <Check size={16} className="text-blue-500" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                            {/* Card 1 */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="text-blue-400 mb-4"><Users size={28} /></div>
                                <h3 className="text-xl font-bold mb-2">{t.sections.inbox.cards.identity.title}</h3>
                                <p className="text-sm text-slate-400">{t.sections.inbox.cards.identity.desc}</p>
                            </div>
                            {/* Card 2 */}
                            <div className="bg-gradient-to-br from-blue-600/90 to-blue-800/90 rounded-3xl p-6 flex flex-col justify-between text-white shadow-2xl shadow-blue-900/50">
                                <div>
                                    <div className="bg-white/20 w-fit p-2 rounded-lg mb-4"><MessageSquare size={20} /></div>
                                    <h3 className="text-xl font-bold">{t.sections.inbox.cards.omni.title}</h3>
                                    <p className="text-sm opacity-80 mt-2">{t.sections.inbox.cards.omni.desc}</p>
                                </div>
                                <div className="text-6xl font-black opacity-20">ALL</div>
                            </div>
                            {/* Card 3 (Wide) */}
                            <div className="col-span-2 bg-slate-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold mb-2">{t.sections.inbox.cards.context.title}</h3>
                                    <p className="text-slate-400">{t.sections.inbox.cards.context.desc}</p>
                                </div>
                                <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity translate-y-10 translate-x-10">
                                    <Globe size={200} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. OPERATIONS ENGINE */}
                <section className="mx-auto max-w-7xl px-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-900/50 to-slate-900 border border-white/10 rounded-[3rem] p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center h-full">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
                                        <Zap size={14} /> {t.sections.ops.tag}
                                    </div>
                                    <h2 className="text-4xl font-black mb-6">{t.sections.ops.title}</h2>
                                    <p className="text-slate-300 font-medium leading-relaxed mb-8">{t.sections.ops.desc}</p>
                                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">{t.sections.ops.cta}</Button>
                                </div>
                                <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/10 backdrop-blur-md">
                                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                                        <span className="text-sm font-bold text-slate-300">{t.sections.ops.cleaner_status}</span>
                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Live</span>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { name: 'Maria S.', status: 'In Progress', time: '14:30' },
                                            { name: 'John D.', status: 'Completed', time: '12:15' },
                                            { name: 'Team Alpha', status: 'En Route', time: '--:--' }
                                        ].map((c, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                                    <span className="text-slate-200">{c.name}</span>
                                                </div>
                                                <span className="text-slate-500 font-mono">{c.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1 flex flex-col gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex-1">
                                <Calendar size={32} className="text-emerald-400 mb-4" />
                                <h3 className="text-xl font-bold mb-2">{t.sections.ops.cards.sched.title}</h3>
                                <p className="text-sm text-slate-400">{t.sections.ops.cards.sched.desc}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex-1">
                                <Check size={32} className="text-emerald-400 mb-4" />
                                <h3 className="text-xl font-bold mb-2">{t.sections.ops.cards.proof.title}</h3>
                                <p className="text-sm text-slate-400">{t.sections.ops.cards.proof.desc}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. AI & TELEPHONY */}
                <section className="mx-auto max-w-7xl px-6">
                    <div className="bg-gradient-to-b from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-[3rem] p-12 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-indigo-500/20 blur-[100px] -z-10"></div>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500 text-white text-xs font-black uppercase tracking-widest mb-8 shadow-lg shadow-indigo-500/20">
                            <Cpu size={14} /> {t.sections.ai.tag}
                        </div>

                        <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">{t.sections.ai.title}</h2>
                        <p className="max-w-2xl mx-auto text-xl text-indigo-200/80 mb-12">{t.sections.ai.desc}</p>

                        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-left">
                            {t.sections.ai.cards.map((card, i) => (
                                <div key={i} className="bg-slate-950/50 border border-indigo-500/20 p-6 rounded-2xl hover:border-indigo-500/50 transition-colors">
                                    <div className="text-indigo-400 mb-4 font-mono text-xs uppercase tracking-widest">Feature 0{i + 1}</div>
                                    <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                                    <p className="text-sm text-slate-400">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 4. COMPARISON TABLE */}
                <section className="mx-auto max-w-5xl px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black mb-4">{t.sections.kill_list.title}</h2>
                        <p className="text-slate-400">{t.sections.kill_list.subtitle}</p>
                    </div>
                    <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10 text-xs font-black uppercase tracking-widest text-slate-400">
                                    <th className="p-6">{t.sections.kill_list.table.feature}</th>
                                    <th className="p-6 text-center text-white bg-indigo-900/20">{t.sections.kill_list.table.cleanly}</th>
                                    <th className="p-6 text-center">{t.sections.kill_list.table.stack}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm font-medium">
                                {t.sections.kill_list.table.rows.map((row, i) => (
                                    <tr key={i}>
                                        <td className="p-6 text-slate-300">{row.name}</td>
                                        <td className="p-6 text-center bg-indigo-900/10 text-emerald-400"><Check size={20} className="mx-auto" /></td>
                                        <td className="p-6 text-center text-slate-500">{row.stack_cost}</td>
                                    </tr>
                                ))}
                                <tr className="bg-white/5 text-base font-bold">
                                    <td className="p-6">{t.sections.kill_list.table.total}</td>
                                    <td className="p-6 text-center bg-indigo-600 font-black text-white">$29.90</td>
                                    <td className="p-6 text-center text-rose-500 line-through decoration-2">$140.00+</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 5. COMPLETE FEATURE MATRIX (NEW) */}
                <section className="mx-auto max-w-7xl px-6">
                    <div className="text-center mb-16">
                        <span className="text-indigo-500 font-black tracking-widest uppercase text-xs">Everything Included</span>
                        <h2 className="text-4xl font-black mt-4 mb-4">{t.sections.matrix.title}</h2>
                        <p className="text-slate-400 text-lg">{t.sections.matrix.subtitle}</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Category 1: Management */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                                <LayoutGrid size={18} className="text-indigo-400" />
                                {t.sections.matrix.categories.management}
                            </h3>
                            <ul className="space-y-3">
                                <MatrixItem text={t.sections.matrix.features.multi_cal} />
                                <MatrixItem text={t.sections.matrix.features.channel} />
                                <MatrixItem text={t.sections.matrix.features.auto_review} />
                                <MatrixItem text={t.sections.matrix.features.guidebooks} />
                                <MatrixItem text={t.sections.matrix.features.website} />
                            </ul>
                        </div>
                        {/* Category 2: Ops */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                                <Briefcase size={18} className="text-emerald-400" />
                                {t.sections.matrix.categories.operations}
                            </h3>
                            <ul className="space-y-3">
                                <MatrixItem text={t.sections.matrix.features.gps} />
                                <MatrixItem text={t.sections.matrix.features.checklist} />
                                <MatrixItem text={t.sections.matrix.features.app} />
                                <MatrixItem text={t.sections.matrix.features.maint} />
                                <MatrixItem text={t.sections.matrix.features.supply} />
                            </ul>
                        </div>
                        {/* Category 3: Finance */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                                <Wallet size={18} className="text-amber-400" />
                                {t.sections.matrix.categories.finance}
                            </h3>
                            <ul className="space-y-3">
                                <MatrixItem text={t.sections.matrix.features.owner_portal} />
                                <MatrixItem text={t.sections.matrix.features.statements} />
                                <MatrixItem text={t.sections.matrix.features.payroll} />
                                <MatrixItem text={t.sections.matrix.features.expense} />
                                <MatrixItem text={t.sections.matrix.features.wallet} />
                            </ul>
                        </div>
                        {/* Category 4: Tech */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                                <Cpu size={18} className="text-purple-400" />
                                {t.sections.matrix.categories.tech}
                            </h3>
                            <ul className="space-y-3">
                                <MatrixItem text={t.sections.matrix.features.ai_voice} />
                                <MatrixItem text={t.sections.matrix.features.ivr} />
                                <MatrixItem text={t.sections.matrix.features.sms} />
                                <MatrixItem text={t.sections.matrix.features.api} />
                                <MatrixItem text={t.sections.matrix.features.whitelabel} />
                            </ul>
                        </div>
                    </div>
                </section>
            </div>

            {/* CTA Footer */}
            <section className="border-t border-white/10 py-20 bg-slate-950">
                <div className="mx-auto max-w-3xl text-center px-6">
                    <h2 className="text-4xl font-black mb-8">{t.sections.footer.title}</h2>
                    <Button
                        size="lg"
                        onClick={onStart}
                        className="h-16 px-10 text-xl font-bold bg-white text-slate-900 hover:bg-slate-200 rounded-full shadow-2xl shadow-indigo-500/20"
                    >
                        {t.sections.footer.cta}
                    </Button>
                </div>
            </section>
        </div>
    );
};

const MatrixItem = ({ text }: { text: string }) => (
    <li className="flex items-start gap-3 text-sm font-medium text-slate-400 group hover:text-white transition-colors">
        <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
            <Check size={10} />
        </div>
        {text}
    </li>
);
