-- Tabela para armazenar tokens OAuth do Bling
CREATE TABLE public.bling_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar pedidos sincronizados com Bling
CREATE TABLE public.bling_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  bling_order_id TEXT NOT NULL,
  bling_nfe_id TEXT,
  bling_nfe_number TEXT,
  bling_contact_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para cache de produtos do Bling
CREATE TABLE public.bling_products_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bling_product_id TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bling_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_products_cache ENABLE ROW LEVEL SECURITY;

-- Políticas para bling_oauth_tokens (apenas service role pode acessar)
CREATE POLICY "Service role access only for tokens"
  ON public.bling_oauth_tokens
  FOR ALL
  USING (false);

-- Políticas para bling_orders (leitura pública para consulta de status)
CREATE POLICY "Public read for bling_orders"
  ON public.bling_orders
  FOR SELECT
  USING (true);

CREATE POLICY "Service insert for bling_orders"
  ON public.bling_orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service update for bling_orders"
  ON public.bling_orders
  FOR UPDATE
  USING (true);

-- Políticas para bling_products_cache (leitura pública)
CREATE POLICY "Public read for bling_products_cache"
  ON public.bling_products_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Service write for bling_products_cache"
  ON public.bling_products_cache
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service update for bling_products_cache"
  ON public.bling_products_cache
  FOR UPDATE
  USING (true);

-- Índices
CREATE INDEX idx_bling_orders_order_id ON public.bling_orders(order_id);
CREATE INDEX idx_bling_orders_bling_order_id ON public.bling_orders(bling_order_id);
CREATE INDEX idx_bling_products_cache_synced ON public.bling_products_cache(synced_at);

-- Trigger para updated_at
CREATE TRIGGER update_bling_oauth_tokens_updated_at
  BEFORE UPDATE ON public.bling_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bling_orders_updated_at
  BEFORE UPDATE ON public.bling_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();