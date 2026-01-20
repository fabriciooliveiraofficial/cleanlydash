// ARQUIVO: app/actions/telephony-ai.ts
'use server'

import { GoogleGenAI, Type } from "@google/genai"
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY })

/**
 * Helper function to encode ArrayBuffer to base64 string without using Node's Buffer.
 * This ensures compatibility across different Next.js runtimes (Node.js and Edge).
 */
function encodeToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Processa a gravação da chamada usando IA para extrair insights.
 */
export async function processCallAnalysis(callId: string, recordingUrl: string) {
  const supabase = createClient()
  
  try {
    // 1. Download do áudio (Proxy via server)
    const audioRes = await fetch(`${recordingUrl}&key=${process.env.TELNYX_API_KEY}`)
    if (!audioRes.ok) throw new Error("Falha ao baixar gravação")
    const audioBuffer = await audioRes.arrayBuffer()
    
    // Fix: Replaced Buffer.from().toString('base64') with a standard encoding method to resolve 'Buffer' not found error.
    const base64Audio = encodeToBase64(audioBuffer)

    // 2. Análise via Gemini (Nativo Audio)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      contents: [
        {
          inlineData: {
            mimeType: 'audio/mp3',
            data: base64Audio,
          },
        },
        {
          text: `Analise esta chamada de atendimento/venda para uma empresa de limpeza. 
          Extraia as informações seguindo o esquema JSON definido. 
          Considere o tom de voz e o conteúdo da conversa.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Resumo de 3 linhas da chamada." },
            sentimentScore: { type: Type.INTEGER, description: "Score de 0 (Bravo) a 100 (Feliz)." },
            transcription: { type: Type.STRING, description: "Transcrição fiel da conversa." },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  deadline: { type: Type.STRING, description: "Se mencionado" }
                }
              }
            }
          },
          required: ["summary", "sentimentScore", "transcription", "actionItems"]
        }
      }
    })

    // Access .text property directly as per Gemini API guidelines.
    const analysis = JSON.parse(response.text || '{}')

    // 3. Persistir no Banco de Dados
    const { error } = await supabase
      .from('comms_logs')
      .update({
        transcription_full: analysis.transcription,
        ai_summary: analysis.summary,
        ai_action_items: analysis.actionItems,
        ai_sentiment_score: analysis.sentimentScore,
        status: 'analyzed'
      })
      .eq('id', callId)

    if (error) throw error

    revalidatePath('/dashboard/telephony')
    return { success: true, data: analysis }

  } catch (err: any) {
    console.error("AI Analysis Error:", err.message)
    return { error: err.message }
  }
}
