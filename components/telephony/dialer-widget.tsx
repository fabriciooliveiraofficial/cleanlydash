// ARQUIVO: components/telephony/dialer-widget.tsx
'use client'

import * as React from 'react'
import {
  Phone,
  PhoneOff,
  MicOff,
  Mic,
  ChevronDown,
  Grid,
  Delete,
  X,
  Volume2,
  Clock,
  Circle,
  Sparkles,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { cn } from '@/lib/utils.ts'
import { useTelnyx } from '@/hooks/use-telnyx.ts'
import { useLiveCoach } from '@/hooks/use-live-coach.ts'

export function DialerWidget() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const [destination, setDestination] = React.useState('')

  // Persist position
  const [position, setPosition] = React.useState(() => {
    const saved = localStorage.getItem('pwa_dialer_pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  const {
    callState,
    makeCall,
    answerCall,
    hangup,
    toggleMute,
    isMuted,
    duration,
    remoteNumber
  } = useTelnyx()

  const { currentTip } = useLiveCoach(callState === 'active')

  React.useEffect(() => {
    if (callState === 'ringing') setIsOpen(true)
  }, [callState])

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleKeyClick = (key: string) => {
    setDestination(prev => prev + key)
  }

  const handleDragEnd = (_e: any, info: any) => {
    const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
    setPosition(newPos);
    localStorage.setItem('pwa_dialer_pos', JSON.stringify(newPos));
    setTimeout(() => setIsDragging(false), 100);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      style={{ x: position.x, y: position.y }}
      className="fixed bottom-6 right-6 z-50 touch-none"
    >
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="closed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => {
              if (!isDragging) setIsOpen(true)
            }}
            className={cn(
              "h-14 w-14 rounded-full bg-indigo-600 text-white shadow-[0_10px_30px_rgba(99,102,241,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing backdrop-blur-sm border border-white/20",
              callState === 'ringing' && "animate-bounce bg-rose-500 shadow-rose-500/50"
            )}
          >
            <Phone size={24} className={cn(callState === 'ringing' && "animate-pulse")} />
            {callState === 'ringing' && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Circle size={8} className="fill-rose-500 text-rose-500 animate-ping" />
              </span>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="open"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="glass-panel w-80 rounded-[32px] overflow-hidden flex flex-col border-white/60 shadow-[0_30px_60px_rgba(0,0,0,0.12)]"
          >
            {/* Header Glass */}
            <div className="p-4 border-b border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-between cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]",
                  callState === 'active' ? "bg-emerald-400 animate-pulse shadow-emerald-400" :
                    callState === 'error' ? "bg-rose-400" : "bg-emerald-400/50"
                )} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  {callState === 'idle' ? 'Disponível' :
                    callState === 'ringing' ? 'Recebendo...' :
                      callState === 'active' ? 'Em Chamada' : 'Conectando'}
                </span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-black/5 rounded-full">
                <ChevronDown size={18} />
              </button>
            </div>

            <div className="p-6 bg-gradient-to-b from-white/40 to-white/10">
              {/* LIVE COACH TIP */}
              {callState === 'active' && currentTip && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50/80 border border-amber-100/50 text-[11px] text-amber-900 font-bold animate-in zoom-in-95 flex gap-2 backdrop-blur-sm shadow-sm">
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                  <p>{currentTip}</p>
                </div>
              )}

              {callState === 'idle' || callState === 'connecting' ? (
                <div className="space-y-6">
                  <div className="relative group">
                    <Input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Discar..."
                      className="h-14 text-center text-2xl font-black tracking-widest rounded-2xl border-white/40 bg-white/30 focus:bg-white/50 backdrop-blur-sm pr-10 shadow-inner placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal outline-none ring-0 focus-visible:ring-indigo-100"
                    />
                    {destination && (
                      <button
                        onClick={() => setDestination(prev => prev.slice(0, -1))}
                        className="absolute right-4 top-4 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Delete size={20} />
                      </button>
                    )}
                  </div>

                  {/* Keypad Glass */}
                  <div className="grid grid-cols-3 gap-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                      <button
                        key={key}
                        onClick={() => handleKeyClick(key)}
                        className="h-12 w-full rounded-2xl bg-white/20 hover:bg-white/60 text-slate-700 font-bold text-xl transition-all duration-200 active:scale-90 border border-white/30 shadow-sm hover:shadow-md"
                      >
                        {key}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={() => makeCall(destination)}
                    disabled={!destination}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 font-black gap-3 text-white transition-transform active:scale-95"
                  >
                    <Phone size={20} className="fill-white/20" />
                    CHAMAR
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 space-y-8">
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                      <div className="relative h-24 w-24 rounded-[32px] bg-gradient-to-br from-slate-50 to-white flex items-center justify-center text-slate-400 mx-auto border border-white shadow-xl">
                        <Volume2 size={36} className="text-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-800 tracking-tight">{remoteNumber || destination || 'Desconhecido'}</h4>
                      <div className="flex items-center justify-center gap-2 text-indigo-500 font-mono font-bold text-sm bg-indigo-50/50 py-1 px-3 rounded-full mx-auto w-fit mt-2 border border-indigo-100/50">
                        <Clock size={12} />
                        {formatTime(duration)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <button
                      onClick={toggleMute}
                      className={cn(
                        "h-14 w-14 rounded-2xl border flex items-center justify-center transition-all shadow-sm",
                        isMuted ? "bg-amber-100 border-amber-200 text-amber-600" : "bg-white/40 border-white/60 text-slate-500 hover:bg-white hover:scale-105"
                      )}
                    >
                      {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    {callState === 'ringing' ? (
                      <>
                        <button
                          onClick={answerCall}
                          className="h-20 w-20 rounded-[32px] bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.4)] flex items-center justify-center animate-bounce transition-transform hover:scale-105"
                        >
                          <Phone size={32} className="fill-current" />
                        </button>
                        <button
                          onClick={hangup}
                          className="h-14 w-14 rounded-2xl bg-rose-50/80 text-rose-500 border border-rose-200 shadow-sm flex items-center justify-center hover:bg-rose-100"
                        >
                          <X size={24} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={hangup}
                        className="h-20 w-20 rounded-[32px] bg-rose-500 text-white shadow-[0_10px_30px_rgba(244,63,94,0.4)] flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                      >
                        <PhoneOff size={32} className="fill-current" />
                      </button>
                    )}

                    <button className="h-14 w-14 rounded-2xl border border-white/60 bg-white/40 text-slate-400 flex items-center justify-center hover:bg-white shadow-sm transition-all hover:scale-105">
                      <Grid size={24} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-white/30 backdrop-blur-md text-center flex items-center justify-center gap-2 border-t border-white/20">
              <Sparkles size={12} className="text-indigo-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                AI Coach Active
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}