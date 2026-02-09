import React, { useState, useEffect } from 'react';
import { Building, Mail, Phone, MapPin, Save, Loader2, Globe, FileText, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { InternationalPhoneInput } from './ui/InternationalPhoneInput';
import { AddressAutocomplete } from './ui/AddressAutocomplete';
import { createClient } from '../lib/supabase/client';
import { toast } from 'sonner';
import { getTimezoneFromCoords, formatTimezoneDisplay, IANA_TIMEZONES } from '../lib/timezone-utils';
import { cn } from '@/lib/utils';
import { useTimezone } from '../contexts/TimezoneContext';

interface TenantProfileData {
    name: string;
    slug: string;
    logo_url: string | null;
    email: string;
    phone: string;
    address: string;
    company_lat: number | null;
    company_lng: number | null;
    timezone: string;
    time_format: '12h' | '24h';
    ein: string;
    business_type: string;
    business_hours: {
        start: string;
        end: string;
        days: number[];
    };
}

const TIME_OPTIONS = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

const formatTimeOption = (timeStr: string, format?: '12h' | '24h') => {
    if (format === '24h') return timeStr;
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${period}`;
};

export const TenantProfile: React.FC = () => {
    const supabase = createClient();
    const { refresh } = useTimezone();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [detectingTimezone, setDetectingTimezone] = useState(false);
    const [profile, setProfile] = useState<TenantProfileData>({
        name: '',
        slug: '',
        logo_url: null,
        email: '',
        phone: '',
        address: '',
        company_lat: null,
        company_lng: null,
        timezone: 'America/New_York',
        time_format: '12h',
        ein: '',
        business_type: '',
        business_hours: { start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] }
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch tenant_id from team_members like TimezoneContext does
                const { data: member } = await supabase
                    .from('team_members')
                    .select('tenant_id')
                    .eq('user_id', user.id)
                    .single();

                const tenantId = member?.tenant_id || user.id; // Fallback to user.id if not found (e.g. owner)

                const { data, error } = await supabase
                    .from('tenant_profiles')
                    .select('*')
                    .eq('id', tenantId)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error);
                }

                if (data) {
                    setProfile({
                        name: (data as any).name || '',
                        slug: (data as any).slug || '',
                        logo_url: (data as any).logo_url || null,
                        email: (data as any).email || '',
                        phone: (data as any).phone || '',
                        address: (data as any).address || '',
                        company_lat: (data as any).company_lat || null,
                        company_lng: (data as any).company_lng || null,
                        timezone: (data as any).timezone || 'America/New_York',
                        time_format: (data as any).time_format || '12h',
                        ein: (data as any).ein || '',
                        business_type: (data as any).business_type || '',
                        business_hours: data.business_hours
                            ? (Object.keys(data.business_hours).some(k => !isNaN(Number(k)))
                                ? data.business_hours
                                : {
                                    // Convert legacy to new format on load
                                    ...[0, 1, 2, 3, 4, 5, 6].reduce((acc, day) => ({
                                        ...acc,
                                        [day]: {
                                            start: (data.business_hours as any).start?.slice(0, 5) || '08:00',
                                            end: (data.business_hours as any).end?.slice(0, 5) || '18:00',
                                            active: (data.business_hours as any).days?.includes(day) || false
                                        }
                                    }), {})
                                })
                            : {
                                // Default new format
                                ...[0, 1, 2, 3, 4, 5, 6].reduce((acc, day) => ({
                                    ...acc,
                                    [day]: { start: '08:00', end: '18:00', active: day !== 0 && day !== 6 }
                                }), {})
                            }
                    });
                }
            } catch (err) {
                console.error('Failed to load profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // Handle address selection with timezone detection
    const handleAddressChange = async (address: string, lat: number | null, lng: number | null) => {
        setProfile(prev => ({ ...prev, address, company_lat: lat, company_lng: lng }));

        if (lat && lng) {
            setDetectingTimezone(true);
            try {
                const detectedTimezone = await getTimezoneFromCoords(lat, lng);
                setProfile(prev => ({ ...prev, timezone: detectedTimezone }));
                toast.success(`Timezone detected: ${detectedTimezone}`);
            } catch (error) {
                console.error('Failed to detect timezone:', error);
            } finally {
                setDetectingTimezone(false);
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: member } = await supabase
                .from('team_members')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single();

            const tenantId = member?.tenant_id || user.id;

            const { error } = await supabase
                .from('tenant_profiles')
                .update({
                    name: profile.name,
                    // Note: slug is not editable
                    email: profile.email,
                    phone: profile.phone,
                    address: profile.address,
                    company_lat: profile.company_lat,
                    company_lng: profile.company_lng,
                    timezone: profile.timezone,
                    ein: profile.ein,
                    business_type: profile.business_type,
                    business_hours: profile.business_hours
                } as any)
                .eq('id', tenantId);

            if (error) throw error;
            toast.success('Profile updated successfully!');
            // Reload context with optimistic data for instant update
            await refresh({
                businessHours: profile.business_hours as any,
                timezone: profile.timezone
            });
        } catch (err: any) {
            toast.error(err.message || 'Error saving profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Building size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Company Profile</h2>
                    <p className="text-sm text-slate-500">Manage your business information</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Name</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                className="pl-10"
                                placeholder="My Company LLC"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Slug (URL)</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                value={profile.slug}
                                disabled
                                className="pl-10 bg-slate-50 text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-slate-400">Auto-generated. Invite link: /{profile.slug}/join</p>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="border-t pt-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Contact Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Business Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="pl-10"
                                    placeholder="contact@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</label>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Company Phone</label>
                                <InternationalPhoneInput
                                    value={profile.phone}
                                    onChange={(val) => setProfile({ ...profile, phone: val })}
                                    placeholder="Phone number"
                                    defaultCountry="BR"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address with Autocomplete */}
                    <div className="space-y-2 mt-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Address</label>
                        <AddressAutocomplete
                            value={profile.address}
                            onChange={handleAddressChange}
                            placeholder="Start typing your address..."
                        />
                        <p className="text-xs text-slate-400">
                            Type and select your address to auto-detect timezone
                        </p>
                    </div>

                    {/* Timezone Selection */}
                    <div className="space-y-2 mt-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Timezone</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                            <select
                                value={profile.timezone}
                                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                                className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                disabled={detectingTimezone}
                            >
                                {detectingTimezone ? (
                                    <option>Detectando...</option>
                                ) : (
                                    IANA_TIMEZONES.map(tz => (
                                        <option key={tz.value} value={tz.value}>
                                            {tz.label}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <p className="text-xs text-slate-400">
                            Fuso horário oficial da empresa. Todos os agendamentos e automações seguirão este horário.
                        </p>
                    </div>

                </div>

                {/* Business Details */}
                <div className="border-t pt-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Business Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">EIN / Tax ID</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    value={profile.ein}
                                    onChange={(e) => setProfile({ ...profile, ein: e.target.value })}
                                    className="pl-10"
                                    placeholder="XX-XXXXXXX"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Business Type</label>
                            <select
                                value={profile.business_type}
                                onChange={(e) => setProfile({ ...profile, business_type: e.target.value })}
                                className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select...</option>
                                <option value="hotel">Hotel / Resort</option>
                                <option value="vacation_rental">Vacation Rental</option>
                                <option value="property_manager">Property Management</option>
                                <option value="cleaning_company">Cleaning Service</option>
                                <option value="hospitality">Hospitality Services</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Business Hours */}
                <div className="border-t pt-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-700">Business Hours (Per Day)</h3>
                    </div>

                    <div className="space-y-3">
                        {[
                            { id: 1, label: 'Monday' },
                            { id: 2, label: 'Tuesday' },
                            { id: 3, label: 'Wednesday' },
                            { id: 4, label: 'Thursday' },
                            { id: 5, label: 'Friday' },
                            { id: 6, label: 'Saturday' },
                            { id: 0, label: 'Sunday' },
                        ].map((day) => {
                            const config = (profile.business_hours as any)?.[day.id] || { start: '08:00', end: '18:00', active: day.id !== 0 && day.id !== 6 };

                            const updateDay = (updates: any) => {
                                setProfile(prev => ({
                                    ...prev,
                                    business_hours: {
                                        ...(prev.business_hours as any),
                                        [day.id]: { ...config, ...updates }
                                    }
                                }));
                            };

                            return (
                                <div key={day.id} className={cn(
                                    "flex items-center gap-4 p-3 rounded-xl border transition-all",
                                    config.active ? "bg-white border-slate-200" : "bg-slate-50 border-transparent opacity-60"
                                )}>
                                    <div className="flex items-center gap-3 min-w-[120px]">
                                        <button
                                            onClick={() => updateDay({ active: !config.active })}
                                            className={cn(
                                                "w-10 h-5 rounded-full relative transition-colors",
                                                config.active ? "bg-indigo-600" : "bg-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                                config.active ? "left-6" : "left-1"
                                            )} />
                                        </button>
                                        <span className="text-xs font-bold text-slate-700">{day.label}</span>
                                    </div>

                                    {config.active ? (
                                        <div className="flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                            <select
                                                value={config.start}
                                                onChange={(e) => {
                                                    if (e.target.value >= config.end) {
                                                        toast.error('Start must be before end');
                                                        return;
                                                    }
                                                    updateDay({ start: e.target.value });
                                                }}
                                                className="flex-1 h-9 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                                            >
                                                {TIME_OPTIONS.map(time => (
                                                    <option key={time} value={time}>{formatTimeOption(time)}</option>
                                                ))}
                                            </select>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">to</span>
                                            <select
                                                value={config.end}
                                                onChange={(e) => {
                                                    if (e.target.value <= config.start) {
                                                        toast.error('End must be after start');
                                                        return;
                                                    }
                                                    updateDay({ end: e.target.value });
                                                }}
                                                className="flex-1 h-9 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                                            >
                                                {TIME_OPTIONS.map(time => (
                                                    <option key={time} value={time}>{formatTimeOption(time)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 uppercase italic">Closed</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                        <span className="font-bold text-indigo-500 uppercase mr-1">Note:</span>
                        The calendar timeline will adjust to match the widest range configured above. Employees cannot set availability outside these hours for active days.
                    </p>
                </div>

                {/* Save Button */}
                <div className="border-t pt-6 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8"
                    >
                        {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};
