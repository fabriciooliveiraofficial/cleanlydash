// ARQUIVO: components/crm/address-autocomplete.tsx
'use client'

import * as React from "react"
import { MapPin, Loader2, X, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"

interface PhotonResult {
  name: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
  fullAddress: string;
}

interface AddressAutocompleteProps {
  onSelect: (result: PhotonResult) => void;
  defaultValue?: string;
}

// API 1: Photon (Extremamente rápido para sugestões "fuzzy")
async function searchPhoton(query: string): Promise<PhotonResult[]> {
  try {
    // Adicionado filtro &bbox para tentar priorizar Américas e &limit-10
    // Photon não tem um filtro "country" perfeito na query básica, então filtramos no mapeamento
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15`)

    if (!res.ok) throw new Error('Photon failed')
    const data = await res.json()

    if (!data.features || data.features.length === 0) return []

    return data.features
      .filter((f: any) => f.properties.countrycode === 'US' || f.properties.country === 'United States')
      .map((f: any) => {
        const p = f.properties
        const streetWithNumber = p.housenumber
          ? `${p.housenumber} ${p.street || p.name || ''}`.trim()
          : (p.street || p.name || '')

        const parts = [streetWithNumber, p.city, p.state, "USA"].filter(Boolean)

        return {
          name: streetWithNumber || p.city || 'Address',
          street: p.street,
          city: p.city,
          state: p.state,
          country: "USA",
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          fullAddress: Array.from(new Set(parts)).join(", ")
        }
      })
  } catch (err) {
    console.error("Photon Error:", err)
    return []
  }
}

// API 2: US Census Geocoder (API Oficial do Governo dos EUA - 100% Free)
async function searchUSCensus(query: string): Promise<PhotonResult[]> {
  if (query.length < 5) return []

  try {
    // Usando proxy para evitar erro de CORS
    const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(censusUrl)}`

    const res = await fetch(proxyUrl)

    if (!res.ok) throw new Error('US Census failed')
    const data = await res.json()

    if (!data.result?.addressMatches || data.result.addressMatches.length === 0) return []

    return data.result.addressMatches.map((item: any) => ({
      name: item.matchedAddress.split(',')[0],
      street: item.addressComponents.streetName,
      city: item.addressComponents.city,
      state: item.addressComponents.state,
      country: "USA",
      lat: item.coordinates.y,
      lng: item.coordinates.x,
      fullAddress: item.matchedAddress
    }))
  } catch (err) {
    console.error("US Census Error:", err)
    return []
  }
}

// Busca agregada em paralelo
async function searchAggregated(query: string): Promise<PhotonResult[]> {
  const upperQuery = query.toUpperCase();

  const promises = [
    searchPhoton(upperQuery).catch(() => []),
    searchUSCensus(upperQuery).catch(() => [])
  ]

  const [photonResults, censusResults] = await Promise.all(promises)

  // Census primeiro (dados oficiais)
  const allResults = [...censusResults, ...photonResults]

  // Remover duplicatas
  const uniqueResults = allResults.filter((v, i, a) =>
    a.findIndex(t => (t.fullAddress.toLowerCase() === v.fullAddress.toLowerCase()) || (
      Math.abs(t.lat - v.lat) < 0.00001 && Math.abs(t.lng - v.lng) < 0.00001
    )) === i
  )

  return uniqueResults.slice(0, 10)
}

export function AddressAutocomplete({ onSelect, defaultValue = "" }: AddressAutocompleteProps) {
  const [query, setQuery] = React.useState(defaultValue)
  const [results, setResults] = React.useState<PhotonResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [noResults, setNoResults] = React.useState(false)

  const handleSearch = async (val: string) => {
    if (val.length < 3) {
      setResults([])
      setNoResults(false)
      return
    }

    setIsLoading(true)
    setNoResults(false)

    try {
      const formatted = await searchAggregated(val)
      setResults(formatted)
      setNoResults(formatted.length === 0)
      setIsOpen(true)
    } catch (err) {
      setResults([])
      setNoResults(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualEntry = async () => {
    // Try to geocode the manual address using Nominatim via CORS proxy
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(nominatimUrl)}`;

      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          onSelect({
            name: query,
            fullAddress: query,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          });
          setIsOpen(false);
          return;
        }
      }
    } catch (err) {
      console.error('Nominatim geocoding failed:', err);
    }

    // Fallback: use 0,0 if geocoding fails
    onSelect({
      name: query,
      fullAddress: query,
      lat: 0,
      lng: 0
    });
    setIsOpen(false);
  }

  React.useEffect(() => {
    const timer = setTimeout(() => {
      // Evitar pesquisa se o valor for exatamente igual ao default (inicial)
      if (query && query.length >= 3 && query !== defaultValue) {
        handleSearch(query)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Enter US address..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!e.target.value) {
              setIsOpen(false)
              setResults([])
              setNoResults(false)
            }
          }}
          onFocus={() => {
            if (results.length > 0 || noResults) setIsOpen(true)
          }}
          className="pl-9 pr-9 focus-visible:ring-indigo-500 bg-white"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
        ) : query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); setNoResults(false); }}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || noResults) && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 max-h-[300px] overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 text-left border-b border-slate-50 last:border-0"
                onClick={() => {
                  setQuery(r.fullAddress)
                  setIsOpen(false)
                  onSelect(r)
                }}
              >
                <div className="mt-0.5 rounded-full bg-slate-100 p-1.5 text-slate-500 shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 line-clamp-1">{r.name}</span>
                  <span className="text-xs text-slate-500 line-clamp-2">{r.fullAddress}</span>
                  {r.country === 'USA' && <span className="text-[10px] text-indigo-600 font-bold mt-0.5 uppercase tracking-tight">🇺🇸 US Official / Census</span>}
                </div>
              </button>
            ))}

            {noResults && (
              <div className="p-4 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-amber-600 mb-3">
                  <div className="bg-amber-50 p-2 rounded-full">
                    <AlertCircle size={20} />
                  </div>
                  <span className="text-sm font-medium">No official US address found</span>
                </div>
                <button
                  type="button"
                  onClick={handleManualEntry}
                  className="w-full py-2 px-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin size={12} />
                  Use address exactly as typed
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}