'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';

interface TenantTimezoneData {
    timezone: string;
    company_lat: number | null;
    company_lng: number | null;
}

/**
 * Hook to fetch and cache tenant timezone settings
 */
export function useTenantTimezone() {
    const [data, setData] = useState<TenantTimezoneData>({
        timezone: 'America/New_York',
        company_lat: null,
        company_lng: null
    });
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchTimezone = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase
                    .from('tenant_profiles')
                    .select('timezone, company_lat, company_lng')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setData({
                        timezone: (profile as any).timezone || 'America/New_York',
                        company_lat: (profile as any).company_lat || null,
                        company_lng: (profile as any).company_lng || null
                    });
                }
            } catch (error) {
                console.error('Error fetching tenant timezone:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTimezone();
    }, []);

    /**
     * Format a Date as local ISO string (without UTC conversion)
     */
    const toLocalISOString = (date: Date): string => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    /**
     * Format date for database storage using tenant timezone
     */
    const formatForDB = (date: Date): string => {
        return toLocalISOString(date);
    };

    return {
        timezone: data.timezone,
        company_lat: data.company_lat,
        company_lng: data.company_lng,
        loading,
        toLocalISOString,
        formatForDB
    };
}
