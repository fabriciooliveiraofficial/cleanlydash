// ARQUIVO: components/MapView.tsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '../lib/supabase/client.ts';
import { geocodeAddress } from '../lib/geocoding.ts';
import { Loader2, MapPin, Phone, Mail, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Fix para ícones do Leaflet no Vite
const customIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface Customer {
    id: string;
    name: string;
    address: string;
    email?: string;
    phone?: string;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    status: string;
}

// Helper to get coordinates from customer (supports both naming conventions)
function getCoords(customer: Customer): { lat: number; lng: number } | null {
    if (customer.lat && customer.lng) {
        return { lat: customer.lat, lng: customer.lng };
    }
    if (customer.latitude && customer.longitude) {
        return { lat: customer.latitude, lng: customer.longitude };
    }
    return null;
}

// Componente para ajustar bounds automaticamente
function FitBounds({ customers }: { customers: Customer[] }) {
    const map = useMap();

    useEffect(() => {
        const validCustomers = customers.filter(c => getCoords(c) !== null);
        if (validCustomers.length > 0) {
            const bounds = new LatLngBounds(
                validCustomers.map(c => {
                    const coords = getCoords(c)!;
                    return [coords.lat, coords.lng] as [number, number];
                })
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [customers, map]);

    return null;
}

export const MapView: React.FC = () => {
    const { t } = useTranslation();
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [geocoding, setGeocoding] = useState(false);
    const [geocodeProgress, setGeocodeProgress] = useState({ current: 0, total: 0 });
    const supabase: any = createClient();

    async function loadCustomers() {
        const { data, error } = await supabase
            .from('customers')
            .select('*');

        if (error) {
            console.error('[MapView] Error loading customers:', error);
            toast.error(t('map.error_loading'));
        }

        setAllCustomers(data || []);
        setLoading(false);
    }

    useEffect(() => {
        loadCustomers();
    }, []);

    // Customers with valid coordinates
    const customersWithCoords = allCustomers.filter(c => getCoords(c) !== null);

    // Customers without coordinates (need geocoding)
    const customersWithoutCoords = allCustomers.filter(c =>
        getCoords(c) === null && c.address && c.address.length > 5
    );

    async function handleGeocodeAll() {
        if (customersWithoutCoords.length === 0) {
            toast.info(t('map.all_done'));
            return;
        }

        setGeocoding(true);
        setGeocodeProgress({ current: 0, total: customersWithoutCoords.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < customersWithoutCoords.length; i++) {
            const customer = customersWithoutCoords[i];
            setGeocodeProgress({ current: i + 1, total: customersWithoutCoords.length });

            try {
                const result = await geocodeAddress(customer.address);

                if (result) {
                    // Update in database - use both lat/lng and latitude/longitude for compatibility
                    const { error } = await supabase
                        .from('customers')
                        .update({
                            lat: result.lat,
                            lng: result.lng,
                            latitude: result.lat,
                            longitude: result.lng
                        } as any)
                        .eq('id', customer.id);

                    if (error) {
                        console.error(`[Geocode] DB update error for ${customer.name}:`, error);
                        failCount++;
                    } else {
                        successCount++;
                        console.log(`[Geocode] ✓ ${customer.name}: ${result.lat}, ${result.lng}`);
                    }
                } else {
                    failCount++;
                    console.log(`[Geocode] ✗ No results for: ${customer.address}`);
                }
            } catch (err) {
                console.error(`[Geocode] Error for ${customer.name}:`, err);
                failCount++;
            }

            // Rate limiting: Nominatim requires 1 request per second
            if (i < customersWithoutCoords.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1100));
            }
        }

        setGeocoding(false);

        // Reload customers to show updated coordinates
        await loadCustomers();

        if (successCount > 0) {
            toast.success(t('map.success_msg', { count: successCount }));
        }
        if (failCount > 0) {
            toast.warning(t('map.fail_msg', { count: failCount }));
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[500px] bg-slate-100 rounded-2xl">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    // Centro padrão: USA
    const defaultCenter: [number, number] = [39.8283, -98.5795];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{t('map.title')}</h2>
                    <p className="text-slate-500 text-sm">
                        {t('map.subtitle_count', { count: customersWithCoords.length })}
                        {customersWithoutCoords.length > 0 && (
                            <span className="text-amber-600 ml-2">
                                • {t('map.subtitle_missing', { count: customersWithoutCoords.length })}
                            </span>
                        )}
                    </p>
                </div>

                {customersWithoutCoords.length > 0 && (
                    <button
                        onClick={handleGeocodeAll}
                        disabled={geocoding}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {geocoding ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                <span>{t('map.geocoding', { current: geocodeProgress.current, total: geocodeProgress.total })}</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw size={16} />
                                <span>{t('map.geocode_button', { count: customersWithoutCoords.length })}</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Progress bar during geocoding */}
            {geocoding && (
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center gap-2 text-sm text-indigo-700 mb-2">
                        <Loader2 className="animate-spin" size={14} />
                        <span>{t('map.converting')}</span>
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-2">
                        <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(geocodeProgress.current / geocodeProgress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-indigo-600 mt-1">
                        {t('map.delay_note')}
                    </p>
                </div>
            )}

            {customersWithCoords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[500px] bg-slate-100 rounded-2xl text-slate-500">
                    <MapPin size={48} className="mb-4 text-slate-300" />
                    <p className="font-semibold">{t('map.no_coords_title')}</p>
                    <p className="text-sm mb-4">{t('map.no_coords_desc')}</p>
                    {customersWithoutCoords.length > 0 && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                            <AlertCircle size={16} />
                            <span className="text-sm">{t('map.waiting', { count: customersWithoutCoords.length })}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl overflow-hidden shadow-lg border">
                    <MapContainer
                        center={defaultCenter}
                        zoom={4}
                        className="h-[500px] w-full"
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <FitBounds customers={customersWithCoords} />
                        {customersWithCoords.map((customer) => {
                            const coords = getCoords(customer)!;
                            return (
                                <Marker
                                    key={customer.id}
                                    position={[coords.lat, coords.lng]}
                                    icon={customIcon}
                                >
                                    <Popup>
                                        <div className="min-w-[200px]">
                                            <p className="font-bold text-slate-900">{customer.name}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                <MapPin size={10} /> {customer.address}
                                            </p>
                                            {customer.email && (
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                    <Mail size={10} /> {customer.email}
                                                </p>
                                            )}
                                            {customer.phone && (
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                    <Phone size={10} /> {customer.phone}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {customer.status}
                                                </span>
                                                <span className="text-[9px] text-slate-400">
                                                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                                                </span>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            )}
        </div>
    );
};
