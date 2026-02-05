import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, Loader2, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AppliedCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
}

interface CouponInputProps {
  orderTotal: number;
  appliedCoupon: AppliedCoupon | null;
  onApplyCoupon: (coupon: AppliedCoupon | null) => void;
}

const CouponInput = ({ orderTotal, appliedCoupon, onApplyCoupon }: CouponInputProps) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Cupom inválido ou expirado');
        return;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('Este cupom expirou');
        return;
      }

      // Check start date
      if (data.starts_at && new Date(data.starts_at) > new Date()) {
        toast.error('Este cupom ainda não está ativo');
        return;
      }

      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast.error('Este cupom atingiu o limite de uso');
        return;
      }

      // Check minimum order value
      if (data.min_order_value && orderTotal < Number(data.min_order_value)) {
        toast.error(`Pedido mínimo de R$ ${Number(data.min_order_value).toFixed(2)} para usar este cupom`);
        return;
      }

      onApplyCoupon({
        code: data.code,
        discountType: data.discount_type as 'percentage' | 'fixed',
        discountValue: Number(data.discount_value),
        minOrderValue: Number(data.min_order_value) || 0,
      });

      toast.success('Cupom aplicado com sucesso!');
      setCode('');
    } catch (error) {
      console.error('Coupon error:', error);
      toast.error('Erro ao aplicar cupom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    onApplyCoupon(null);
    toast.info('Cupom removido');
  };

  const calculateDiscount = (coupon: AppliedCoupon) => {
    if (coupon.discountType === 'percentage') {
      return (orderTotal * coupon.discountValue) / 100;
    }
    return Math.min(coupon.discountValue, orderTotal);
  };

  if (appliedCoupon) {
    const discountAmount = calculateDiscount(appliedCoupon);
    
    return (
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-700 dark:text-green-400">
              {appliedCoupon.code}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          {appliedCoupon.discountType === 'percentage'
            ? `${appliedCoupon.discountValue}% de desconto`
            : `R$ ${appliedCoupon.discountValue.toFixed(2)} de desconto`}
          {' • '}
          <span className="font-semibold">-R$ {discountAmount.toFixed(2)}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Tag className="h-4 w-4" />
        <span>Tem um cupom de desconto?</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Digite o código"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 uppercase"
          disabled={isLoading}
        />
        <Button 
          onClick={handleApply} 
          variant="outline"
          disabled={isLoading || !code.trim()}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
    </div>
  );
};

export default CouponInput;
