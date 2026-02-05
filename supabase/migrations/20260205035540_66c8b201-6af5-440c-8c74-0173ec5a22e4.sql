-- Adicionar campo SKU para integração com Bling
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku VARCHAR(50);

-- Criar índice único para SKU (permitindo nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku) WHERE sku IS NOT NULL;

-- Comentário para documentar o propósito
COMMENT ON COLUMN public.products.sku IS 'Código SKU para integração com sistema Bling';