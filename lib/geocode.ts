// ARQUIVO: lib/geocode.ts
/**
 * Geocodifica um endereço usando Photon API (gratuito, baseado em OpenStreetMap)
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const response = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await response.json();

        if (data.features?.[0]) {
            const [lng, lat] = data.features[0].geometry.coordinates;
            return { lat, lng };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

/**
 * Busca sugestões de endereço para autocomplete
 */
export async function searchAddress(query: string): Promise<Array<{ display_name: string; lat: number; lng: number }>> {
    if (query.length < 3) return [];

    try {
        const response = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();

        return data.features?.map((f: any) => ({
            display_name: [
                f.properties.name,
                f.properties.street,
                f.properties.city,
                f.properties.state,
                f.properties.country
            ].filter(Boolean).join(', '),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
        })) || [];
    } catch {
        return [];
    }
}
