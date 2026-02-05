import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BLING_API_BASE = 'https://www.bling.com.br/Api/v3';

export async function getBlingAccessToken(): Promise<string> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const BLING_CLIENT_ID = Deno.env.get('BLING_CLIENT_ID')!;
  const BLING_CLIENT_SECRET = Deno.env.get('BLING_CLIENT_SECRET')!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get current token
  const { data: tokenData, error } = await supabase
    .from('bling_oauth_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !tokenData) {
    throw new Error('Bling not connected. Please authorize first.');
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    console.log('Token expired or expiring soon, refreshing...');
    
    // Refresh token
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

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Token refresh failed:', errorText);
      throw new Error('Failed to refresh Bling token. Please reconnect.');
    }

    const newTokenData = await refreshResponse.json();
    const newExpiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000));

    // Update tokens in database
    await supabase.from('bling_oauth_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('bling_oauth_tokens').insert({
      access_token: newTokenData.access_token,
      refresh_token: newTokenData.refresh_token,
      expires_at: newExpiresAt.toISOString(),
    });

    console.log('Token refreshed successfully');
    return newTokenData.access_token;
  }

  return tokenData.access_token;
}

export async function blingRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const accessToken = await getBlingAccessToken();

  const response = await fetch(`${BLING_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Bling API error [${response.status}]:`, errorText);
    throw new Error(`Bling API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Get or create contact in Bling
export async function getOrCreateContact(customer: {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}): Promise<string> {
  // Search for existing contact by email
  try {
    const searchResult = await blingRequest(`/contatos?pesquisa=${encodeURIComponent(customer.email)}`);
    
    if (searchResult.data && searchResult.data.length > 0) {
      console.log('Contact found:', searchResult.data[0].id);
      return searchResult.data[0].id.toString();
    }
  } catch (e) {
    console.log('Contact search failed, will create new:', e);
  }

  // Create new contact
  const contactPayload = {
    nome: customer.name,
    fantasia: customer.name,
    tipo: 'F', // Pessoa Física
    contribuinte: 9, // Não contribuinte
    email: customer.email,
    telefone: customer.phone.replace(/\D/g, ''),
    celular: customer.phone.replace(/\D/g, ''),
    endereco: {
      endereco: customer.address,
      numero: 'S/N',
      bairro: '',
      municipio: customer.city,
      uf: customer.state.toUpperCase(),
      cep: customer.zip.replace(/\D/g, ''),
    },
  };

  console.log('Creating contact:', JSON.stringify(contactPayload));
  
  const createResult = await blingRequest('/contatos', {
    method: 'POST',
    body: JSON.stringify(contactPayload),
  });

  console.log('Contact created:', createResult.data.id);
  return createResult.data.id.toString();
}

// Create sales order in Bling
export async function createSalesOrder(params: {
  contactId: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  shipping: number;
  notes?: string;
}): Promise<{ orderId: string; orderNumber: string }> {
  const itens = params.items.map((item, index) => ({
    codigo: item.sku || `PROD-${index}`,
    descricao: item.name,
    unidade: 'UN',
    quantidade: item.quantity,
    valor: item.price,
  }));

  const orderPayload = {
    contato: {
      id: parseInt(params.contactId),
    },
    itens: itens,
    transporte: {
      frete: params.shipping,
    },
    observacoes: params.notes || 'Pedido realizado pelo site',
    observacoesInternas: 'Pedido automático - Daniel Bike Shop Site',
  };

  console.log('Creating order:', JSON.stringify(orderPayload));

  const result = await blingRequest('/pedidos/vendas', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });

  console.log('Order created:', result.data.id, result.data.numero);
  
  return {
    orderId: result.data.id.toString(),
    orderNumber: result.data.numero?.toString() || result.data.id.toString(),
  };
}

// Issue NF-e/NFC-e for order
export async function issueNFe(orderId: string): Promise<{ nfeId: string; nfeNumber: string }> {
  // First, generate the NF-e from the order
  const generatePayload = {
    idsPedidosVendas: [parseInt(orderId)],
    finalidade: 1, // Normal
    tipo: 1, // Saída
  };

  console.log('Generating NF-e for order:', orderId);

  try {
    const generateResult = await blingRequest('/nfe', {
      method: 'POST',
      body: JSON.stringify(generatePayload),
    });

    const nfeId = generateResult.data?.id?.toString();
    
    if (!nfeId) {
      console.log('NF-e generation response:', JSON.stringify(generateResult));
      throw new Error('Failed to generate NF-e');
    }

    // Send/transmit the NF-e to SEFAZ
    console.log('Transmitting NF-e:', nfeId);
    
    await blingRequest(`/nfe/${nfeId}/enviar`, {
      method: 'POST',
    });

    // Get NF-e details to retrieve the number
    const nfeDetails = await blingRequest(`/nfe/${nfeId}`);
    const nfeNumber = nfeDetails.data?.numero?.toString() || nfeId;

    console.log('NF-e issued successfully:', nfeId, nfeNumber);

    return {
      nfeId: nfeId,
      nfeNumber: nfeNumber,
    };
  } catch (error) {
    console.error('NF-e issuance failed:', error);
    // Return empty values but don't fail the order
    return {
      nfeId: '',
      nfeNumber: '',
    };
  }
}

// Fetch products from Bling
export async function fetchBlingProducts(): Promise<any[]> {
  const allProducts: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const result = await blingRequest(`/produtos?pagina=${page}&limite=100`);
      
      if (result.data && result.data.length > 0) {
        allProducts.push(...result.data);
        page++;
        
        // Check if there are more pages
        hasMore = result.data.length === 100;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error fetching products page', page, error);
      hasMore = false;
    }
  }

  console.log(`Fetched ${allProducts.length} products from Bling`);
  return allProducts;
}
