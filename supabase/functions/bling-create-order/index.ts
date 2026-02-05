import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOrCreateContact, createSalesOrder, issueNFe } from "../_shared/bling-client.ts";

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

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      throw new Error('orderId is required');
    }

    console.log('Processing order:', orderId);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Get order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*, products(sku)')
      .eq('order_id', orderId);

    if (itemsError) {
      throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    }

    console.log('Order items:', items?.length);

    // Step 1: Get or create contact in Bling
    const contactId = await getOrCreateContact({
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      address: order.customer_address,
      city: order.customer_city,
      state: order.customer_state,
      zip: order.customer_zip,
    });

    // Step 2: Create sales order in Bling
    const blingItems = items?.map(item => ({
      sku: item.products?.sku || `PROD-${item.product_id.slice(0, 8)}`,
      name: item.product_name,
      quantity: item.quantity,
      price: item.product_price,
    })) || [];

    const { orderId: blingOrderId, orderNumber } = await createSalesOrder({
      contactId,
      items: blingItems,
      shipping: order.shipping_cost,
      notes: order.notes || '',
    });

    // Step 3: Issue NF-e
    const { nfeId, nfeNumber } = await issueNFe(blingOrderId);

    // Step 4: Save Bling order info
    const { error: blingOrderError } = await supabase
      .from('bling_orders')
      .insert({
        order_id: orderId,
        bling_order_id: blingOrderId,
        bling_nfe_id: nfeId || null,
        bling_nfe_number: nfeNumber || null,
        bling_contact_id: contactId,
        status: nfeNumber ? 'nfe_issued' : 'order_created',
      });

    if (blingOrderError) {
      console.error('Failed to save bling order:', blingOrderError);
    }

    // Step 5: Update order status
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId);

    console.log('Order processed successfully:', {
      blingOrderId,
      orderNumber,
      nfeId,
      nfeNumber,
    });

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
