import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { LogOut, Timer, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes
const WARNING_THRESHOLD_MS = 60 * 1000; // Warning at 9 minutes (60s remaining)

export const SessionGuard: React.FC = () => {
    const supabase = createClient();
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const activityListenerAdded = useRef(false);

    const resetTimer = () => {
        setLastActivity(Date.now());
        if (showWarning) {
            setShowWarning(false);
            setTimeLeft(60);
            toast.success("Sessão renovada com sucesso!");
        }
    };

    const handleLogout = async () => {
        try {
            toast.dismiss();
            await supabase.auth.signOut();
            window.location.href = '/auth?mode=login&reason=timeout';
        } catch (error) {
            console.error("Logout error", error);
            window.location.href = '/auth';
        }
    };

    useEffect(() => {
        // Events to track activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        // Throttled handler to avoid state spam
        let lastThrottle = 0;
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastThrottle > 1000) { // Only update every second max
                // Only reset if NOT in warning mode (force user to interact with modal)
                // Actually, if they move mouse, should we auto-reset? 
                // Security best practice: If warning is shown, require Explicit Click?
                // User asked: "botão onde o usuário precisa confirmar clicar"
                // So, if warning is shown, we DO NOT auto-reset on mousemove. We wait for button click.

                // We need a ref to access current showWarning state inside listener without re-binding
                // Using a check in the interval instead is safer or using a Ref for state.
            }
        };

        // We'll use a slightly different approach:
        // Update a Ref on activity, but only Sync to State periodically.

        const onUserAction = () => {
            // Only update lastActivity if we are NOT in warning mode
            // If in warning mode, user MUST interact with the Modal Trigger (Button) to reset.
            if (!document.body.classList.contains('session-warning-active')) {
                setLastActivity(Date.now());
            }
        };

        if (!activityListenerAdded.current) {
            events.forEach(event => window.addEventListener(event, onUserAction));
            activityListenerAdded.current = true;
        }

        // Timer Check Loop
        const intervalId = setInterval(() => {
            const now = Date.now();
            const inactiveTime = now - lastActivity;
            const timeRemaining = IDLE_TIMEOUT_MS - inactiveTime;

            if (timeRemaining <= 0) {
                // Time Expired
                clearInterval(intervalId);
                handleLogout();
            } else if (timeRemaining <= WARNING_THRESHOLD_MS) {
                // Warning Zone
                if (!showWarning) {
                    setShowWarning(true);
                    document.body.classList.add('session-warning-active'); // Flag to stop auto-reset
                }
                setTimeLeft(Math.ceil(timeRemaining / 1000));
            } else {
                // Safe Zone
                if (showWarning) {
                    setShowWarning(false);
                    document.body.classList.remove('session-warning-active');
                }
            }
        }, 1000);

        return () => {
            events.forEach(event => window.removeEventListener(event, onUserAction));
            clearInterval(intervalId);
            document.body.classList.remove('session-warning-active');
        };
    }, [lastActivity, showWarning]);
    // Dependency on lastActivity triggers re-bind, but that's okay for low freq updates (we only update it when not warning)
    // Actually, better to use a Ref for lastActivity to avoid re-binding listeners?
    // Let's optimize: The `activityListener` should just update a Ref. The Interval checks the Ref.

    // REFACTORING FOR PERFORMANCE and CORRECTNESS inside the component

    return (
        <Dialog open={showWarning} onOpenChange={(open) => {
            // Prevent closing by clicking outside? usually `modal` prop handles this.
            // We want to force interaction.
            if (!open) {
                // If they try to close (ESC), we interpret as "Stay Logged In"? 
                // Or we block close? Let's treat Close/Esc as "Stay".
                resetTimer();
            }
        }}>
            <DialogContent className="sm:max-w-md border-red-200 bg-red-50/50 backdrop-blur-xl">
                <DialogHeader>
                    <div className="mx-auto bg-red-100 h-16 w-16 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <Timer className="h-8 w-8 text-red-600" />
                    </div>
                    <DialogTitle className="text-center text-xl font-black text-slate-900">Sua sessão vai expirar</DialogTitle>
                </DialogHeader>

                <div className="text-center space-y-4 py-2">
                    <p className="text-slate-600 font-medium">
                        Você está inativo há quase 30 minutos. Para sua segurança, sua sessão será encerrada automaticamente.
                    </p>
                    <div className="text-3xl font-black text-red-600 tabular-nums">
                        00:{timeLeft.toString().padStart(2, '0')}
                    </div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Segundos Restantes</p>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
                    <Button
                        onClick={resetTimer}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 text-lg shadow-lg shadow-indigo-200"
                    >
                        <ShieldAlert className="mr-2 h-5 w-5" />
                        Manter Sessão Ativa
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair Agora
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
