import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLING_API_BASE = 'https://www.bling.com.br/Api/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const BLING_CLIENT_ID = Deno.env.get('BLING_CLIENT_ID')!;
    const BLING_CLIENT_SECRET = Deno.env.get('BLING_CLIENT_SECRET')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting Bling product sync...');

    // Get access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('bling_oauth_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError || !tokenData) {
      throw new Error('Bling not connected. Please authorize first.');
    }

    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();

    // Refresh token if expired
    if (expiresAt.getTime() - now.getTime() < 300000) {
      console.log('Token expired, refreshing...');
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

      if (!refreshResponse.ok) throw new Error('Failed to refresh token');

      const newTokenData = await refreshResponse.json();
      const newExpiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000));

      await supabase.from('bling_oauth_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('bling_oauth_tokens').insert({
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token,
        expires_at: newExpiresAt.toISOString(),
      });

      accessToken = newTokenData.access_token;
    }

    // Fetch products from Bling
    const allProducts: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const response = await fetch(`${BLING_API_BASE}/produtos?pagina=${page}&limite=100`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bling API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (result.data && result.data.length > 0) {
        allProducts.push(...result.data);
        page++;
        hasMore = result.data.length === 100;
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allProducts.length} products from Bling`);
    
    let synced = 0;
    let failed = 0;

    for (const product of allProducts) {
      try {
        const productId = product.id.toString();
        
        // Cache product data
        await supabase
          .from('bling_products_cache')
          .upsert({
            bling_product_id: productId,
            data: product,
            synced_at: new Date().toISOString(),
          }, { onConflict: 'bling_product_id' });

        // Create slug
        const slug = product.nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const productData = {
          sku: product.codigo || productId,
          name: product.nome,
          slug: `${slug}-${productId}`,
          description: product.descricaoCurta || product.observacoes || null,
          price: parseFloat(product.preco) || 0,
          promotional_price: product.precoPromocional ? parseFloat(product.precoPromocional) : null,
          stock_quantity: product.estoque?.saldoVirtualTotal || 0,
          is_active: product.situacao === 'A',
          brand: product.marca || null,
        };

        // Check if product exists
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('sku', productData.sku)
          .maybeSingle();

        if (existingProduct) {
          await supabase
            .from('products')
            .update({
              name: productData.name,
              description: productData.description,
              price: productData.price,
              promotional_price: productData.promotional_price,
              stock_quantity: productData.stock_quantity,
              is_active: productData.is_active,
              brand: productData.brand,
            })
            .eq('id', existingProduct.id);
        } else {
          const { data: newProduct, error: insertError } = await supabase
            .from('products')
            .insert(productData)
            .select()
            .single();

          if (insertError) {
            console.error('Failed to insert product:', productData.sku, insertError);
            failed++;
            continue;
          }

          if (product.imagemURL && newProduct) {
            await supabase
              .from('product_images')
              .insert({
                product_id: newProduct.id,
                image_url: product.imagemURL,
                is_primary: true,
                display_order: 0,
              });
          }
        }

        synced++;
      } catch (e) {
        console.error('Error syncing product:', product.id, e);
        failed++;
      }
    }

    console.log(`Sync complete. Synced: ${synced}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, synced, failed, total: allProducts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Product sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
