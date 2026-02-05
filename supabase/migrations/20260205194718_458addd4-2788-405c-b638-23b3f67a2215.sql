-- Add is_store_open field to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS is_store_open boolean NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.store_settings.is_store_open IS 'Controls whether the store is open for customers to make purchases';