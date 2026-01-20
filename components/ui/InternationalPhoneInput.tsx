import React, { useState, useRef, useEffect } from 'react';
import PhoneInput, { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en';
import 'react-phone-number-input/style.css';
import { Search, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapping of country codes to names for search - Using a standard list
const countryNames: Record<string, string> = {
    AD: "Andorra", AE: "United Arab Emirates", AF: "Afghanistan", AG: "Antigua and Barbuda", AI: "Anguilla",
    AL: "Albania", AM: "Armenia", AO: "Angola", AQ: "Antarctica", AR: "Argentina", AS: "American Samoa",
    AT: "Austria", AU: "Australia", AW: "Aruba", AX: "Åland Islands", AZ: "Azerbaijan", BA: "Bosnia and Herzegovina",
    BB: "Barbados", BD: "Bangladesh", BE: "Belgium", BF: "Burkina Faso", BG: "Bulgaria", BH: "Bahrain",
    BI: "Burundi", BJ: "Benin", BL: "Saint Barthélemy", BM: "Bermuda", BN: "Brunei", BO: "Bolivia",
    BQ: "Bonaire, Sint Eustatius and Saba", BR: "Brazil", BS: "Bahamas", BT: "Bhutan", BV: "Bouvet Island",
    BW: "Botswana", BY: "Belarus", BZ: "Belize", CA: "Canada", CC: "Cocos (Keeling) Islands",
    CD: "Congo, Democratic Republic of the", CF: "Central African Republic", CG: "Congo", CH: "Switzerland",
    CI: "Côte d'Ivoire", CK: "Cook Islands", CL: "Chile", CM: "Cameroon", CN: "China", CO: "Colombia",
    CR: "Costa Rica", CU: "Cuba", CV: "Cape Verde", CW: "Curaçao", CX: "Christmas Island", CY: "Cyprus",
    CZ: "Czech Republic", DE: "Germany", DJ: "Djibouti", DK: "Denmark", DM: "Dominica", DO: "Dominican Republic",
    DZ: "Algeria", EC: "Ecuador", EE: "Estonia", EG: "Egypt", EH: "Western Sahara", ER: "Eritrea",
    ES: "Spain", ET: "Ethiopia", FI: "Finland", FJ: "Fiji", FK: "Falkland Islands", FM: "Micronesia",
    FO: "Faroe Islands", FR: "France", GA: "Gabon", GB: "United Kingdom", GD: "Grenada", GE: "Georgia",
    GF: "French Guiana", GG: "Guernsey", GH: "Ghana", GI: "Gibraltar", GL: "Greenland", GM: "Gambia",
    GN: "Guinea", GP: "Guadeloupe", GQ: "Equatorial Guinea", GR: "Greece", GS: "South Georgia",
    GT: "Guatemala", GU: "Guam", GW: "Guinea-Bissau", GY: "Guyana", HK: "Hong Kong", HM: "Heard Island",
    HN: "Honduras", HR: "Croatia", HT: "Haiti", HU: "Hungary", ID: "Indonesia", IE: "Ireland", IL: "Israel",
    IM: "Isle of Man", IN: "India", IO: "British Indian Ocean Territory", IQ: "Iraq", IR: "Iran", IS: "Iceland",
    IT: "Italy", JE: "Jersey", JM: "Jamaica", JO: "Jordan", JP: "Japan", KE: "Kenya", KG: "Kyrgyzstan",
    KH: "Cambodia", KI: "Kiribati", KM: "Comoros", KN: "Saint Kitts and Nevis", KP: "North Korea",
    KR: "South Korea", KW: "Kuwait", KY: "Cayman Islands", KZ: "Kazakhstan", LA: "Laos", LB: "Lebanon",
    LC: "Saint Lucia", LI: "Liechtenstein", LK: "Sri Lanka", LR: "Liberia", LS: "Lesotho", LT: "Lithuania",
    LU: "Luxembourg", LV: "Latvia", LY: "Libya", MA: "Morocco", MC: "Monaco", MD: "Moldova", ME: "Montenegro",
    MF: "Saint Martin", MG: "Madagascar", MH: "Marshall Islands", MK: "North Macedonia", ML: "Mali",
    MM: "Myanmar", MN: "Mongolia", MO: "Macao", MP: "Northern Mariana Islands", MQ: "Martinique",
    MR: "Mauritania", MS: "Montserrat", MT: "Malta", MU: "Mauritius", MV: "Maldives", MW: "Malawi",
    MX: "Mexico", MY: "Malaysia", MZ: "Mozambique", NA: "Namibia", NC: "New Caledonia", NE: "Niger",
    NF: "Norfolk Island", NG: "Nigeria", NI: "Nicaragua", NL: "Netherlands", NO: "Norway", NP: "Nepal",
    NR: "Nauru", NU: "Niue", NZ: "New Zealand", OM: "Oman", PA: "Panama", PE: "Peru", PF: "French Polynesia",
    PG: "Papua New Guinea", PH: "Philippines", PK: "Pakistan", PL: "Poland", PM: "Saint Pierre and Miquelon",
    PN: "Pitcairn", PR: "Puerto Rico", PS: "Palestine", PT: "Portugal", PW: "Palau", PY: "Paraguay",
    QA: "Qatar", RE: "Réunion", RO: "Romania", RS: "Serbia", RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia",
    SB: "Solomon Islands", SC: "Seychelles", SD: "Sudan", SE: "Sweden", SG: "Singapore", SH: "Saint Helena",
    SI: "Slovenia", SJ: "Svalbard and Jan Mayen", SK: "Slovakia", SL: "Sierra Leone", SM: "San Marino",
    SN: "Senegal", SO: "Somalia", SR: "Suriname", SS: "South Sudan", ST: "Sao Tome and Principe",
    SV: "El Salvador", SX: "Sint Maarten", SY: "Syria", SZ: "Eswatini", TC: "Turks and Caicos Islands",
    TD: "Chad", TF: "French Southern Territories", TG: "Togo", TH: "Thailand", TJ: "Tajikistan", TK: "Tokelau",
    TL: "Timor-Leste", TM: "Turkmenistan", TN: "Tunisia", TO: "Tonga", TR: "Turkey", TT: "Trinidad and Tobago",
    TV: "Tuvalu", TW: "Taiwan", TZ: "Tanzania", UA: "Ukraine", UG: "Uganda", UM: "United States Minor Outlying Islands",
    US: "United States", UY: "Uruguay", UZ: "Uzbekistan", VA: "Vatican City", VC: "Saint Vincent and the Grenadines",
    VE: "Venezuela", VG: "Virgin Islands, British", VI: "Virgin Islands, U.S.", VN: "Vietnam", VU: "Vanuatu",
    WF: "Wallis and Futuna", WS: "Samoa", YE: "Yemen", YT: "Mayotte", ZA: "South Africa", ZM: "Zambia", ZW: "Zimbabwe"
};

interface InternationalPhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    defaultCountry?: string;
    className?: string;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
    value,
    onChange,
    placeholder = 'Phone number',
    defaultCountry = 'BR',
    className = ''
}) => {
    const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const countries = getCountries();

    const filteredCountries = countries.filter(code => {
        const name = countryNames[code] || '';
        return name.toLowerCase().includes(search.toLowerCase()) || code.toLowerCase().includes(search.toLowerCase());
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCountrySelect = (code: string) => {
        setSelectedCountry(code);
        setIsOpen(false);
        setSearch('');

        // Auto-insert DDI when country changes
        // We always reset/set the value to the new country's DDI to ensure correct formatting
        const callingCode = getCountryCallingCode(code as any);
        if (callingCode) {
            onChange(`+${callingCode}`);
        }
    };

    return (
        <div className={cn("relative flex items-center gap-0 w-full group", className)} ref={dropdownRef}>
            {/* Country Selector */}
            <div className="relative shrink-0">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "h-10 flex items-center justify-center gap-2 px-3 border border-slate-200 rounded-l-lg bg-slate-50 hover:bg-slate-100 transition-all border-r-0",
                        isOpen && "ring-2 ring-indigo-500 ring-inset z-10"
                    )}
                >
                    <span className="text-xl">
                        {/* Simple Flag implementation using Emojis for simplicity or custom component */}
                        {getEmojiFlag(selectedCountry)}
                    </span>
                    <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search country..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredCountries.map((code) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => handleCountrySelect(code)}
                                    className={cn(
                                        "w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-indigo-50 transition-colors",
                                        selectedCountry === code && "bg-indigo-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{getEmojiFlag(code)}</span>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700">{countryNames[code] || code}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">+{getCountryCallingCode(code)}</span>
                                        </div>
                                    </div>
                                    {selectedCountry === code && <Check size={14} className="text-indigo-600" />}
                                </button>
                            ))}
                            {filteredCountries.length === 0 && (
                                <div className="p-4 text-center text-xs text-slate-400">No countries found.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Phone Input */}
            <div className="relative flex-1">
                <PhoneInput
                    international
                    placeholder={placeholder}
                    country={selectedCountry as any}
                    value={value}
                    onChange={(val) => onChange(val || '')}
                    className="premium-phone-input"
                />
            </div>

            <style>{`
                .premium-phone-input {
                    display: flex;
                    width: 100%;
                }
                .premium-phone-input div:first-child {
                    display: none; /* Hide internal country select */
                }
                .premium-phone-input input {
                    width: 100%;
                    height: 40px;
                    padding: 0 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 0 8px 8px 0;
                    font-size: 14px;
                    font-weight: 500;
                    color: #1e293b;
                    background: white;
                    outline: none;
                    transition: all 0.2s;
                }
                .premium-phone-input input:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
                    z-index: 1;
                }
                .premium-phone-input input::placeholder {
                    color: #94a3b8;
                }
            `}</style>
        </div>
    );
};

// Helper to get emoji flag from country code
function getEmojiFlag(countryCode: string) {
    if (!countryCode) return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
