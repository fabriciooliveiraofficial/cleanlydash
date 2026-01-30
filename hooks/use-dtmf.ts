import { useCallback, useEffect, useRef } from 'react'

const DTMF_FREQUENCIES: Record<string, [number, number]> = {
    '1': [697, 1209],
    '2': [697, 1336],
    '3': [697, 1477],
    'A': [697, 1633],
    '4': [770, 1209],
    '5': [770, 1336],
    '6': [770, 1477],
    'B': [770, 1633],
    '7': [852, 1209],
    '8': [852, 1336],
    '9': [852, 1477],
    'C': [852, 1633],
    '*': [941, 1209],
    '0': [941, 1336],
    '#': [941, 1477],
    'D': [941, 1633],
}

export function useDtmf() {
    const audioContext = useRef<AudioContext | null>(null)

    useEffect(() => {
        // Initialize AudioContext on first user interaction if needed, 
        // but usually better to let playTone handle lazy init to avoid 
        // "AudioContext was not allowed to start" warnings before interaction
        return () => {
            audioContext.current?.close()
        }
    }, [])

    const playTone = useCallback((key: string, duration = 150) => {
        const frequencies = DTMF_FREQUENCIES[key.toUpperCase()]
        if (!frequencies) return

        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }

        if (audioContext.current.state === 'suspended') {
            audioContext.current.resume()
        }

        const ctx = audioContext.current
        const now = ctx.currentTime

        // Oscillator 1 (Low Frequency)
        const osc1 = ctx.createOscillator()
        osc1.frequency.value = frequencies[0]
        osc1.type = 'sine'

        // Oscillator 2 (High Frequency)
        const osc2 = ctx.createOscillator()
        osc2.frequency.value = frequencies[1]
        osc2.type = 'sine'

        // Gain Node (Volume Control & Envelop)
        const gainNode = ctx.createGain()
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000)

        // Connect graph
        osc1.connect(gainNode)
        osc2.connect(gainNode)
        gainNode.connect(ctx.destination)

        // Start and stop
        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + duration / 1000)
        osc2.stop(now + duration / 1000)
    }, [])

    return { playTone }
}
