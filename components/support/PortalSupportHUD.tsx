import React, { useEffect, useState } from 'react';
import { LogOut, ShieldAlert, Activity, User, ExternalLink, MonitorPlay } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShadowView } from './ShadowView.tsx';

export const PortalSupportHUD: React.FC = () => {
    const [config, setConfig] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isShadowVisible, setIsShadowVisible] = useState(false);

    useEffect(() => {
        const portalConfig = sessionStorage.getItem('portal_mode_config');
        if (portalConfig) {
            setConfig(JSON.parse(portalConfig));
            setIsVisible(true);
        }
    }, []);

    const handleQuit = () => {
        sessionStorage.removeItem('portal_mode_config');
        window.location.href = '/platform';
    };

    if (!isVisible || !config) return null;

    return (
        <>
            <AnimatePresence>
                {isShadowVisible && (
                    <ShadowView
                        tenantId={config.targetTenantId}
                        onClose={() => setIsShadowVisible(false)}
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
            >
                <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-2xl border-b border-white/20 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
                            <ShieldAlert size={16} className="text-amber-300 animate-pulse" />
                            <span className="text-xs font-black tracking-widest uppercase">Portal Mode Ativo</span>
                        </div>

                        <div className="h-4 w-px bg-white/20" />

                        <div className="flex items-center gap-2">
                            <User size={14} className="text-indigo-200" />
                            <span className="text-sm font-medium">Visualizando como:</span>
                            <span className="text-sm font-bold bg-white text-indigo-700 px-2 py-0.5 rounded leading-none">
                                {config.targetTenantName}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsShadowVisible(!isShadowVisible)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border shadow-sm ${isShadowVisible
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'
                                : 'bg-white/10 hover:bg-white/20 text-indigo-100 border-white/10 hover:border-white/30 text-xs font-bold'
                                }`}
                        >
                            <MonitorPlay size={14} className={isShadowVisible ? 'animate-pulse' : ''} />
                            {isShadowVisible ? 'FECHAR MONITOR' : 'MONITORAR AO VIVO'}
                        </button>

                        <button
                            onClick={() => window.open('/platform', '_blank')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-indigo-100 rounded-lg transition-all border border-white/10 hover:border-white/30"
                        >
                            <ExternalLink size={14} />
                            Painel Admin
                        </button>

                        <button
                            onClick={handleQuit}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-lg transition-all shadow-lg hover:scale-105 active:scale-95 group"
                        >
                            <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            ENCERRAR PORTAL
                        </button>
                    </div>
                </div>

                {/* Glow effect under the bar */}
                <div className="h-1 bg-indigo-400/30 blur-sm w-full" />
            </motion.div>
        </>
    );
};
