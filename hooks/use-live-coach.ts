
// ARQUIVO: hooks/use-live-coach.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

const COACHING_TRIGGERS = [
  {
    keywords: ['preço', 'caro', 'desconto', 'valor', 'custo'],
    tip: "Foque na qualidade premium: 'Nós garantimos a limpeza técnica com produtos hospitalares. Posso oferecer 5% se fecharmos o pacote agora?'"
  },
  {
    keywords: ['concorrente', 'outra empresa', 'vi no google', 'mais barato'],
    tip: "Diferencial Cleanlydash: 'Nós temos seguro de danos e todos os nossos parceiros passam por verificação de antecedentes criminais.'"
  },
  {
    keywords: ['atraso', 'demora', 'tempo', 'agilidade'],
    tip: "Compromisso de tempo: 'Nosso sistema de Dispatch monitora a equipe em tempo real para garantir pontualidade britânica.'"
  }
]

export function useLiveCoach(isActive: boolean) {
  const [currentTip, setCurrentTip] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')

  useEffect(() => {
    if (!isActive) {
      setCurrentTip(null)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'pt-BR'

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.toLowerCase()
          setTranscript(prev => prev + ' ' + text)

          // Verificar Gatilhos
          COACHING_TRIGGERS.forEach(trigger => {
            if (trigger.keywords.some(k => text.includes(k))) {
              setCurrentTip(trigger.tip)
              // Limpar tip após 10 segundos
              setTimeout(() => setCurrentTip(null), 10000)
            }
          })
        }
      }
    }

    recognition.start()

    return () => {
      recognition.stop()
    }
  }, [isActive])

  return { currentTip, transcript }
}
