'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { TelnyxRTC } from '@telnyx/webrtc'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useRole } from '@/hooks/use-role'
import { toast } from 'sonner'

export type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'on-hold' | 'error'

interface TelnyxContextType {
    callState: CallState
    makeCall: (destination: string) => void
    answerCall: () => void
    hangup: () => void
    toggleMute: () => void
    isMuted: boolean
    duration: number
    remoteNumber: string
}

const TelnyxContext = createContext<TelnyxContextType | null>(null)

export function TelnyxProvider({ children, supabaseClient }: { children: React.ReactNode, supabaseClient?: SupabaseClient<any, any, any> }) {
    const defaultClient = createClient()
    const supabase = supabaseClient || defaultClient
    const [client, setClient] = useState<any>(null)
    const [call, setCall] = useState<any>(null)
    const [callState, setCallState] = useState<CallState>('idle')
    const [isMuted, setIsMuted] = useState(false)
    const [duration, setDuration] = useState(0)
    const [callerId, setCallerId] = useState<string>('')
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const ringtoneRef = useRef<HTMLAudioElement>(null)
    const startTimeRef = useRef<number | null>(null)
    const isDialingRef = useRef(false)
    const clientRef = useRef<any>(null) // Track specific instance for Strict Mode cleanup
    const { tenant_id } = useRole()

    // Handle Ringtone
    useEffect(() => {
        if (callState === 'ringing' && call?.direction === 'inbound') {
            const playRingtone = async () => {
                try {
                    if (ringtoneRef.current) {
                        ringtoneRef.current.currentTime = 0;
                        await ringtoneRef.current.play();
                    }
                } catch (error) {
                    console.error("Error playing ringtone:", error);
                }
            };
            playRingtone();
        } else {
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current.currentTime = 0;
            }
        }
    }, [callState, call]);

    // Monitor Call Object for Remote Stream updates
    useEffect(() => {
        if (call && call.remoteStream && audioRef.current) {
            // Attach stream for Ringback (Early Media) and Active audio
            // Do not restrict to 'active' state only, as ringback happens in 'connecting'/'ringing'
            console.log('Attaching remote stream (useEffect)', call.remoteStream);
            if (audioRef.current.srcObject !== call.remoteStream) {
                audioRef.current.srcObject = call.remoteStream;
                audioRef.current.play().catch(e => console.error('Error playing audio stream:', e));
            }
        }
    }, [call, callState]);

    // Inicializar Cliente Telnyx
    const isInitializingRef = useRef(false);

    useEffect(() => {
        async function initTelnyx() {
            if (isInitializingRef.current) {
                console.log("[Telnyx Context] Initialization already in progress. Skipping.");
                return;
            }
            isInitializingRef.current = true;

            setCallState('idle');
            setCall(null);

            // Cleanup potential existing client from strict mode double-mount
            if (clientRef.current) {
                console.log("[Telnyx Context] Disconnecting existing client before re-init");
                try {
                    clientRef.current.disconnect();
                } catch (e) { }
                clientRef.current = null;
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.log('Telnyx: No session')
                isInitializingRef.current = false;
                return
            }

            const { data, error } = await supabase.functions.invoke('telnyx-token')

            if (error || (!data?.token && !data?.login)) {
                console.error('Failed to get Telnyx credentials:', error);
                // Attempt to log more detail if it's an HTTP error with a response
                if (error && typeof error === 'object' && 'context' in error) {
                    try {
                        const responseBody = await (error as any).context.json();
                        console.error('Telnyx Function Error Detail:', responseBody);
                    } catch (e) {
                        console.error('Could not parse Telnyx Error body');
                    }
                }
                isInitializingRef.current = false;
                return
            }

            let rtcClient: any;

            // Check if using SIP credentials (new method)
            if (data.authType === 'sip_credentials' && data.login && data.password) {
                console.log('Using SIP credential authentication for:', data.login);
                // Save callerId for outbound calls
                if (data.callerId) {
                    setCallerId(data.callerId);
                    console.log('Caller ID configured:', data.callerId);
                }
                rtcClient = new TelnyxRTC({
                    login: data.login,
                    password: data.password,
                    debug: true
                });
            }
            // Fallback to token-based auth (old method)
            else if (data.token) {
                console.log('Using token-based authentication');
                rtcClient = new TelnyxRTC({
                    login_token: data.token
                });
            } else {
                console.error('No valid authentication credentials received');
                isInitializingRef.current = false;
                return;
            }

            rtcClient.on('telnyx.ready', () => {
                console.log('Telnyx WebRTC Ready (Context)')
                setCallState('idle')
            })

            rtcClient.on('telnyx.error', (error: any) => {
                console.error('Telnyx Client Error:', error);
                // Only set error state if we are trying to connect or in a call
                // Otherwise it might be a background error we can ignore or retry
                setCallState((prev) => {
                    if (prev !== 'idle') {
                        toast.error("Erro na conexão de voz. Tentando reconectar...");
                        return 'error';
                    }
                    return prev;
                });
            })

            rtcClient.on('telnyx.notification', (notification: any) => {
                if (notification.type === 'callUpdate') {
                    const { call: updatedCall } = notification;
                    console.log(`[Telnyx Context] Notification: ${updatedCall.state} for ID: ${updatedCall.id}`);

                    // Support Singleton Call: 
                    // 1. If we don't have a call state, accept this as the current call (e.g. inbound)
                    // 2. If we have a call state, only update if the IDs match
                    setCall((prevCall: any) => {
                        if (!prevCall || prevCall.id === updatedCall.id) {
                            // Vital: Preserve remoteStream if the update doesn't have it (JSON payload vs SDK Object)
                            if (prevCall?.remoteStream && !updatedCall.remoteStream) {
                                updatedCall.remoteStream = prevCall.remoteStream;
                            }
                            return updatedCall;
                        }
                        return prevCall;
                    });

                    switch (updatedCall.state) {
                        case 'ringing':
                            setCallState((prev: string) => {
                                const currentGlobalId = (window as any)._telnyx_current_call_id;
                                console.log(`[Telnyx Context] Ringing check - Prev state: ${prev}, Global ID: ${currentGlobalId}`);

                                if (!currentGlobalId || currentGlobalId === updatedCall.id) {
                                    if (!currentGlobalId) {
                                        console.log(`[Telnyx Context] ADOPTING Inbound Call: ${updatedCall.id}`);
                                        (window as any)._telnyx_current_call_id = updatedCall.id;
                                    }
                                    return 'ringing';
                                }
                                console.warn(`[Telnyx Context] Ignoring ringing for ${updatedCall.id} - Another call active: ${currentGlobalId}`);
                                return prev as any;
                            });
                            break
                        case 'active':
                            setCallState((prev: string) => {
                                const currentGlobalId = (window as any)._telnyx_current_call_id;
                                if (updatedCall.id === currentGlobalId) {
                                    if (!startTimeRef.current) {
                                        console.log('[Telnyx Context] Call Active - Starting Timer');
                                        startTimeRef.current = Date.now();
                                        startTimer();
                                    }
                                    return 'active';
                                }
                                return prev as any;
                            });
                            break
                        case 'hangup':
                            const currentGlobalId = (window as any)._telnyx_current_call_id;
                            if (updatedCall.id === currentGlobalId) {
                                console.log(`[Telnyx Context] Active call ${updatedCall.id} hung up.`);
                                setCallState('idle')
                                setCall(null)
                                stopTimer()
                                if (audioRef.current) {
                                    audioRef.current.srcObject = null
                                }
                                (window as any)._telnyx_current_call_id = null;

                                const endTime = Date.now()
                                const start = startTimeRef.current || endTime
                                const durationSecs = Math.round((endTime - start) / 1000)
                                const minutes = Math.ceil(durationSecs / 60)
                                const cost = durationSecs > 0 ? (minutes * 0.08) : 0

                                supabase.auth.getUser().then(({ data: { user } }) => {
                                    if (user && updatedCall.id) {
                                        supabase.from('call_logs')
                                            .update({
                                                status: 'completed',
                                                duration_seconds: durationSecs,
                                                cost: cost
                                            })
                                            .eq('external_id', updatedCall.id);
                                    }
                                });
                                startTimeRef.current = null;
                            } else {
                                console.log(`[Telnyx Context] Background call ${updatedCall.id} hung up. (Active was: ${currentGlobalId})`);
                            }
                            break
                    }
                }
            })
            // ... (rest of init)

            // ... (rest of methods)

            try {
                rtcClient.connect()
                setClient(rtcClient)
                clientRef.current = rtcClient; // Save specific instance to ref
            } catch (err) {
                console.error("Connection failed", err)
            } finally {
                isInitializingRef.current = false;
            }
        }

        initTelnyx()

        const handleBeforeUnload = () => {
            if (client) {
                // Try to hang up any active calls before closing
                if (client.calls) {
                    Object.values(client.calls).forEach((c: any) => c.hangup());
                }
                client.disconnect();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Cleanup Strict Mode / Unmount
            if (clientRef.current) {
                console.log("Cleaning up Telnyx Client (Unmount)");
                if (clientRef.current.calls) {
                    Object.values(clientRef.current.calls).forEach((c: any) => c.hangup());
                }
                clientRef.current.disconnect();
                clientRef.current = null;
            }
            stopTimer()
        }
    }, [])

    const startTimer = () => {
        setDuration(0)
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1)
        }, 1000)
    }

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        setDuration(0)
    }

    const makeCall = useCallback(async (destination: string) => {
        if (!client) {
            console.warn("Telnyx client not ready")
            return
        }

        // 1. Synchronous Mutex for rapid clicks
        if (isDialingRef.current) {
            console.warn("Dialing already in progress (Mutex Locked). Ignoring click.");
            return;
        }

        // 2. Global State Check
        if (callState !== 'idle' || (window as any)._telnyx_current_call_id || call) {
            console.warn("Call already in progress. Ignoring makeCall request.");
            if (call) call.hangup();
            return;
        }

        // Lock Mutex
        isDialingRef.current = true;

        try {
            // Normalize destination to E.164 if it looks like a US number
            let cleanDest = destination.replace(/\D/g, '');
            if (cleanDest.length === 10) {
                cleanDest = `+1${cleanDest}`;
            } else if (!cleanDest.startsWith('+')) {
                cleanDest = `+${cleanDest}`;
            }

            const configuredCallerId = callerId || 'Anonymous';
            console.log(`Initiating call to ${cleanDest}...`);

            const newCall = client.newCall({
                destinationNumber: cleanDest,
                callerNumber: configuredCallerId,
                audio: true,
                max_duration: 600 // 10 minutes maximum to prevent leaks
            });

            // Track this call ID globally to filter notifications correctly
            (window as any)._telnyx_current_call_id = newCall.id;

            setCall(newCall)
            setCallState('connecting')

            // Log the call immediately to call_logs
            if (tenant_id) {
                await supabase.from('call_logs').insert({
                    tenant_id: tenant_id,
                    direction: 'outbound',
                    from_number: configuredCallerId,
                    to_number: cleanDest,
                    status: 'ringing',
                    created_at: new Date().toISOString(),
                    external_id: newCall.id
                });
            } else {
                console.warn('Cannot log call: No tenant_id available');
            }
        } catch (e) {
            console.error("Error making call", e)
            setCallState('error')
        } finally {
            // Release Mutex after some time or immediately? 
            // Better to release it when callState changes to 'connecting' or on error
            // But if we return early due to error, we must release.
            // Since `client.newCall` is sync, we can release it here, BUT `setCallState` is async.
            // We should rely on `callState` blocking future calls, so releasing this mutex is safe 
            // once we've established the "next state" or failed.

            // Keep it locked for a short buffer (500ms) to prevent bounce
            setTimeout(() => {
                isDialingRef.current = false;
            }, 500);
        }
    }, [client, callerId, supabase, call])

    const answerCall = useCallback(() => {
        if (call) call.answer()
    }, [call])

    const hangup = useCallback(() => {
        console.log("Hangup requested manually");
        if (call) {
            try {
                call.hangup();
            } catch (e) {
                console.error("Error calling SDK hangup:", e);
            }
        }

        // Force UI Reset immediately to prevent freezing
        // The SDK event 'hangup' will fire later, but we shouldn't wait for it if the user wants out.
        console.log("Force resetting UI state for hangup");
        setCallState('idle');
        setCall(null);
        if (timerRef.current) clearInterval(timerRef.current);
        setDuration(0);
        if (audioRef.current) audioRef.current.srcObject = null;
        (window as any)._telnyx_current_call_id = null;

    }, [call])

    const toggleMute = useCallback(() => {
        if (call) {
            isMuted ? call.unmute() : call.mute()
            setIsMuted(!isMuted)
        }
    }, [call, isMuted])

    // Listen for quick action events from other components
    useEffect(() => {
        const handleQuickCall = (e: CustomEvent<{ number: string }>) => {
            if (e.detail?.number) {
                // Check mutex here too
                if (!isDialingRef.current) {
                    makeCall(e.detail.number);
                }
            }
        };

        window.addEventListener('quick-call', handleQuickCall as EventListener);
        return () => window.removeEventListener('quick-call', handleQuickCall as EventListener);
    }, [makeCall]);

    const value = {
        callState,
        makeCall,
        answerCall,
        hangup,
        toggleMute,
        isMuted,
        duration,
        remoteNumber: call?.remoteCallerNumber || ''
    }

    return (
        <TelnyxContext.Provider value={value}>
            <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
            <audio ref={ringtoneRef} src="/ringtone.mp3" loop style={{ display: 'none' }} />
            {children}
        </TelnyxContext.Provider>
    )
}

export function useTelnyx() {
    const context = useContext(TelnyxContext)
    if (!context) {
        throw new Error('useTelnyx must be used within a TelnyxProvider')
    }
    return context
}
