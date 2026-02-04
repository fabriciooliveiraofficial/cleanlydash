import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Timezone Utilities
 * Provides functions for timezone detection and date formatting per tenant timezone
 */

// Comprehensive and curated IANA Timezone list for the selection UI
export const IANA_TIMEZONES = [
    // US & Canada
    { value: 'America/New_York', label: 'Eastern Time (New York, Miami, Toronto)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago, Dallas, Winnipeg)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver, Calgary, Phoenix)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (LA, Vancouver, Seattle)' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii-Aleutian Time' },
    { value: 'America/Phoenix', label: 'Arizona (No DST)' },

    // Latin America
    { value: 'America/Sao_Paulo', label: 'Brasília (São Paulo, Rio de Janeiro)' },
    { value: 'America/Manaus', label: 'Amazon (Manaus)' },
    { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
    { value: 'America/Mexico_City', label: 'Mexico City' },
    { value: 'America/Santiago', label: 'Chile (Santiago)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },

    // Europe
    { value: 'Europe/London', label: 'London, Dublin, Lisbon' },
    { value: 'Europe/Paris', label: 'Paris, Madrid, Amsterdam' },
    { value: 'Europe/Berlin', label: 'Berlin, Rome, Stockholm' },
    { value: 'Europe/Lisbon', label: 'Lisbon, Porto' },
    { value: 'Europe/Dublin', label: 'Dublin' },

    // Asia/Pacific
    { value: 'Asia/Tokyo', label: 'Tokyo, Seoul' },
    { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi' },
    { value: 'Asia/Singapore', label: 'Singapore, Hong Kong' },
    { value: 'Australia/Sydney', label: 'Sydney, Melbourne' },
    { value: 'Australia/Perth', label: 'Perth' },
    { value: 'Asia/Jerusalem', label: 'Jerusalem (Israel)' },
];

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

    // Colombia
    if (lat >= -4 && lat <= 13 && lng >= -82 && lng <= -66) {
        return 'America/Bogota';
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
 * Format timezone for display
 */
export function formatTimezoneDisplay(timezone: string): string {
    const found = IANA_TIMEZONES.find(t => t.value === timezone);
    if (found) return found.label;
    return timezone;
}

/**
 * Get current time in a specific timezone
 */
export function getZonedNow(timezone: string): Date {
    return toZonedTime(new Date(), timezone);
}

/**
 * Format a date in a specific timezone
 */
export function formatInTZ(date: Date | string | number, timezone: string, formatStr: string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(d, timezone, formatStr);
}

/**
 * Convert a local date string to tenant timezone ISO string
 */
export function toTenantISOString(
    dateStr: string,
    timeStr: string,
    timezone: string
): string {
    // Create the date string in local format
    const localDateTimeStr = `${dateStr}T${timeStr}:00`;
    // We keep ISO-8601 representation consistent
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
