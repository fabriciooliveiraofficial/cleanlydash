
export interface PlanFeature {
    id: string;
    label: {
        en: string;
        pt: string;
        es: string;
    };
    category: 'management' | 'telephony' | 'finance' | 'guest_experience' | 'operations';
    premium?: boolean;
    description?: string;
}

export const PLAN_FEATURES: PlanFeature[] = [
    // Management
    { id: 'direct_booking', label: { en: 'Direct Booking Website', pt: 'Site de Reservas Diretas', es: 'Sitio de Reservas Directas' }, category: 'management', premium: true },
    { id: 'channel_manager', label: { en: 'Channel Manager (Airbnb, VRBO)', pt: 'Gestor de Canais (Airbnb, VRBO)', es: 'Gestor de Canales (Airbnb, VRBO)' }, category: 'management', premium: true },
    { id: 'multi_calendar', label: { en: 'Multi-Calendar Sync (iCal/OTA)', pt: 'Sincronização Multi-Calendário', es: 'Sincronización Multi-Calendario' }, category: 'management' },
    { id: 'unified_inbox', label: { en: 'Unified Inbox', pt: 'Caixa de Entrada Unificada', es: 'Bandeja de Entrada Unificada' }, category: 'management' },

    // Guest Experience
    { id: 'digital_guidebooks', label: { en: 'Digital Guidebooks', pt: 'Guias Digitais', es: 'Guías Digitales' }, category: 'guest_experience', premium: true },
    { id: 'guest_reviews', label: { en: 'Automated Guest Reviews', pt: 'Avaliações Automáticas', es: 'Reseñas Automáticas' }, category: 'guest_experience', premium: true },
    { id: 'checkin_instructions', label: { en: 'Automated Check-in Instructions', pt: 'Instruções de Check-in Automáticas', es: 'Instrucciones de Check-in Automáticas' }, category: 'guest_experience' },

    // Operations
    { id: 'visual_checklists', label: { en: 'Visual Checklists & Inventory', pt: 'Checklists Visuais e Inventário', es: 'Checklists Visuales e Inventario' }, category: 'operations', premium: true },
    { id: 'maintenance_tracking', label: { en: 'Maintenance Tracking', pt: 'Rastreamento de Manutenção', es: 'Rastreo de Mantenimiento' }, category: 'operations' },
    { id: 'supply_management', label: { en: 'Supply Management', pt: 'Gestão de Suprimentos', es: 'Gestión de Suministros' }, category: 'operations' },
    { id: 'cleaner_app', label: { en: 'Cleaner Mobile App', pt: 'App Mobile para Equipe', es: 'App Móvil para Equipo' }, category: 'operations' },

    // Telephony
    { id: 'global_dialer', label: { en: 'Global Floating Dialer', pt: 'Dialer Flutuante Global', es: 'Marcador Flotante Global' }, category: 'telephony', premium: true },
    { id: 'call_recording', label: { en: 'Call Recording & Transcription', pt: 'Gravação e Transcrição de Chamadas', es: 'Grabación y Transcripción de Llamadas' }, category: 'telephony', premium: true },
    { id: 'ivr', label: { en: 'IVR (Auto-Attendant)', pt: 'URA (Atendimento Automático)', es: 'IVR (Operadora Automática)' }, category: 'telephony' },
    { id: 'sms_mms', label: { en: 'SMS & MMS Support', pt: 'Suporte SMS e MMS', es: 'Soporte SMS y MMS' }, category: 'telephony' },

    // Finance
    { id: 'financial_reports', label: { en: 'Financial Reports', pt: 'Relatórios Financeiros', es: 'Reportes Financieros' }, category: 'finance' },
    { id: 'expense_tracking', label: { en: 'Expense Tracking', pt: 'Rastreamento de Despesas', es: 'Rastreo de Gastos' }, category: 'finance' },
    { id: 'owner_access', label: { en: 'Owner Portal Access', pt: 'Acesso ao Portal do Proprietário', es: 'Acceso al Portal del Propietario' }, category: 'finance', premium: true },
];

export const PLAN_CONFIGS: Record<string, { users: number; features: string[] }> = {
    'solopreneur_combo': {
        users: 1,
        features: ['multi_calendar', 'unified_inbox', 'checkin_instructions', 'cleaner_app', 'global_dialer', 'sms_mms', 'financial_reports']
    },
    'founders_combo': {
        users: 3,
        features: [
            // All Features + Premium
            'direct_booking', 'channel_manager', 'multi_calendar', 'unified_inbox',
            'digital_guidebooks', 'guest_reviews', 'checkin_instructions',
            'visual_checklists', 'maintenance_tracking', 'supply_management', 'cleaner_app',
            'global_dialer', 'call_recording', 'ivr', 'sms_mms',
            'financial_reports', 'expense_tracking', 'owner_access'
        ]
    },
    'growth_team_combo': {
        users: 5,
        features: [
            'multi_calendar', 'unified_inbox', 'checkin_instructions', 'maintenance_tracking', 'cleaner_app',
            'global_dialer', 'sms_mms', 'financial_reports', 'expense_tracking', 'owner_access'
        ]
    },
    // System Plans
    'system_essentials': { users: 2, features: ['multi_calendar', 'unified_inbox', 'checkin_instructions'] },
    'system_business': { users: 5, features: ['multi_calendar', 'unified_inbox', 'owner_access', 'financial_reports'] },
    // Telephony
    'voice_starter': { users: 1, features: ['global_dialer', 'sms_mms'] },
    'voice_pro': { users: 3, features: ['global_dialer', 'sms_mms', 'call_recording'] },
};
