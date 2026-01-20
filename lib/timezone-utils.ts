/**
 * Timezone Utilities
 * Provides functions for timezone detection and date formatting per tenant timezone
 */

// Common timezone data with UTC offsets
const TIMEZONE_OFFSETS: Record<string, { offset: number; label: string }> = {
    'America/Sao_Paulo': { offset: -3, label: 'Brasília (UTC-03:00)' },
    'America/New_York': { offset: -5, label: 'New York (UTC-05:00)' },
    'America/Chicago': { offset: -6, label: 'Chicago (UTC-06:00)' },
    'America/Denver': { offset: -7, label: 'Denver (UTC-07:00)' },
    'America/Los_Angeles': { offset: -8, label: 'Los Angeles (UTC-08:00)' },
    'America/Anchorage': { offset: -9, label: 'Alaska (UTC-09:00)' },
    'Pacific/Honolulu': { offset: -10, label: 'Hawaii (UTC-10:00)' },
    'Europe/London': { offset: 0, label: 'London (UTC+00:00)' },
    'Europe/Paris': { offset: 1, label: 'Paris (UTC+01:00)' },
    'Europe/Berlin': { offset: 1, label: 'Berlin (UTC+01:00)' },
    'Asia/Tokyo': { offset: 9, label: 'Tokyo (UTC+09:00)' },
    'Australia/Sydney': { offset: 11, label: 'Sydney (UTC+11:00)' },
};

/**
 * Get timezone from coordinates using local coordinate-based detection
 * No external API dependency - fully local calculation
 */
export async function getTimezoneFromCoords(lat: number, lng: number): Promise<string> {
    // US Timezones (primary market) - using latitude and longitude ranges
    if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) {
        // Eastern Time (roughly east of -85 longitude)
        if (lng > -85) return 'America/New_York';
        // Central Time (roughly between -85 and -100)
        if (lng > -100) return 'America/Chicago';
        // Mountain Time (roughly between -100 and -115)
        if (lng > -115) return 'America/Denver';
        // Pacific Time (west of -115)
        return 'America/Los_Angeles';
    }

    // Alaska
    if (lat >= 51 && lat <= 72 && lng >= -180 && lng <= -130) {
        return 'America/Anchorage';
    }

    // Hawaii
    if (lat >= 18 && lat <= 29 && lng >= -161 && lng <= -154) {
        return 'Pacific/Honolulu';
    }

    // Brazil
    if (lat >= -34 && lat <= 6 && lng >= -74 && lng <= -34) {
        return 'America/Sao_Paulo';
    }

    // UK/Ireland
    if (lat >= 49 && lat <= 61 && lng >= -11 && lng <= 2) {
        return 'Europe/London';
    }

    // Western Europe (France, Spain, Belgium, Netherlands)
    if (lat >= 36 && lat <= 52 && lng >= -10 && lng <= 8) {
        return 'Europe/Paris';
    }

    // Central Europe (Germany, Poland, Italy, etc)
    if (lat >= 35 && lat <= 55 && lng >= 5 && lng <= 25) {
        return 'Europe/Berlin';
    }

    // Australia (East Coast)
    if (lat >= -44 && lat <= -10 && lng >= 140 && lng <= 154) {
        return 'Australia/Sydney';
    }

    // Japan
    if (lat >= 24 && lat <= 46 && lng >= 122 && lng <= 154) {
        return 'Asia/Tokyo';
    }

    // Default fallback for unknown regions
    return 'America/New_York';
}

/**
 * Format timezone for display (e.g., "America/Sao_Paulo - Brasília (UTC-03:00)")
 */
export function formatTimezoneDisplay(timezone: string): string {
    const info = TIMEZONE_OFFSETS[timezone];
    if (info) {
        return `${timezone} - ${info.label}`;
    }
    return timezone;
}

/**
 * Get simple timezone label
 */
export function getTimezoneLabel(timezone: string): string {
    const info = TIMEZONE_OFFSETS[timezone];
    return info?.label || timezone;
}

/**
 * Convert a local date string to tenant timezone ISO string
 * This ensures dates are saved consistently regardless of browser timezone
 */
export function toTenantISOString(
    dateStr: string,
    timeStr: string,
    timezone: string
): string {
    // Create the date string in local format
    const localDateTimeStr = `${dateStr}T${timeStr}:00`;

    // For now, we just return the local format without UTC conversion
    // This matches the toLocalISOString approach used in BookingModal
    return localDateTimeStr;
}

/**
 * Format a Date object as local ISO string (without UTC conversion)
 */
export function toLocalISOString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Calculate end date given start date and duration in minutes
 */
export function calculateEndDate(startDate: Date, durationMinutes: number): Date {
    return new Date(startDate.getTime() + durationMinutes * 60 * 1000);
}
