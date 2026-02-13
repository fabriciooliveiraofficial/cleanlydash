import { useState, useEffect } from 'react';
import { toZonedTime } from 'date-fns-tz';

export function useTimezone() {
    // Default to system timezone or a specific app setting
    // For now, we'll use the browser's local timezone
    const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [now, setNow] = useState<Date>(new Date());

    useEffect(() => {
        // Update 'now' every minute to keep UI fresh without excessive re-renders
        const interval = setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    return {
        now,
        timezone,
        // Helper to get time in current timezone
        zonedNow: toZonedTime(now, timezone)
    };
}
