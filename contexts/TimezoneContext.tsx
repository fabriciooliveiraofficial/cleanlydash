import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRole } from '../hooks/use-role';
import { getZonedNow, formatInTZ } from '../lib/timezone-utils';

interface TimezoneContextType {
    timezone: string;
    isLoaded: boolean;
    now: Date;
    formatTime: (date: Date | string | number, formatStr: string) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const TimezoneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { tenant_id, loading: roleLoading } = useRole();
    const [timezone, setTimezone] = useState<string>('America/New_York');
    const [isLoaded, setIsLoaded] = useState(false);
    const [now, setNow] = useState<Date>(new Date());
    const supabase = createClient();

    useEffect(() => {
        const fetchTimezone = async () => {
            if (roleLoading || !tenant_id) return;

            try {
                const { data, error } = await supabase
                    .from('tenant_profiles')
                    .select('timezone')
                    .eq('id', tenant_id)
                    .single();

                if (error) {
                    console.error('Error fetching timezone:', error);
                } else if (data?.timezone) {
                    setTimezone(data.timezone);
                }
            } catch (err) {
                console.error('Failed to load timezone context:', err);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchTimezone();
    }, [tenant_id, roleLoading]);

    // Update "now" every minute
    useEffect(() => {
        const updateNow = () => setNow(getZonedNow(timezone));
        updateNow();
        const interval = setInterval(updateNow, 60000);
        return () => clearInterval(interval);
    }, [timezone]);

    const formatTime = (date: Date | string | number, formatStr: string) => {
        return formatInTZ(date, timezone, formatStr);
    };

    return (
        <TimezoneContext.Provider value={{ timezone, isLoaded, now, formatTime }}>
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
