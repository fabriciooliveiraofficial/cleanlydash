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
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

            if (error || !data?.token) {
                console.error('Failed to get Telnyx token:', error);
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

            const rtcClient = new TelnyxRTC({
                login_token: data.token
            })

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
                            break
                    }
                }
            })

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

    const makeCall = useCallback((destination: string) => {
        if (!client) {
            console.warn("Telnyx client not ready")
            return
        }
        try {
            const newCall = client.newCall({
                destinationNumber: destination,
                callerNumber: 'Cleanlydash-System',
                audio: true
            })
            setCall(newCall)
            setCallState('connecting')
        } catch (e) {
            console.error("Error making call", e)
        }
    }, [client])

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
