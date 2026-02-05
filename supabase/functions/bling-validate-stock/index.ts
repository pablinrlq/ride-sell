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
    const body = await req.json();
    const { items } = body; // Array of { productId, quantity, sku }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('items array is required');
    }

    console.log('Validating stock for items:', items);

    // Check if store is open
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('is_store_open')
      .limit(1)
      .maybeSingle();

    if (!storeSettings?.is_store_open) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'store_closed',
          message: 'A loja está fechada no momento. Tente novamente mais tarde.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('bling_oauth_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError || !tokenData) {
      // If Bling is not connected, fall back to local stock
      console.log('Bling not connected, using local stock');
      
      const validationResults = [];
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, stock_quantity, is_active')
          .eq('id', item.productId)
          .single();

        if (!product) {
          validationResults.push({
            productId: item.productId,
            valid: false,
            reason: 'product_not_found',
            message: 'Produto não encontrado'
          });
        } else if (!product.is_active) {
          validationResults.push({
            productId: item.productId,
            valid: false,
            reason: 'product_inactive',
            message: `${product.name} não está disponível para venda`
          });
        } else if (product.stock_quantity < item.quantity) {
          validationResults.push({
            productId: item.productId,
            valid: false,
            reason: 'insufficient_stock',
            message: `${product.name}: estoque insuficiente (disponível: ${product.stock_quantity})`,
            available: product.stock_quantity
          });
        } else {
          validationResults.push({
            productId: item.productId,
            valid: true,
            available: product.stock_quantity
          });
        }
      }

      const allValid = validationResults.every(r => r.valid);
      return new Response(
        JSON.stringify({ 
          valid: allValid, 
          results: validationResults,
          source: 'local'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
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

      if (!refreshResponse.ok) throw new Error('Token refresh failed');

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

    // Validate each item against Bling
    const validationResults = [];
    
    for (const item of items) {
      // Get product from local DB to check is_active and get SKU
      const { data: localProduct } = await supabase
        .from('products')
        .select('id, name, sku, is_active, stock_quantity')
        .eq('id', item.productId)
        .single();

      if (!localProduct) {
        validationResults.push({
          productId: item.productId,
          valid: false,
          reason: 'product_not_found',
          message: 'Produto não encontrado'
        });
        continue;
      }

      if (!localProduct.is_active) {
        validationResults.push({
          productId: item.productId,
          valid: false,
          reason: 'product_inactive',
          message: `${localProduct.name} não está disponível para venda`
        });
        continue;
      }

      // If product has SKU, validate against Bling
      if (localProduct.sku) {
        try {
          const blingResponse = await fetch(
            `${BLING_API_BASE}/produtos?codigo=${encodeURIComponent(localProduct.sku)}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            }
          );

          if (blingResponse.ok) {
            const blingData = await blingResponse.json();
            const blingProduct = blingData.data?.[0];
            
            if (blingProduct) {
              const blingStock = blingProduct.estoque?.saldoVirtualTotal || 0;
              
              // Update local stock with Bling value
              await supabase
                .from('products')
                .update({ stock_quantity: blingStock })
                .eq('id', item.productId);

              if (blingStock < item.quantity) {
                validationResults.push({
                  productId: item.productId,
                  valid: false,
                  reason: 'insufficient_stock',
                  message: `${localProduct.name}: estoque insuficiente (disponível: ${blingStock})`,
                  available: blingStock
                });
                continue;
              }

              validationResults.push({
                productId: item.productId,
                valid: true,
                available: blingStock,
                source: 'bling'
              });
              continue;
            }
          }
        } catch (e) {
          console.error('Error checking Bling stock for', localProduct.sku, e);
        }
      }

      // Fallback to local stock
      if (localProduct.stock_quantity < item.quantity) {
        validationResults.push({
          productId: item.productId,
          valid: false,
          reason: 'insufficient_stock',
          message: `${localProduct.name}: estoque insuficiente (disponível: ${localProduct.stock_quantity})`,
          available: localProduct.stock_quantity
        });
      } else {
        validationResults.push({
          productId: item.productId,
          valid: true,
          available: localProduct.stock_quantity,
          source: 'local'
        });
      }
    }

    const allValid = validationResults.every(r => r.valid);
    
    console.log('Stock validation complete:', { allValid, results: validationResults });

    return new Response(
      JSON.stringify({ 
        valid: allValid, 
        results: validationResults 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Stock validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
