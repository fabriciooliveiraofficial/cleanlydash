'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { TelnyxRTC } from '@telnyx/webrtc'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

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
        if (call && call.remoteStream && audioRef.current && callState === 'active') {
            console.log('Attaching remote stream (useEffect)', call.remoteStream);
            if (audioRef.current.srcObject !== call.remoteStream) {
                audioRef.current.srcObject = call.remoteStream;
                audioRef.current.play().catch(e => console.error('Error playing audio stream:', e));
            }
        }
    }, [call, callState]);

    // Inicializar Cliente Telnyx
    useEffect(() => {
        async function initTelnyx() {
            setCallState('idle')
            // ... (rest of the file remains same until return)
            // I will start the replacement from timerRef line to include the new useEffect and Refs
            // And I need to update the return statement too. This tool doesn't support multiple disjoint edits in 'replace_file_content' unless I use 'multi_replace'.
            // But I can limit the scope.
            // Let's use multi_replace for safety and clarity.


            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.log('Telnyx: No session')
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
                return;
            }

            rtcClient.on('telnyx.ready', () => {
                console.log('Telnyx WebRTC Ready (Context)')
                setCallState('idle')
            })

            rtcClient.on('telnyx.error', (error: any) => {
                console.error('Telnyx Client Error:', error)
                setCallState('error')
            })

            rtcClient.on('telnyx.notification', (notification: any) => {
                if (notification.type === 'callUpdate') {
                    const { call: updatedCall } = notification;

                    // Support Singleton Call: 
                    // 1. If we don't have a call state, accept this as the current call (e.g. inbound)
                    // 2. If we have a call state, only update if the IDs match
                    setCall((prevCall: any) => {
                        if (!prevCall || prevCall.id === updatedCall.id) {
                            return updatedCall;
                        }
                        return prevCall;
                    });

                    switch (updatedCall.state) {
                        case 'ringing':
                            // Only set global callState if it's the call we are tracking
                            setCallState((prev: string) => {
                                if (updatedCall.id === (window as any)._telnyx_current_call_id) return 'ringing';
                                return prev as any;
                            });
                            break
                        case 'active':
                            setCallState((prev: string) => {
                                if (updatedCall.id === (window as any)._telnyx_current_call_id) {
                                    startTimeRef.current = Date.now();
                                    startTimer();
                                    return 'active';
                                }
                                return prev as any;
                            });
                            break
                        case 'hangup':
                            if (updatedCall.id === (window as any)._telnyx_current_call_id) {
                                console.log(`Active call ${updatedCall.id} hung up.`);
                                setCallState('idle')
                                setCall(null)
                                stopTimer()
                                if (audioRef.current) {
                                    audioRef.current.srcObject = null
                                }
                                (window as any)._telnyx_current_call_id = null;

                                // Update log ... (logging logic remains)
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
                                console.log(`Background call ${updatedCall.id} hung up.`);
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
            } catch (err) {
                console.error("Connection failed", err)
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
            if (client) {
                if (client.calls) {
                    Object.values(client.calls).forEach((c: any) => c.hangup());
                }
                client.disconnect();
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

        // 1. Prevent overlapping calls - CRITICAL GUARD
        if (callState !== 'idle' || (window as any)._telnyx_current_call_id || call) {
            console.warn("Call already in progress. Ignoring makeCall request.");
            // If there's a ghost call, try to clean it up but don't start a new one yet
            if (call) call.hangup();
            return;
        }

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
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('call_logs').insert({
                    tenant_id: user.id,
                    direction: 'outbound',
                    from_number: configuredCallerId,
                    to_number: cleanDest,
                    status: 'ringing',
                    created_at: new Date().toISOString(),
                    external_id: newCall.id
                });
            }
        } catch (e) {
            console.error("Error making call", e)
            setCallState('error')
        }
    }, [client, callerId, supabase, call])

    const answerCall = useCallback(() => {
        if (call) call.answer()
    }, [call])

    const hangup = useCallback(() => {
        console.log("Hangup requested manually");
        if (call) {
            call.hangup();
        } else {
            console.log("No active call object found in state, force resetting UI");
            setCallState('idle');
            (window as any)._telnyx_current_call_id = null;
        }
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
                makeCall(e.detail.number);
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
