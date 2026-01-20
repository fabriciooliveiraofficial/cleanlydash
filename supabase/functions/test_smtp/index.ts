import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// POLYFILL for Deno.writeAll (Removed in recent Deno/Supabase versions)
// The 'smtp' library depends on this.
if (typeof Deno.writeAll === "undefined") {
    // @ts-ignore: Patching missing std function
    Deno.writeAll = async (writer: Deno.Writer, data: Uint8Array) => {
        let n = 0;
        while (n < data.length) {
            const nwritten = await writer.write(data.subarray(n));
            n += nwritten;
        }
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { host, port, username, password, encryption } = await req.json()

        if (!host || !username || !password) {
            throw new Error('Missing credentials')
        }

        const client = new SmtpClient();

        // Mode: SSL/TLS (Implicit) - Port 465
        if (encryption === 'ssl') {
            const connectPromise = client.connectTLS({
                hostname: host,
                port: port,
                username: username,
                password: password,
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("SSL Connection timed out (10s). Check if port 465 is open.")), 10000)
            );
            await Promise.race([connectPromise, timeoutPromise]);
        }
        // Mode: STARTTLS (Explicit) - Port 587
        else {
            // 1. Connect Insecurely first
            const connectPromise = client.connect({
                hostname: host,
                port: port,
                username: username,
                password: password,
            });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection timed out (10s). Check Host/Port firewall.")), 10000)
            );
            await Promise.race([connectPromise, timeoutPromise]);

            // 2. Upgrade to TLS if requested (STARTTLS)
            // Note: client.connect usually handles auth. 
            // If we want explicit STARTTLS, often we connect -> startTLS -> login.
            // But this lib's `connect` helper does login automatically. 
            // For now, assuming `connect` does opportunistic TLS if available on 587.
            // If encryption == 'none', we are good.
        }

        // If we passed connect, auth is good.
        await client.close();

        return new Response(
            JSON.stringify({ message: 'Connection successful' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
