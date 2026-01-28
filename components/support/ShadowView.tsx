import React, { useEffect, useRef, useState } from 'react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import { createPlatformClient } from '../../lib/supabase/platform-client';
import { Monitor, Loader2, X, Maximize2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShadowViewProps {
    tenantId: string;
    onClose: () => void;
}

export const ShadowView: React.FC<ShadowViewProps> = ({ tenantId, onClose }) => {
    const playerRef = useRef<HTMLDivElement>(null);
    const [replayer, setReplayer] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const supabase = createPlatformClient();

    useEffect(() => {
        if (!tenantId) return;

        console.log('[ShadowView] Initializing connection for tenant:', tenantId);

        const streamChannel = supabase.channel(`support_stream:${tenantId}`);

        streamChannel.on('broadcast', { event: 'dom_event' }, ({ payload }) => {
            if (!replayer && playerRef.current) {
                // Initialize player on first event
                const newPlayer = new rrwebPlayer({
                    target: playerRef.current,
                    props: {
                        events: [payload],
                        liveMode: true,
                        autoPlay: true,
                        width: playerRef.current.clientWidth || 800,
                        height: playerRef.current.clientHeight || 450,
                    },
                });
                setReplayer(newPlayer);
                setIsConnected(true);
            } else if (replayer) {
                replayer.addEvent(payload);
            }
        }).subscribe();

        // Send a request to start mirroring
        const controlChannel = supabase.channel(`support_session:${tenantId}`);
        controlChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                controlChannel.send({
                    type: 'broadcast',
                    event: 'request_mirror',
                    payload: { adminId: 'super-admin', timestamp: new Date().toISOString() }
                });
            }
        });

        const handleResize = () => {
            if (replayer && playerRef.current) {
                // replayer doesn't have a direct resize method in all versions, 
                // but we can try to update props if the lib supports it or just recreate if needed.
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            // Tell the client to stop mirroring
            controlChannel.send({
                type: 'broadcast',
                event: 'stop_mirror',
                payload: {}
            });
            supabase.removeChannel(streamChannel);
            supabase.removeChannel(controlChannel);
        };
    }, [tenantId, supabase, replayer]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-20 right-8 z-[10000] w-[800px] h-[500px] bg-slate-900 rounded-2xl border-4 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
        >
            {/* Window Header */}
            <div className="bg-slate-800 px-4 py-3 flex items-center justify-between cursor-move">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                        <Monitor className="text-indigo-400" size={18} />
                    </div>
                    <div>
                        <h3 className="text-white text-sm font-bold tracking-tight leading-none">ShadowView Live Monitor</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <ShieldCheck size={10} className="text-emerald-400" />
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Conexão Criptografada</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-4 bg-slate-950/50 px-3 py-1 rounded-full border border-white/5">
                        <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-[10px] text-slate-300 font-bold tracking-wider">
                            {isConnected ? 'ESTREAMING' : 'AGUARDANDO...'}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Player Area */}
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center">
                {!isConnected && (
                    <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="relative inline-block">
                            <Loader2 size={48} className="text-indigo-500 animate-spin opacity-50" />
                            <Maximize2 size={20} className="absolute inset-0 m-auto text-indigo-400 opacity-80" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-white text-sm font-bold">Solicitando Mirroring...</p>
                            <p className="text-slate-500 text-[11px] max-w-[250px]">O cliente iniciará a transmissão assim que a solicitação de handshake for aceita via Realtime.</p>
                        </div>
                    </div>
                )}
                <div ref={playerRef} className="w-full h-full shadow-inner" id="rrweb-player-container" />
            </div>

            {/* Footer Status */}
            <div className="bg-slate-800/50 px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">Cleanlydash Platform Ops Center v2.0</span>
                <span className="text-[10px] text-indigo-400 font-bold italic">RRWeb Real-time Replay</span>
            </div>
        </motion.div>
    );
};
