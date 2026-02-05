import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      console.error('Authorization code not provided');
      return new Response(
        `<html><body><h1>Erro</h1><p>Código de autorização não fornecido.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    const BLING_CLIENT_ID = Deno.env.get('BLING_CLIENT_ID');
    const BLING_CLIENT_SECRET = Deno.env.get('BLING_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!BLING_CLIENT_ID || !BLING_CLIENT_SECRET) {
      throw new Error('Bling credentials not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Exchange code for tokens
    const credentials = btoa(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`);
    const tokenResponse = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Bling token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Store tokens in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Delete existing tokens and insert new one
    await supabase.from('bling_oauth_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { error: insertError } = await supabase.from('bling_oauth_tokens').insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('Failed to store tokens:', insertError);
      throw new Error('Failed to store tokens');
    }

    console.log('Tokens stored successfully');

    return new Response(
      `<html>
        <head>
          <title>Bling Conectado</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
            .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #22c55e; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Bling Conectado com Sucesso!</h1>
            <p>Você já pode fechar esta janela.</p>
            <p>A integração está ativa e funcionando.</p>
          </div>
        </body>
      </html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 200 }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      `<html><body><h1>Erro</h1><p>${error.message}</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 500 }
    );
  }
});
