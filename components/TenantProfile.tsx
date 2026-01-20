import React, { useState, useEffect } from 'react';
import { Building, Mail, Phone, MapPin, Save, Loader2, Globe, FileText, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { InternationalPhoneInput } from './ui/InternationalPhoneInput';
import { AddressAutocomplete } from './ui/AddressAutocomplete';
import { createClient } from '../lib/supabase/client';
import { toast } from 'sonner';
import { getTimezoneFromCoords, formatTimezoneDisplay } from '../lib/timezone-utils';

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
    ein: string;
    business_type: string;
}

export const TenantProfile: React.FC = () => {
    const supabase = createClient();
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
        ein: '',
        business_type: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('tenant_profiles')
                    .select('*')
                    .eq('id', user.id)
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
                        ein: (data as any).ein || '',
                        business_type: (data as any).business_type || ''
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
                    business_type: profile.business_type
                } as any)
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Profile updated successfully!');
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

                    {/* Timezone Display (Read-only) */}
                    <div className="space-y-2 mt-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Timezone</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                value={detectingTimezone ? 'Detecting...' : formatTimezoneDisplay(profile.timezone)}
                                disabled
                                className="pl-10 bg-slate-50 text-slate-600 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            Auto-detected from address. Used for all booking times.
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
