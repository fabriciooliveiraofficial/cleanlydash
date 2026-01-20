// ARQUIVO: lib/geocoding.ts
// Geocodificação usando OpenStreetMap Nominatim (API gratuita)

export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
}

/**
 * Geocodifica um endereço usando a API Nominatim do OpenStreetMap
 * @param address - Endereço para geocodificar
 * @returns Coordenadas lat/lng ou null se não encontrado
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!address || address.trim().length < 5) {
        return null;
    }

    try {
        // Nominatim API - using CORS proxy to avoid CORS issues from localhost
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(nominatimUrl)}`;

        const response = await fetch(proxyUrl, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('[Geocoding] API error:', response.status);
            return null;
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            console.log('[Geocoding] No results for:', address);
            return null;
        }

        const result = data[0];
        return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: result.display_name
        };
    } catch (error) {
        console.error('[Geocoding] Error:', error);
        return null;
    }
}

/**
 * Geocodifica múltiplos endereços com rate limiting
 * Nominatim permite 1 request/segundo
 */
export async function geocodeAddresses(
    addresses: Array<{ id: string; address: string }>,
    onProgress?: (current: number, total: number) => void
): Promise<Array<{ id: string; lat: number; lng: number } | null>> {
    const results: Array<{ id: string; lat: number; lng: number } | null> = [];

    for (let i = 0; i < addresses.length; i++) {
        const { id, address } = addresses[i];

        if (onProgress) {
            onProgress(i + 1, addresses.length);
        }

        const result = await geocodeAddress(address);

        if (result) {
            results.push({ id, lat: result.lat, lng: result.lng });
        } else {
            results.push(null);
        }

        // Rate limiting: 1 request per second para respeitar os limites do Nominatim
        if (i < addresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1100));
        }
    }

    return results;
}
