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
                const { call: updatedCall } = notification
                if (notification.type === 'callUpdate') {
                    setCall(updatedCall)

                    switch (updatedCall.state) {
                        case 'ringing':
                            setCallState('ringing')
                            break
                        case 'active':
                            setCallState('active')
                            startTimer()
                            break
                        case 'hangup':
                            setCallState('idle')
                            setCall(null)
                            stopTimer()
                            if (audioRef.current) {
                                audioRef.current.srcObject = null
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

        return () => {
            if (client) client.disconnect()
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
        try {
            // Normalize destination to E.164 if it looks like a US number
            let cleanDest = destination.replace(/\D/g, '');
            if (cleanDest.length === 10) {
                cleanDest = `+1${cleanDest}`;
            } else if (!cleanDest.startsWith('+')) {
                cleanDest = `+${cleanDest}`;
            }

            const configuredCallerId = callerId || 'Anonymous';
            console.log(`Making call to ${cleanDest} with caller ID: ${configuredCallerId}`);

            // Log the call immediately to call_logs (bypasses webhook delay/dependency)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('call_logs').insert({
                    tenant_id: user.id,
                    direction: 'outbound',
                    from_number: configuredCallerId,
                    to_number: cleanDest,
                    status: 'ringing',
                    created_at: new Date().toISOString()
                });
                console.log('Call logged to call_logs table');
            }

            const newCall = client.newCall({
                destinationNumber: cleanDest,
                callerNumber: configuredCallerId,
                audio: true
            })
            setCall(newCall)
            setCallState('connecting')
        } catch (e) {
            console.error("Error making call", e)
        }
    }, [client, callerId, supabase])

    const answerCall = useCallback(() => {
        if (call) call.answer()
    }, [call])

    const hangup = useCallback(() => {
        if (call) call.hangup()
        else setCallState('idle')
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
