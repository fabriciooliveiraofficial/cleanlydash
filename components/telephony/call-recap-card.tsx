
// ARQUIVO: components/telephony/call-recap-card.tsx
'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Smile, 
  Frown, 
  Meh, 
  ListTodo, 
  MessageSquareText, 
  History 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CallRecapProps {
  log: {
    ai_summary: string | null;
    ai_sentiment_score: number | null;
    ai_action_items: any[] | null;
    transcription_full: string | null;
  }
}

export function CallRecapCard({ log }: CallRecapProps) {
  if (!log.ai_summary) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-slate-50/50">
        <History className="h-10 w-10 text-slate-200 mb-4" />
        <p className="text-slate-400 font-bold text-sm uppercase tracking-tighter">Aguardando Análise de IA...</p>
      </div>
    )
  }

  const getSentimentIcon = (score: number) => {
    if (score >= 70) return <Smile className="text-emerald-500" />
    if (score <= 40) return <Frown className="text-rose-500" />
    return <Meh className="text-amber-500" />
  }

  const getSentimentColor = (score: number) => {
    if (score >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-100"
    if (score <= 40) return "bg-rose-50 text-rose-700 border-rose-100"
    return "bg-amber-50 text-amber-700 border-amber-100"
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Resumo e Sentimento */}
      <Card className="border-indigo-100 shadow-lg shadow-indigo-100/20 overflow-hidden bg-white">
        <CardHeader className="bg-indigo-50/50 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Sparkles className="text-indigo-600 h-4 w-4" />
            RESUMO INTELIGENTE
          </CardTitle>
          <Badge className={cn("gap-1 font-black", getSentimentColor(log.ai_sentiment_score || 50))}>
            {getSentimentIcon(log.ai_sentiment_score || 50)}
            {log.ai_sentiment_score}% HUMOR
          </Badge>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {log.ai_summary}
          </p>
          
          <div className="pt-4 border-t">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <MessageSquareText size={12} /> Transcrição Principal
            </h5>
            <p className="text-[11px] text-slate-500 italic line-clamp-3">
              "{log.transcription_full}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card className="border-emerald-100 shadow-lg shadow-emerald-100/20 bg-white">
        <CardHeader className="bg-emerald-50/50 py-4">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <ListTodo className="text-emerald-600 h-4 w-4" />
            PRÓXIMOS PASSOS (AI)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {log.ai_action_items && log.ai_action_items.length > 0 ? (
              log.ai_action_items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:border-emerald-200 transition-all">
                  <div className="mt-1 h-4 w-4 rounded border-2 border-emerald-200 flex items-center justify-center bg-white group-hover:bg-emerald-50 transition-colors" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{item.task}</span>
                    {item.deadline && <span className="text-[10px] text-emerald-600 font-bold uppercase">{item.deadline}</span>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-8">Nenhuma tarefa detectada.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
