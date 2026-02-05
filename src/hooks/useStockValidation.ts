import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StockItem {
  productId: string;
  quantity: number;
  sku?: string;
}

interface StockValidationResult {
  productId: string;
  valid: boolean;
  reason?: string;
  message?: string;
  available?: number;
  source?: 'bling' | 'local';
}

interface StockValidationResponse {
  valid: boolean;
  error?: string;
  message?: string;
  results?: StockValidationResult[];
  source?: string;
}

export const useValidateStock = () => {
  return useMutation({
    mutationFn: async (items: StockItem[]): Promise<StockValidationResponse> => {
      const { data, error } = await supabase.functions.invoke('bling-validate-stock', {
        body: { items },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao validar estoque');
      }

      return data as StockValidationResponse;
    },
  });
};

export const useCheckStoreOpen = () => {
  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('is_store_open')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.is_store_open ?? true;
    },
  });
};
