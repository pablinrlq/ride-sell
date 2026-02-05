import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLING_API_BASE = 'https://www.bling.com.br/Api/v3';

async function getBlingAccessToken(supabase: any): Promise<string> {
  const BLING_CLIENT_ID = Deno.env.get('BLING_CLIENT_ID')!;
  const BLING_CLIENT_SECRET = Deno.env.get('BLING_CLIENT_SECRET')!;

  const { data: tokenData, error } = await supabase
    .from('bling_oauth_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !tokenData) {
    throw new Error('Bling not connected');
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  if (expiresAt.getTime() - now.getTime() < 300000) {
    const credentials = btoa(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`);
    const refreshResponse = await fetch(`${BLING_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
      }),
    });

    if (!refreshResponse.ok) throw new Error('Token refresh failed');

    const newTokenData = await refreshResponse.json();
    const newExpiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000));

    await supabase.from('bling_oauth_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('bling_oauth_tokens').insert({
      access_token: newTokenData.access_token,
      refresh_token: newTokenData.refresh_token,
      expires_at: newExpiresAt.toISOString(),
    });

    return newTokenData.access_token;
  }

  return tokenData.access_token;
}

async function blingRequest(accessToken: string, endpoint: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${BLING_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bling API: ${response.status} - ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) throw new Error('orderId is required');

    console.log('Processing order:', orderId);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error(`Order not found: ${orderId}`);

    const { data: items } = await supabase
      .from('order_items')
      .select('*, products(sku)')
      .eq('order_id', orderId);

    const accessToken = await getBlingAccessToken(supabase);

    // 1. Create/find contact
    let contactId: string;
    try {
      const searchResult = await blingRequest(accessToken, `/contatos?pesquisa=${encodeURIComponent(order.customer_email)}`);
      if (searchResult.data?.length > 0) {
        contactId = searchResult.data[0].id.toString();
      } else {
        const contactPayload = {
          nome: order.customer_name,
          tipo: 'F',
          contribuinte: 9,
          email: order.customer_email,
          telefone: order.customer_phone.replace(/\D/g, ''),
          endereco: {
            endereco: order.customer_address,
            numero: 'S/N',
            municipio: order.customer_city,
            uf: order.customer_state.toUpperCase(),
            cep: order.customer_zip.replace(/\D/g, ''),
          },
        };
        const createResult = await blingRequest(accessToken, '/contatos', {
          method: 'POST',
          body: JSON.stringify(contactPayload),
        });
        contactId = createResult.data.id.toString();
      }
    } catch (e) {
      console.error('Contact error:', e);
      contactId = '';
    }

    // 2. Create order
    const blingItems = items?.map((item: any, index: number) => ({
      codigo: item.products?.sku || `PROD-${index}`,
      descricao: item.product_name,
      unidade: 'UN',
      quantidade: item.quantity,
      valor: item.product_price,
    })) || [];

    const orderPayload = {
      contato: { id: contactId ? parseInt(contactId) : undefined },
      itens: blingItems,
      transporte: { frete: order.shipping_cost },
      observacoes: order.notes || 'Pedido via site',
    };

    const orderResult = await blingRequest(accessToken, '/pedidos/vendas', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });

    const blingOrderId = orderResult.data.id.toString();
    const orderNumber = orderResult.data.numero?.toString() || blingOrderId;

    // 3. Try to issue NF-e
    let nfeId = '', nfeNumber = '';
    try {
      const nfePayload = { idsPedidosVendas: [parseInt(blingOrderId)], finalidade: 1, tipo: 1 };
      const nfeResult = await blingRequest(accessToken, '/nfe', {
        method: 'POST',
        body: JSON.stringify(nfePayload),
      });
      
      if (nfeResult.data?.id) {
        nfeId = nfeResult.data.id.toString();
        await blingRequest(accessToken, `/nfe/${nfeId}/enviar`, { method: 'POST' });
        const nfeDetails = await blingRequest(accessToken, `/nfe/${nfeId}`);
        nfeNumber = nfeDetails.data?.numero?.toString() || nfeId;
      }
    } catch (e) {
      console.error('NF-e error:', e);
    }

    // 4. Save Bling order info
    await supabase.from('bling_orders').insert({
      order_id: orderId,
      bling_order_id: blingOrderId,
      bling_nfe_id: nfeId || null,
      bling_nfe_number: nfeNumber || null,
      bling_contact_id: contactId || null,
      status: nfeNumber ? 'nfe_issued' : 'order_created',
    });

    await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId);

    console.log('Order processed:', { blingOrderId, orderNumber, nfeId, nfeNumber });

    return new Response(
      JSON.stringify({
        success: true,
        blingOrderId,
        orderNumber,
        nfeId,
        nfeNumber,
        nfeIssued: !!nfeNumber,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Order processing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
