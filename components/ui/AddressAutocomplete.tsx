'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, Search } from 'lucide-react';
import { Input } from './input';

interface AddressSuggestion {
    display_name: string;
    lat: string;
    lon: string;
    place_id: string;
}

interface AddressAutocompleteProps {
    value: string;
    onChange: (address: string, lat: number | null, lng: number | null) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    value,
    onChange,
    placeholder = 'Enter address...',
    disabled = false
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync external value
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchAddress = async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            // Use Nominatim API (OpenStreetMap) for geocoding - free and no API key required
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'pt-BR,en',
                        'User-Agent': 'Cleanlydash/1.0' // Required by Nominatim ToS
                    }
                }
            );

            if (response.ok) {
                const data: AddressSuggestion[] = await response.json();
                setSuggestions(data);
                setShowDropdown(data.length > 0);
            }
        } catch (error) {
            console.error('Address search error:', error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        // Debounce search
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            searchAddress(newValue);
        }, 400);
    };

    const handleSelect = (suggestion: AddressSuggestion) => {
        setInputValue(suggestion.display_name);
        setSuggestions([]);
        setShowDropdown(false);
        onChange(
            suggestion.display_name,
            parseFloat(suggestion.lat),
            parseFloat(suggestion.lon)
        );
    };

    const handleClear = () => {
        setInputValue('');
        setSuggestions([]);
        setShowDropdown(false);
        onChange('', null, null);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="pl-10 pr-10"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 text-slate-400 animate-spin" />
                )}
                {!isLoading && inputValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-3 h-4 w-4 text-slate-400 hover:text-slate-600"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                        <button
                            key={suggestion.place_id}
                            type="button"
                            onClick={() => handleSelect(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-slate-700 line-clamp-2">
                                    {suggestion.display_name}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No results hint */}
            {showDropdown && inputValue.length >= 3 && suggestions.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-4 text-center">
                    <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No addresses found</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                </div>
            )}
        </div>
    );
};
