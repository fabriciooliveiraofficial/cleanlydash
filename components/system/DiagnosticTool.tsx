import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase/client';

export const DiagnosticTool: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const mountCount = useRef(0);
    const supabase = createClient();

    const addLog = (type: string, message: string, data?: any) => {
        const entry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
            data
        };
        setLogs(prev => [entry, ...prev].slice(0, 50));
        console.log(`[Diagnostic] [${type}] ${message}`, data || '');
    };

    useEffect(() => {
        mountCount.current += 1;
        addLog('MOUNT', `App / Root mounted (Total: ${mountCount.current})`);

        // Track Path
        addLog('PATH', `URL Context: ${window.location.pathname}`);

        // Listen to Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            addLog('AUTH', `Supabase Event: ${event}`, {
                user: session?.user?.email,
                lastSignIn: session?.user?.last_sign_in_at
            });
        });

        // Listen to popstate
        const handlePopstate = () => {
            addLog('NAV', `Popstate change to: ${window.location.pathname}`);
        };
        window.addEventListener('popstate', handlePopstate);

        return () => {
            addLog('UNMOUNT', 'Component unmounting');
            subscription.unsubscribe();
            window.removeEventListener('popstate', handlePopstate);
        };
    }, []);

    // Detect browser reloads & REMOUNT LOOPS (Panic Break)
    const [panicState, setPanicState] = useState<{ isPanicked: boolean, reason: string }>({ isPanicked: false, reason: '' });

    useEffect(() => {
        const now = Date.now();
        const reloadData = JSON.parse(sessionStorage.getItem('diag_loop_check') || '{"count": 0, "firstMount": 0, "lastMount": 0}');

        // Reset if it's been more than 10 seconds since last mount (a fresh start)
        const isFreshStart = (now - reloadData.lastMount) > 10000;
        const newCount = isFreshStart ? 1 : reloadData.count + 1;
        const firstMount = isFreshStart ? now : reloadData.firstMount;

        const updatedData = {
            count: newCount,
            firstMount: firstMount,
            lastMount: now
        };
        sessionStorage.setItem('diag_loop_check', JSON.stringify(updatedData));

        // PANIC CRITERIA: More than 10 mounts in 10 seconds
        if (newCount >= 10 && (now - firstMount) < 10000) {
            console.error("☠️ PANIC BREAK: Loop detected!", updatedData);
            setPanicState({ isPanicked: true, reason: `FREQUENT REMOUNTS (${newCount} in ${Math.round((now - firstMount) / 1000)}s)` });

            // Try to stop anything that's running
            if (typeof window !== 'undefined') {
                window.stop?.(); // Stop further downloads/execution if possible

                // Add a hard overlay to the DOM immediately (outside React)
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:red;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;padding:20px;text-align:center';
                overlay.innerHTML = `
                    <h1 style="font-size:40px;margin-bottom:20px">☠️ LOOP DETECTADO ☠️</h1>
                    <p style="font-size:20px">${newCount} remounts detectados em ${Math.round((now - firstMount) / 1000)}s.</p>
                    <p style="margin-top:20px">A aplicação foi interrompida para evitar travamento.</p>
                    <button onclick="sessionStorage.removeItem('diag_loop_check');location.reload()" style="margin-top:30px;padding:10px 20px;background:white;color:red;border:none;font-weight:bold;cursor:pointer">TENTAR NOVAMENTE</button>
                    <div style="margin-top:20px;font-size:12px;opacity:0.8;max-width:600px;text-align:left;max-height:300px;overflow-y:auto">
                       Últimos Logs:<br/>
                       ${new Error().stack}
                    </div>
                `;
                document.body.appendChild(overlay);
            }
        }

        // Detect navigation type for context
        let navType = 'unknown';
        if (performance.getEntriesByType) {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
                navType = (navEntries[0] as PerformanceNavigationTiming).type;
            }
        }

        if (newCount > 1) {
            addLog('SYSTEM', `Session count: ${newCount}. Navigation Type: ${navType}`);
        }
    }, []);

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-4 right-4 z-[9999] bg-slate-900 border border-white/20 text-white px-3 py-1.5 rounded-full shadow-2xl text-[10px] font-black opacity-40 hover:opacity-100 hover:scale-110 transition-all flex items-center gap-2"
            >
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                SYSTEM DIAG
            </button>
        );
    }

    return (
        <div className="fixed inset-y-4 right-4 w-96 z-[9999] bg-white border-2 border-slate-900 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] rounded-xl flex flex-col overflow-hidden font-mono text-[10px] animate-in slide-in-from-right duration-300">
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-bold tracking-tighter">DIAGNOSTIC OVERLAY V1</span>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="hover:text-red-400 font-bold px-2"
                >
                    [X]
                </button>
            </div>

            <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-4 text-[9px] text-slate-500 font-bold uppercase">
                <span>Mounts: {mountCount.current}</span>
                <span>Active: {window.location.pathname}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
                {logs.length === 0 && <div className="text-slate-300 italic">No events recorded yet...</div>}
                {logs.map(log => (
                    <div key={log.id} className="border-l-2 border-slate-200 pl-2 py-1 bg-white rounded-r shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black text-white ${log.type === 'AUTH' ? 'bg-indigo-500' :
                                log.type === 'MOUNT' ? 'bg-green-600' :
                                    log.type === 'SYSTEM' ? 'bg-rose-600 animate-pulse' :
                                        log.type === 'NAV' ? 'bg-amber-500' :
                                            'bg-slate-500'
                                }`}>
                                {log.type}
                            </span>
                            <span className="text-slate-400 text-[8px]">{log.timestamp}</span>
                        </div>
                        <div className="text-slate-800 break-words font-semibold">{log.message}</div>
                        {log.data && (
                            <pre className="bg-slate-900 text-[8px] text-green-400 p-2 mt-2 rounded overflow-x-auto border border-white/10">
                                {JSON.stringify(log.data, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-2 bg-white border-t border-slate-200 flex gap-2">
                <button
                    onClick={() => setLogs([])}
                    className="flex-1 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-bold transition-colors"
                >
                    CLEAR LOGS
                </button>
                <button
                    onClick={() => {
                        sessionStorage.removeItem('diag_reload_count');
                        window.location.reload();
                    }}
                    className="flex-1 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded font-bold transition-colors"
                >
                    MANUAL REFRESH
                </button>
            </div>
        </div>
    );
};
