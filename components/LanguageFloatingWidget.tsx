import React from 'react';

export type Language = 'en' | 'pt' | 'es';

interface LanguageFloatingWidgetProps {
    currentLang: Language;
    onLanguageChange: (lang: Language) => void;
    variant?: 'light' | 'dark';
}

export const LanguageFloatingWidget: React.FC<LanguageFloatingWidgetProps> = ({ currentLang, onLanguageChange, variant = 'light' }) => {
    const isDark = variant === 'dark';

    return (
        <div className={`fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 p-2 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-700 ${isDark
                ? 'bg-slate-800/90 backdrop-blur-xl border border-white/10'
                : 'bg-white border border-slate-200'
            }`}>
            {[
                { code: 'en', flag: 'us', label: 'English' },
                { code: 'pt', flag: 'br', label: 'Português' },
                { code: 'es', flag: 'es', label: 'Español' }
            ].map(({ code, flag, label }) => (
                <button
                    key={code}
                    onClick={() => onLanguageChange(code as Language)}
                    className={`h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden transition-all ${currentLang === code
                            ? 'ring-2 ring-indigo-500 ring-offset-2 shadow-lg scale-110' + (isDark ? ' ring-offset-slate-800' : '')
                            : 'grayscale hover:grayscale-0 opacity-70 hover:opacity-100'
                        }`}
                    title={label}
                >
                    <img
                        src={`https://flagcdn.com/w40/${flag}.png`}
                        srcSet={`https://flagcdn.com/w80/${flag}.png 2x`}
                        alt={label}
                        className="h-full w-full object-cover"
                    />
                </button>
            ))}
            <div className={`text-[8px] text-center font-black uppercase mt-1 ${isDark ? 'text-slate-500' : 'text-slate-300'}`}>Lang</div>
        </div>
    );
};
