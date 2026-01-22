import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Globe } from 'lucide-react';

export const LanguageFloatingWidget: React.FC = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Persist position
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('pwa_lang_pos');
        return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    });

    const languages = [
        { code: 'en', flag: 'us', label: 'English' },
        { code: 'pt', flag: 'br', label: 'Português' },
        { code: 'es', flag: 'es', label: 'Español' }
    ];

    const normalizedLang = (i18n.language || 'en').split('-')[0];
    const currentLang = languages.find(l => l.code === normalizedLang) || languages[0];

    const handleDragEnd = (_e: any, info: any) => {
        const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
        setPosition(newPos);
        localStorage.setItem('pwa_lang_pos', JSON.stringify(newPos));
        setTimeout(() => setIsDragging(false), 100);
    };

    return (
        <motion.div
            ref={containerRef}
            drag
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ x: position.x, y: position.y }}
            className="fixed bottom-24 right-6 z-[9999] flex flex-col items-center gap-3 touch-none"
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        className="flex flex-col gap-3 mb-2"
                    >
                        {languages
                            .filter(l => l.code !== i18n.language)
                            .map((lang, index) => (
                                <motion.button
                                    key={lang.code}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => {
                                        if (isDragging) return;
                                        i18n.changeLanguage(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className="h-12 w-12 rounded-full bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl flex items-center justify-center overflow-hidden hover:scale-110 active:scale-95 transition-transform"
                                    title={lang.label}
                                >
                                    <img
                                        src={`https://flagcdn.com/w80/${lang.flag}.png`}
                                        alt={lang.label}
                                        className="h-full w-full object-cover pointer-events-none"
                                    />
                                </motion.button>
                            ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (!isDragging) setIsOpen(!isOpen);
                }}
                className={`h-14 w-14 rounded-full flex items-center justify-center overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all relative border-2 cursor-grab active:cursor-grabbing ${isOpen ? 'border-indigo-500 scale-110' : 'border-white/50'
                    } bg-white/90 backdrop-blur-md`}
            >
                <img
                    src={`https://flagcdn.com/w80/${currentLang.flag}.png`}
                    alt={currentLang.label}
                    className="h-full w-full object-cover pointer-events-none"
                />

                <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Globe size={18} className="text-white drop-shadow-md" />
                </div>
            </motion.button>
        </motion.div>
    );
};
