
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { audio_url, tenant_id, call_control_id } = await req.json();

        if (!audio_url || !tenant_id) {
            throw new Error("Missing audio_url or tenant_id");
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Download Audio from Telnyx
        console.log("Downloading audio from:", audio_url);
        const audioResponse = await fetch(audio_url);
        if (!audioResponse.ok) throw new Error("Failed to download audio file from Telnyx");
        const audioBlob = await audioResponse.blob();

        // Convert Blob to Base64 (Gemini API Inline Data Requirement)
        // Note: For files < 20MB, inline data is fine. For larger, use File API (upload/get).
        // Telnyx recordings are usually small enough for inline processing in this MVP.
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

        // 2. Initialize Gemini 1.5 Flash
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. Generate Content (Transcript + Analysis in ONE pass)
        console.log("Sending to Gemini 1.5 Flash...");
        const prompt = `
            Please process this audio file. 
            Phase 1: Transcribe the audio verbatim keeping the original language (Portuguese).
            Phase 2: Analyze the transcript.
            
            Return the result in strictly valid JSON format with the following structure:
            {
                "transcript": "Full text transcription here...",
                "summary": "3 bullet point summary in Portuguese...",
                "sentiment_score": 0.8, (Number between -1.0 and 1.0)
                "sentiment_label": "positive" (positive, neutral, or negative)
            }
            Do not include Markdown formatting like \`\`\`json. Just the raw JSON string.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/mp3",
                    data: base64Audio
                }
            }
        ]);

        const response = await result.response;
        let text = response.text();

        // Clean up markdown if Gemini adds it despite instructions
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log("Gemini Response:", text.substring(0, 100) + "...");

        let analysis;
        try {
            analysis = JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            // Fallback if JSON fails, partial save
            analysis = {
                transcript: text,
                summary: "Error parsing Analysis JSON",
                sentiment_label: "neutral",
                sentiment_score: 0
            };
        }

        // 4. Save to Call Intelligence
        const { error } = await supabase.from('call_intelligence').insert({
            tenant_id,
            call_id: call_control_id,
            transcript: analysis.transcript,
            summary: analysis.summary,
            sentiment_score: analysis.sentiment_score,
            sentiment_label: analysis.sentiment_label,
            cost_ai: 0.001 // Flash is much cheaper
        });

        if (error) throw error;

        return new Response(
            JSON.stringify({ success: true, analysis }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error("Process Audio Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
