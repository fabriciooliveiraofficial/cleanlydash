import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRole } from '../hooks/use-role';
import { getZonedNow, formatInTZ } from '../lib/timezone-utils';

interface BusinessHours {
    [key: number]: {
        start: string;
        end: string;
        active: boolean;
    };
}

interface TimezoneContextType {
    timezone: string;
    isLoaded: boolean;
    now: Date;
    formatTime: (date: Date | string | number, formatStr: string) => string;
    timeFormat: '12h' | '24h';
    businessHours: BusinessHours | null;
    formatWallTime: (hourOrDate: number | Date | string, minute?: number) => string;
    refresh: (optimisticData?: { businessHours?: BusinessHours, timezone?: string }) => Promise<void>;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const TimezoneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { tenant_id, loading: roleLoading } = useRole();
    const [timezone, setTimezone] = useState<string>('America/New_York');
    const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
    const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [now, setNow] = useState<Date>(new Date());
    const supabase = createClient();

    useEffect(() => {
        const fetchTenantConfig = async () => {
            if (roleLoading || !tenant_id) return;

            try {
                const { data, error } = await supabase
                    .from('tenant_profiles')
                    .select('timezone, business_hours') // Removed time_format as it causes column does not exist error
                    .eq('id', tenant_id)
                    .single();

                if (error) {
                    console.error('Error fetching tenant config:', error);
                } else if (data) {
                    if (data.timezone) setTimezone(data.timezone);
                    // if (data.time_format) setTimeFormat(data.time_format as '12h' | '24h'); // Column missing

                    let normalizedHours: BusinessHours | null = null;
                    const rawHours: any = data.business_hours;

                    if (rawHours) {
                        // Check if it's the legacy format { start, end, days } or the new Per-Day format
                        // The new format has numeric keys (as string or number)
                        const hasNumericKeys = Object.keys(rawHours).some(k => !isNaN(Number(k)));

                        if (hasNumericKeys) {
                            normalizedHours = rawHours as BusinessHours;
                        } else if (rawHours.start && rawHours.end && Array.isArray(rawHours.days)) {
                            // Convert legacy format to Per-Day format
                            normalizedHours = {};
                            [0, 1, 2, 3, 4, 5, 6].forEach(day => {
                                normalizedHours![day] = {
                                    start: rawHours.start.slice(0, 5),
                                    end: rawHours.end.slice(0, 5),
                                    active: rawHours.days.includes(day)
                                };
                            });
                        }
                    }

                    if (normalizedHours) {
                        setBusinessHours(normalizedHours);
                    }
                }
            } catch (err) {
                console.error('Failed to load timezone context:', err);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchTenantConfig();
    }, [tenant_id, roleLoading]);

    const refresh = async (optimisticData?: { businessHours?: BusinessHours, timezone?: string }) => {
        // Optimistic Update
        if (optimisticData) {
            if (optimisticData.timezone) setTimezone(optimisticData.timezone);
            if (optimisticData.businessHours) setBusinessHours(optimisticData.businessHours);
        }

        setIsLoaded(false);

        if (!tenant_id) return;

        try {
            const { data, error } = await supabase
                .from('tenant_profiles')
                .select('timezone, business_hours')
                .eq('id', tenant_id)
                .single();

            if (data) {
                if (data.timezone) setTimezone(data.timezone);
                let normalizedHours: BusinessHours | null = null;
                const rawHours: any = data.business_hours;

                if (rawHours) {
                    const hasNumericKeys = Object.keys(rawHours).some(k => !isNaN(Number(k)));
                    if (hasNumericKeys) {
                        normalizedHours = rawHours as BusinessHours;
                    } else if (rawHours.start && rawHours.end && Array.isArray(rawHours.days)) {
                        normalizedHours = {};
                        [0, 1, 2, 3, 4, 5, 6].forEach(day => {
                            // @ts-ignore
                            normalizedHours![day] = {
                                start: rawHours.start.slice(0, 5),
                                end: rawHours.end.slice(0, 5),
                                active: rawHours.days.includes(day)
                            };
                        });
                    }
                }
                if (normalizedHours) setBusinessHours(normalizedHours);
            }
        } catch (e) { console.error(e) } finally { setIsLoaded(true); }
    };

    // Update "now" every minute
    useEffect(() => {
        const updateNow = () => setNow(new Date());
        updateNow();
        const interval = setInterval(updateNow, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (date: Date | string | number, formatStr: string) => {
        // Handle platform-standard time formatting
        if (formatStr === 'p_time') {
            const actualFormat = timeFormat === '12h' ? 'h:mm a' : 'HH:mm';
            return formatInTZ(date, timezone, actualFormat);
        }
        return formatInTZ(date, timezone, formatStr);
    };

    const formatWallTime = (hourOrDate: number | Date | string, minute: number = 0) => {
        let h: number;
        let m: number;

        if (typeof hourOrDate === 'number') {
            h = Math.floor(hourOrDate);
            m = Math.floor(minute);
        } else {
            // Handle both ISO strings and HH:mm strings
            let date: Date;
            if (typeof hourOrDate === 'string') {
                if (hourOrDate.includes('T')) {
                    date = new Date(hourOrDate);
                } else {
                    const [hourStr, minStr] = hourOrDate.split(':');
                    date = new Date();
                    date.setHours(parseInt(hourStr, 10), parseInt(minStr || '0', 10), 0, 0);
                }
            } else {
                date = hourOrDate;
            }
            h = date.getHours();
            m = date.getMinutes();
        }

        if (timeFormat === '24h') {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        } else {
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
        }
    };

    return (
        <TimezoneContext.Provider value={{ timezone, isLoaded, now, formatTime, formatWallTime, timeFormat, businessHours, refresh }}>
            {children}
        </TimezoneContext.Provider>
    );
};

export const useTimezone = () => {
    const context = useContext(TimezoneContext);
    if (context === undefined) {
        throw new Error('useTimezone must be used within a TimezoneProvider');
    }
    return context;
};

// Force HMR validation
