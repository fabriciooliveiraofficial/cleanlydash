'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { TelnyxRTC } from '@telnyx/webrtc'
import { getTelnyxToken } from '@/app/(dashboard)/telephony/actions.ts'

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

export function TelnyxProvider({ children }: { children: React.ReactNode }) {
    const [client, setClient] = useState<any>(null)
    const [call, setCall] = useState<any>(null)
    const [callState, setCallState] = useState<CallState>('idle')
    const [isMuted, setIsMuted] = useState(false)
    const [duration, setDuration] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Inicializar Cliente Telnyx
    useEffect(() => {
        async function initTelnyx() {
            // In a real app, you might want to only connect when the user clicks "Go Online" or logs in
            // For now, we connect on mount for simplicity
            // BYPASS FOR VITE (Client-Side Only)
            // 'getTelnyxToken' uses Next.js Server Actions which are incompatible with Vite.
            // For production, this requires a dedicated backend/Edge Function.
            console.warn('Telephony: Backend required for real calls. Mocking connection.');
            setCallState('idle');
            return;

            /* 
            const { token, error } = await getTelnyxToken()
            if (error || !token) {
                console.error('Failed to get Telnyx token:', error)
                setCallState('error')
                return
            }
            ... (rest of code logic would go here if we had a token)
            */

            /*
            const rtcClient = new TelnyxRTC({
                login_token: token
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
                if (notification.type === 'callUpdate') {
                    const { call: updatedCall } = notification
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
            */
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
                callerNumber: 'AirGoverness-System',
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
