
export interface PlanFeature {
    id: string;
    label: string;
    category: 'management' | 'telephony' | 'finance' | 'guest_experience' | 'operations';
    premium?: boolean;
    description?: string;
}

export const PLAN_FEATURES: PlanFeature[] = [
    // Management
    { id: 'direct_booking', label: 'Direct Booking Website', category: 'management', premium: true },
    { id: 'channel_manager', label: 'Channel Manager (Airbnb, VRBO)', category: 'management', premium: true },
    { id: 'multi_calendar', label: 'Multi-Calendar Sync (iCal/OTA)', category: 'management' },
    { id: 'unified_inbox', label: 'Unified Inbox', category: 'management' },

    // Guest Experience
    { id: 'digital_guidebooks', label: 'Digital Guidebooks', category: 'guest_experience', premium: true },
    { id: 'guest_reviews', label: 'Automated Guest Reviews', category: 'guest_experience', premium: true },
    { id: 'checkin_instructions', label: 'Automated Check-in Instructions', category: 'guest_experience' },

    // Operations
    { id: 'visual_checklists', label: 'Visual Checklists & Inventory', category: 'operations', premium: true },
    { id: 'maintenance_tracking', label: 'Maintenance Tracking', category: 'operations' },
    { id: 'supply_management', label: 'Supply Management', category: 'operations' },
    { id: 'cleaner_app', label: 'Cleaner Mobile App', category: 'operations' },

    // Telephony
    { id: 'global_dialer', label: 'Global Floating Dialer', category: 'telephony', premium: true },
    { id: 'call_recording', label: 'Call Recording & Transcription', category: 'telephony', premium: true },
    { id: 'ivr', label: 'IVR (Auto-Attendant)', category: 'telephony' },
    { id: 'sms_mms', label: 'SMS & MMS Support', category: 'telephony' },

    // Finance
    { id: 'financial_reports', label: 'Financial Reports', category: 'finance' },
    { id: 'expense_tracking', label: 'Expense Tracking', category: 'finance' },
    { id: 'owner_access', label: 'Owner Portal Access', category: 'finance', premium: true },
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
