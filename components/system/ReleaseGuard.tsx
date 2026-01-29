import React from 'react';
import { Sparkles, RefreshCw, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppUpdates } from '../../hooks/use-app-updates';

export const ReleaseGuard: React.FC = () => {
    const { needRefresh, message, performUpdate, dismissUpdate } = useAppUpdates();

    return (
        <AnimatePresence>
            {needRefresh && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-6 right-6 z-[1000] md:left-auto md:w-[450px]"
                >
                    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative group">
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />

                        <div className="relative flex items-start gap-4">
                            <div className="shrink-0 p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                <Sparkles className="text-indigo-400" size={24} />
                            </div>

                            <div className="flex-1 space-y-1 pr-6">
                                <h4 className="text-sm font-black tracking-tight uppercase italic text-indigo-300">
                                    Nova Versão Disponível
                                </h4>
                                <p className="text-slate-300 text-xs leading-relaxed font-medium">
                                    {message || 'Melhoramos o Cleanlydash! Atualize agora para carregar os novos recursos e correções.'}
                                </p>

                                <div className="pt-3 flex items-center gap-3">
                                    <button
                                        onClick={performUpdate}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-black rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95 group/btn"
                                    >
                                        <RefreshCw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                                        ATUALIZAR AGORA
                                        <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                                    </button>

                                    <button
                                        onClick={dismissUpdate}
                                        className="text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                                    >
                                        Ignorar
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={dismissUpdate}
                                className="absolute top-0 right-0 p-1 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Progress line indicator (purely aesthetic) */}
                        <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/50 w-full" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
