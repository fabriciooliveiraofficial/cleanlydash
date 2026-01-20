
export interface Point {
    id: string;
    lat: number;
    lng: number;
    name: string;
}

// Simple Nearest Neighbor Algorithm
export function optimizeRoute(startPoint: Point | null, points: Point[]): Point[] {
    if (points.length === 0) return [];

    const unvisited = [...points];
    const route: Point[] = [];

    // Start from the provided start point or the first point in the list
    let current = startPoint || unvisited.shift()!;
    if (startPoint) route.push(startPoint); // Include HQ if provided
    else route.push(current);

    while (unvisited.length > 0) {
        let nearest: Point | null = null;
        let minDist = Infinity;
        let nearestIdx = -1;

        for (let i = 0; i < unvisited.length; i++) {
            const p = unvisited[i];
            const d = getDistance(current.lat, current.lng, p.lat, p.lng);
            if (d < minDist) {
                minDist = d;
                nearest = p;
                nearestIdx = i;
            }
        }

        if (nearest) {
            route.push(nearest);
            current = nearest;
            unvisited.splice(nearestIdx, 1);
        } else {
            break;
        }
    }

    return route;
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
