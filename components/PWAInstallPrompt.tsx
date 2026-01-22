
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X, Share } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAInstallPrompt: React.FC = () => {
    const { t } = useTranslation();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) return;

        // Check if dismissed in this session
        const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
        if (dismissed) return;

        // Check for iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);

        if (isIosDevice) {
            // Show for iOS immediately (maybe with a small delay for UX)
            // But only if not standalone
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }

        // Handle Android/Desktop Chrome
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show prompt with delay
            setTimeout(() => setIsVisible(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                >
                    <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-white/20 relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-indigo-600/10 rounded-b-[50%] -translate-y-16 pointer-events-none" />

                        <div className="relative z-10 text-center">
                            <div className="h-20 w-20 bg-white rounded-2xl shadow-lg mx-auto mb-4 flex items-center justify-center p-2">
                                <img src="/icons/icon-192.png" alt="App Icon" className="w-full h-full object-contain rounded-xl" onError={(e) => (e.currentTarget.src = '/logo-full.png')} />
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('pwa.title')}</h3>
                            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                {t('pwa.description')}
                            </p>

                            {isIOS ? (
                                <div className="bg-slate-50 p-4 rounded-xl text-left text-sm text-slate-600 mb-6 border border-slate-100">
                                    <p className="mb-2 font-semibold flex items-center gap-2">
                                        <Share size={16} className="text-blue-500" /> {t('pwa.ios_step1')}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center text-[10px] font-bold">+</span> {t('pwa.ios_step2')}
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleInstall}
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 mb-3"
                                >
                                    <Download size={18} className="mr-2" />
                                    {t('pwa.install_button')}
                                </Button>
                            )}

                            <button
                                onClick={handleDismiss}
                                className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {t('pwa.later_button')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
