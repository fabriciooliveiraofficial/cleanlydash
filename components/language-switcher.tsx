
import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n.ts';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
    const { t } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const currentLanguage = i18n.language || 'en';

    const languages = [
        { code: 'en', label: 'English (US)', flag: '🇺🇸' },
        { code: 'pt', label: 'Português (BR)', flag: '🇧🇷' },
        { code: 'es', label: 'Español (MX)', flag: '🇲🇽' },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 rounded-xl" title="Change Language">
                    <Globe size={20} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`cursor-pointer rounded-lg flex items-center gap-2 ${currentLanguage.startsWith(lang.code) ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600'}`}
                    >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
