'use client'

import * as React from "react"
import { Search, MapPin, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AddressResult {
  name: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
  fullAddress: string;
}

interface AddressSearchProps {
  onSelect: (result: AddressResult) => void;
  defaultValue?: string;
}

export function AddressSearch({ onSelect, defaultValue = "" }: AddressSearchProps) {
  const [query, setQuery] = React.useState(defaultValue)
  const [results, setResults] = React.useState<AddressResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const searchAddress = async (q: string) => {
    if (q.length < 3) {
      setResults([])
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`)
      const data = await res.json()
      
      const formatted = data.features.map((f: any) => {
        const p = f.properties
        const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean)
        return {
          name: p.name,
          city: p.city,
          country: p.country,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          fullAddress: parts.join(", ")
        }
      })
      setResults(formatted)
      setOpen(true)
    } catch (err) {
      console.error("Photon API Error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Debounce logic
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (query && query !== defaultValue) searchAddress(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Comece a digitar o endereço..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!e.target.value) setOpen(false)
          }}
          className="pl-9"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md animate-in fade-in zoom-in-95">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setQuery(r.fullAddress)
                setOpen(false)
                onSelect(r)
              }}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" />
              <div className="text-left">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.fullAddress}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
