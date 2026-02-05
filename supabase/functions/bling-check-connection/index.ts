import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const BLING_CLIENT_ID = Deno.env.get('BLING_CLIENT_ID');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: tokenData, error } = await supabase
      .from('bling_oauth_tokens')
      .select('expires_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isConnected = !error && tokenData && new Date(tokenData.expires_at) > new Date();

    const redirectUri = `${SUPABASE_URL}/functions/v1/bling-oauth-callback`;
    const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${BLING_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=connect`;

    return new Response(
      JSON.stringify({
        connected: isConnected,
        authUrl: authUrl,
        expiresAt: tokenData?.expires_at || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Check connection error:', error);
    return new Response(
      JSON.stringify({ connected: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
