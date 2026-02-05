import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchBlingProducts } from "../_shared/bling-client.ts";

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
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting Bling product sync...');

    // Fetch all products from Bling
    const blingProducts = await fetchBlingProducts();
    
    let synced = 0;
    let failed = 0;

    for (const product of blingProducts) {
      try {
        // Get product details with stock
        const productId = product.id.toString();
        
        // Cache the product data
        await supabase
          .from('bling_products_cache')
          .upsert({
            bling_product_id: productId,
            data: product,
            synced_at: new Date().toISOString(),
          }, {
            onConflict: 'bling_product_id',
          });

        // Create slug from name
        const slug = product.nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // Update or create product in main products table
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

        // Check if product exists by SKU
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('sku', productData.sku)
          .maybeSingle();

        if (existingProduct) {
          // Update existing product
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
          // Insert new product
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

          // If product has images, add them
          if (product.imagemURL) {
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
      JSON.stringify({
        success: true,
        synced,
        failed,
        total: blingProducts.length,
      }),
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
