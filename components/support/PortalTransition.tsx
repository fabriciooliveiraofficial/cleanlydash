import React from 'react';
import { motion } from 'framer-motion';

export const PortalTransition: React.FC<{ active: boolean }> = ({ active }) => {
    if (!active) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none overflow-hidden"
        >
            {/* Background Layer */}
            <motion.div
                className="absolute inset-0 bg-indigo-950/20 backdrop-blur-sm"
                initial={{ backgroundColor: "rgba(49, 46, 129, 0)" }}
                animate={{ backgroundColor: "rgba(49, 46, 129, 0.4)" }}
            />

            {/* Warp Circles */}
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 2, 4],
                        opacity: [0, 0.6, 0],
                        borderWidth: [2, 10, 0]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeOut"
                    }}
                    className="absolute rounded-full border border-indigo-400/50"
                    style={{
                        width: '30vw',
                        height: '30vw',
                    }}
                />
            ))}

            {/* Center Flash */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 1, ease: "circOut" }}
                className="w-64 h-64 bg-white rounded-full blur-3xl"
            />

            {/* Portal Text */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="z-10 text-center"
            >
                <div className="text-white text-4xl font-black tracking-tighter uppercase italic">
                    Portal <span className="text-indigo-400">ATIVADO</span>
                </div>
                <div className="text-indigo-200 text-sm font-medium tracking-widest uppercase mt-2">
                    Redirecionando para o ambiente do Tenant...
                </div>
            </motion.div>
        </motion.div>
    );
};
